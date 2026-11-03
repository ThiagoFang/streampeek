<p align="center">
  <img src="apps/desktop/public/logo_streampeek.png" alt="StreamPeek logo" width="96" />
</p>

<h1 align="center">StreamPeek</h1>
<p align="center">A desktop companion for keeping up with followed Twitch streamers.</p>

> **Retired — November 2026.** This repository is preserved as a portfolio project and source reference. Development and hosted-service support have ended. No new releases, fixes, or support are planned. Historical binaries may still point to the former API; use the source with your own local backend to explore the app.

## What it does

StreamPeek lives in the system tray and shows which followed Twitch channels are live, with desktop notifications when a stream starts. It combines a compact native desktop shell with a backend that handles Twitch authentication, polls live status, and pushes events to connected clients.

- Sign in with Twitch and browse followed channels, grouped by live status.
- Open a channel on Twitch directly from the app.
- Enable or disable notifications, and mute individual channels.
- Keep the app in the tray and optionally launch it at login.
- Restore sessions and reconnect to the event stream.

## Architecture

```text
Tauri + React desktop
  │  RPC requests / server-sent events
  ▼
Bun + Hono API ─────────────── Twitch OAuth + Helix API
  ├── PostgreSQL: sessions, settings, notification exclusions
  └── Redis + BullMQ: polling jobs and event distribution
```

| Layer | Technologies | Responsibility |
| --- | --- | --- |
| Desktop UI | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand | Channel list, authentication flow, preferences |
| Native shell | Tauri 2, Rust | Tray, notifications, autostart, SSE connection |
| API | Bun, Hono, oRPC, ArkType | Typed RPC, OAuth, sessions, rate limiting |
| Persistence | PostgreSQL, Prisma migrations, Kysely | Schema management and typed queries |
| Background work | Redis, BullMQ | Scheduled Twitch polling and live events |

The backend separates application lifecycle, session handling, polling policy, and transport adapters. Tests cover these boundaries alongside frontend preferences and event handling. Native tray code has separate Linux and other-platform implementations; Linux also has a window configuration override for WebKitGTK rendering.

## Repository

```text
apps/api/
  prisma/                   Database schema and migrations
  src/rpc/                  RPC procedures
  src/routes/               OAuth callback, SSE, health endpoint
  src/services/             Authentication, sessions, polling, Twitch client
  src/__tests__/            Unit and integration tests
apps/desktop/
  src/                      React UI, hooks, state, frontend tests
  src-tauri/                Rust shell, tray, notifications, SSE
.github/workflows/ci.yml     Source checks; release automation was retired
```

## Explore locally

The source is preserved for study and local experimentation. It requires your own Twitch application credentials; there is no supported public backend.

Prerequisites: Bun (version pinned in `.bun-version`), Docker Compose, Rust, and the native development libraries required by Tauri 2 for your OS. Native behavior was developed for Linux and Windows; other platforms are unverified.

From the repository root:

```bash
bun install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/desktop/.env.example apps/desktop/.env
bun db:up
```

In `apps/api/.env`, fill in `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` from your own Twitch application. Register `http://localhost:3000/auth/twitch/callback` as its OAuth redirect URL. The example database credentials are for local development only; database and Redis ports bind to loopback.

```bash
cd apps/api
bun db:generate
bun db:migrate:deploy
```

Then, in separate terminals from the repository root:

```bash
bun dev:api
bun dev:desktop           # Linux; also sets a WebKit renderer workaround
# Windows: bun dev:desktop:windows
```

The desktop example and packaged CSP target `http://localhost:3000`. For a different backend, change both `VITE_API_BASE_URL` and `app.security.csp.connect-src` in `apps/desktop/src-tauri/tauri.conf.json` before building.

## Verification

```bash
bun typecheck
bun lint
cd apps/desktop
bun test
bun run build
```

API tests run with `cd apps/api && bun test`. Integration tests require a migrated, disposable PostgreSQL database and Redis instance configured through the API environment. They write and clean up test data; do not point them at a production database.

CI checks the frontend on Linux and Windows, and typechecks and tests the API with isolated PostgreSQL and Redis services. Native installers, notifications, tray behavior, and autostart require manual OS testing.

## Retirement notes

Production deployment files and automated releases have been removed. The generic API Dockerfile remains as a source reference. Local environment files, credentials, and build artifacts are excluded from Git and Docker contexts. No license is currently declared in this repository.
