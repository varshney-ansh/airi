"""
flaui.py — Windows UI Automation Engine
Powered by FlaUI/UIA3 via pythonnet.

Exports:
    engine  — module-level WindowsAutomationEngine singleton
"""

import os
import sys
import time
import json
import difflib
import subprocess
import logging

logger = logging.getLogger(__name__)

# ── DLL Loading ───────────────────────────────────────────────────────────────
_dll_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'deps', 'flaui')
if _dll_path not in sys.path:
    sys.path.insert(0, _dll_path)

import clr
clr.AddReference('FlaUI.Core')
clr.AddReference('FlaUI.UIA3')
clr.AddReference('Interop.UIAutomationClient')

from FlaUI.UIA3 import UIA3Automation
from FlaUI.Core.Conditions import ConditionFactory
from FlaUI.Core.Definitions import ControlType
from FlaUI.UIA3 import UIA3PropertyLibrary
from FlaUI.Core.Input import Keyboard, Mouse
from FlaUI.Core.WindowsAPI import VirtualKeyShort

# ── UIA3 Singleton ────────────────────────────────────────────────────────────
_automation = UIA3Automation()
_cf = ConditionFactory(UIA3PropertyLibrary())

# ── Known App Registry ────────────────────────────────────────────────────────
KNOWN_APPS = {
    "chrome":    {"exe": "chrome.exe",            "title_hint": "Chrome",    "launch": "chrome"},
    "excel":     {"exe": "EXCEL.EXE",             "title_hint": "Excel",     "launch": "excel"},
    "word":      {"exe": "WINWORD.EXE",           "title_hint": "Word",      "launch": "winword"},
    "explorer":  {"exe": "explorer.exe",          "title_hint": "",          "launch": "explorer"},
    "whatsapp":  {"exe": "WhatsApp.exe",          "title_hint": "WhatsApp",  "launch": "WhatsApp"},
    "cmd":       {"exe": "cmd.exe",               "title_hint": "",          "launch": "cmd"},
    "settings":  {"exe": "SystemSettings.exe",    "title_hint": "Settings",  "launch": "ms-settings:"},
    "notepad":   {"exe": "notepad.exe",           "title_hint": "Notepad",   "launch": "notepad"},
    "vlc":       {"exe": "vlc.exe",               "title_hint": "VLC",       "launch": "vlc"},
    "spotify":   {"exe": "Spotify.exe",           "title_hint": "Spotify",   "launch": "spotify"},
    "calculator":{"exe": "CalculatorApp.exe",     "title_hint": "Calculator","launch": "calc"},
    "paint":     {"exe": "mspaint.exe",           "title_hint": "Paint",     "launch": "mspaint"},
    "edge":      {"exe": "msedge.exe",            "title_hint": "Edge",      "launch": "msedge"},
    "teams":     {"exe": "Teams.exe",             "title_hint": "Teams",     "launch": "msteams"},
    "outlook":   {"exe": "OUTLOOK.EXE",           "title_hint": "Outlook",   "launch": "outlook"},
    "powerpoint":{"exe": "POWERPNT.EXE",          "title_hint": "PowerPoint","launch": "powerpnt"},
}

# ── Control type name map ─────────────────────────────────────────────────────
_CT_MAP = {
    "button":      ControlType.Button,
    "edit":        ControlType.Edit,
    "combobox":    ControlType.ComboBox,
    "document":    ControlType.Document,
    "text":        ControlType.Text,
    "checkbox":    ControlType.CheckBox,
    "radiobutton": ControlType.RadioButton,
    "list":        ControlType.List,
    "listitem":    ControlType.ListItem,
    "menu":        ControlType.Menu,
    "menuitem":    ControlType.MenuItem,
    "toolbar":     ControlType.ToolBar,
    "tab":         ControlType.Tab,
    "tabitem":     ControlType.TabItem,
    "tree":        ControlType.Tree,
    "treeitem":    ControlType.TreeItem,
    "image":       ControlType.Image,
    "pane":        ControlType.Pane,
    "window":      ControlType.Window,
    "group":       ControlType.Group,
    "scrollbar":   ControlType.ScrollBar,
    "slider":      ControlType.Slider,
    "spinner":     ControlType.Spinner,
    "statusbar":   ControlType.StatusBar,
    "hyperlink":   ControlType.Hyperlink,
    "custom":      ControlType.Custom,
    "dataitem":    ControlType.DataItem,
    "datagrid":    ControlType.DataGrid,
    "header":      ControlType.Header,
    "headeritem":  ControlType.HeaderItem,
    "table":       ControlType.Table,
    "titlebar":    ControlType.TitleBar,
    "thumb":       ControlType.Thumb,
    "tooltip":     ControlType.ToolTip,
}


