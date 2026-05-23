# PomoTime

PomoTime is a desktop study-time tracker built with Tauri 2 (Rust backend + web frontend).

## Project Status

- Desktop target: Linux and Windows
- App shell: Tauri 2
- Product specification: docs/spec.md
- UI prototype/spec reference: docs/index.html

## Current Structure

- src-tauri/: Rust app and Tauri configuration
- docs/spec.md: product and implementation spec
- docs/index.html: UI prototype/spec artifact
- app-config.js: runtime Supabase config placeholders

## Prerequisites

- Node.js and npm
- Rust toolchain (cargo, rustc)
- Tauri Linux system dependencies (for Linux builds)

Example Linux dependencies (Ubuntu/Debian):

```bash
sudo apt update
sudo apt install -y \
  pkg-config \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

## Install

```bash
npm install
```

## Run (Development)

```bash
npm run dev
```

## Build

```bash
npm run build
```

## NPM Scripts

- npm run dev: start Tauri in development mode
- npm run build: build desktop bundles
- npm run tauri: run Tauri CLI directly

## Supabase Runtime Config

Prefer environment variables so you do not commit keys into git.

Add these variables to `.env.local` (or `.env` for local-only setups):

- VITE_POMOTIME_SUPABASE_URL
- VITE_POMOTIME_SUPABASE_PUBLISHABLE_KEY
- VITE_POMOTIME_SUPABASE_ANON_KEY

Legacy fallback keys are still supported if needed:

- VITE_LEARNTIME_SUPABASE_URL
- VITE_LEARNTIME_SUPABASE_PUBLISHABLE_KEY
- VITE_LEARNTIME_SUPABASE_ANON_KEY

`app-config.js` remains as a runtime fallback for older builds, but it should stay with empty placeholders in the repository.
Prefer the publishable key for new setups. The anon key remains supported for backward compatibility.

## Important Note About Frontend

Tauri is currently configured with frontendDist = ../dist in src-tauri/tauri.conf.json.

This means production build expects a web frontend output in dist/. If you are using React, ensure your React build step generates dist/ before running npm run build.
