import React, { useState, useEffect, useCallback } from 'react';
import './OcrRecognition.css';
import { performOcr, OcrResult } from '../../services/ocr';
import TooltipCanvas from './TooltipCanvas';
import Sidebar, { OcrHistoryItem } from './Sidebar';

interface OcrRecognitionProps {
  projectPath: string;
  pendingImage: string | null;
  onProcessingComplete: () => void;
  ocrFiles: string[];
}

const OcrRecognition: React.FC<OcrRecognitionProps> = ({ projectPath, pendingImage, onProcessingComplete, ocrFiles }) => {
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [displayMode, setDisplayMode] = useState<'extended' | 'tooltip'>('extended');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<OcrHistoryItem[]>([]);

  useEffect(() => {
    const historyItems = ocrFiles.map(id => ({ id, timestamp: parseInt(id.split('-').pop() || '0') }));
    setHistory(historyItems.sort((a, b) => b.timestamp - a.timestamp));
  }, [ocrFiles]);

  useEffect(() => {
    if (pendingImage) {
      const name = `cropped-${Date.now()}.png`;
      handleImageLoad(pendingImage, name);
      onProcessingComplete();
    }
  }, [pendingImage, onProcessingComplete]);

  const handleImageLoad = async (imageDataUrl: string, name: string) => {
    setImage(imageDataUrl);
    setImageName(name);
    setIsLoading(true);
    setOcrResults([]);
    setOcrImage(null);

    const result = await performOcr(imageDataUrl);
    if (result) {
      const combinedResults: OcrResult[] = result.prunedResult.rec_texts.map((text, index) => ({
        text,
        box: result.prunedResult.rec_boxes[index],
      }));
      setOcrResults(combinedResults);
      setOcrImage(`data:image/png;base64,${result.ocrImage}`);

      if (window.electronAPI) {
        // Save the result
        await window.electronAPI.saveOcrResult(projectPath, name, result.ocrImage, combinedResults);
        loadHistory(); // Refresh history
      }
    }
    setIsLoading(false);
  };

  const handleSelectHistory = async (resultId: string) => {
    if (window.electronAPI) {
      const data = await window.electronAPI.loadOcrResult(projectPath, resultId);
      if (data) {
        // For simplicity, we'll just show the extended view of the saved OCR image
        setImage(null); // Clear any original image
        setOcrImage(data.image);
        setOcrResults(data.results);
        setDisplayMode('extended');
      }
    }
  };

  const handleDeleteHistory = async (resultId: string) => {
    if (window.electronAPI && window.confirm(`Are you sure you want to delete ${resultId}?`)) {
      await window.electronAPI.deleteOcrResult(projectPath, resultId);
      loadHistory(); // Refresh history
    }
  };

  const handleRenameHistory = async (resultId: string, newName: string) => {
    if (window.electronAPI) {
      const success = await window.electronAPI.renameOcrResult(projectPath, resultId, newName);
      if (success) {
        loadHistory();
      } else {
        alert('Failed to rename result. The name may already exist.');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => handleImageLoad(event.target!.result as string, file.name);
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
          const name = `pasted-image-${Date.now()}.png`;
          reader.onload = (event) => handleImageLoad(event.target!.result as string, name);
          reader.readAsDataURL(blob);
        }
        break;
      }
    }
  };

  const renderDisplay = () => {
    if (isLoading) {
      return <div className="placeholder">Performing OCR...</div>;
    }
    if (displayMode === 'extended' && ocrImage) {
      return <img src={ocrImage} alt="OCR Result" />;
    }
    if (displayMode === 'tooltip' && image && ocrResults.length > 0) {
      return <TooltipCanvas image={image} results={ocrResults} />;
    }
    if (image) {
      return <img src={image} alt="Original for OCR" />;
    }
    if (ocrImage) { // Fallback for loaded history items
        return <img src={ocrImage} alt="OCR Result" />;
    }
    return (
      <div className="placeholder">
        Drop an image here or paste to start OCR
      </div>
    );
  };

  return (
    <div
      className="ocr-recognition-layout"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
    >
      <Sidebar
        history={history}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
        onRename={handleRenameHistory}
      />
      <div className="main-content-area">
        <div className="ocr-controls">
          <button onClick={() => setDisplayMode('extended')}>Extended View</button>
          <button onClick={() => setDisplayMode('tooltip')}>Tooltip View</button>
        </div>
        <div className="ocr-display-area">
          {renderDisplay()}
        </div>
      </div>
    </div>
  );
};

export default OcrRecognition;