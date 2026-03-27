const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openOverlay: () => ipcRenderer.send('trigger-snap-overlay'),
  getChats:   (userId)         => ipcRenderer.invoke('get-chats', userId),
  pullChats:  (userId)         => ipcRenderer.invoke('pull-chats', userId),
  saveChat:   (chatData)       => ipcRenderer.invoke('save-chat', chatData),
  deleteChat: (chatId, userId) => ipcRenderer.invoke('delete-chat', { chatId, userId }),
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