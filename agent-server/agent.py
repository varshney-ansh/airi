import os
import sys
import json
import time
import asyncio
import logging
import subprocess
import pyautogui
import pyperclip
import urllib.parse
from playwright.sync_api import sync_playwright

# Force UTF-8 output so browser_use emoji logs don't crash on Windows cp1252
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Qwen Agent Framework
from qwen_agent.agents import Assistant
from qwen_agent.llm import get_chat_model
from qwen_agent.tools.base import BaseTool, register_tool
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

from browser_use import Agent as BrowserAgent
from browser_use.browser.service import Browser
from langchain_openai import ChatOpenAI

import win

logger = logging.getLogger(__name__)
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

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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


CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
CHROME_USER_DATA = r"C:\Users\anshv\AppData\Local\Google\Chrome\User Data Airi"

class ChromeBrowser(Browser):
    """Launches system Chrome with real user profile + stealth to avoid bot detection."""

    async def _initialize_session(self):
        from playwright.async_api import async_playwright
        from playwright_stealth import stealth_async

        playwright = await async_playwright().start()

        # Use persistent context so Google sees real cookies/history
        context = await playwright.chromium.launch_persistent_context(
            user_data_dir=CHROME_USER_DATA,
            executable_path=CHROME_PATH,
            headless=False,
            ignore_default_args=['--enable-automation'],
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-first-run',
                '--no-default-browser-check',
            ],
            viewport={'width': 1280, 'height': 1024},
            user_agent=(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ),
        )

        # Apply stealth to all existing and future pages
        async def apply_stealth(page):
            await stealth_async(page)

        for page in context.pages:
            await apply_stealth(page)
        context.on("page", lambda page: asyncio.ensure_future(apply_stealth(page)))

        page = context.pages[0] if context.pages else await context.new_page()

        from browser_use.browser.views import BrowserState
        from browser_use.browser.service import BrowserSession
        initial_state = BrowserState(
            items=[], selector_map={},
            url=page.url, title=await page.title(),
            screenshot=None, tabs=[],
        )
        self.session = BrowserSession(
            playwright=playwright,
            browser=context,   # persistent context acts as the browser
            context=context,
            current_page=page,
            cached_state=initial_state,
        )
        return self.session

# --- 2. Browser Use for browser Automation ---
@register_tool('browser_automation')
class BrowserAutomationTool(BaseTool):
    description = 'Use this tool to perform complex browser tasks like clicking, typing, and navigating websites.'
    parameters = [{
        'name': 'task',
        'type': 'string',
        'description': 'The specific web automation task to perform (e.g., "Find the price of BTC on Coinbase")',
        'required': True
    }]

    def call(self, params: str, **kwargs) -> str:
        from browser_use.controller.service import Controller

        params = _parse(params)
        task = params['task'] if isinstance(params, dict) else params

        try:
            browser = ChromeBrowser()
            controller = Controller()
            controller.browser = browser
            llm = ChatOpenAI(
                base_url="http://127.0.0.1:11434/v1",
                model="default",
                temperature=0.3,
            )
            browser_sub_agent = BrowserAgent(
                task=task,
                llm=llm,
                controller=controller,
                use_vision=False,
            )
            result = asyncio.run(browser_sub_agent.run())
            return str(result)
        except Exception as e:
            logger.error(f"[browser_automation] failed: {e}")
            return json.dumps({"error": str(e)})

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


SYSTEM_PROMPT = """
# IDENTITY
You are Airi, a Windows Desktop AI Assistant. You specialize in app orchestration, web automation, and code execution.

# RULES
1. ATOMICITY: Execute exactly ONE tool call per turn. Wait for output before proceeding.
2. APP ID STRICTNESS: Never guess an `app_id`. Always `search_win_app_by_name` first.
3. VISUAL VERIFICATION: Never click blindly. You MUST `inspect_ui_elements` -> `list_element_names` before interaction.
4. TASK DELEGATION:
   - Use `browser_automation` for ALL web tasks.
   - Use `code_interpreter` for logic, math, and file operations.
   - Use the 7-step Workflow ONLY for Windows Desktop apps.

# WINDOWS APP WORKFLOW (STRICT SEQUENCE)
1. search_win_app_by_name(name)
2. start_app_session(app_id)
3. inspect_ui_elements(app_id)
4. list_element_names(app_id)
5. get_element_details(app_id, element_name)
6. [Interact via code_interpreter/pyautogui]
7. stop_app_session(app_id)

# FEW-SHOT EXAMPLES

## Example 1: Windows App Task (Sticky Notes)
User: Write "Buy Milk" in Sticky Notes.
Airi: search_win_app_by_name("sticky notes")
Result: [{"app_id": "Microsoft.MicrosoftStickyNotes_8wekyb3d8bbwe!App"}]
Airi: start_app_session("Microsoft.MicrosoftStickyNotes_8wekyb3d8bbwe!App")
Result: {"status": "success"}
Airi: inspect_ui_elements("Microsoft.MicrosoftStickyNotes_8wekyb3d8bbwe!App")
Result: {"status": "UI_tree_captured"}
Airi: list_element_names("Microsoft.MicrosoftStickyNotes_8wekyb3d8bbwe!App")
Result: ["Note_Window", "Create_Note_Button"]
Airi: get_element_details("Microsoft.MicrosoftStickyNotes_8wekyb3d8bbwe!App", "Note_Window")
Result: {"x": 450, "y": 300}
Airi: code_interpreter(code="pyautogui.click(450, 300); pyautogui.write('Buy Milk')")
Result: {"status": "success"}
Airi: stop_app_session("Microsoft.MicrosoftStickyNotes_8wekyb3d8bbwe!App")

## Example 2: Web Task (Youtube)
User: Go to Youtube.com and click on any video
Airi: browser_automation(task="Go to Youtube.com and click on any video")

## Example 3: Calculation/Data
User: Calculate the 15% tax on a $1245 invoice and save to 'tax.txt'.
Airi: code_interpreter(code="tax = 1245 * 0.15; with open('tax.txt', 'w') as f: f.write(str(tax))")

# TOOL REFERENCE
- search_win_app_by_name(name): Returns matching AppIds.
- start_app_session(app_id): Starts session (requires !App suffix).
- inspect_ui_elements(app_id): Saves UI tree to context/.
- list_element_names(app_id): Lists interactable names from current tree.
- get_element_details(app_id, element_name): Returns coordinates/ID for an element.
- stop_app_session(app_id): Closes session. Mandatory.
- browser_automation(task): English description of web tasks.
- web_search(query) / web_fetch(url): Quick web lookup/reading.
- code_interpreter: Execute Python for logic/automation.

# ERROR RECOVERY
- UI Stale: If an element is missing, re-run tool `inspect_ui_elements`.
- Launch Fail: Re-verify `app_id` string via search.

"""

# --- 6. AGENT INITIALIZATION ---
airi = Assistant(
    llm=llm_cfg,
    system_message=SYSTEM_PROMPT,
    function_list=[
        'browser_automation',
        'search_win_app_by_name', 'start_app_session',
        'inspect_ui_elements', 'list_element_names', 'get_element_details',
        'stop_app_session', 'web_search'
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