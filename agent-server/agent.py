import os
import json
import time
import subprocess
import pyautogui
import pyperclip
import urllib.parse
from playwright.sync_api import sync_playwright

# Qwen Agent Framework
from qwen_agent.agents import Assistant
from qwen_agent.llm import get_chat_model
from qwen_agent.tools.base import BaseTool, register_tool
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

import win

modelName = "ibm-granite/granite-4.0-1b"

def _parse(params):
    """Safely parse params: dict, JSON string, Python repr, or raw primitive."""
    if isinstance(params, (dict, list)):
        return params
    try:
        result = json.loads(params)
        return result
    except (json.JSONDecodeError, TypeError):
        try:
            import ast
            return ast.literal_eval(params)
        except Exception:
            return params  # raw string/value fallback

def _get(params, key):
    """Get a named param, handling the case where Qwen passes the value directly."""
    parsed = _parse(params)
    if isinstance(parsed, dict):
        return parsed.get(key)
    # Qwen passed the value directly (e.g. "dir" instead of {"command": "dir"})
    return parsed

app = FastAPI()

# --- 1. LLM CONFIGURATION (Optimized for Qwen3-VL-2B) ---
llm_cfg = {
    "model": "default",
    "model_server": "http://127.0.0.1:11434/v1",
    "generate_cfg": {
        "temperature": 0.3,      
        "top_p": 0.85,
        "top_k": 15,             
        "presence_penalty": 1.2,
        "max_tokens": 1536,      
        "stop": ["<|im_end|>", "```"]  
    }
}

# --- 2. CONTROL TOOLS (Optimized Descriptions) ---

@register_tool('run_cmd')
class RunCmd(BaseTool):
    description = "Execute shell command. Returns JSON: {stdout, stderr}. Use for file ops, system info."
    parameters = [{
        'name': 'command', 
        'type': 'string', 
        'required': True,
        'description': 'Shell command to execute (e.g., "dir", "echo hello")'
    }]

    def call(self, params: str, **kwargs) -> str:
        cmd = _get(params, 'command')
        try:
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            return json.dumps({"stdout": res.stdout, "stderr": res.stderr})
        except Exception as e:
            return json.dumps({"error": str(e)})

@register_tool('take_screenshot')
class TakeScreenshot(BaseTool):
    description = "Capture full screen screenshot. Saves PNG to ./screenshots/. Returns file path."
    parameters = []  # No params needed

    def call(self, params: str, **kwargs) -> str:
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            save_dir = os.path.join(script_dir, "screenshots")
            os.makedirs(save_dir, exist_ok=True)
            from datetime import datetime
            filename = f"screen_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            path = os.path.join(save_dir, filename)
            pyautogui.screenshot().save(path)
            return json.dumps({"path": path, "status": "success"})
        except Exception as e:
            return json.dumps({"error": str(e), "status": "failed"})

@register_tool('mouse_control')
class MouseControl(BaseTool):
    description = "Control mouse: move/click at (x,y). Actions: move, click, double_click. Buttons: left, right, middle."
    parameters = [
        {'name': 'x', 'type': 'integer', 'required': True, 'description': 'X coordinate (0-1920)'},
        {'name': 'y', 'type': 'integer', 'required': True, 'description': 'Y coordinate (0-1080)'},
        {'name': 'action', 'type': 'string', 'required': True, 'enum': ['move', 'click', 'double_click']},
        {'name': 'button', 'type': 'string', 'default': 'left', 'enum': ['left', 'right', 'middle']}
    ]

    def call(self, params: str, **kwargs) -> str:
        p = _parse(params)
        pyautogui.moveTo(p['x'], p['y'], duration=0.3)  # Smooth movement
        if p['action'] == 'click':
            pyautogui.click(button=p.get('button', 'left'))
        elif p['action'] == 'double_click':
            pyautogui.doubleClick(button=p.get('button', 'left'))
        return json.dumps({"action": p['action'], "position": [p['x'], p['y']], "status": "done"})

@register_tool('type_text')
class TypeText(BaseTool):
    description = "Type text into focused app. Uses clipboard paste for reliability with special chars."
    parameters = [{'name': 'text', 'type': 'string', 'required': True, 'description': 'Text to type'}]

    def call(self, params: str, **kwargs) -> str:
        try:
            txt = _get(params, 'text')
            pyperclip.copy(txt)
            pyautogui.hotkey('ctrl', 'v', interval=0.1)
            return json.dumps({"text": txt[:50] + "..." if len(txt) > 50 else txt, "status": "typed"})
        except Exception as e:
            return json.dumps({"error": str(e)})

@register_tool('clipboard_manager')
class ClipboardManager(BaseTool):
    description = "Read/write system clipboard. Mode: 'read' (returns text) or 'write' (needs text param)."
    parameters = [
        {'name': 'mode', 'type': 'string', 'required': True, 'enum': ['read', 'write']},
        {'name': 'text', 'type': 'string', 'description': 'Text to copy (only for write mode)'}
    ]

    def call(self, params: str, **kwargs) -> str:
        p = _parse(params)
        if p['mode'] == 'write':
            pyperclip.copy(p.get('text', ''))
            return json.dumps({"mode": "write", "status": "copied"})
        return json.dumps({"mode": "read", "content": pyperclip.paste()})

