const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getDatabasePath: () => ipcRenderer.invoke('getDatabasePath'),
  getBrands: () => ipcRenderer.invoke('getBrands'),
  getDevices: (options) => ipcRenderer.invoke('getDevices', options),
  getDeviceSpecs: (devicePath) => ipcRenderer.invoke('getDeviceSpecs', devicePath),
  getDeviceImage: (devicePath) => ipcRenderer.invoke('getDeviceImage', devicePath),
  getDeviceImages: (devicePath) => ipcRenderer.invoke('getDeviceImages', devicePath),
  getDeviceImagesByYearSlug: (year, slug) => ipcRenderer.invoke('getDeviceImagesByYearSlug', year, slug),
  exportFileIndex: () => ipcRenderer.invoke('exportFileIndex'),
  hasIndex: () => ipcRenderer.invoke('hasIndex'),
  buildAndSaveIndex: () => ipcRenderer.invoke('buildAndSaveIndex'),
});