# ── AppResolver ───────────────────────────────────────────────────────────────

class AppResolver:
    """Resolves a human-readable app name to a live FlaUI window element."""

    def resolve(self, app: str):
        """Try 4 strategies to find the window. Returns AutomationElement or None."""
        app_lower = app.strip().lower()
        info = KNOWN_APPS.get(app_lower, {})
        title_hint = info.get("title_hint", "")

        desktop = _automation.GetDesktop()

        # Strategy 1: exact title match
        try:
            win = desktop.FindFirstDescendant(_cf.ByName(app))
            if win is not None:
                return win
        except Exception:
            pass

        # Strategy 2: title contains app name or title_hint
        try:
            children = desktop.FindAllChildren()
            for child in children:
                name = (child.Name or "").lower()
                if app_lower in name:
                    return child
                if title_hint and title_hint.lower() in name:
                    return child
        except Exception:
            pass

        # Strategy 3: process name match via psutil
        try:
            import psutil
            exe = info.get("exe", app + ".exe").lower()
            children = desktop.FindAllChildren()
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    if proc.info['name'].lower() == exe:
                        pid = proc.info['pid']
                        for child in children:
                            try:
                                if child.Properties.ProcessId.Value == pid:
                                    return child
                            except Exception:
                                pass
                except Exception:
                    pass
        except Exception:
            pass

        # Strategy 4: fuzzy title match
        try:
            children = desktop.FindAllChildren()
            best_ratio = 0.0
            best_win = None
            for child in children:
                title = (child.Name or "").lower()
                if not title:
                    continue
                ratio = difflib.SequenceMatcher(None, app_lower, title).ratio()
                if ratio > 0.6 and ratio > best_ratio:
                    best_ratio = ratio
                    best_win = child
            if best_win is not None:
                return best_win
        except Exception:
            pass

        return None

    def get_all_windows(self):
        """Return list of {title, pid} for all top-level windows."""
        result = []
        try:
            desktop = _automation.GetDesktop()
            for child in desktop.FindAllChildren():
                title = child.Name or ""
                if title:
                    try:
                        pid = child.Properties.ProcessId.Value
                    except Exception:
                        pid = None
                    result.append({"title": title, "pid": pid})
        except Exception:
            pass
        return result


# ── ElementFinder ─────────────────────────────────────────────────────────────

class ElementFinder:
    """
    Finds a UI element inside a window using a target descriptor dict.
    Priority: automation_id > exact name > contains name > control_type+index > text_contains
    Returns None (never raises) when nothing matches.
    """

    def find(self, root, target: dict):
        if not target:
            return None

        auto_id = target.get("automation_id")
        name    = target.get("name")
        ct_name = (target.get("control_type") or "").lower()
        index   = int(target.get("index", 0))
        text_q  = target.get("text_contains")

        # 1. automation_id
        if auto_id:
            try:
                el = root.FindFirstDescendant(_cf.ByAutomationId(str(auto_id)))
                if el is not None:
                    return el
            except Exception:
                pass

        # 2. exact name
        if name:
            try:
                el = root.FindFirstDescendant(_cf.ByName(str(name)))
                if el is not None:
                    return el
            except Exception:
                pass

        # 3. name contains (case-insensitive)
        if name:
            try:
                name_lower = name.lower()
                for el in root.FindAllDescendants():
                    if el.Name and name_lower in el.Name.lower():
                        return el
            except Exception:
                pass

        # 4. control_type + index
        if ct_name and ct_name in _CT_MAP:
            try:
                ct = _CT_MAP[ct_name]
                matches = root.FindAllDescendants(_cf.ByControlType(ct))
                if matches and index < len(matches):
                    return matches[index]
            except Exception:
                pass

        # 5. text_contains — scan Edit and Document elements
        if text_q:
            try:
                text_lower = text_q.lower()
                for ct in [ControlType.Edit, ControlType.Document, ControlType.Text]:
                    for el in root.FindAllDescendants(_cf.ByControlType(ct)):
                        try:
                            val = ""
                            try:
                                val = el.AsTextBox().Text or ""
                            except Exception:
                                val = el.Name or ""
                            if text_lower in val.lower():
                                return el
                        except Exception:
                            pass
            except Exception:
                pass

        return None

    def _safe_value(self, el) -> str:
        """Extract text/value from an element safely."""
        try:
            return el.AsTextBox().Text or ""
        except Exception:
            pass
        try:
            return el.AsValueControl().Value or ""
        except Exception:
            pass
        return el.Name or ""


