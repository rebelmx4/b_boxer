export interface OcrResult {
  text: string;
  box: [number, number, number, number];
}

export interface OcrResponse {
  prunedResult: {
    rec_texts: string[];
    rec_boxes: [number, number, number, number][];
  };
  ocrImage: string; // base64 encoded image
}

const OCR_API_URL = 'http://10.20.6.31:8080/ocr';

/**
 * Converts a data URL (e.g., from a FileReader) to a base64 string.
 * @param dataUrl The data URL to convert.
 * @returns The base64 encoded string.
 */
function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(',')[1];
}

export const performOcr = async (imageDataUrl: string): Promise<OcrResponse | null> => {
  const base64Image = dataUrlToBase64(imageDataUrl);

  const payload = {
    file: base64Image,
    fileType: 1, // 1 represents an image file
    visualize: true,
  };

  try {
    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`OCR API request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.errorCode !== 0) {
      throw new Error(`OCR API returned an error: ${data.errorMsg || 'Unknown error'}`);
    }

    const ocrResult = data.result.ocrResults[0];
    return {
      prunedResult: ocrResult.prunedResult,
      ocrImage: ocrResult.ocrImage,
    };

  } catch (error) {
    console.error('Failed to perform OCR:', error);
    // In a real app, you'd want to show this error to the user
    alert(`OCR Request Failed: ${error.message}`);
    return null;
  }
};