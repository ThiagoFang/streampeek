import { Hono } from "hono";

export const health = new Hono().get("/health", (c) => {
  return c.json({ status: "ok" });
});
