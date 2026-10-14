const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('jarvis', {
  getData: () => ipcRenderer.invoke('settings:get'), saveSettings: value => ipcRenderer.invoke('settings:save', value),
  recordUsage: label => ipcRenderer.invoke('usage:record', label), searchFiles: q => ipcRenderer.invoke('files:search', q), openFile: p => ipcRenderer.invoke('files:open', p),
  openApp: name => ipcRenderer.invoke('apps:open', name), createDocument: input => ipcRenderer.invoke('documents:create', input), backup: repo => ipcRenderer.invoke('github:backup', repo),
  onBackupResult: callback => ipcRenderer.on('github:result', (_e, result) => callback(result))
});
