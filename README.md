tele.me

A tasteful, local-first teleprompter + recorder.

## Dev

Prereqs: Node.js 20+ recommended.

```bash
pnpm install
pnpm run dev
```

Then open `http://localhost:5173`.

## Notes

- Camera + recording runs fully in-browser via `getUserMedia` + `MediaRecorder`.
- No accounts, no backend. Export is a direct download.
