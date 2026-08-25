import { TraversalError } from "arktype";
import { Hono, type Handler, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

interface RpcHttpHandler {
  handle: (
    request: Request,
    options: { prefix: `/${string}`; context: { reqHeaders: Headers } },
  ) => Promise<{ matched: true; response: Response } | { matched: false; response?: undefined }>;
}

export interface HttpAppDependencies {
  corsOrigins: string[];
  rateLimit: MiddlewareHandler;
  authCallback: Handler;
  events: Handler;
  health: Handler;
  rpcHandler: RpcHttpHandler;
  reportValidationError: (summary: string) => void;
  reportUnhandledError: (error: unknown) => void;
}

export function createHttpApp(dependencies: HttpAppDependencies) {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: dependencies.corsOrigins,
      credentials: true,
    }),
  );

  app.get("/auth/twitch/callback", dependencies.rateLimit, dependencies.authCallback);
  app.get("/events", dependencies.rateLimit, dependencies.events);
  app.get("/health", dependencies.health);

  app.use("/rpc/*", dependencies.rateLimit);
  app.all("/rpc/*", async (c) => {
    const result = await dependencies.rpcHandler.handle(c.req.raw, {
      prefix: "/rpc",
      context: { reqHeaders: c.req.raw.headers },
    });
    if (result.matched) return result.response;
    return c.json({ error: "NOT_FOUND" }, 404);
  });

  app.onError((error, c) => {
    if (error instanceof TraversalError) {
      dependencies.reportValidationError(error.message);
      return c.json({ error: "VALIDATION_ERROR" }, 400);
    }

    if ("status" in error && typeof error.status === "number") {
      return c.json({ error: "EXTERNAL_API_ERROR" }, 502);
    }

    dependencies.reportUnhandledError(error);
    return c.json({ error: "INTERNAL_ERROR" }, 500);
  });

  return app;
}
