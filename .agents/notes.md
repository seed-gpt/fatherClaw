# FatherClaude — Agent Notes

## Architecture Decision Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend Framework | Vite + React + TypeScript | Fast DX, developer-friendly for OSS |
| Terminal Emulator | xterm.js + AttachAddon + FitAddon | Industry standard, VS Code uses it |
| Backend | Express + ws (native WebSocket) | Lightweight, no over-engineering |
| Container Management | Dockerode | Best Node.js Docker API client |
| Agent Runtime | Claude Code CLI (`--print` mode) | Official headless mode in containers |
| Styling | Vanilla CSS (GitHub dark theme) | No framework deps, premium feel |
| Container Isolation | `bypassPermissions` + Docker sandbox | Safe: Claude has full power but contained |

## Key Technical Patterns

### Container Lifecycle
```
spawnAgent(prompt) → createContainer() → start() → attachStream() → wait()
```
- AutoRemove: true (containers clean up on exit)
- 512MB memory limit per container
- Non-root `agent` user inside container

### WebSocket Bridge
```
Container stdout → ws.ts relay → WebSocket → xterm.js AttachAddon
```
- Unidirectional: container → browser (read-only terminal)
- Auto-cleanup on client disconnect

### Dev Workflow
```
npm run dev = concurrently(vite, tsx --watch server/index.ts)
```
- Hot reload on both frontend and server
- Vite proxies `/api` and `/ws` to backend

## Dependencies
- `@anthropic-ai/claude-code` — Claude CLI inside Docker
- `dockerode` — Docker Engine API
- `@xterm/xterm` + `@xterm/addon-attach` + `@xterm/addon-fit` — Browser terminal
- `express` + `ws` — HTTP + WebSocket server
- `concurrently` + `tsx` — Dev tooling
