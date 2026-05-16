import os
import sys
import json
import time
import asyncio
import logging
import concurrent.futures
from contextvars import ContextVar
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# ── Force UTF-8 output ────────────────────────────────────────────────────────
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# ── Env vars before mem0 import ───────────────────────────────────────────────
os.environ.setdefault("OPENAI_API_KEY", "none")
os.environ.setdefault("MEM0_TELEMETRY", "false")

# ── Settings (persisted to settings.json) ────────────────────────────────────
_SETTINGS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "settings.json")
_DEFAULT_SETTINGS = {
    "model_server":      "http://127.0.0.1:11434/v1",
    "model":             "default",
    "api_key":           "none",
    "thinking_enabled":  True,
}

def _load_settings() -> dict:
    if os.path.exists(_SETTINGS_PATH):
        try:
            with open(_SETTINGS_PATH, "r", encoding="utf-8") as f:
                saved = json.load(f)
            s = {**_DEFAULT_SETTINGS, **saved}
            logger.info(f"[settings] Loaded from settings.json: server={s['model_server']} model={s['model']}")
            return s
        except Exception as e:
            logger.warning(f"[settings] Failed to load settings.json: {e}")
    return dict(_DEFAULT_SETTINGS)

def _save_settings(s: dict):
    try:
        with open(_SETTINGS_PATH, "w", encoding="utf-8") as f:
            json.dump(s, f, indent=2)
    except Exception as e:
        logger.warning(f"[settings] Failed to save settings.json: {e}")

_settings = _load_settings()

# ── Qwen Agent Framework ──────────────────────────────────────────────────────
from qwen_agent.agents import Assistant
from qwen_agent.tools.base import BaseTool, register_tool
from qwen_agent.llm.schema import Message, ContentItem

# ── FastAPI ───────────────────────────────────────────────────────────────────
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import StreamingResponse
import shutil

# ── Memory ────────────────────────────────────────────────────────────────────
from mem0 import Memory

# ── FlaUI Engine ─────────────────────────────────────────────────────────────
from flaui import engine as _flaui_engine

# ── Model name (for SSE responses) ───────────────────────────────────────────
modelName = "Qwen/Qwen3-VL-2B-Instruct-GGUF"

# ── Mem0 setup ────────────────────────────────────────────────────────────────
_MEM0_DB        = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".mem0_db")
_EMBED_DIMS     = 768
_COLLECTION     = "airi_memory"
_EMBED_MODEL    = "unsloth/embeddinggemma-300m-GGUF:Q4_0"
_EMBED_BASE_URL = "http://127.0.0.1:11445/v1"

def _wait_for_embedding_server(max_retries=40, delay=0.5):
    import requests
    for i in range(max_retries):
        try:
            if requests.get("http://127.0.0.1:11445/health", timeout=1).status_code == 200:
                logger.info("[mem0] Embedding server ready")
                return True
        except Exception:
            pass
        if i == 0:
            logger.info("[mem0] Waiting for embedding server...")
        time.sleep(delay)
    logger.warning("[mem0] Embedding server not ready after timeout")
    return False

def _probe_embedding_dims():
    import requests
    try:
        data = requests.post(
            f"{_EMBED_BASE_URL}/embeddings",
            json={"model": _EMBED_MODEL, "input": "test"},
            timeout=5,
        ).json()
        dims = len(data["data"][0]["embedding"])
        logger.info(f"[mem0] Embedder returns {dims} dims")
        return dims
    except Exception as e:
        logger.warning(f"[mem0] Could not probe dims: {e}")
        return _EMBED_DIMS

def _ensure_qdrant_collection(dims: int):
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams
    os.makedirs(_MEM0_DB, exist_ok=True)
    client = QdrantClient(path=_MEM0_DB)
    existing = {c.name for c in client.get_collections().collections}
    if _COLLECTION in existing:
        info = client.get_collection(_COLLECTION)
        vectors_config = info.config.params.vectors
        current_dims = (
            next(iter(vectors_config.values())).size
            if isinstance(vectors_config, dict)
            else vectors_config.size
        )
        if current_dims != dims:
            logger.warning(f"[mem0] Recreating collection: {current_dims} -> {dims} dims")
            client.delete_collection(_COLLECTION)
            client.create_collection(_COLLECTION, vectors_config=VectorParams(size=dims, distance=Distance.COSINE))
        else:
            logger.info(f"[mem0] Collection OK ({dims} dims)")
    else:
        client.create_collection(_COLLECTION, vectors_config=VectorParams(size=dims, distance=Distance.COSINE))
        logger.info(f"[mem0] Collection created ({dims} dims)")
    client.close()

_wait_for_embedding_server()
_EMBED_DIMS = _probe_embedding_dims()
_ensure_qdrant_collection(_EMBED_DIMS)

