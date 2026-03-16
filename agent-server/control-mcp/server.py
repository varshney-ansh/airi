from mcp.server import FastMCP
import pyperclip
import pyautogui
import os
import subprocess
 
mcp = FastMCP("Control MCP Server", host="127.0.0.1", port="11441")

@mcp.tool(description="Execute a shell command and return stdout and stderr output.")
def run_cmd(command: str) -> dict:
    """
    Run the given command in the system shell (cmd.exe on Windows, /bin/sh on Linux/macOS).
    Returns both stdout and stderr. Avoid destructive commands like deleting system files.

    Examples: 'dir', 'node -v', 'npm install', 'ipconfig', 'ls -la'
    """
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            "success": True,
            "command": command,
            "result": {
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip()
            }
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "command": command, "error": "Command timed out after 30 seconds"}
    except Exception as e:
        return {"success": False, "command": command, "error": str(e)}

@mcp.tool(description="Capture a screenshot of the current desktop and save it to ../../media/screenshots/screenshot.png.")
def take_screenshot() -> dict:
    """
    Take a full-screen screenshot of the current desktop.
    The image is saved as a PNG file at ../../media/screenshots/screenshot.png.
    Use this to visually inspect the screen, analyze UI elements, or debug issues.
    """
    try:
        os.makedirs("../../media/screenshots", exist_ok=True)
        screenshot = pyautogui.screenshot()
        save_path = "../../media/screenshots/screenshot.png"
        screenshot.save(save_path)
        return {"success": True, "message": f"Screenshot saved to {save_path}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@mcp.tool(description="Move the mouse to (x, y) and perform a left, right, or middle click. Supports double-click.")
def mouse_click(
    x: int,
    y: int,
    button: str = "left",
    double: bool = False
) -> dict:
    """
    Move the mouse cursor to the given screen coordinates and click.
    button: 'left' | 'right' | 'middle'
    double: set True to perform a double-click instead of a single click.
    """
    try:
        valid_buttons = {"left", "right", "middle"}
        if button not in valid_buttons:
            return {"success": False, "error": f"Invalid button '{button}'. Use: left, right, middle"}

        pyautogui.moveTo(x, y)

        if double:
            pyautogui.doubleClick(x, y, button=button)
            action = "double_click"
        else:
            pyautogui.click(x, y, button=button)
            action = "click"

        return {"success": True, "action": action, "button": button, "position": {"x": x, "y": y}}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool(description="Move the mouse cursor to a specific (x, y) screen position without clicking.")
def mouse_move(x: int, y: int) -> dict:
    """
    Move the mouse cursor to the given absolute screen coordinates.
    Use before a click or to hover over UI elements.
    """
    try:
        pyautogui.moveTo(x, y)
        return {"success": True, "position": {"x": x, "y": y}}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool(description="Type text using the system keyboard into the currently focused application.")
def type_text(text: str) -> dict:
    """
    Simulate keyboard input and type the given text into the active window.
    Ensure the correct input field is focused before calling this tool.
    Special key combinations (e.g., Ctrl+C) are not supported here.
    """
    try:
        pyautogui.write(text, interval=0.03)
        return {"success": True, "typed": text}
    except Exception as e:
        return {"success": False, "error": str(e)}

@mcp.tool(description="Write text to the system clipboard.")
def clipboard_write(text: str) -> dict:
    """
    Write text to the system clipboard so the user can paste it elsewhere.
    Only plain text is supported. Replaces any existing clipboard content.
    """
    try:
        pyperclip.copy(text)
        return {"success": True, "text": text}
    except Exception as e:
        return {"success": False, "error": str(e)}


@mcp.tool(description="Read text content from the system clipboard.")
def clipboard_read() -> dict:
    """
    Read and return the current text content of the system clipboard.
    Returns an empty string if the clipboard is empty.
    Binary clipboard data is not supported.
    """
    try:
        text = pyperclip.paste()
        return {"success": True, "text": text}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    print("Starting Control MCP server on http://localhost:11441/mcp/")
    mcp.run(transport="streamable-http")