# ── Key combo helper ──────────────────────────────────────────────────────────

_KEY_MAP = {
    "ctrl":   VirtualKeyShort.CONTROL,
    "alt":    VirtualKeyShort.ALT,
    "shift":  VirtualKeyShort.SHIFT,
    "win":    VirtualKeyShort.LWIN,
    "enter":  VirtualKeyShort.RETURN,
    "esc":    VirtualKeyShort.ESCAPE,
    "escape": VirtualKeyShort.ESCAPE,
    "tab":    VirtualKeyShort.TAB,
    "space":  VirtualKeyShort.SPACE,
    "back":   VirtualKeyShort.BACK,
    "delete": VirtualKeyShort.DELETE,
    "del":    VirtualKeyShort.DELETE,
    "home":   VirtualKeyShort.HOME,
    "end":    VirtualKeyShort.END,
    "up":     VirtualKeyShort.UP,
    "down":   VirtualKeyShort.DOWN,
    "left":   VirtualKeyShort.LEFT,
    "right":  VirtualKeyShort.RIGHT,
    "pgup":   VirtualKeyShort.PRIOR,
    "pgdn":   VirtualKeyShort.NEXT,
    "f1":     VirtualKeyShort.F1,  "f2": VirtualKeyShort.F2,
    "f3":     VirtualKeyShort.F3,  "f4": VirtualKeyShort.F4,
    "f5":     VirtualKeyShort.F5,  "f6": VirtualKeyShort.F6,
    "f7":     VirtualKeyShort.F7,  "f8": VirtualKeyShort.F8,
    "f9":     VirtualKeyShort.F9,  "f10": VirtualKeyShort.F10,
    "f11":    VirtualKeyShort.F11, "f12": VirtualKeyShort.F12,
}

def _parse_keys(keys_str: str):
    """Parse 'ctrl+shift+esc' into a list of VirtualKeyShort values."""
    parts = [p.strip().lower() for p in keys_str.split("+")]
    result = []
    for p in parts:
        if p in _KEY_MAP:
            result.append(_KEY_MAP[p])
        elif len(p) == 1:
            # Single character — use its VK code
            try:
                vk = getattr(VirtualKeyShort, p.upper(), None)
                if vk is not None:
                    result.append(vk)
            except Exception:
                pass
    return result


# ── ActionExecutor ────────────────────────────────────────────────────────────