mem0_config = {
    "vector_store": {
        "provider": "qdrant",
        "config": {"path": _MEM0_DB, "collection_name": _COLLECTION, "on_disk": True}
    },
    "llm": {
        "provider": "openai",
        "config": {
            "model": "default",
            "openai_base_url": "http://127.0.0.1:11434/v1",
            "api_key": "none",
            "temperature": 0.1,
            "max_tokens": 2000,
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": _EMBED_MODEL,
            "openai_base_url": _EMBED_BASE_URL,
            "api_key": "none",
            "embedding_dims": _EMBED_DIMS,
        }
    }
}
mem_client = Memory.from_config(mem0_config)
logger.info(f"[mem0] Ready — collection '{_COLLECTION}' @ {_EMBED_DIMS} dims")

# ── Context vars ──────────────────────────────────────────────────────────────
_current_user_id:    ContextVar[str] = ContextVar('user_id',    default='default_user')
_current_session_id: ContextVar[str] = ContextVar('session_id', default='default_session')

_RAG_EXTS = {'.pdf', '.docx', '.pptx', '.txt', '.csv', '.tsv', '.xlsx', '.xls', '.html'}
_IMG_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'}

# ── Helpers ───────────────────────────────────────────────────────────────────
def _parse(params):
    if isinstance(params, (dict, list)):
        return params
    if params is None:
        return {}
    try:
        return json.loads(params)
    except (json.JSONDecodeError, TypeError):
        try:
            import ast
            return ast.literal_eval(params)
        except Exception:
            return params

def _get(params, key, default=None):
    parsed = _parse(params)
    if isinstance(parsed, dict):
        return parsed.get(key, default)
    return default

def _build_messages(raw_messages: list) -> list[Message]:
    result = []
    for m in raw_messages:
        role        = m.get("role", "user")
        raw_content = m.get("content", "")
        if isinstance(raw_content, list):
            items = []
            for c in raw_content:
                if not isinstance(c, dict):
                    continue
                if c.get("text"):
                    items.append(ContentItem(text=c["text"]))
                elif c.get("image"):
                    items.append(ContentItem(image=c["image"]))
                elif c.get("file"):
                    items.append(ContentItem(file=c["file"]))
                elif c.get("type") == "text":
                    items.append(ContentItem(text=c.get("text", "")))
                elif c.get("type") == "image_url":
                    img_url = c.get("image_url", {})
                    url = img_url.get("url", "") if isinstance(img_url, dict) else str(img_url)
                    items.append(ContentItem(image=url))
            result.append(Message(role=role, content=items if items else ""))
            continue
        text_part  = str(raw_content) if raw_content else ""
        file_items: list[ContentItem] = []
        if "\nAttached files: " in text_part:
            idx       = text_part.index("\nAttached files: ")
            paths_str = text_part[idx + len("\nAttached files: "):]
            text_part = text_part[:idx].strip()
            for path in [p.strip() for p in paths_str.split(",") if p.strip()]:
                ext = os.path.splitext(path)[1].lower()
                if ext in _IMG_EXTS:
                    file_items.append(ContentItem(image=path))
                else:
                    file_items.append(ContentItem(file=path))
        if file_items:
            items = ([ContentItem(text=text_part)] if text_part else []) + file_items
            result.append(Message(role=role, content=items))
        else:
            result.append(Message(role=role, content=text_part))
    return result

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(title="Airi Agent API", version="3.0.0")
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
                   allow_headers=["*"], expose_headers=["*"])

# ── LLM config builder ────────────────────────────────────────────────────────
def _build_llm_cfg(s: dict) -> dict:
    cfg = {
        "model": s["model"],
        "model_server": s["model_server"],
        "api_key": s.get("api_key", "none"),
        "generate_cfg": {
            "temperature": 0.5,
            "top_p": 0.9,
            "top_k": 20,
            "presence_penalty": 0.5,
            "max_tokens": 2048,
            "repetition_penalty": 1.1,
            "extra_body": {"enable_thinking": s.get("thinking_enabled", True)},
        }
    }
    return cfg

# ═══════════════════════════════════════════════════════════════════════════════
# TOOLS
# ═══════════════════════════════════════════════════════════════════════════════

# ── Windows Automation Tools ──────────────────────────────────────────────────

@register_tool('windows_launch')
class WindowsLaunch(BaseTool):
    description = 'Launch a Windows app by name (chrome, excel, word, explorer, whatsapp, cmd, settings, notepad, etc.). Returns status and window title.'
    parameters = [
        {'name': 'app',  'type': 'string', 'required': True,
         'description': 'App name e.g. "chrome", "excel", "cmd", "explorer"'},
        {'name': 'args', 'type': 'string', 'required': False,
         'description': 'Optional command-line arguments e.g. "https://youtube.com" or "shell:Desktop"'},
    ]
    def call(self, params: str, **kwargs) -> str:
        p    = _parse(params)
        app  = p.get('app', '') if isinstance(p, dict) else str(p)
        args = p.get('args', '') if isinstance(p, dict) else ''
        logger.info(f"[windows_launch] {app} args={args}")
        try:
            result = _flaui_engine.launch_app(app, args)
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"status": "error", "window_title": "", "detail": str(e)})


