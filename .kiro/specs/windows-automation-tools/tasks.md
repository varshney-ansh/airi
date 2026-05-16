# Tasks: Windows Automation Tools

## Task List

- [x] 1. Rewrite flaui.py — automation engine core
  - [x] 1.1 Load FlaUI DLLs and create UIA3Automation singleton at module level
  - [x] 1.2 Implement AppResolver with KNOWN_APPS registry and 4-strategy resolution
  - [x] 1.3 Implement ElementFinder with 5-strategy resolution (automation_id, exact name, contains name, control_type+index, text_contains)
  - [x] 1.4 Implement ActionExecutor supporting all 12 action types (click, double_click, right_click, type, key, scroll, focus, read, read_screen, wait, screenshot, close_app)
  - [x] 1.5 Implement WindowsAutomationEngine orchestrating the above components (launch_app, inspect_window, execute_batch, get_desktop_windows)

- [x] 2. Clean up and update agent.py
  - [x] 2.1 Remove browser_automation tool, ChromeBrowser class, and all browser-use/langchain imports
  - [x] 2.2 Remove old FlaUI tools (search_win_app_by_name, start_app_session, inspect_ui_elements, list_element_names, get_element_details, stop_app_session), win import, and ACTIVE_SESSIONS
  - [x] 2.3 Add windows_launch, windows_inspect, windows_do tools (register_tool, BaseTool, via flaui engine)
  - [x] 2.4 Add file_op tool (list, open, copy, move, delete, create_folder, search with desktop/downloads/documents aliases)
  - [x] 2.5 Add list_installed_apps tool (PowerShell Get-StartApps, fallback to Start Menu scan)
  - [x] 2.6 Add GET /settings and POST /settings endpoints with settings.json persistence and hot-reload of agent LLM config
  - [x] 2.7 Update SYSTEM_PROMPT to reference new tools and remove old tool references

- [-] 3. Clean up electron/main.js
  - [ ] 3.1 Remove startAppium() function, appiumProcess variable, and all references
  - [ ] 3.2 Make startLlama() read model from settings.json and skip launch if model_server is external

- [ ] 4. Write skill files
  - [ ] 4.1 Write agent-server/WindowsAutomator.md — tool reference, action table, target syntax, example batches for Chrome/Excel/WhatsApp/CMD/Explorer/Settings
  - [ ] 4.2 Write agent-server/ChromeNavigator.md — Chrome navigation via FlaUI, address bar patterns, example batches for "go to YouTube and search for X and click first video"
  - [ ] 4.3 Write agent-server/FileManager.md — file_op tool usage, desktop/downloads/documents examples, combined file_op + windows_launch pattern
