# AGENTS

## Purpose

This file helps coding agents become productive quickly in this workspace.

## Read First

- Project setup and runtime notes: [README.md](README.md)
- Product requirements and scope: [docs/spec.md](docs/spec.md)
- Tauri app config and build expectations: [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)
- Rust crate metadata and dependencies: [src-tauri/Cargo.toml](src-tauri/Cargo.toml)

## Current Reality of This Repo

- This is a Tauri 2 desktop app shell with Rust backend scaffolding.
- UI reference exists at [docs/index.html](docs/index.html) and is treated as a spec/prototype artifact.
- Tauri currently expects frontend output at dist via frontendDist in [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json).
- Runtime Supabase placeholders live in [app-config.js](app-config.js).

## Commands Agents Should Use

- Install dependencies: npm install
- Start desktop dev mode: npm run dev
- Build desktop bundles: npm run build
- Run direct Tauri commands: npm run tauri -- <args>

## Editing Rules

- Do not edit generated or dependency directories:
  - node_modules/
  - dist/
  - src-tauri/target/
- Keep backward compatibility in Supabase config keys when touching [app-config.js](app-config.js).
- For feature behavior, align implementation with [docs/spec.md](docs/spec.md).
- If a task requires React/frontend source changes and no source scaffold exists, create the scaffold first and make sure it outputs to dist.

## Validation Expectations

- Check edited files for diagnostics before finishing.
- For Rust changes, run cargo check on [src-tauri/Cargo.toml](src-tauri/Cargo.toml) when possible.
- No formal test/lint scripts are currently defined in [package.json](package.json); call this out in task summaries when relevant.
