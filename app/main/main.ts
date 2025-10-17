import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';

// Define a schema for the store to get type safety
interface StoreSchema {
  lastProjectPath: string | null;
  recentProjects: string[];
}

const store = new Store<StoreSchema>({
  defaults: {
    lastProjectPath: null,
    recentProjects: [],
  },
});

let mainWindow: BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for Project Management
ipcMain.handle('project:create', async (event, projectName: string) => {
  const dataPath = path.join(app.getPath('userData'), 'data');
  const projectPath = path.join(dataPath, projectName);

  if (fs.existsSync(projectPath)) {
    dialog.showErrorBox('Error', 'A project with this name already exists.');
    return null;
  }

  try {
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'annotations'));
    fs.mkdirSync(path.join(projectPath, 'ocr'));
    return projectPath;
  } catch (error: unknown) { // Explicitly type the error
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Error', `Failed to create project: ${message}`);
    return null;
  }
});

ipcMain.handle('project:open', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('project:list-files', async (event, projectPath: string) => {
  const annotationsDir = path.join(projectPath, 'annotations');
  const ocrDir = path.join(projectPath, 'ocr');
  try {
    const annotationFiles = await fs.promises.readdir(annotationsDir);
    const ocrFiles = await fs.promises.readdir(ocrDir);
    return {
      annotations: annotationFiles.filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json')),
      ocr: ocrFiles.filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json')),
    };
  } catch {
    return { annotations: [], ocr: [] };
  }
});

ipcMain.handle('project:save-annotations', async (event, projectPath: string, imageName: string, boxes: any[]) => {
  const annotationsDir = path.join(projectPath, 'annotations');
  const jsonFileName = path.basename(imageName, path.extname(imageName)) + '.json';
  const jsonPath = path.join(annotationsDir, jsonFileName);

  try {
    await fs.promises.writeFile(jsonPath, JSON.stringify({ boxes }, null, 2));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Error', `Failed to save annotations: ${message}`);
  }
});

// OCR Handlers
ipcMain.handle('ocr:save-result', async (event, projectPath: string, originalImageName: string, ocrImageBase64: string, results: any) => {
  const ocrDir = path.join(projectPath, 'ocr');
  const baseName = `ocr-result-${Date.now()}`;
  const imagePath = path.join(ocrDir, `${baseName}.png`);
  const jsonPath = path.join(ocrDir, `${baseName}.json`);

  try {
    const imageBuffer = Buffer.from(ocrImageBase64, 'base64');
    await fs.promises.writeFile(imagePath, imageBuffer);
    await fs.promises.writeFile(jsonPath, JSON.stringify(results, null, 2));
    return baseName;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('Error', `Failed to save OCR result: ${message}`);
    return null;
  }
});

ipcMain.handle('ocr:list-results', async (event, projectPath: string) => {
  const ocrDir = path.join(projectPath, 'ocr');
  try {
    const files = await fs.promises.readdir(ocrDir);
    // Return only the base names of the JSON files
    return files.filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json'));
  } catch {
    return []; // Return empty array if directory doesn't exist
  }
});

ipcMain.handle('ocr:load-result', async (event, projectPath: string, resultId: string) => {
  const ocrDir = path.join(projectPath, 'ocr');
  const jsonPath = path.join(ocrDir, `${resultId}.json`);
  const imagePath = path.join(ocrDir, `${resultId}.png`);

  try {
    const jsonData = await fs.promises.readFile(jsonPath, 'utf-8');
    const imageData = await fs.promises.readFile(imagePath, 'base64');
    return {
      image: `data:image/png;base64,${imageData}`,
      results: JSON.parse(jsonData),
    };
  } catch {
    return null;
  }
});

ipcMain.handle('ocr:delete-result', async (event, projectPath: string, resultId: string) => {
  const ocrDir = path.join(projectPath, 'ocr');
  const jsonPath = path.join(ocrDir, `${resultId}.json`);
  const imagePath = path.join(ocrDir, `${resultId}.png`);
  try {
    await fs.promises.unlink(jsonPath);
    await fs.promises.unlink(imagePath);
  } catch (error) {
    console.error(`Failed to delete OCR result ${resultId}:`, error);
  }
});

ipcMain.handle('ocr:rename', async (event, projectPath: string, oldName: string, newName: string) => {
  const ocrDir = path.join(projectPath, 'ocr');
  const oldJsonPath = path.join(ocrDir, `${oldName}.json`);
  const newJsonPath = path.join(ocrDir, `${newName}.json`);
  const oldImagePath = path.join(ocrDir, `${oldName}.png`);
  const newImagePath = path.join(ocrDir, `${newName}.png`);

  try {
    await fs.promises.rename(oldJsonPath, newJsonPath);
  } catch (error) {
    console.error(`Failed to rename OCR JSON file ${oldName}:`, error);
    return false;
  }

  try {
    await fs.promises.rename(oldImagePath, newImagePath);
  } catch (error) {
    console.error(`Failed to rename OCR image file ${oldName}:`, error);
    // Attempt to revert the JSON file rename
    try {
      await fs.promises.rename(newJsonPath, oldJsonPath);
    } catch (revertError) {
      console.error(`Failed to revert JSON file rename for ${oldName}:`, revertError);
    }
    return false;
  }

  return true;
});


// IPC Handlers for electron-store
ipcMain.handle('store:get', (event, key: keyof StoreSchema) => {
  return store.get(key);
});

ipcMain.on('store:set', (event, key: keyof StoreSchema, value: any) => {
  if (key === 'lastProjectPath' && typeof value === 'string') {
    const recentProjects = store.get('recentProjects', []);
    const updatedRecent = [value, ...recentProjects.filter(p => p !== value)].slice(0, 10);
    store.set('recentProjects', updatedRecent);
  }
  store.set(key, value);
});

ipcMain.handle('get-app-path', async () => {
  return app.getAppPath();
});