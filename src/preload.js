const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('jarvis', {
  getData: () => ipcRenderer.invoke('settings:get'), saveSettings: value => ipcRenderer.invoke('settings:save', value),
  getAiModels: () => ipcRenderer.invoke('ai:models'), openExternal: url => ipcRenderer.invoke('shell:open-external', url), saveAiConfig: config => ipcRenderer.invoke('ai:save-config', config), sendAiMessage: prompt => ipcRenderer.invoke('ai:chat', prompt), clearAiChat: () => ipcRenderer.invoke('ai:clear-chat'),
  recordUsage: label => ipcRenderer.invoke('usage:record', label), searchFiles: q => ipcRenderer.invoke('files:search', q), openFile: p => ipcRenderer.invoke('files:open', p),
  openApp: name => ipcRenderer.invoke('apps:open', name), listApps: () => ipcRenderer.invoke('apps:list'), createDocument: input => ipcRenderer.invoke('documents:create', input), backup: repo => ipcRenderer.invoke('github:backup', repo),
  openImage: () => ipcRenderer.invoke('images:open'), saveImage: dataUrl => ipcRenderer.invoke('images:save', dataUrl), export3dModel: model => ipcRenderer.invoke('blender:export-model', model),
  getMetrics: () => ipcRenderer.invoke('system:metrics'), takeScreenshot: () => ipcRenderer.invoke('system:screenshot'), requestPower: action => ipcRenderer.invoke('system:power', action), cancelPower: () => ipcRenderer.invoke('system:cancel-power'), setVolume: value => ipcRenderer.invoke('system:volume', value), setBrightness: value => ipcRenderer.invoke('system:brightness', value),
  webSearch: query => ipcRenderer.invoke('web:search', query), translate: text => ipcRenderer.invoke('web:translate', text),
  onBackupResult: callback => ipcRenderer.on('github:result', (_e, result) => callback(result))
});