class ActionExecutor:
    """Executes a single action dict against a resolved element or window."""

    _screenshots_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")

    def execute(self, action: dict, element, window, engine) -> dict:
        act = action.get("action", "").lower()
        target_name = element.Name if element is not None else None

        try:
            if act == "click":
                element.Click()
                return self._ok(act, target_name, "clicked")

            elif act == "double_click":
                element.DoubleClick()
                return self._ok(act, target_name, "double-clicked")

            elif act == "right_click":
                element.RightClick()
                return self._ok(act, target_name, "right-clicked")

            elif act == "focus":
                element.Focus()
                return self._ok(act, target_name, "focused")

            elif act == "type":
                text = action.get("text", "")
                append = action.get("append", False)
                tb = element.AsTextBox()
                if not append:
                    tb.Enter(text)
                else:
                    element.Focus()
                    Keyboard.Type(text)
                return self._ok(act, target_name, f"typed {len(text)} chars")

            elif act == "key":
                keys_str = action.get("keys", "")
                vkeys = _parse_keys(keys_str)
                if not vkeys:
                    return self._err(act, None, f"Unknown key combo: {keys_str}")
                if len(vkeys) == 1:
                    Keyboard.Press(vkeys[0])
                    Keyboard.Release(vkeys[0])
                else:
                    # Hold modifiers, press last key
                    for k in vkeys[:-1]:
                        Keyboard.Press(k)
                    Keyboard.Press(vkeys[-1])
                    Keyboard.Release(vkeys[-1])
                    for k in reversed(vkeys[:-1]):
                        Keyboard.Release(k)
                return self._ok(act, None, f"pressed {keys_str}")

            elif act == "scroll":
                direction = action.get("direction", "down").lower()
                amount = int(action.get("amount", 3))
                rect = element.BoundingRectangle
                cx = int(rect.X + rect.Width / 2)
                cy = int(rect.Y + rect.Height / 2)
                from FlaUI.Core.Input import Mouse as _Mouse
                from System.Drawing import Point
                _Mouse.MoveTo(Point(cx, cy))
                delta = amount * 120
                if direction == "up":
                    _Mouse.Scroll(delta)
                elif direction == "down":
                    _Mouse.Scroll(-delta)
                return self._ok(act, target_name, f"scrolled {direction} {amount}")

            elif act == "read":
                val = self._read_value(element)
                return self._ok(act, target_name, "read", value=val)

            elif act == "read_screen":
                text = self._read_screen(window)
                return self._ok(act, None, "screen read", value=text)

            elif act == "wait":
                ms = int(action.get("ms", 1000))
                time.sleep(ms / 1000.0)
                return self._ok(act, None, f"waited {ms}ms")

            elif act == "screenshot":
                path = self._take_screenshot()
                return self._ok(act, None, "screenshot saved", value=path)

            elif act == "close_app":
                try:
                    window.Close()
                except Exception:
                    # Try patterns
                    try:
                        window.AsWindow().Close()
                    except Exception:
                        pass
                return self._ok(act, None, "app closed")

            else:
                return self._err(act, None, f"Unknown action: {act}")

        except Exception as e:
            return self._err(act, target_name, str(e))

    def _read_value(self, element) -> str:
        try:
            return element.AsTextBox().Text or ""
        except Exception:
            pass
        try:
            return element.AsValueControl().Value or ""
        except Exception:
            pass
        return element.Name or ""

    def _read_screen(self, window) -> str:
        """Walk all descendants and collect visible text — fast, no screenshot."""
        parts = []
        try:
            for el in window.FindAllDescendants():
                try:
                    name = el.Name or ""
                    if name and name not in parts:
                        parts.append(name)
                    # Also try value pattern
                    try:
                        val = el.AsValueControl().Value or ""
                        if val and val not in parts:
                            parts.append(val)
                    except Exception:
                        pass
                except Exception:
                    pass
        except Exception:
            pass
        return "\n".join(parts)

    def _take_screenshot(self) -> str:
        os.makedirs(self._screenshots_dir, exist_ok=True)
        ts = time.strftime("%Y%m%d_%H%M%S")
        path = os.path.join(self._screenshots_dir, f"screen_{ts}.png")
        try:
            import pyautogui
            pyautogui.screenshot(path)
        except Exception:
            try:
                from PIL import ImageGrab
                ImageGrab.grab().save(path)
            except Exception as e:
                return f"screenshot_failed: {e}"
        return path

    @staticmethod
    def _ok(action, target, detail, value=None):
        return {"action": action, "target": target, "status": "ok", "detail": detail, "value": value}

    @staticmethod
    def _err(action, target, detail):
        return {"action": action, "target": target, "status": "error", "detail": detail, "value": None}


# ── WindowsAutomationEngine ───────────────────────────────────────────────────

