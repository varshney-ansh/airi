# 🌸 Airi — AI Desktop Assistant

Airi is a friendly, local-first AI assistant that helps you control your Windows PC through natural language. Powered by Qwen3-VL-2B, it runs entirely on your machine with no cloud API required.

---

## ✨ Features

- **Natural language chat** — Real-time streaming responses with Qwen3-VL-2B
- **Windows app control** — Open, inspect, and automate any installed app
- **Browser automation** — Navigate sites, fill forms, extract data via Playwright
- **Document & image analysis** — Upload PDFs, Word docs, images — RAG is automatic
- **Memory** — Remember user preferences and facts across sessions (local Qdrant)
- **Thinking mode** — Qwen3's reasoning mode for complex tasks
- **Fully local** — No cloud, no API keys, no data leaves your machine

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Desktop shell | Electron |
| Frontend | Next.js 16, React 19, Tailwind CSS |
| UI components | ShadCN, Radix UI, Fluent UI |
| Agent backend | Python, FastAPI, Qwen-Agent |
| LLM inference | llama.cpp (`llama-server`) |
| Browser automation | Playwright + playwright-stealth |
| Vector DB | Qdrant (local) |
| Memory | mem0 (local) |
| Auth | Auth0 |

---

## 📋 Prerequisites

- Node.js v18+
- Python 3.10+
- [llama.cpp](https://github.com/ggml-org/llama.cpp) (`winget install llama.cpp` on Windows)
- Git

---

## 🚀 Setup

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
.venv\Scripts\activate.bat       # Windows
# source .venv/bin/activate       # macOS/Linux

pip install -r requirements.txt
playwright install chromium
```

### 4. Start the LLM server

```bash
llama-server -hf Qwen/Qwen3-VL-2B-Instruct-GGUF:Q8_0 ^
  --port 11434 ^
  --ctx-size 32768 ^
  --jinja ^
  --embedding
```

> You can swap the model for any OpenAI-compatible GGUF. The agent backend points to `http://127.0.0.1:11434/v1`.

### 5. Run in development

```bash
.venv\Scripts\activate.bat
npm run dev
```

This starts the Next.js dev server and Electron concurrently. The app opens at `http://localhost:3000`.

---

## 📁 Project Structure

```
airi/
├── agent-server/
│   ├── agent.py              # FastAPI server + Qwen agent + all tools
│   ├── test_mem0.py          # mem0 memory integration tests
│   ├── user_stuff/           # Uploaded files for RAG (auto-created)
│   ├── context/              # App metadata (auto-generated)
│   └── .mem0_db/             # Local Qdrant vector DB (auto-created)
├── electron/
│   ├── main.js               # Electron entry — spawns llama-server + agent.py
│   └── preload.js
├── src/
│   ├── app/
│   │   ├── api/agent/        # Next.js API route — proxies to agent backend
│   │   └── app/[chatId]/     # Chat interface
│   ├── component/            # App-specific components (chat, sidebar)
│   └── lib/
│       ├── agent-api.js      # Streaming NDJSON client
│       └── auth0.js
├── ui-components/            # Reusable UI components
├── requirements.txt
└── package.json
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js + Electron together |
| `npm run dev:next` | Next.js only |
| `npm run dev:electron` | Electron only (requires Next.js running) |
| `npm run build` | Production build |
| `python test_mem0.py` | Run mem0 memory integration tests |

---

## 🧰 Agent Tools

The agent (`agent-server/agent.py`) exposes these tools to the LLM:

| Tool | When to Use |
|---|---|
| `search_win_app_by_name(name)` | First step to find any Windows app |
| `start_app_session(app_id)` | Launch app after getting AppId |
| `inspect_ui_elements(app_id)` | See what's clickable in the app |
| `list_element_names(app_id)` | Get list of element names |
| `get_element_details(app_id, element_name)` | Find exact position of element |
| `stop_app_session(app_id)` | Close app when done |
| `browser_automation(task)` | Web tasks (search, forms, navigation) |
| `web_search(query)` | Find current info online |
| `manage_memory(action, content)` | Save/search user facts — action: `save` \| `search` \| `delete_session` |

---

## 💡 Memory System

Airi uses **mem0** for persistent memory:

- **Session-scoped** — `run_id=session_id` — cleared when chat ends
- **User-scoped** — `user_id` — persists across sessions
- **Local Qdrant** — no cloud, all data stays on your machine

**Example usage:**
```python
# Save a fact
mem_client.add(
    [{"role": "user", "content": "User prefers dark mode"}],
    user_id="user_123",
    run_id="session_001",
    infer=False,
)

# Search for relevant facts
memories = mem_client.search("dark mode", user_id="user_123", threshold=0.2)
```

---

## 🧪 Testing

Run the mem0 integration test to verify memory works:

```bash
.venv\Scripts\activate.bat
cd agent-server
..\.venv\Scripts\python.exe test_mem0.py
```

Expected output: `✓ ALL TESTS PASSED`

---

## 🛠️ Configuration

### LLM Config (`agent-server/agent.py`)

```python
llm_cfg = {
    "model": "default",
    "model_server": "http://127.0.0.1:11434/v1",
    "generate_cfg": {
        "temperature": 0.5,
        "top_p": 0.9,
        "top_k": 20,
        "max_tokens": 2048,
        "repetition_penalty": 1.1,
        "extra_body": {"enable_thinking": True},  # Qwen3 reasoning mode
    }
}
```

### Mem0 Config

```python
mem0_config = {
    "vector_store": {
        "provider": "qdrant",
        "config": {"path": ".mem0_db", "collection_name": "airi_memory"}
    },
    "llm": { ... },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "embeddinggemma-300m-Q4_0",
            "openai_base_url": "http://127.0.0.1:11445/v1",
            "embedding_dims": 768,
        }
    }
}
```

---

## 🤝 Contributing

1. Fork the repo and create a branch: `git checkout -b feature/your-feature`
2. Make your changes and test locally with `npm run dev`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m "feat: add X"`
4. Push and open a Pull Request against `main`

---

## 📄 License

MIT
