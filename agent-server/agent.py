import os
import json
import asyncio
import subprocess
import pyautogui
import pyperclip
import urllib.parse
from typing import List, Dict, Optional
from playwright.sync_api import sync_playwright

# Qwen Agent Framework
from qwen_agent.agents import Assistant
from qwen_agent.llm import get_chat_model
from qwen_agent.tools.base import BaseTool, register_tool
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse

def _parse(params):
    """Qwen may pass params as a dict, JSON string, or Python-repr string."""
    if isinstance(params, dict):
        return params
    try:
        return json.loads(params)
    except json.JSONDecodeError:
        # Qwen sometimes dumps Python repr with single quotes — eval it safely
        import ast
        return ast.literal_eval(params)

app = FastAPI()

# --- 1. LLM CONFIGURATION ---
llm_cfg = {
    "model": "default",
    "model_server": "http://127.0.0.1:11434/v1",
    "generate_cfg": {
        "top_p": 0.8,
        "temperature": 0.2,
    }
}

# --- 2. CONTROL TOOLS ---

@register_tool('run_cmd')
class RunCmd(BaseTool):
    description = "Execute a shell command and return output."
    parameters = [{'name': 'command', 'type': 'string', 'required': True}]

    def call(self, params: str, **kwargs) -> str:
        cmd = _parse(params)['command']
        try:
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            return json.dumps({"stdout": res.stdout, "stderr": res.stderr})
        except Exception as e:
            return str(e)

@register_tool('take_screenshot')
class TakeScreenshot(BaseTool):
    description = "Capture screenshot and save it locally."
    parameters = []

    def call(self, params: str, **kwargs) -> str:
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            save_dir = os.path.join(script_dir, "screenshots")
            os.makedirs(save_dir, exist_ok=True)
            from datetime import datetime
            filename = f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
            path = os.path.join(save_dir, filename)
            pyautogui.screenshot().save(path)
            return f"Screenshot saved to {path}"
        except Exception as e:
            return str(e)

@register_tool('mouse_control')
class MouseControl(BaseTool):
    description = "Move/Click mouse. Action: 'move', 'click', 'double_click'. Button: 'left','right','middle'."
    parameters = [
        {'name': 'x', 'type': 'integer', 'required': True},
        {'name': 'y', 'type': 'integer', 'required': True},
        {'name': 'action', 'type': 'string', 'required': True},
        {'name': 'button', 'type': 'string', 'default': 'left'}
    ]

    def call(self, params: str, **kwargs) -> str:
        p = _parse(params)
        pyautogui.moveTo(p['x'], p['y'])
        if p['action'] == 'click':
            pyautogui.click(button=p.get('button', 'left'))
        elif p['action'] == 'double_click':
            pyautogui.doubleClick(button=p.get('button', 'left'))
        return f"Mouse {p['action']} at {p['x']},{p['y']}"

@register_tool('type_text')
class TypeText(BaseTool):
    description = "Type text into the focused application."
    parameters = [{'name': 'text', 'type': 'string', 'required': True}]

    def call(self, params: str, **kwargs) -> str:
        try:
            txt = _parse(params)['text']
            # Use clipboard paste — handles unicode and is faster than pyautogui.write
            pyperclip.copy(txt)
            pyautogui.hotkey('ctrl', 'v')
            return f"Typed: {txt}"
        except Exception as e:
            return str(e)

@register_tool('clipboard_manager')
class ClipboardManager(BaseTool):
    description = "Read or write to system clipboard. Mode: 'read' or 'write'."
    parameters = [
        {'name': 'mode', 'type': 'string', 'required': True},
        {'name': 'text', 'type': 'string'}
    ]

    def call(self, params: str, **kwargs) -> str:
        p = _parse(params)
        if p['mode'] == 'write':
            pyperclip.copy(p.get('text', ''))
            return "Copied to clipboard."
        return pyperclip.paste()

# --- 3. BROWSER TOOLS ---

@register_tool('browser_search')
class BrowserSearch(BaseTool):
    description = "Search online and scrape top results. Use this for real-time info."
    parameters = [{'name': 'queries', 'type': 'array', 'items': {'type': 'string'}, 'required': True}]

    def call(self, params: str, **kwargs) -> str:
        parsed = _parse(params)
        # Qwen may pass the array directly or wrapped in {"queries": [...]}
        if isinstance(parsed, list):
            queries = parsed
        else:
            queries = parsed['queries']
        
        with sync_playwright() as p:
            # 1. Launch with a real-looking User Agent
            browser = p.chromium.launch(headless=False)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
            )
            
            results = []
            for q in queries:
                page = context.new_page()
                # 2. Use the 'html' version of DuckDuckGo (Less bot detection)
                encoded_q = urllib.parse.quote(q)
                search_url = f"https://html.duckduckgo.com/html/?q={encoded_q}"
                
                try:
                    page.goto(search_url, wait_until="domcontentloaded", timeout=15000)
                    
                    # 3. Extract results from the 'Lite' layout
                    # On the HTML site, results are usually in '.result__body'
                    content = page.evaluate("""
                        () => {
                            const items = Array.from(document.querySelectorAll('.result__body')).slice(0, 3);
                            return items.map(item => ({
                                title: item.querySelector('.result__title')?.innerText || '',
                                snippet: item.querySelector('.result__snippet')?.innerText || ''
                            }));
                        }
                    """)
                    
                    results.append({"query": q, "results": content})
                except Exception as e:
                    results.append({"query": q, "error": f"Failed to load: {str(e)}"})
                
                page.close()
                
            browser.close()
            return json.dumps(results, ensure_ascii=False)
# --- 4. AGENT & SERVER ---

SYSTEM_PROMPT = """
You are Airi, a desktop assistant. Use your tools to help users with their PC.
- Call ONE tool at a time.
- Be concise.
- For browser tasks, use browser_search.
- For UI tasks, use mouse_control and type_text.
"""

airi = Assistant(
    llm=llm_cfg,
    system_message=SYSTEM_PROMPT,
    function_list=[
        'run_cmd', 'take_screenshot', 'mouse_control', 
        'type_text', 'clipboard_manager', 'browser_search'
    ]
)

@app.post("/invoke")
async def invoke(request: Request):
    data = await request.json()
    messages = [{"role": "user", "content": data.get("prompt")}]
    
    def stream_gen():
        for response in airi.run(messages):
            last = response[-1]
            # Only stream final assistant text, skip tool calls and tool results
            if last.get("role") != "assistant":
                continue
            content = last.get("content", "")
            # content can be a list of dicts (e.g. tool_call blocks) or a plain string
            if isinstance(content, list):
                text = "".join(c.get("text", "") for c in content if c.get("type") == "text")
            else:
                text = content or ""
            if text:
                yield json.dumps({"role": "assistant", "content": text}) + "\n"

    return StreamingResponse(stream_gen(), media_type="application/x-ndjson")

if __name__ == "__main__":
    import uvicorn
    print("Airi (Unified Qwen Agent) running on http://127.0.0.1:11435")
    uvicorn.run(app, host="127.0.0.1", port=11435)