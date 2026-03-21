# ⚡ FatherClaude

> Spawn fully-configured Claude agents in Docker containers with a beautiful web UI.

**FatherClaude** is an open-source developer tool that lets you describe a task, then spins up an isolated Docker container with a pre-configured [Claude Code](https://code.claude.com) agent — complete with skills, MCP servers, and system prompts — streaming the agent's work live to your browser.

Built by [**AgentsBooks**](https://agentsbooks.com) — AI-Powered Multi-Agent Management Platform.

---

## Architecture

```
Browser (React + xterm.js)
    │ REST + WebSocket
Server (Express + ws + Dockerode)
    │ Docker Socket
Container (Claude Code CLI, sandboxed)
```

| Layer | Stack |
|-------|-------|
| Frontend | Vite + React + TypeScript + xterm.js |
| Backend | Express + ws + Dockerode |
| Agent | Claude Code CLI (headless, sandboxed) |
| Styling | Vanilla CSS, GitHub dark theme |

## Quick Start

### Prerequisites
- **Node.js 20+**
- **Docker Desktop** running
- **Anthropic API Key** ([get one here](https://console.anthropic.com/))

### 1. Clone & Install

```bash
git clone https://github.com/seed-gpt/fatherClaude.git
cd fatherClaude
npm install
```

### 2. Configure

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Build Agent Image

```bash
npm run docker:build
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — describe your task, hit **Spawn Agent**, and watch Claude work in the live terminal.

## Docker Compose (One Command)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
docker compose up
```

## How It Works

1. You type a prompt describing what to build
2. The server creates a Docker container from `fatherclaude-agent` image
3. Inside the container, Claude Code CLI runs in headless mode with `--permission-mode bypassPermissions`
4. Container output streams via WebSocket → xterm.js in your browser
5. Claude has full access to filesystem, shell, and web — all sandboxed inside Docker

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Your Anthropic API key (required) |
| `PORT` | `3001` | Server port |
| `MAX_BUDGET` | `5` | Max USD spend per agent session |

## Project Structure

```
fatherclaude/
├── src/                  # React frontend
│   ├── components/       # ChatPanel, TerminalPanel, SessionList, Header
│   ├── hooks/            # useTerminal, useSession
│   └── index.css         # Design system
├── server/               # Express backend
│   ├── index.ts          # Server entry
│   ├── api.ts            # REST routes
│   ├── ws.ts             # WebSocket terminal bridge
│   └── docker.ts         # Dockerode container manager
├── docker/               # Agent container
│   ├── Dockerfile.claude # Agent image
│   └── workspace/        # Pre-loaded config
│       ├── CLAUDE.md     # System prompt
│       └── mcp_servers.json
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Contributing

PRs welcome! Please open an issue first for major changes.

## License

MIT — see [LICENSE](./LICENSE)

---

<p align="center">
  <a href="https://agentsbooks.com"><strong>AgentsBooks</strong></a> — AI-Powered Multi-Agent Management Platform
</p>
