const { contextBridge, ipcRenderer } = require('electron');

// 1. The new code: Expose the IPC bridge to your frontend
contextBridge.exposeInMainWorld('electronAPI', {
  openOverlay: () => ipcRenderer.send('trigger-snap-overlay')
});

// 2. Your existing code: Expose version numbers to the DOM
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})