@register_tool('windows_inspect')
class WindowsInspect(BaseTool):
    description = 'Get the UI element tree of a running app. Use to discover element names/IDs before windows_do. Returns list of elements with name, automation_id, control_type, value.'
    parameters = [
        {'name': 'app',          'type': 'string',  'required': True,
         'description': 'App name e.g. "chrome", "excel"'},
        {'name': 'depth',        'type': 'integer', 'required': False,
         'description': 'Tree depth (default 4)'},
        {'name': 'filter_types', 'type': 'string',  'required': False,
         'description': 'Comma-separated control types to include e.g. "Button,Edit,ComboBox"'},
    ]
    def call(self, params: str, **kwargs) -> str:
        p            = _parse(params)
        app          = p.get('app', '') if isinstance(p, dict) else str(p)
        depth        = int(p.get('depth', 4)) if isinstance(p, dict) else 4
        filter_types = p.get('filter_types', '') if isinstance(p, dict) else ''
        logger.info(f"[windows_inspect] {app} depth={depth}")
        try:
            result = _flaui_engine.inspect_window(app, depth, filter_types)
            return json.dumps(result)
        except Exception as e:
            return json.dumps([{"error": str(e)}])


@register_tool('windows_do')
class WindowsDo(BaseTool):
    description = (
        'Execute a batch of UI actions on a running Windows app. '
        'Pass actions as a JSON array. Each action has: action, target (optional), and action-specific fields. '
        'Actions: click, double_click, right_click, type, key, scroll, focus, read, read_screen, wait, screenshot, close_app. '
        'read_screen returns all visible text — use instead of screenshot to read content. '
        'close_app must be explicit to close the window.'
    )
    parameters = [
        {'name': 'app',     'type': 'string', 'required': True,
         'description': 'Target app name e.g. "chrome", "excel"'},
        {'name': 'actions', 'type': 'string', 'required': True,
         'description': (
             'JSON array of actions. Examples: '
             '[{"action":"click","target":{"name":"Search"}}] '
             '[{"action":"type","target":{"automation_id":"addressEditBox"},"text":"youtube.com"}] '
             '[{"action":"key","keys":"ctrl+t"}] '
             '[{"action":"read_screen"}] '
             '[{"action":"close_app"}]'
         )},
    ]
    def call(self, params: str, **kwargs) -> str:
        p       = _parse(params)
        app     = p.get('app', '') if isinstance(p, dict) else str(p)
        actions = p.get('actions', []) if isinstance(p, dict) else []
        if isinstance(actions, str):
            try:
                actions = json.loads(actions)
            except Exception:
                return json.dumps([{"action": "?", "status": "error", "detail": "Invalid actions JSON", "target": None, "value": None}])
        logger.info(f"[windows_do] {app} — {len(actions)} actions")
        try:
            result = _flaui_engine.execute_batch(app, actions)
            return json.dumps(result)
        except Exception as e:
            return json.dumps([{"action": "?", "status": "error", "detail": str(e), "target": None, "value": None}])


# ── File Operations Tool ──────────────────────────────────────────────────────

def _resolve_path(path_str: str) -> str:
    """Resolve special aliases to real Windows paths."""
    aliases = {
        "desktop":   os.path.join(os.path.expanduser("~"), "Desktop"),
        "downloads": os.path.join(os.path.expanduser("~"), "Downloads"),
        "documents": os.path.join(os.path.expanduser("~"), "Documents"),
        "pictures":  os.path.join(os.path.expanduser("~"), "Pictures"),
        "music":     os.path.join(os.path.expanduser("~"), "Music"),
        "videos":    os.path.join(os.path.expanduser("~"), "Videos"),
        "home":      os.path.expanduser("~"),
    }
    key = path_str.strip().lower()
    return aliases.get(key, path_str)