# --- 3. BROWSER TOOLS (VL-Optimized) ---

@register_tool('browser_search')
class BrowserSearch(BaseTool):
    description = "Search web & scrape top 3 results. Use DuckDuckGo HTML for reliability. Returns: query + [{title, snippet}]."
    parameters = [{
        'name': 'queries', 
        'type': 'array', 
        'items': {'type': 'string'}, 
        'required': True,
        'description': 'List of search queries (max 3)'
    }]

    def call(self, params: str, **kwargs) -> str:
        parsed = _parse(params)
        queries = parsed if isinstance(parsed, list) else parsed.get('queries', [])
        queries = queries[:3]  # Limit for 2B model context
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)  # Headless for speed
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
                viewport={'width': 1280, 'height': 720}
            )
            
            results = []
            for q in queries:
                page = context.new_page()
                encoded_q = urllib.parse.quote(q)
                search_url = f"https://html.duckduckgo.com/html?q={encoded_q}"
                
                try:
                    page.goto(search_url, wait_until="domcontentloaded", timeout=12000)
                    content = page.evaluate("""() => {
                        const items = document.querySelectorAll('.result__body');
                        return Array.from(items).slice(0, 3).map(item => ({
                            title: item.querySelector('.result__title')?.textContent?.trim() || '',
                            snippet: item.querySelector('.result__snippet')?.textContent?.trim() || ''
                        }));
                    }""")
                    results.append({"query": q, "results": content})
                except Exception as e:
                    results.append({"query": q, "error": str(e)})
                page.close()
            browser.close()
            return json.dumps(results, ensure_ascii=False)

# --- 4. WINDOWS APP CONTROL (Step-by-Step Workflow) ---
ACTIVE_SESSIONS = {}

@register_tool('search_win_app_by_name')
class SearchWinAppByName(BaseTool):
    description = "Step 1: Get the AppId for any app by its name (e.g. 'calc' or 'chrome'). Use this before starting a session."
    parameters = [{
        'name': 'name', 
        'type': 'string', 
        'required': True, 
        'description': 'The name of the app to search for.'
    }]

    def call(self, params: str, **kwargs) -> str:
        # 1. Parse the single 'name' parameter
        p = _parse(params)
        name = p.get('name', '')
        
        # 2. Logic: Ensure the database exists (use absolute path)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(script_dir, "context", "installed_apps.json")
        if not os.path.exists(db_path):
            win.get_all_windows_apps_installed_AppIds()

        # 3. Logic: Search for the app
        results = win.find_appId_by_name(name)

        # 4. Self-Healing: If not found, refresh the system list and search again
        if isinstance(results, str) and "No Apps found" in results:
            win.get_all_windows_apps_installed_AppIds() # Re-scan system
            results = win.find_appId_by_name(name)

        # 5. Return clean results for the 0.6B model
        if isinstance(results, list):
            # Return only the top 3 results to save context space
            return json.dumps(results[:3], ensure_ascii=False)
        
        return str(results)

@register_tool('start_app_session')
class StartAppSession(BaseTool):
    description = "Launch app using AppId from search_app_id. Returns session status. Store driver in ACTIVE_SESSIONS."
    parameters = [{'name': 'app_id', 'type': 'string', 'required': True, 'description': 'Full AppId like "Microsoft.WindowsNotepad_8wekyb3d8bbwe!App"'}]

    def call(self, params: str, **kwargs) -> str:
        app_id = _get(params, 'app_id')
        driver, message = win.open_win_app_and_start_session(app_id)
        if driver:
            ACTIVE_SESSIONS[app_id] = driver
            return json.dumps({"app_id": app_id, "status": "started", "message": message})
        return json.dumps({"app_id": app_id, "status": "failed", "message": message})

@register_tool('inspect_ui_elements')
class InspectUIElements(BaseTool):
    description = "Capture app UI tree. Run AFTER start_app_session. Saves elements to context/ for next steps."
    parameters = [{'name': 'app_id', 'type': 'string', 'required': True}]

    def call(self, params: str, **kwargs) -> str:
        app_id = _get(params, 'app_id')
        driver = ACTIVE_SESSIONS.get(app_id)
        if not driver:
            return json.dumps({"error": f"No session for {app_id}. Call start_app_session first."})
        result = win.get_all_elements_in_current_window(app_id, driver)
        return json.dumps({"app_id": app_id, "status": "inspected", "elements_saved": True})

@register_tool('list_element_names')
class ListElementNames(BaseTool):
    description = "Get clickable element names from inspected UI. Returns list of strings. Use to find button names."
    parameters = [{'name': 'app_id', 'type': 'string', 'required': True}]

    def call(self, params: str, **kwargs) -> str:
        app_id = _get(params, 'app_id')
        driver = ACTIVE_SESSIONS.get(app_id)
        if not driver:
            return json.dumps({"error": f"No session for {app_id}"})
        names = win.quickly_lookup_all_element_names_in_current_window(app_id, driver)
        return json.dumps({"app_id": app_id, "element_names": names})

