import React, { useRef, useEffect, useState } from 'react';
import { OcrResult } from '../../services/ocr';
import './TooltipCanvas.css';

interface TooltipCanvasProps {
  image: string;
  results: OcrResult[];
}

const TooltipCanvas: React.FC<TooltipCanvasProps> = ({ image, results }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [hoveredResult, setHoveredResult] = useState<OcrResult | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = image;
    img.onload = () => setImgElement(img);
  }, [image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement!.clientWidth;
    canvas.height = canvas.parentElement!.clientHeight;

    const hRatio = canvas.width / imgElement.width;
    const vRatio = canvas.height / imgElement.height;
    const ratio = Math.min(hRatio, vRatio, 1);
    const centerShift_x = (canvas.width - imgElement.width * ratio) / 2;
    const centerShift_y = (canvas.height - imgElement.height * ratio) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgElement, centerShift_x, centerShift_y, imgElement.width * ratio, imgElement.height * ratio);

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 2;
    results.forEach(result => {
      const [x1, y1, x2, y2] = result.box;
      ctx.strokeRect(
        x1 * ratio + centerShift_x,
        y1 * ratio + centerShift_y,
        (x2 - x1) * ratio,
        (y2 - y1) * ratio
      );
    });

  }, [imgElement, results]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;
    const rect = canvas.getBoundingClientRect();
    const hRatio = canvas.width / imgElement.width;
    const vRatio = canvas.height / imgElement.height;
    const ratio = Math.min(hRatio, vRatio, 1);
    const centerShift_x = (canvas.width - imgElement.width * ratio) / 2;
    const centerShift_y = (canvas.height - imgElement.height * ratio) / 2;

    const x = (e.clientX - rect.left - centerShift_x) / ratio;
    const y = (e.clientY - rect.top - centerShift_y) / ratio;

    const resultUnderMouse = results.find(r => {
      const [x1, y1, x2, y2] = r.box;
      return x >= x1 && x <= x2 && y >= y1 && y <= y2;
    });

    if (resultUnderMouse) {
      setHoveredResult(resultUnderMouse);
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredResult(null);
    }
  };

  return (
    <div className="tooltip-canvas-container" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredResult(null)}>
      <canvas ref={canvasRef} />
      {hoveredResult && tooltipPos && (
        <div className="tooltip" style={{ top: tooltipPos.y + 15, left: tooltipPos.x + 15 }}>
          {hoveredResult.text}
        </div>
      )}
    </div>
  );
};

export default TooltipCanvas;