@register_tool('file_op')
class FileOp(BaseTool):
    description = (
        'Perform file system operations. '
        'ops: list (show files), open (open with default app), copy, move, delete, create_folder, search. '
        'Path aliases: desktop, downloads, documents, pictures, home.'
    )
    parameters = [
        {'name': 'op',      'type': 'string', 'required': True,
         'description': 'Operation: list | open | copy | move | delete | create_folder | search'},
        {'name': 'path',    'type': 'string', 'required': True,
         'description': 'Path or alias (desktop, downloads, documents, pictures, home)'},
        {'name': 'dest',    'type': 'string', 'required': False,
         'description': 'Destination path for copy/move'},
        {'name': 'pattern', 'type': 'string', 'required': False,
         'description': 'Glob pattern or name fragment for search e.g. "*.pdf"'},
    ]
    def call(self, params: str, **kwargs) -> str:
        p       = _parse(params)
        op      = (p.get('op', '') if isinstance(p, dict) else str(p)).lower()
        path    = _resolve_path(p.get('path', '') if isinstance(p, dict) else '')
        dest    = _resolve_path(p.get('dest', '') if isinstance(p, dict) else '')
        pattern = p.get('pattern', '*') if isinstance(p, dict) else '*'
        logger.info(f"[file_op] {op} path={path}")
        try:
            if op == 'list':
                return self._list(path)
            elif op == 'open':
                os.startfile(path)
                return json.dumps({"status": "ok", "detail": f"Opened {path}"})
            elif op == 'copy':
                import shutil as _sh
                if os.path.isdir(path):
                    _sh.copytree(path, dest)
                else:
                    _sh.copy2(path, dest)
                return json.dumps({"status": "ok", "detail": f"Copied to {dest}"})
            elif op == 'move':
                import shutil as _sh
                _sh.move(path, dest)
                return json.dumps({"status": "ok", "detail": f"Moved to {dest}"})
            elif op == 'delete':
                import shutil as _sh
                if os.path.isdir(path):
                    _sh.rmtree(path)
                else:
                    os.remove(path)
                return json.dumps({"status": "ok", "detail": f"Deleted {path}"})
            elif op == 'create_folder':
                os.makedirs(path, exist_ok=True)
                return json.dumps({"status": "ok", "detail": f"Created {path}"})
            elif op == 'search':
                return self._search(path, pattern)
            else:
                return json.dumps({"error": f"Unknown op: {op}"})
        except Exception as e:
            return json.dumps({"error": str(e)})

    def _list(self, path: str) -> str:
        if not os.path.exists(path):
            return json.dumps({"error": f"Path not found: {path}"})
        items = []
        for entry in sorted(os.scandir(path), key=lambda e: (not e.is_dir(), e.name.lower())):
            stat = entry.stat()
            items.append({
                "name":     entry.name,
                "type":     "folder" if entry.is_dir() else "file",
                "ext":      os.path.splitext(entry.name)[1].lstrip(".").lower() if entry.is_file() else "",
                "size":     stat.st_size,
                "modified": stat.st_mtime,
            })
        return json.dumps({"path": path, "count": len(items), "items": items})

    def _search(self, path: str, pattern: str) -> str:
        import fnmatch
        matches = []
        try:
            for root, dirs, files in os.walk(path):
                for fname in files:
                    if fnmatch.fnmatch(fname.lower(), pattern.lower()) or pattern.lower() in fname.lower():
                        full = os.path.join(root, fname)
                        matches.append({"name": fname, "path": full})
                        if len(matches) >= 100:
                            break
                if len(matches) >= 100:
                    break
        except Exception as e:
            return json.dumps({"error": str(e)})
        return json.dumps({"pattern": pattern, "count": len(matches), "results": matches})


# ── Installed Apps Tool ───────────────────────────────────────────────────────

@register_tool('list_installed_apps')
class ListInstalledApps(BaseTool):
    description = 'List all installed Windows applications. Use to find the right app name before windows_launch.'
    parameters = [
        {'name': 'filter', 'type': 'string', 'required': False,
         'description': 'Optional name filter e.g. "chrome" to narrow results'},
    ]
    def call(self, params: str, **kwargs) -> str:
        p      = _parse(params)
        filt   = (p.get('filter', '') if isinstance(p, dict) else '').lower()
        logger.info(f"[list_installed_apps] filter={filt}")
        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-Command",
                 "Get-StartApps | Select-Object Name,AppID | ConvertTo-Json"],
                capture_output=True, text=True, timeout=15
            )
            apps = json.loads(result.stdout or "[]")
            if isinstance(apps, dict):
                apps = [apps]
            if filt:
                apps = [a for a in apps if filt in (a.get("Name") or "").lower()]
            return json.dumps(apps[:100])
        except Exception as e:
            # Fallback: scan Start Menu
            try:
                return self._scan_start_menu(filt)
            except Exception as e2:
                return json.dumps({"error": f"PowerShell: {e}, Start Menu: {e2}"})

    def _scan_start_menu(self, filt: str) -> str:
        import glob
        dirs = [
            os.path.join(os.environ.get("APPDATA", ""), r"Microsoft\Windows\Start Menu\Programs"),
            r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs",
        ]
        apps = []
        for d in dirs:
            for lnk in glob.glob(os.path.join(d, "**", "*.lnk"), recursive=True):
                name = os.path.splitext(os.path.basename(lnk))[0]
                if not filt or filt in name.lower():
                    apps.append({"Name": name, "AppID": lnk})
        return json.dumps(apps[:100])