@register_tool('get_element_details')
class GetElementDetails(BaseTool):
    description = "Get coords/ID for element by name. Returns: {name, id, x, y, width, height}. Use for clicking."
    parameters = [
        {'name': 'app_id', 'type': 'string', 'required': True},
        {'name': 'element_name', 'type': 'string', 'required': True, 'description': 'Exact name from list_element_names'}
    ]

    def call(self, params: str, **kwargs) -> str:
        p = _parse(params)
        driver = ACTIVE_SESSIONS.get(p['app_id'])
        if not driver:
            return json.dumps({"error": f"No session for {p['app_id']}"})
        details = win.get_element_by_name(p['app_id'], driver, p['element_name'])
        return json.dumps(details if details else {"error": f"Element '{p['element_name']}' not found"})

@register_tool('stop_app_session')
class StopAppSession(BaseTool):
    description = "Close app & cleanup session. Always call when done with an app."
    parameters = [{'name': 'app_id', 'type': 'string', 'required': True}]

    def call(self, params: str, **kwargs) -> str:
        app_id = _get(params, 'app_id')
        driver = ACTIVE_SESSIONS.get(app_id)
        if not driver:
            return json.dumps({"status": "no_session", "app_id": app_id})
        success, message = win.close_app_session(driver)
        if success:
            del ACTIVE_SESSIONS[app_id]
        return json.dumps({"app_id": app_id, "status": "closed" if success else "failed", "message": message})


SYSTEM_PROMPT = """You are Airi, a Windows desktop automation agent.
RULES:
- Call ONE tool at a time. Wait for the result before proceeding.
- Never pass an app name where app_id is required.
- Never assume UI elements exist — always inspect first.
- For shell tasks, prefer run_cmd over GUI automation when possible.

APP CONTROL WORKFLOW (follow in order):
1. search_win_app_by_name(name) → get AppId
2. start_app_session(app_id) → launch app
3. inspect_ui_elements(app_id) → scan UI tree
4. list_element_names(app_id) → see available elements
5. get_element_details(app_id, element_name) → get coordinates
6. mouse_control / type_text → interact
7. stop_app_session(app_id) → always clean up when done

TOOL REFERENCE:
- run_cmd(command) — run any shell command, returns {stdout, stderr}
- take_screenshot() — capture screen, returns file path
- mouse_control(x, y, action, button) — move/click/double_click at coordinates
- type_text(text) — paste text into focused element
- clipboard_manager(mode, text) — read or write clipboard
- browser_search(queries) — search DuckDuckGo, returns top 3 results per query
- search_win_app_by_name(name) — find installed app AppId by name
- start_app_session(app_id) — launch a Windows app by full AppId
- inspect_ui_elements(app_id) — capture and save the app's UI element tree
- list_element_names(app_id) — list clickable element names in the open app
- get_element_details(app_id, element_name) — get position and ID of a named element
- stop_app_session(app_id) — close app and end session

ERROR RECOVERY:
- Element not found → call list_element_names to see what's available
- App won't start → verify AppId includes the !App suffix
- Search returns nothing → app may not be installed; try run_cmd to locate it
"""

# --- 6. AGENT INITIALIZATION ---
airi = Assistant(
    llm=llm_cfg,
    system_message=SYSTEM_PROMPT,
    function_list=[
        'run_cmd', 'take_screenshot', 'mouse_control', 
        'type_text', 'clipboard_manager', 'browser_search',
        'search_win_app_by_name', 'start_app_session',
        'inspect_ui_elements', 'list_element_names', 'get_element_details',
        'stop_app_session'
    ]
)

# --- 7. FASTAPI ENDPOINT (Streaming + Error Handling) ---
@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    data = await request.json()
    messages = data.get("messages", [])
    
    def stream_gen():
        prev_content = ""
        for response in airi.run(messages):
            if not response: continue
            # Find the last assistant message
            assistant_msgs = [m for m in response if m.get("role") == "assistant"]
            if not assistant_msgs: continue
            last = assistant_msgs[-1]

            full_content = last.get("content") or ""
            if not isinstance(full_content, str): continue

            delta = full_content[len(prev_content):]
            prev_content = full_content

            if not delta: continue

            chunk = {
                "id": f"chatcmpl-{int(time.time())}",
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": modelName,
                "choices": [{
                    "index": 0,
                    "delta": {"content": delta},
                    "finish_reason": None
                }]
            }

            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_gen(), media_type="text/event-stream")

@app.get("/health")
async def health():
    return {"status": "ok", "model": modelName, "agent": "Airi"}

if __name__ == "__main__":
    import uvicorn
    print("Airi Agent running on http://127.0.0.1:11435")
    print("Tips: Use /health to check status, /v1/chat/completions for requests")
    uvicorn.run(app, host="127.0.0.1", port=11435, log_level="info")