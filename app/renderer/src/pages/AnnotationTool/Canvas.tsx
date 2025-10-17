import React, { useRef, useEffect, useState, useCallback } from 'react';
import './Canvas.css';

// Data structures
export interface Point { x: number; y: number; }
export interface Box { id: number; x: number; y: number; width: number; height: number; }
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

interface CanvasProps {
  image: string | null;
  onImageChange: (imageData: string, name: string) => void;
  boxes: Box[];
  setBoxes: React.Dispatch<React.SetStateAction<Box[]>>;
  selectedBoxId: number | null;
  setSelectedBoxId: (id: number | null) => void;
}

const Canvas: React.FC<CanvasProps> = ({ image, onImageChange, boxes, setBoxes, selectedBoxId, setSelectedBoxId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeHandle | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);

  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [cursor, setCursor] = useState('crosshair');
  const [nextId, setNextId] = useState(1);

  const getMousePos = useCallback((e: React.MouseEvent | MouseEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom,
    };
  }, [panOffset, zoom]);

  // Main drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement!.clientWidth;
    canvas.height = canvas.parentElement!.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    ctx.drawImage(imgElement, 0, 0);

    boxes.forEach(box => {
      const isSelected = box.id === selectedBoxId;
      ctx.strokeStyle = isSelected ? '#007acc' : 'red';
      ctx.lineWidth = isSelected ? 3 / zoom : 2 / zoom;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      if (isSelected) {
        // Draw resize handles
        const handleSize = 8 / zoom;
        ctx.fillStyle = '#007acc';
        const { x, y, width, height } = box;
        const handles = [
          { x: x, y: y }, { x: x + width / 2, y: y }, { x: x + width, y: y },
          { x: x, y: y + height / 2 }, { x: x + width, y: y + height / 2 },
          { x: x, y: y + height }, { x: x + width / 2, y: y + height }, { x: x + width, y: y + height }
        ];
        handles.forEach(handle => {
          ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        });
      }
    });

    ctx.restore();
  }, [imgElement, boxes, panOffset, zoom, selectedBoxId]);

  useEffect(() => {
    if (image) {
      const img = new Image();
      img.src = image;
      img.onload = () => {
        setImgElement(img);
        setPanOffset({ x: 0, y: 0 });
        setZoom(1);
        setBoxes([]);
        setSelectedBoxId(null);
      }
    }
  }, [image, setBoxes, setSelectedBoxId]);

  const getHandleUnderMouse = useCallback((box: Box, pos: Point): ResizeHandle | null => {
    const handleSize = 8 / zoom;
    const { x, y, width, height } = box;
    if (Math.abs(pos.x - x) < handleSize && Math.abs(pos.y - y) < handleSize) return 'nw';
    if (Math.abs(pos.x - (x + width)) < handleSize && Math.abs(pos.y - y) < handleSize) return 'ne';
    if (Math.abs(pos.x - x) < handleSize && Math.abs(pos.y - (y + height)) < handleSize) return 'sw';
    if (Math.abs(pos.x - (x + width)) < handleSize && Math.abs(pos.y - (y + height)) < handleSize) return 'se';
    if (Math.abs(pos.x - (x + width / 2)) < handleSize && Math.abs(pos.y - y) < handleSize) return 'n';
    if (Math.abs(pos.x - (x + width / 2)) < handleSize && Math.abs(pos.y - (y + height)) < handleSize) return 's';
    if (Math.abs(pos.x - x) < handleSize && Math.abs(pos.y - (y + height / 2)) < handleSize) return 'w';
    if (Math.abs(pos.x - (x + width)) < handleSize && Math.abs(pos.y - (y + height / 2)) < handleSize) return 'e';
    return null;
  }, [zoom]);

  const isPointInBox = (point: Point, box: Box) => {
    return point.x >= box.x && point.x <= box.x + box.width &&
           point.y >= box.y && point.y <= box.y + box.height;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.altKey) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = getMousePos(e);
    if (!pos) return;

    const selectedBox = boxes.find(b => b.id === selectedBoxId);
    if (selectedBox) {
      const handle = getHandleUnderMouse(selectedBox, pos);
      if (handle) {
        setIsResizing(handle);
        setStartPoint(pos);
        return;
      }
    }

    const boxUnderMouse = boxes.slice().reverse().find(b => isPointInBox(pos, b));
    if (boxUnderMouse) {
      setSelectedBoxId(boxUnderMouse.id);
      setIsMoving(true);
      setStartPoint(pos);
    } else {
      setSelectedBoxId(null);
      setIsDrawing(true);
      setStartPoint(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && lastPanPoint) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPanOffset({ x: panOffset.x + dx, y: panOffset.y + dy });
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = getMousePos(e);
    if (!pos || !startPoint) {
      // Update cursor even if not dragging
      const selectedBox = boxes.find(b => b.id === selectedBoxId);
      let newCursor = 'crosshair';
      if (selectedBox) {
        const handle = getHandleUnderMouse(selectedBox, getMousePos(e)!);
        if (handle) { newCursor = `${handle}-resize`; }
        else if (isPointInBox(getMousePos(e)!, selectedBox)) { newCursor = 'move'; }
      } else {
        const boxUnderMouse = boxes.slice().reverse().find(b => isPointInBox(getMousePos(e)!, b));
        if (boxUnderMouse) newCursor = 'pointer';
      }
      setCursor(newCursor);
      return;
    }

    if (isResizing) {
      const currentBox = boxes.find(b => b.id === selectedBoxId);
      if (!currentBox) return;
      let { x, y, width, height } = currentBox;
      const dx = pos.x - startPoint.x;
      const dy = pos.y - startPoint.y;

      switch (isResizing) {
        case 'n': y += dy; height -= dy; break;
        case 's': height += dy; break;
        case 'w': x += dx; width -= dx; break;
        case 'e': width += dx; break;
        case 'nw': x += dx; y += dy; width -= dx; height -= dy; break;
        case 'ne': y += dy; width += dx; height -= dy; break;
        case 'sw': x += dx; width -= dx; height += dy; break;
        case 'se': width += dx; height += dy; break;
      }

      setBoxes(boxes.map(b => b.id === selectedBoxId ? { ...b, x, y, width, height } : b));
      setStartPoint(pos);

    } else if (isMoving) {
      const dx = pos.x - startPoint.x;
      const dy = pos.y - startPoint.y;
      setBoxes(boxes.map(b => b.id === selectedBoxId ? { ...b, x: b.x + dx, y: b.y + dy } : b));
      setStartPoint(pos);
    } else if (isDrawing) {
      // Drawing preview could be implemented here by drawing on a temporary canvas
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDrawing && startPoint) {
      const endPoint = getMousePos(e);
      if (endPoint) {
        const newBox: Box = {
          id: nextId,
          x: Math.min(startPoint.x, endPoint.x),
          y: Math.min(startPoint.y, endPoint.y),
          width: Math.abs(startPoint.x - endPoint.x),
          height: Math.abs(startPoint.y - endPoint.y),
        };
        if (newBox.width > 5 && newBox.height > 5) {
          setBoxes([...boxes, newBox]);
          setNextId(nextId + 1);
          setSelectedBoxId(newBox.id);
        }
      }
    }
    setIsDrawing(false);
    setIsMoving(false);
    setIsResizing(null);
    setIsPanning(false);
    setStartPoint(null);
    setLastPanPoint(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedBoxId) return;
    const box = boxes.find(b => b.id === selectedBoxId);
    if (!box) return;

    let updatedBox = { ...box };
    const step = 1;

    if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
            case 'ArrowUp': updatedBox.y -= step; updatedBox.height += step; break;
            case 'ArrowDown': updatedBox.y += step; updatedBox.height -= step; break;
            case 'ArrowLeft': updatedBox.x -= step; updatedBox.width += step; break;
            case 'ArrowRight': updatedBox.x += step; updatedBox.width -= step; break;
            default: return;
        }
    }
    else if (e.shiftKey) {
        switch (e.key) {
            case 'ArrowUp': updatedBox.height -= step; break;
            case 'ArrowDown': updatedBox.height += step; break;
            case 'ArrowLeft': updatedBox.width -= step; break;
            case 'ArrowRight': updatedBox.width += step; break;
            default: return;
        }
    } else {
        switch (e.key) {
            case 'ArrowUp': updatedBox.y -= step; break;
            case 'ArrowDown': updatedBox.y += step; break;
            case 'ArrowLeft': updatedBox.x -= step; break;
            case 'ArrowRight': updatedBox.x += step; break;
            case 'Delete':
      case 'Backspace':
        if (window.confirm(`Are you sure you want to delete box ${selectedBoxId}?`)) {
          setBoxes(boxes.filter(b => b.id !== selectedBoxId));
          setSelectedBoxId(null);
        }
        return;
      default: return;
    }
    }
    setBoxes(boxes.map(b => b.id === selectedBoxId ? updatedBox : b));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newZoom = Math.min(Math.max(zoom + scaleAmount, 0.5), 2);

    const mousePos = getMousePos(e);
    if (!mousePos) return;

    const newPanX = panOffset.x - (mousePos.x * scaleAmount * newZoom);
    const newPanY = panOffset.y - (mousePos.y * scaleAmount * newZoom);

    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onImageChange(event.target!.result as string, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const name = `pasted-image-${Date.now()}.png`;
                onImageChange(event.target!.result as string, name);
            };
            reader.readAsDataURL(blob);
        }
        break;
      }
    }
  };

  return (
    <div
      className="canvas-container"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor }}
    >
      {image ? (
        <canvas ref={canvasRef} />
      ) : (
        <div className="canvas-placeholder">
          Drop an image here or paste from clipboard (Ctrl+V)
        </div>
      )}
    </div>
  );
};

export default Canvas;