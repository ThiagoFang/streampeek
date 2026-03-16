import { Hono } from "hono";
import { cors } from "hono/cors";
import { type } from "arktype";
import { health } from "./routes/health";
import { auth } from "./routes/auth";
import { streamer } from "./routes/streamer";
import { envVariables } from "./lib/env";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: envVariables.CORS_ORIGIN,
    credentials: true,
  }),
);

app.route("/", health);
app.route("/", auth);
app.route("/", streamer);

app.onError((err, c) => {
  if (err instanceof type.errors) {
    return c.json(
      { error: "VALIDATION_ERROR", details: err.summary },
      400,
    );
  }

  if ("status" in err && typeof err.status === "number") {
    return c.json({ error: "EXTERNAL_API_ERROR" }, 502);
  }

  console.error(err);
  return c.json({ error: "INTERNAL_ERROR" }, 500);
});

export default {
  port: envVariables.PORT,
  fetch: app.fetch,
};
