# Marble Maze 3D

A 3D ball-rolling maze game built with Babylon.js, packaged as a web app with APK export support via Capacitor + GitHub Actions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/3d-game run dev` — run the game (dev mode)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Game: Babylon.js (3D engine)
- UI: React + Vite + Tailwind CSS
- APK packaging: Capacitor + GitHub Actions
- API: Express 5
- DB: PostgreSQL + Drizzle ORM

## Where things live

- `artifacts/3d-game/` — main game app (Babylon.js + React)
- `artifacts/3d-game/src/game/BabylonGame.ts` — core game engine class
- `artifacts/3d-game/src/App.tsx` — UI, menus, HUD
- `artifacts/3d-game/capacitor.config.json` — Capacitor config for APK
- `.github/workflows/build-apk.yml` — GitHub Actions workflow for APK build

## APK Build via GitHub Actions

Push to `main` branch or trigger manually. The workflow:
1. Builds the Vite web app
2. Syncs with Capacitor Android project
3. Builds a debug APK
4. Uploads the APK as a GitHub Actions artifact (downloadable for 30 days)

For a signed release APK, add these GitHub secrets:
- `KEYSTORE_BASE64` — base64-encoded keystore file
- `KEYSTORE_PASSWORD` — keystore password
- `KEY_ALIAS` — key alias
- `KEY_PASSWORD` — key password

## Architecture decisions

- Babylon.js chosen over React Three Fiber for richer built-in tooling and physics
- Capacitor wraps the Vite build output for native Android packaging
- Game state managed in React (lives, score, gems), rendering in Babylon.js class
- Three difficulty levels with increasingly complex maze layouts

## Product

- 3D marble-rolling maze game, 3 levels of increasing difficulty
- Collect all gems to unlock the exit portal
- WASD / Arrow key controls
- Lives system — fall off the edge and lose a life
- Score based on gems collected + time bonus

## User preferences

- Engine: Babylon.js
- APK export via GitHub Actions + Capacitor

## Gotchas

- `BASE_PATH` env var must be set when building — vite.config.ts requires it
- Run `pnpm exec cap sync android` inside `artifacts/3d-game` after a web build to sync Capacitor
- Capacitor Android project is generated on first `cap sync` — commit the `android/` folder to enable GitHub Actions APK build
