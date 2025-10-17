import React, { useState, useRef, useEffect, useCallback } from 'react';
import './AnnotationTool.css';
import { useHistory } from '../../hooks/useHistory';
import { useDebounce } from '../../hooks/useDebounce';

import Canvas, { Box } from './Canvas';
import Sidebar from './Sidebar';

const AnnotationTool = ({ projectPath, onOcrRequest, annotationFiles }: { projectPath: string, onOcrRequest: (imageData: string) => void, annotationFiles: string[] }) => {
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const { state: boxes, setState: setBoxes, undo, redo, canUndo, canRedo } = useHistory<Box[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    console.log('Annotation files updated:', annotationFiles);
  }, [annotationFiles]);

  const debouncedBoxes = useDebounce(boxes, 2000);

  useEffect(() => {
    if (window.electronAPI && debouncedBoxes && projectPath && imageName) {
      window.electronAPI.saveAnnotations(projectPath, imageName, debouncedBoxes);
    }
  }, [debouncedBoxes, projectPath, imageName]);

  const handleBoxCreate = (box: Omit<Box, 'id'>) => {
    const newBox = { ...box, id: nextId.current++ };
    setBoxes([...boxes, newBox]);
    setSelectedBoxId(newBox.id);
  };

  const handleOcrRequest = (boxId: number) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box || !image) return;

    const img = new Image();
    img.src = image;
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = box.width;
      tempCanvas.height = box.height;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
      onOcrRequest(tempCanvas.toDataURL());
    };
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z') {
      undo();
    }
    if (e.ctrlKey && e.key === 'y') {
      redo();
    }
  }, [undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="annotation-tool-layout">
      <Sidebar
        boxes={boxes}
        selectedBoxId={selectedBoxId}
        onBoxSelect={setSelectedBoxId}
        onBoxCreate={handleBoxCreate}
        onOcrRequest={handleOcrRequest}
      />
      <div className="main-content-area">
        <Canvas
          image={image}
          onImageChange={(imageData, name) => {
            setImage(imageData);
            setImageName(name);
          }}
          boxes={boxes}
          setBoxes={setBoxes}
          selectedBoxId={selectedBoxId}
          setSelectedBoxId={setSelectedBoxId}
        />
      </div>
    </div>
  );
};

export default AnnotationTool;