class WindowsAutomationEngine:
    """
    Central singleton. Owns AppResolver, ElementFinder, ActionExecutor.
    All public methods return plain dicts/lists — never raise.
    """

    def __init__(self):
        self._resolver = AppResolver()
        self._finder   = ElementFinder()
        self._executor = ActionExecutor()

    # ── Launch ────────────────────────────────────────────────────────────────

    def launch_app(self, app: str, args: str = "") -> dict:
        app_lower = app.strip().lower()

        # Already running?
        win = self._resolver.resolve(app)
        if win is not None:
            try:
                win.SetForeground()
            except Exception:
                pass
            return {"status": "already_running", "window_title": win.Name or app, "detail": "Window already open"}

        # Launch
        info = KNOWN_APPS.get(app_lower, {})
        launch_cmd = info.get("launch", app)
        try:
            if launch_cmd.startswith("ms-"):
                subprocess.Popen(["start", launch_cmd], shell=True)
            else:
                cmd = [launch_cmd] + (args.split() if args else [])
                subprocess.Popen(cmd, shell=True)
        except Exception as e:
            return {"status": "error", "window_title": "", "detail": str(e)}

        # Wait up to 5s for window
        for _ in range(25):
            time.sleep(0.2)
            win = self._resolver.resolve(app)
            if win is not None:
                try:
                    win.SetForeground()
                except Exception:
                    pass
                return {"status": "launched", "window_title": win.Name or app, "detail": "Launched successfully"}

        return {"status": "launched", "window_title": "", "detail": "Launched but window not detected yet"}

    # ── Inspect ───────────────────────────────────────────────────────────────

    def inspect_window(self, app: str, depth: int = 4, filter_types: str = "") -> list:
        win = self._resolver.resolve(app)
        if win is None:
            return [{"error": f"Window not found for: {app}. Use windows_launch first."}]

        allowed_cts = set()
        if filter_types:
            for ft in filter_types.split(","):
                ft = ft.strip().lower()
                if ft in _CT_MAP:
                    allowed_cts.add(_CT_MAP[ft])

        results = []
        try:
            self._collect_elements(win, 0, depth, allowed_cts, results)
        except Exception as e:
            return [{"error": str(e)}]

        results.sort(key=lambda x: x["depth"])
        return results[:200]

    def _collect_elements(self, el, current_depth: int, max_depth: int, allowed_cts: set, out: list):
        if current_depth > max_depth:
            return
        try:
            ct = el.ControlType
            ct_name = str(ct).split(".")[-1] if ct else ""
            if allowed_cts and ct not in allowed_cts:
                pass  # still recurse, just don't add
            else:
                name = el.Name or ""
                auto_id = ""
                try:
                    auto_id = el.AutomationId or ""
                except Exception:
                    pass
                value = ""
                try:
                    value = el.AsValueControl().Value or ""
                except Exception:
                    pass
                rect = {}
                try:
                    r = el.BoundingRectangle
                    rect = {"x": int(r.X), "y": int(r.Y), "w": int(r.Width), "h": int(r.Height)}
                except Exception:
                    pass
                if name or auto_id:
                    out.append({
                        "name": name,
                        "automation_id": auto_id,
                        "control_type": ct_name,
                        "value": value,
                        "rect": rect,
                        "depth": current_depth,
                    })
            for child in el.FindAllChildren():
                self._collect_elements(child, current_depth + 1, max_depth, allowed_cts, out)
        except Exception:
            pass

    # ── Execute Batch ─────────────────────────────────────────────────────────

    def execute_batch(self, app: str, actions: list) -> list:
        win = self._resolver.resolve(app)
        if win is None:
            return [
                {"action": a.get("action", "?"), "target": None,
                 "status": "error", "detail": f"Window not found: {app}. Call windows_launch first.", "value": None}
                for a in actions
            ]

        # Bring window to front
        try:
            win.SetForeground()
            time.sleep(0.1)
        except Exception:
            pass

        results = []
        for action in actions:
            act = action.get("action", "").lower()

            # close_app needs no element
            if act == "close_app":
                res = self._executor.execute(action, None, win, self)
                results.append(res)
                break  # window is gone

            # key / wait / screenshot / read_screen need no element
            if act in ("key", "wait", "screenshot", "read_screen"):
                res = self._executor.execute(action, None, win, self)
                results.append(res)
                continue

            # All other actions need a target element
            target = action.get("target")
            if not target:
                results.append({"action": act, "target": None, "status": "error",
                                 "detail": "No target specified", "value": None})
                continue

            element = self._finder.find(win, target)
            if element is None:
                results.append({"action": act, "target": str(target), "status": "error",
                                 "detail": f"Element not found: {target}", "value": None})
                continue

            res = self._executor.execute(action, element, win, self)
            results.append(res)

        return results

    # ── Desktop Windows ───────────────────────────────────────────────────────

    def get_desktop_windows(self) -> list:
        return self._resolver.get_all_windows()


# ── Module-level singleton ────────────────────────────────────────────────────
engine = WindowsAutomationEngine()
