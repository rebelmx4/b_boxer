import React, { useState } from 'react';
import './ProjectMenu.css';

import { IElectronAPI } from '../electron';

interface ProjectMenuProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onRefreshProject: () => void;
  onOpenRecent: (path: string) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

const ProjectMenu: React.FC<ProjectMenuProps> = ({ onNewProject, onOpenProject, onRefreshProject, onOpenRecent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  const handleToggle = async () => {
    if (!isOpen) {
      if (window.electronAPI) {
        const recents = await window.electronAPI.getStoreValue('recentProjects');
        setRecentProjects(recents || []);
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="project-menu-container">
      <button onClick={handleToggle} className="project-menu-button">
        Project Menu
      </button>
      {isOpen && (
        <div className="project-menu-dropdown">
          <ul>
            <li onClick={onNewProject}>New Project</li>
            <li onClick={onOpenProject}>Open Project Directory</li>
            <li onClick={onRefreshProject}>Refresh Project</li>
            <li className="separator">Recent Projects</li>
            {recentProjects.length > 0 ? (
              recentProjects.map(path => (
                <li key={path} onClick={() => onOpenRecent(path)} className="recent-item">
                  {path.split(/[\\/]/).pop()}
                </li>
              ))
            ) : (
              <li className="disabled">No recent projects</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProjectMenu;