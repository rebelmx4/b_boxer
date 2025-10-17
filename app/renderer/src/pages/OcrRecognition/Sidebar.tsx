import React from 'react';
import './Sidebar.css';

interface OcrHistoryItem {
  id: string; // e.g., the image name
  timestamp: number;
}

interface SidebarProps {
  history: OcrHistoryItem[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ history, onSelect, onDelete, onRename }) => {
  return (
    <div className="sidebar-container">
      <h2>OCR History</h2>
      <div className="history-list">
        {history.map(item => (
          <div key={item.id} className="history-item">
            <span onClick={() => onSelect(item.id)}>
              {item.id}
            </span>
            <div>
              <button onClick={() => {
                const newName = prompt('Enter new name for ' + item.id);
                if (newName) onRename(item.id, newName);
              }}>Rename</button>
              <button onClick={() => onDelete(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;