import { Box } from './pages/AnnotationTool/Canvas';

import { OcrResult } from './services/ocr';

export interface IElectronAPI {
  createProject: (projectName: string) => Promise<string | null>;
  openProject: () => Promise<string | null>;
  listProjectFiles: (projectPath: string) => Promise<{ annotations: string[]; ocr: string[] }>;
  saveAnnotations: (projectPath: string, imageName: string, boxes: Box[]) => Promise<void>;
  saveOcrResult: (projectPath: string, originalImageName: string, ocrImageBase64: string, results: OcrResult[]) => Promise<string | null>;
  renameOcrResult: (projectPath: string, oldName: string, newName: string) => Promise<boolean>;
  listOcrResults: (projectPath: string) => Promise<string[]>;
  loadOcrResult: (projectPath: string, resultId: string) => Promise<{ image: string; results: OcrResult[] } | null>;
  deleteOcrResult: (projectPath: string, resultId: string) => Promise<void>;
  getStoreValue: (key: string) => Promise<any>;
  setStoreValue: (key: string, value: any) => void;
  getAppPath: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}