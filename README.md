# StreamPeek

Desktop app that notifies you when streamers you follow on Twitch go live.

- **Desktop** — Tauri 2 + React 19 + Vite + Tailwind
- **API** — Bun + Hono + ORPC + Prisma + Kysely + BullMQ
- **Infra** — PostgreSQL + Redis

## Repo layout

```
apps/
  api/        # Bun + Hono backend (ORPC, Twitch polling, SSE)
  desktop/    # Tauri + React frontend
docker-compose.yml   # Postgres + Redis for local dev
```

## Prerequisites

- [Bun](https://bun.sh) 1.2+ (`.bun-version` pins the version used for desktop checks and releases)
- [Docker](https://www.docker.com/) (for local Postgres + Redis)
- [Rust toolchain](https://rustup.rs/) (for Tauri)
- A Twitch app at [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)

## Local setup

```bash
bun install
bun db:up                                # postgres + redis via docker
cp apps/api/.env.example apps/api/.env   # fill TWITCH_CLIENT_ID/SECRET
cp apps/desktop/.env.example apps/desktop/.env

cd apps/api && bun db:migrate            # apply prisma migrations
```

Register `http://localhost:3000/auth/twitch/callback` in the Twitch app's OAuth Redirect URLs.

## Run

```bash
bun dev:api          # API on :3000
bun dev:desktop      # Tauri dev (Linux/macOS)
bun dev:desktop:windows
```

## Production (Railway)

The API runs on [Railway](https://railway.com) via the `apps/api/Dockerfile`:

- Builder: **Dockerfile** with path `apps/api/Dockerfile`
- Postgres + Redis added as services; reference `${{Postgres.DATABASE_URL}}` and `${{Redis.REDIS_URL}}` in the API service variables
- Required env vars: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REDIRECT_URI` (production callback URL), `CORS_ORIGIN` (comma-separated list including `tauri://localhost,https://tauri.localhost`)
- `prisma migrate deploy` runs automatically on container start

The desktop app points to the production API by setting `VITE_API_BASE_URL` in `apps/desktop/.env` before building the Tauri bundle.

## Scripts

```bash
bun typecheck        # workspace-wide
bun lint             # oxlint
bun format           # oxfmt
bun db:up / db:down  # postgres + redis containers
```

In `apps/api`:

```bash
bun db:migrate           # prisma migrate dev (creates new migration)
bun db:migrate:deploy    # prisma migrate deploy (production)
bun db:generate          # regenerate prisma + kysely types
bun test                 # bun test (requires postgres + redis running)
```

In `apps/desktop`:

```bash
bun test                 # frontend unit tests (no database or native window needed)
bun run build            # TypeScript checks + production frontend build
bun run tauri build      # rebuilds the frontend, then creates the native app and installers
```

CI runs frontend tests, lint, and the frontend build on Linux and Windows. Releases
also run lint and frontend tests before building the native app; Tauri runs the
TypeScript checks and frontend build automatically before packaging. Native
installation, notifications, and autostart still need manual checks on each OS.