# ── Memory Tools ──────────────────────────────────────────────────────────────

@register_tool('add_memory')
class AddMemory(BaseTool):
    description = "Save a fact or preference about the user to long-term memory."
    parameters = [{'name': 'content', 'type': 'string', 'required': True,
                   'description': "The fact to remember e.g. 'User prefers dark mode'"}]
    def call(self, params: str, **kwargs) -> str:
        p       = _parse(params)
        content = p.get('content', '') if isinstance(p, dict) else str(p)
        user_id = _current_user_id.get()
        if not content:
            return json.dumps({"error": "content is required"})
        try:
            result = mem_client.add([{"role": "user", "content": content}], user_id=user_id, infer=False)
            ids = [r.get("id") for r in result.get("results", [])]
            return json.dumps({"saved": True, "ids": ids})
        except Exception as e:
            return json.dumps({"error": str(e)})


@register_tool('search_memories')
class SearchMemories(BaseTool):
    description = "Search user's long-term memories for relevant facts."
    parameters = [
        {'name': 'query', 'type': 'string', 'required': True},
        {'name': 'limit', 'type': 'integer'},
    ]
    def call(self, params: str, **kwargs) -> str:
        p       = _parse(params)
        query   = p.get('query', '') if isinstance(p, dict) else str(p)
        limit   = int(p.get('limit', 8)) if isinstance(p, dict) else 8
        user_id = _current_user_id.get()
        try:
            raw      = mem_client.search(query, user_id=user_id, limit=limit, threshold=0.15)
            items    = raw.get("results", []) if isinstance(raw, dict) else []
            memories = [{"id": r["id"], "memory": r["memory"]} for r in items if r.get("memory")]
            return json.dumps(memories)
        except Exception as e:
            return json.dumps({"error": str(e)})


@register_tool('get_memories')
class GetMemories(BaseTool):
    description = "Get all stored memories for the current user."
    parameters = [{'name': 'limit', 'type': 'integer'}]
    def call(self, params: str, **kwargs) -> str:
        p       = _parse(params)
        limit   = int(p.get('limit', 50)) if isinstance(p, dict) else 50
        user_id = _current_user_id.get()
        try:
            raw      = mem_client.get_all(user_id=user_id, limit=limit)
            items    = raw.get("results", []) if isinstance(raw, dict) else raw
            memories = [{"id": r["id"], "memory": r["memory"]} for r in items if r.get("memory")]
            return json.dumps(memories)
        except Exception as e:
            return json.dumps({"error": str(e)})


@register_tool('get_memory')
class GetMemory(BaseTool):
    description = "Get a single memory by its ID."
    parameters = [{'name': 'memory_id', 'type': 'string', 'required': True}]
    def call(self, params: str, **kwargs) -> str:
        p         = _parse(params)
        memory_id = p.get('memory_id', '') if isinstance(p, dict) else str(p)
        try:
            result = mem_client.get(memory_id)
            return json.dumps(result) if result else json.dumps({"error": "Not found"})
        except Exception as e:
            return json.dumps({"error": str(e)})


@register_tool('update_memory')
class UpdateMemory(BaseTool):
    description = "Update an existing memory by ID."
    parameters = [
        {'name': 'memory_id', 'type': 'string', 'required': True},
        {'name': 'content',   'type': 'string', 'required': True},
    ]
    def call(self, params: str, **kwargs) -> str:
        p         = _parse(params)
        memory_id = p.get('memory_id', '') if isinstance(p, dict) else ''
        content   = p.get('content',   '') if isinstance(p, dict) else ''
        try:
            mem_client.update(memory_id, content)
            return json.dumps({"updated": True, "memory_id": memory_id})
        except Exception as e:
            return json.dumps({"error": str(e)})


@register_tool('delete_memory')
class DeleteMemory(BaseTool):
    description = "Delete a specific memory by ID."
    parameters = [{'name': 'memory_id', 'type': 'string', 'required': True}]
    def call(self, params: str, **kwargs) -> str:
        p         = _parse(params)
        memory_id = p.get('memory_id', '') if isinstance(p, dict) else str(p)
        try:
            mem_client.delete(memory_id)
            return json.dumps({"deleted": True, "memory_id": memory_id})
        except Exception as e:
            return json.dumps({"error": str(e)})


@register_tool('delete_all_memories')
class DeleteAllMemories(BaseTool):
    description = "Delete ALL memories for the current user. Use only when user explicitly asks."
    parameters = []
    def call(self, params: str, **kwargs) -> str:
        user_id = _current_user_id.get()
        try:
            mem_client.delete_all(user_id=user_id)
            return json.dumps({"deleted": True, "user_id": user_id})
        except Exception as e:
            return json.dumps({"error": str(e)})

