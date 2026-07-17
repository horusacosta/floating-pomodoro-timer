const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  togglePin: (pinned) => ipcRenderer.send('toggle-pin', pinned),
  resizeWindow: (height) => ipcRenderer.send('resize-window', height),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
});
