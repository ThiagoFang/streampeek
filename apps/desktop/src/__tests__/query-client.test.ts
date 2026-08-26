import { describe, expect, it } from "bun:test";
import { createAppQueryClient } from "../lib/query-client";

describe("application query client", () => {
  it("leaves an initial protected query error for the error boundary", async () => {
    const messages: string[] = [];
    const client = createAppQueryClient({ showError: (message) => messages.push(message) });

    await expect(
      client.fetchQuery({
        queryKey: ["protected"],
        retry: false,
        queryFn: async () => {
          throw new Error("Falha protegida");
        },
      }),
    ).rejects.toThrow("Falha protegida");

    expect(messages).toEqual([]);
  });

  it("shows an unprotected query error instead of losing it", async () => {
    const messages: string[] = [];
    const client = createAppQueryClient({ showError: (message) => messages.push(message) });

    await expect(
      client.fetchQuery({
        queryKey: ["login-status"],
        meta: { errorPresentation: "toast" },
        queryFn: async () => {
          throw new Error("API indisponível");
        },
        retry: false,
      }),
    ).rejects.toThrow("API indisponível");

    expect(messages).toEqual(["API indisponível"]);
  });

  it("shows unhandled action errors without duplicating locally handled ones", async () => {
    const messages: string[] = [];
    const client = createAppQueryClient({ showError: (message) => messages.push(message) });
    const unhandled = client.getMutationCache().build(client, {
      mutationFn: async () => {
        throw new Error("Ação falhou");
      },
    });
    const handled = client.getMutationCache().build(client, {
      mutationFn: async () => {
        throw new Error("Falha tratada");
      },
      onError: () => undefined,
    });

    await expect(unhandled.execute(undefined)).rejects.toThrow("Ação falhou");
    await expect(handled.execute(undefined)).rejects.toThrow("Falha tratada");

    expect(messages).toEqual(["Ação falhou"]);
  });
});
