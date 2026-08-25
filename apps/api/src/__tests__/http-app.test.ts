import { describe, expect, it } from "bun:test";
import { type } from "arktype";
import type { Handler, MiddlewareHandler } from "hono";
import { createHttpApp, type HttpAppDependencies } from "../http-app";

function createHarness(overrides: Partial<HttpAppDependencies> = {}) {
  const rateLimitedPaths: string[] = [];
  const validationErrors: string[] = [];
  const unhandledErrors: unknown[] = [];

  const endpoint =
    (name: string): Handler =>
    (c) =>
      c.json({ endpoint: name });
  const rateLimit: MiddlewareHandler = async (c, next) => {
    rateLimitedPaths.push(c.req.path);
    await next();
  };

  const dependencies: HttpAppDependencies = {
    corsOrigins: ["http://desktop.local"],
    rateLimit,
    authCallback: endpoint("auth-callback"),
    events: endpoint("events"),
    health: endpoint("health"),
    rpcHandler: {
      handle: async () => ({ matched: false, response: undefined }),
    },
    reportValidationError: (summary) => {
      validationErrors.push(summary);
    },
    reportUnhandledError: (error) => {
      unhandledErrors.push(error);
    },
    ...overrides,
  };

  return {
    app: createHttpApp(dependencies),
    rateLimitedPaths,
    validationErrors,
    unhandledErrors,
  };
}

describe("HTTP app", () => {
  it("routes requests and applies rate limiting only to protected entry points", async () => {
    const harness = createHarness();

    expect(await (await harness.app.request("/health")).json()).toEqual({ endpoint: "health" });
    expect(await (await harness.app.request("/auth/twitch/callback")).json()).toEqual({
      endpoint: "auth-callback",
    });
    expect(await (await harness.app.request("/events")).json()).toEqual({ endpoint: "events" });
    expect((await harness.app.request("/rpc/unknown")).status).toBe(404);

    expect(harness.rateLimitedPaths).toEqual(["/auth/twitch/callback", "/events", "/rpc/unknown"]);
  });

  it("returns the response produced by a matched RPC procedure", async () => {
    const harness = createHarness({
      rpcHandler: {
        handle: async () => ({
          matched: true,
          response: Response.json({ result: "ok" }),
        }),
      },
    });

    const response = await harness.app.request("/rpc/example");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: "ok" });
  });

  it("keeps CORS configuration at the HTTP boundary", async () => {
    const harness = createHarness();

    const response = await harness.app.request("/health", {
      headers: { Origin: "http://desktop.local" },
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://desktop.local");
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("turns invalid input into a client error", async () => {
    const schema = type({ required: "string" });
    const harness = createHarness({
      health: () => {
        schema.assert({});
        return new Response();
      },
    });

    const response = await harness.app.request("/health");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "VALIDATION_ERROR" });
    expect(harness.validationErrors).toHaveLength(1);
  });

  it("hides external service errors from clients", async () => {
    const harness = createHarness({
      health: () => {
        throw Object.assign(new Error("Twitch rejected the request"), { status: 401 });
      },
    });

    const response = await harness.app.request("/health");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "EXTERNAL_API_ERROR" });
  });

  it("reports unexpected errors without leaking their details", async () => {
    const error = new Error("database password appeared here");
    const harness = createHarness({
      health: () => {
        throw error;
      },
    });

    const response = await harness.app.request("/health");

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "INTERNAL_ERROR" });
    expect(harness.unhandledErrors).toEqual([error]);
  });
});
