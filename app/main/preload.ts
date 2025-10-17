import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe, limited API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Project Management
  createProject: (projectName: string) => ipcRenderer.invoke('project:create', projectName),
  openProject: () => ipcRenderer.invoke('project:open'),
  listProjectFiles: (projectPath: string) => ipcRenderer.invoke('project:list-files', projectPath),
  saveAnnotations: (projectPath: string, imageName: string, boxes: any[]) => ipcRenderer.invoke('project:save-annotations', projectPath, imageName, boxes),

  // OCR
  saveOcrResult: (projectPath: string, originalImageName: string, ocrImageBase64: string, results: any) => ipcRenderer.invoke('ocr:save-result', projectPath, originalImageName, ocrImageBase64, results),
  renameOcrResult: (projectPath: string, oldName: string, newName: string) => ipcRenderer.invoke('ocr:rename', projectPath, oldName, newName),
  listOcrResults: (projectPath: string) => ipcRenderer.invoke('ocr:list-results', projectPath),
  loadOcrResult: (projectPath: string, resultId: string) => ipcRenderer.invoke('ocr:load-result', projectPath, resultId),
  deleteOcrResult: (projectPath: string, resultId: string) => ipcRenderer.invoke('ocr:delete-result', projectPath, resultId),

  // App settings
  getStoreValue: (key: string) => ipcRenderer.invoke('store:get', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.send('store:set', key, value),

  // General
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
});

// Type declarations for the API are now in `app/renderer/src/electron.d.ts`
// and are included in the renderer's tsconfig.json.
// No need for a global declaration here.