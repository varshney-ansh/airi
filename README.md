# Airi — AI Desktop Agent

Airi is an AI-powered desktop agent that lets you control your PC through natural language. It runs locally using a quantized LLM via llama.cpp, with a Next.js + Electron frontend and a Python FastAPI agent backend.

---

## Features

- Text chat interface with real-time streaming responses
- Desktop automation — mouse control, keyboard input, clipboard management
- Browser search via Playwright (Google scraping)
- Screenshot capture
- Shell command execution
- Runs fully local — no cloud API required

## Tech Stack

| Layer | Tech |
|---|---|
| Desktop shell | Electron |
| Frontend | Next.js 16, React 19, Tailwind CSS |
| UI components | ShadCN, Radix UI, Lucide |
| Markdown rendering | Streamdown |
| Agent backend | Python, FastAPI, Qwen-Agent |
| LLM inference | llama.cpp (`llama-server`) |
| Browser automation | Playwright |
| Auth | Auth0 |

---

## Prerequisites

- Node.js v18+
- Python 3.10+
- [llama.cpp](https://github.com/ggml-org/llama.cpp) (`winget install llama.cpp` on Windows)
- Git

---

## Setup

### 1. Clone

```bash
git clone https://github.com/varshney-ansh/airi.git
cd airi
```

### 2. Install JS dependencies

```bash
npm install
```

### 3. Install Python dependencies

```bash
python -m venv .venv
.venv/Scripts/activate.bat       # Windows
# source .venv/bin/activate       # macOS/Linux

pip install -r requirements.txt
playwright install chromium
```

### 4. Start the LLM server

```bash
llama-server -hf Qwen/Qwen3-0.6B-GGUF:Q8_0 --port 11434 --ctx-size 32768 --jinja
```

> You can swap the model for any OpenAI-compatible GGUF. The agent backend points to `http://127.0.0.1:11434/v1`.

### 5. Run in development

```bash
.venv/Scripts/activate.bat
npm run dev
```

This starts the Next.js dev server and Electron concurrently. The app opens at `http://localhost:3000`.

---

## Project Structure

```
airi/
├── agent-server/
│   ├── agent.py              # FastAPI server + Qwen agent + all tools
│   └── screenshots/          # Screenshot output directory (auto-created)
├── electron/
│   ├── main.js               # Electron entry — spawns llama-server + agent.py
│   └── preload.js
├── src/
│   ├── app/
│   │   ├── api/agent/        # Next.js API route — proxies to agent backend
│   │   ├── layout.js
│   │   └── page.jsx
│   ├── component/            # App-specific components (chat, sidebar)
│   └── lib/
│       ├── agent-api.js      # Streaming NDJSON client
│       └── auth0.js
├── requirements.txt
└── package.json
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js + Electron together |
| `npm run dev:next` | Next.js only |
| `npm run dev:electron` | Electron only (requires Next.js running) |
| `npm run build` | Production build |

---

## Agent Tools

The agent (`agent-server/agent.py`) exposes these tools to the LLM:

| Tool | Description |
|---|---|
| `run_cmd` | Execute shell commands |
| `take_screenshot` | Capture desktop screenshot (saved to `agent-server/screenshots/`) |
| `mouse_control` | Move, click, or double-click at screen coordinates |
| `type_text` | Type text into the focused window via clipboard paste |
| `clipboard_manager` | Read or write system clipboard |
| `browser_search` | Search Google and return result snippets |

---

## Contributing

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make your changes and test locally with `npm run dev`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m "feat: add X"`
4. Push and open a Pull Request against `main`

---

## License

MIT
