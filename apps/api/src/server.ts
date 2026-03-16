import { Hono } from "hono";
import { cors } from "hono/cors";
import { health } from "./routes/health";
import { auth } from "./routes/auth";
import { streamer } from "./routes/streamer";
import { envVariables } from "./lib/env";

const app = new Hono();

app.use("*", cors());

app.route("/", health);
app.route("/", auth);
app.route("/", streamer);

export default {
  port: envVariables.PORT,
  fetch: app.fetch,
};
