import { Hono } from "hono"
import { health } from "./routes/health"
import { envVariables } from "./lib/env"

const app = new Hono()

app.route("/", health)

export default {
  port: envVariables.PORT,
  fetch: app.fetch,
}