# ── System Prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Airi, a friendly and efficient Windows desktop AI assistant.

## Skills
You have three skill files loaded. Follow them precisely for the relevant task type:
- WindowsAutomator: automate any Windows app via windows_launch / windows_inspect / windows_do
- ChromeNavigator: navigate Chrome (go to URLs, search, click links, read pages)
- FileManager: manage files and folders via file_op + windows_launch

## Tools
| Tool | Purpose |
|------|---------|
| windows_launch(app, args) | Open any app by name |
| windows_inspect(app) | Discover UI elements (use before windows_do when unsure) |
| windows_do(app, actions) | Execute JSON action batch — primary interaction tool |
| file_op(op, path) | List/open/copy/move/delete/search files. Aliases: desktop, downloads, documents |
| list_installed_apps(filter) | List installed apps to find the right name |
| web_search(query) | Search the web |
| add_memory / search_memories / get_memories | Long-term memory |

## Rules
1. Use windows_do with a JSON actions array — batch multiple steps in one call.
2. Use read_screen action (not screenshot) to read window content — it's fast and text-only.
3. Never close an app unless the user asks — always use explicit close_app action.
4. For file tasks: call file_op to list/operate AND windows_launch explorer to show the folder.
5. Save user preferences with add_memory. Check search_memories at conversation start.
6. Keep tool calls minimal — batch actions together in windows_do whenever possible.
"""

# ── Agent factory ─────────────────────────────────────────────────────────────
_TOOL_LIST = [
    'windows_launch', 'windows_inspect', 'windows_do',
    'file_op', 'list_installed_apps',
    'web_search',
    'add_memory', 'search_memories', 'get_memories', 'get_memory',
    'update_memory', 'delete_memory', 'delete_all_memories',
]

def _make_agent(s: dict) -> Assistant:
    return Assistant(
        llm=_build_llm_cfg(s),
        system_message=SYSTEM_PROMPT,
        function_list=_TOOL_LIST,
    )

airi = _make_agent(_settings)

# ── Settings endpoints ────────────────────────────────────────────────────────
from pydantic import BaseModel

class SettingsBody(BaseModel):
    model_server:     str  = None
    model:            str  = None
    api_key:          str  = None
    thinking_enabled: bool = None

@app.get("/settings")
async def get_settings():
    return {
        "model_server":     _settings["model_server"],
        "model":            _settings["model"],
        "thinking_enabled": _settings.get("thinking_enabled", True),
    }

@app.post("/settings")
async def update_settings(body: SettingsBody):
    global _settings, airi
    if body.model_server     is not None: _settings["model_server"]     = body.model_server
    if body.model            is not None: _settings["model"]            = body.model
    if body.api_key          is not None: _settings["api_key"]          = body.api_key
    if body.thinking_enabled is not None: _settings["thinking_enabled"] = body.thinking_enabled
    _save_settings(_settings)
    airi = _make_agent(_settings)
    logger.info(f"[settings] Hot-reloaded: server={_settings['model_server']} model={_settings['model']}")
    return {"status": "ok", "model_server": _settings["model_server"], "model": _settings["model"]}


# ── Chat completions ──────────────────────────────────────────────────────────
@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    data         = await request.json()
    raw_messages = data.get("messages", [])
    user_id      = data.get("user_id",    "default_user")
    session_id   = data.get("session_id", "default_session")

    _current_user_id.set(user_id)
    _current_session_id.set(session_id)
    messages = _build_messages(raw_messages)

    def stream_gen():
        import re as _re
        _current_user_id.set(user_id)
        _current_session_id.set(session_id)

        prev_content  = ""
        chunk_id      = f"chatcmpl-{int(time.time())}"
        seen_tool_ids = set()

        def _tool_event(tool_name: str, detail: str = "") -> str:
            payload = json.dumps({"tool": tool_name, "detail": detail}, ensure_ascii=False)
            return f"event: tool_call\ndata: {payload}\n\n"

        try:
            for response in airi.run(messages):
                if not response:
                    continue
                for m in response:
                    role = m.get("role", "")
                    if role == "assistant":
                        content = m.get("content") or ""
                        if isinstance(content, list):
                            for item in content:
                                if not isinstance(item, dict):
                                    continue
                                fn      = item.get("function") or item.get("name") or ""
                                call_id = item.get("id") or item.get("call_id") or fn
                                if fn and call_id not in seen_tool_ids:
                                    seen_tool_ids.add(call_id)
                                    yield _tool_event(fn)
                    elif role == "tool":
                        tool_name = m.get("name") or m.get("tool_call_id") or "tool"
                        call_id   = m.get("tool_call_id") or tool_name
                        result_id = f"result_{call_id}"
                        if result_id not in seen_tool_ids:
                            seen_tool_ids.add(result_id)
                            yield _tool_event(tool_name, "done")

                assistant_msgs = [m for m in response if m.get("role") == "assistant"]
                if not assistant_msgs:
                    continue
                last = assistant_msgs[-1]
                raw  = last.get("content") or ""
                if isinstance(raw, list):
                    full_content = " ".join(c.get("text", "") for c in raw if isinstance(c, dict) and c.get("text"))
                else:
                    full_content = str(raw)

                if "<think>" in full_content:
                    full_content = _re.sub(r"<think>.*?</think>", "", full_content, flags=_re.DOTALL).strip()

                delta = full_content[len(prev_content):]
                prev_content = full_content
                if not delta:
                    continue

                chunk = {
                    "id": chunk_id, "object": "chat.completion.chunk",
                    "created": int(time.time()), "model": modelName,
                    "choices": [{"index": 0, "delta": {"content": delta}, "finish_reason": None}],
                }
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

            yield f"data: {json.dumps({'id': chunk_id, 'object': 'chat.completion.chunk', 'created': int(time.time()), 'model': modelName, 'choices': [{'index': 0, 'delta': {}, 'finish_reason': 'stop'}]})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"[chat_completions] stream error: {e}")
            err = {"id": chunk_id, "object": "chat.completion.chunk", "created": int(time.time()),
                   "model": modelName,
                   "choices": [{"index": 0, "delta": {"content": f"\n\n⚠️ Error: {e}"}, "finish_reason": "error"}]}
            yield f"data: {json.dumps(err)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(stream_gen(), media_type="text/event-stream")


# ── File upload ───────────────────────────────────────────────────────────────
USER_STUFF_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "user_stuff")
os.makedirs(USER_STUFF_DIR, exist_ok=True)

@app.post("/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    saved = []
    for f in files:
        dest = os.path.join(USER_STUFF_DIR, f.filename)
        base, ext = os.path.splitext(f.filename)
        counter = 1
        while os.path.exists(dest):
            dest = os.path.join(USER_STUFF_DIR, f"{base}_{counter}{ext}")
            counter += 1
        with open(dest, "wb") as out:
            shutil.copyfileobj(f.file, out)
        saved.append(dest)
    return {"paths": saved, "count": len(saved)}


# ── Whisper transcription ─────────────────────────────────────────────────────
_whisper_model = None

def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        from huggingface_hub import try_to_load_from_cache
        cached = try_to_load_from_cache("Systran/faster-whisper-tiny", "model.bin")
        is_cached = cached is not None
        if is_cached:
            os.environ["HF_HUB_OFFLINE"] = "1"
            _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8", local_files_only=True)
        else:
            _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _whisper_model

def _prewarm_whisper():
    import threading
    def _load():
        try:
            _get_whisper()
        except Exception as e:
            logger.warning(f"[whisper] Pre-warm failed: {e}")
    threading.Thread(target=_load, daemon=True).start()

_prewarm_whisper()

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    import tempfile
    try:
        suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        model = _get_whisper()
        segments, _ = model.transcribe(tmp_path, language="en", beam_size=1, vad_filter=True)
        text = " ".join(seg.text.strip() for seg in segments).strip()
        os.unlink(tmp_path)
        return {"text": text}
    except Exception as e:
        return {"text": "", "error": str(e)}


from fastapi import WebSocket, WebSocketDisconnect
import wave, io, threading, queue

@app.websocket("/ws/transcribe")
async def ws_transcribe(websocket: WebSocket):
    await websocket.accept()
    model = _get_whisper()
    audio_queue: queue.Queue = queue.Queue()
    result_queue: queue.Queue = queue.Queue()
    running = True
    SAMPLE_RATE, CHANNELS, SAMPLE_WIDTH = 16000, 1, 2
    CHUNK_SAMPLES = int(SAMPLE_RATE * 1.2)

    def transcribe_worker():
        buf = b""
        while running:
            try:
                chunk = audio_queue.get(timeout=0.3)
                if chunk is None:
                    break
                buf += chunk
                if len(buf) >= CHUNK_SAMPLES * SAMPLE_WIDTH:
                    pcm, buf = buf, b""
                    try:
                        wav_io = io.BytesIO()
                        with wave.open(wav_io, "wb") as wf:
                            wf.setnchannels(CHANNELS); wf.setsampwidth(SAMPLE_WIDTH); wf.setframerate(SAMPLE_RATE)
                            wf.writeframes(pcm)
                        wav_io.seek(0)
                        segs, _ = model.transcribe(wav_io, language="en", beam_size=1, vad_filter=True,
                                                    vad_parameters={"min_silence_duration_ms": 300})
                        text = " ".join(s.text.strip() for s in segs).strip()
                        if text:
                            result_queue.put({"type": "interim", "text": text})
                    except Exception:
                        pass
            except queue.Empty:
                if len(buf) > SAMPLE_RATE * SAMPLE_WIDTH * 0.3:
                    pcm, buf = buf, b""
                    try:
                        wav_io = io.BytesIO()
                        with wave.open(wav_io, "wb") as wf:
                            wf.setnchannels(CHANNELS); wf.setsampwidth(SAMPLE_WIDTH); wf.setframerate(SAMPLE_RATE)
                            wf.writeframes(pcm)
                        wav_io.seek(0)
                        segs, _ = model.transcribe(wav_io, language="en", beam_size=1, vad_filter=True,
                                                    vad_parameters={"min_silence_duration_ms": 300})
                        text = " ".join(s.text.strip() for s in segs).strip()
                        if text:
                            result_queue.put({"type": "final", "text": text})
                    except Exception:
                        pass

    worker = threading.Thread(target=transcribe_worker, daemon=True)
    worker.start()

    async def send_results():
        while True:
            await asyncio.sleep(0.05)
            while not result_queue.empty():
                msg = result_queue.get_nowait()
                try:
                    await websocket.send_json(msg)
                except Exception:
                    return

    send_task = asyncio.create_task(send_results())
    try:
        while True:
            msg = await websocket.receive()
            if msg["type"] == "websocket.disconnect":
                break
            if "bytes" in msg and msg["bytes"]:
                audio_queue.put(msg["bytes"])
            elif "text" in msg and msg["text"] == "stop":
                break
    except WebSocketDisconnect:
        pass
    finally:
        running = False
        audio_queue.put(None)
        send_task.cancel()
        worker.join(timeout=2)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": modelName,
        "agent": "Airi",
        "version": "3.0.0",
        "model_server": _settings["model_server"],
        "thinking_enabled": _settings.get("thinking_enabled", True),
        "timestamp": time.time(),
    }


# ── Library endpoints ─────────────────────────────────────────────────────────
_IMG_EXTS_SET = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'}
_DOC_EXTS_SET = {'.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx', '.xls', '.json', '.pptx', '.html', '.md'}

@app.get("/library")
async def list_library():
    docs, media = [], []
    if not os.path.exists(USER_STUFF_DIR):
        return {"documents": [], "media": []}
    for fname in sorted(os.listdir(USER_STUFF_DIR)):
        fpath = os.path.join(USER_STUFF_DIR, fname)
        if not os.path.isfile(fpath):
            continue
        ext  = os.path.splitext(fname)[1].lower()
        stat = os.stat(fpath)
        info = {"name": fname, "size": stat.st_size, "modified": stat.st_mtime, "ext": ext.lstrip(".")}
        (media if ext in _IMG_EXTS_SET else docs).append(info)
    return {"documents": docs, "media": media}

@app.delete("/library/{filename}")
async def delete_library_file(filename: str):
    safe_name = os.path.basename(filename)
    fpath = os.path.join(USER_STUFF_DIR, safe_name)
    if not os.path.exists(fpath):
        return {"success": False, "error": "File not found"}
    try:
        os.remove(fpath)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

from fastapi.responses import FileResponse

@app.get("/library/file/{filename}")
async def serve_library_file(filename: str):
    safe_name = os.path.basename(filename)
    fpath = os.path.join(USER_STUFF_DIR, safe_name)
    if not os.path.exists(fpath):
        return {"error": "File not found"}
    return FileResponse(fpath)


# ── Memory REST endpoints ─────────────────────────────────────────────────────
@app.get("/memories")
async def get_memories_endpoint(user_id: str = "default_user"):
    try:
        raw = mem_client.get_all(user_id=user_id, limit=200)
        results = raw.get("results", []) if isinstance(raw, dict) else raw
        return {"memories": results}
    except Exception as e:
        return {"memories": [], "error": str(e)}

@app.delete("/memories/{memory_id}")
async def delete_memory_endpoint(memory_id: str):
    try:
        mem_client.delete(memory_id)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

class MemoryUpdateBody(BaseModel):
    data: str

@app.put("/memories/{memory_id}")
async def update_memory_endpoint(memory_id: str, body: MemoryUpdateBody):
    try:
        mem_client.update(memory_id, body.data)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("""
╔═══════════════════════════════════════════════════════════╗
║                    🌸 Airi Agent v3.0                     ║
║          Friendly Windows Desktop AI Assistant            ║
║                                                           ║
║  Model  : Qwen3-VL-2B-Instruct-GGUF                       ║
║  Thinking: Enabled                                        ║
║  Endpoint: http://127.0.0.1:11435                         ║
╚═══════════════════════════════════════════════════════════╝
""")
    uvicorn.run(app, host="127.0.0.1", port=11435, log_level="info", access_log=True)
