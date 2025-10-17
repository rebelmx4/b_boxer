import React from 'react';
import { Box } from './Canvas';
import './Sidebar.css';

interface SidebarProps {
  boxes: Box[];
  selectedBoxId: number | null;
  onBoxSelect: (id: number) => void;
  onBoxCreate: (box: Omit<Box, 'id'>) => void;
  onOcrRequest: (boxId: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ boxes, selectedBoxId, onBoxSelect, onBoxCreate, onOcrRequest }) => {
  const [coordInput, setCoordInput] = React.useState('');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCoordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const match = coordInput.match(/\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (match) {
      const [, x, y, w, h] = match.map(Number);
      onBoxCreate({ x, y, width: w, height: h });
      setCoordInput('');
    } else {
      alert('Invalid format. Please use (x, y, w, h)');
    }
  };

  return (
    <div className="sidebar-container">
      <h2>History & Boxes</h2>
      <div className="coord-input-container">
        <form onSubmit={handleCoordSubmit}>
          <input
            type="text"
            placeholder="(x, y, w, h)"
            value={coordInput}
            onChange={(e) => setCoordInput(e.target.value)}
          />
        </form>
      </div>
      <div className="box-list">
        {boxes.map(box => (
          <div
            key={box.id}
            className={`box-item ${box.id === selectedBoxId ? 'selected' : ''}`}
            onClick={() => onBoxSelect(box.id)}
          >
            <div className="box-info">
              {`ID ${box.id}: X:${box.x.toFixed(0)} Y:${box.y.toFixed(0)} W:${box.width.toFixed(0)} H:${box.height.toFixed(0)}`}
            </div>
            <div className="box-actions">
              <button onClick={() => handleCopy(`(${box.x.toFixed(0)}, ${box.y.toFixed(0)}, ${box.width.toFixed(0)}, ${box.height.toFixed(0)})`)}>Copy Tuple</button>
              <button onClick={() => handleCopy(`Rect(left=${box.x.toFixed(0)}, top=${box.y.toFixed(0)}, width=${box.width.toFixed(0)}, height=${box.height.toFixed(0)})`)}>Copy Rect</button>
              <button onClick={() => handleCopy(`(${box.x.toFixed(0)}, ${box.y.toFixed(0)})`)}>Copy Point</button>
              <button onClick={() => onOcrRequest(box.id)}>OCR</button>
              {/* The delete functionality will be handled by the keyboard delete key for now */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;