import React, { useState, useEffect } from 'react';
import './App.css';
import ProjectMenu from './components/ProjectMenu';
import Modal from './components/Modal';

import AnnotationTool from './pages/AnnotationTool/AnnotationTool';

import OcrRecognition from './pages/OcrRecognition/OcrRecognition';

type Tab = 'annotation' | 'ocr';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('annotation');
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [pendingOcrImage, setPendingOcrImage] = useState<string | null>(null);
  const [annotationFiles, setAnnotationFiles] = useState<string[]>([]);
  const [ocrFiles, setOcrFiles] = useState<string[]>([]);

  useEffect(() => {
    if (window.electronAPI) {
      // Load the last opened project on startup
      window.electronAPI.getStoreValue('lastProjectPath').then(path => {
        if (path) {
          setCurrentProject(path);
        } else {
          // If no recent project, prompt to create one
          setIsNewProjectModalOpen(true);
        }
      });
    } else {
      // In browser environment, always prompt for new project
      setIsNewProjectModalOpen(true);
    }
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName) return;
    if (window.electronAPI) {
      const projectPath = await window.electronAPI.createProject(newProjectName);
      if (projectPath) {
        setCurrentProject(projectPath);
        window.electronAPI.setStoreValue('lastProjectPath', projectPath);
        setIsNewProjectModalOpen(false);
        setNewProjectName('');
      }
    } else {
      // In browser, just simulate project creation
      setCurrentProject(newProjectName);
      setIsNewProjectModalOpen(false);
      setNewProjectName('');
    }
  };

  const handleOpenProject = async () => {
    if (window.electronAPI) {
      const projectPath = await window.electronAPI.openProject();
      if (projectPath) {
        setCurrentProject(projectPath);
        window.electronAPI.setStoreValue('lastProjectPath', projectPath);
      }
    } else {
      alert('Opening projects is not supported in the browser.');
    }
  };

  const handleOpenRecent = (path: string) => {
    setCurrentProject(path);
    if (window.electronAPI) {
      window.electronAPI.setStoreValue('lastProjectPath', path);
    }
  };

  const handleRefreshProject = async () => {
    if (window.electronAPI && currentProject) {
      const files = await window.electronAPI.listProjectFiles(currentProject);
      setAnnotationFiles(files.annotations);
      setOcrFiles(files.ocr);
    }
  };

  useEffect(() => {
    if (currentProject) {
      handleRefreshProject();
    }
  }, [currentProject]);


  const handleOcrRequestFromAnnotation = (imageData: string) => {
    setPendingOcrImage(imageData);
    setActiveTab('ocr');
  };

  const clearPendingOcr = () => {
    setPendingOcrImage(null);
  }

  const renderContent = () => {
    if (!currentProject) {
      return <div>Please create or open a project to begin.</div>;
    }
    switch (activeTab) {
      case 'annotation':
        return <AnnotationTool projectPath={currentProject} onOcrRequest={handleOcrRequestFromAnnotation} annotationFiles={annotationFiles} />;
      case 'ocr':
        return <OcrRecognition projectPath={currentProject} pendingImage={pendingOcrImage} onProcessingComplete={clearPendingOcr} ocrFiles={ocrFiles} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Annotation & OCR Tool</h1>
        <div className="project-info">
          Project: {currentProject ? currentProject.split(/[\\/]/).pop() : 'None'}
        </div>
        <ProjectMenu
          onNewProject={() => setIsNewProjectModalOpen(true)}
          onOpenProject={handleOpenProject}
          onRefreshProject={handleRefreshProject}
          onOpenRecent={handleOpenRecent}
        />
      </header>
      <div className="main-content">
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'annotation' ? 'active' : ''}`}
            onClick={() => setActiveTab('annotation')}
          >
            Annotation Tool
          </button>
          <button
            className={`tab-button ${activeTab === 'ocr' ? 'active' : ''}`}
            onClick={() => setActiveTab('ocr')}
          >
            OCR Recognition
          </button>
        </div>
        <div className="content">
          {renderContent()}
        </div>
      </div>

      <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)}>
        <h2>Create New Project</h2>
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="Enter project name"
        />
        <button onClick={handleCreateProject}>Create</button>
      </Modal>
    </div>
  );
}

export default App;