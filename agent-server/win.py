import subprocess
import json
import os
from appium import webdriver
import xml.etree.ElementTree as ET
from appium.options.windows import WindowsOptions

appium_server_url = "http://127.0.0.1:4723"

def get_all_windows_apps_installed_AppIds():
    '''Get all installed Windows Apps AppIds and also saves them in /context/installed_apps.json'''
    ps_command = "Get-StartApps | ConvertTo-Json"

    try: 
        result = subprocess.run(
            ["powershell", "-Command", ps_command],
            capture_output=True,
            text=True,
            check=True
        )

        apps = json.loads(result.stdout)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        save_path = os.path.join(script_dir, "context")
        os.makedirs(save_path, exist_ok=True)

        with open(os.path.join(save_path, "installed_apps.json"), "w") as f:
            json.dump(apps, f, indent=4)

        return apps
    except subprocess.CalledProcessError as e:
        print(f"Error executing PowerShell command: {e}")
        return []
    
def find_appId_by_name(search_string: str):
    '''Search for an app by name in context/installed_apps.json and return its AppId'''

    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(script_dir, "context", "installed_apps.json")
    
    if not os.path.exists(db_path):
        return f"Installed apps data not found. Please run get_all_windows_apps_installed_AppIds() first."

    with open(db_path, "r") as f:
        apps = json.load(f)
    
    matches = [
        app for app in apps
        if search_string.lower() in app["Name"].lower()
    ]

    if not matches:
        return f"No Apps found matching '{search_string}'."
        
    if len(matches) > 0:
        return matches
                
def open_win_app_and_start_session(AppId: str): 
    '''Open a Windows App using its AppId and start an session with it'''
    options = WindowsOptions()
    options.app = AppId
    options.automation_name = "windows"
    options.platform_name = "windows"
    options.set_capability("ms:waitForAppLaunch", "8")
    options.set_capability("appium:newCommandTimeout", 3600)

    try: 
        driver = webdriver.Remote(
            command_executor=appium_server_url,
            options=options
        )

        return driver, f"App is successfully Opened and Session is started with AppId: {AppId}"
    except Exception as e:
        return None, f"Failed to open app with AppId: {AppId}. Error: {str(e)}"
    
def get_all_elements_in_current_window(AppId, driver):
    '''Get all elements in the current window and return them as a list and also saved in /context/AppId/all_elements.json'''
    script_dir = os.path.dirname(os.path.abspath(__file__))
    folder_name = AppId.replace("!", "_").replace(".", "_")
    directory = os.path.join(script_dir, "context", folder_name)
    file_path = os.path.join(directory, "all_elements.json")

    if not os.path.exists(directory):
        os.makedirs(directory)
    
    try:
        xml_source = driver.page_source
        def xml_to_dict(element):
            node = {
                "tag": element.tag,
                "attributes": element.attrib,
                "children": []
            }
            for child in element:
                node["children"].append(xml_to_dict(child))
            return node

        # Parse the XML string and convert
        root = ET.fromstring(xml_source)
        elements_dict = xml_to_dict(root)

        # 4. Save to JSON file
        with open(file_path, "w+", encoding="utf-8") as f:
            json.dump(elements_dict, f, indent=4)
        
        return elements_dict
    except Exception as e:
        return f"Failed to get elements for AppId: {AppId}. Error: {str(e)}"

def quickly_lookup_all_element_names_in_current_window(AppId, driver):
    '''Quickly lookup all element names in the current window and return them as a list if window is changed try run get_all_elements_in_current_window() first'''
    folder_name = AppId.replace("!", "_").replace(".", "_")
    directory = os.path.join("context", folder_name)
    file_path = os.path.join(directory, "all_elements.json")
    if not os.path.exists(file_path):
        return f"Elements data not found for {AppId}. Please run get_all_elements_in_current_window() first."
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        names = []
        def extract_names(node):
            attr = node.get("attributes", {})
            name = attr.get("Name")
            
            if name and name.strip():
                names.append(name)
            
            for child in node.get("children", []):
                extract_names(child)

        extract_names(data)
        return sorted(list(set(names)))
    except Exception as e:
        return f"Failed to quickly lookup element names for AppId: {AppId}. Error: {str(e)}"
    
def get_element_by_name(AppId, driver, element_name):
    '''Get element details by name in the current window and return them as a list (there can be multiple elements with same name)'''
    folder_name = AppId.replace("!", "_").replace(".", "_")
    directory = os.path.join("context", folder_name)
    file_path = os.path.join(directory, "all_elements.json")
    if not os.path.exists(file_path):
        return f"Elements data not found for {AppId}. Please run get_all_elements_in_current_window() first."
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        matching_elements = []
        def find_elements(node):
            attr = node.get("attributes", {})
            name = attr.get("Name")
            
            if name and name.strip() and name.strip().lower() == element_name.strip().lower():
                matching_elements.append(node)
            
            for child in node.get("children", []):
                find_elements(child)

        find_elements(data)
        return matching_elements
    except Exception as e:
        return f"Failed to get element by name for AppId: {AppId}. Error: {str(e)}"
    
def close_app_session(driver):
    """
    Terminates the Windows App session and closes the App.
    """
    if driver:
        try:
            driver.quit()
            return True, "Session closed successfully."
        except Exception as e:
            return False, f"Error while closing session: {str(e)}"
    else:
        return False, "No active driver session found to close."

