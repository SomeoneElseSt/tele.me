# AGENTS.md

## Cursor Cloud specific instructions

### Overview

teleme.me is a client-side React SPA (Vite + TypeScript + Tailwind CSS) — a teleprompter and video recorder that runs entirely in the browser. There is no backend, no database, and no external services required.

### Running the dev server

```bash
pnpm run dev
```

Starts Vite on port 5173 with required COOP/COEP headers for SharedArrayBuffer (needed by FFmpeg WASM).

### Lint / Build / Preview

See `package.json` scripts:
- `pnpm run lint` — ESLint (note: vendored `public/ffmpeg/ffmpeg-core.js` produces ~230 baseline errors that are pre-existing)
- `pnpm run build` — TypeScript check + Vite production build
- `pnpm run preview` — Serve production build locally

### Important caveats

- **esbuild build scripts**: pnpm v10 blocks lifecycle scripts by default. The `pnpm.onlyBuiltDependencies` field in `package.json` allows esbuild's postinstall to run (required for Vite). The repo owner's local machine has `ignore-scripts=false` in their global pnpm config which bypasses this, but cloud VMs and CI need the explicit allowlist in `package.json`.
- **No automated test suite**: The project has no unit/integration tests. Validation is manual (browser-based).
- **FFmpeg WASM**: The `@ffmpeg/ffmpeg` and `@ffmpeg/util` packages are excluded from Vite's dependency optimization (`optimizeDeps.exclude` in `vite.config.ts`). A vendored copy of ffmpeg-core lives in `public/ffmpeg/`.
- **Browser APIs required for full testing**: Camera/mic access (MediaRecorder), Document Picture-in-Picture API, and IndexedDB are used but only available in a real browser context.
