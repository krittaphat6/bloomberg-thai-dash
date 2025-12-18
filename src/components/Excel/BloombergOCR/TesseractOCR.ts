// Tesseract.js based OCR for Bloomberg Terminal images
import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
}

export interface ExtractedTableRow {
  rowNumber: number;
  rank?: string;
  name: string;
  ticker: string;
  field: string;
  position: string;
  posChg: string;
  pctOut: string;
  currMV: string;
  filingDate: string;
}

export interface ProcessingProgress {
  current: number;
  total: number;
  status: string;
  percentage: number;
}

// Preprocess image for better OCR results
export const preprocessImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Bloomberg terminal has dark background with colored text
      // Convert to high contrast black and white
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate brightness
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // Check for colored text (green, yellow, white) on dark background
        const isGreen = g > 150 && r < 150;
        const isYellow = r > 200 && g > 200 && b < 150;
        const isWhite = r > 180 && g > 180 && b > 180;
        const isOrange = r > 200 && g > 100 && g < 200 && b < 100;
        
        // Invert colors for OCR - make text black on white
        if (isGreen || isYellow || isWhite || isOrange || brightness > 100) {
          data[i] = 0;     // R
          data[i + 1] = 0; // G
          data[i + 2] = 0; // B
        } else {
          data[i] = 255;     // R
          data[i + 1] = 255; // G
          data[i + 2] = 255; // B
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Return as data URL
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Alternative preprocessing - enhanced for Bloomberg terminal
export const preprocessImageEnhanced = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Scale up for better OCR
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Enable image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw scaled image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Process pixels
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Detect text colors
        const isText = 
          (g > 150 && r < 100 && b < 100) || // Green
          (r > 200 && g > 200 && b < 100) || // Yellow
          (r > 200 && g > 100 && b < 50) ||  // Orange
          (r > 200 && g > 200 && b > 200) || // White
          (r > 180 && g < 50 && b < 50);     // Red
        
        if (isText) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        } else {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Run OCR on image
export const runOCR = async (
  imageSource: string | File,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<OCRResult> => {
  try {
    let imageUrl: string;
    
    if (typeof imageSource === 'string') {
      imageUrl = imageSource;
    } else {
      // Preprocess the image first
      imageUrl = await preprocessImageEnhanced(imageSource);
    }
    
    const result = await Tesseract.recognize(
      imageUrl,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress({
              current: Math.round(m.progress * 100),
              total: 100,
              status: 'Recognizing text...',
              percentage: m.progress * 100
            });
          }
        }
      }
    );
    
    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  } catch (error) {
    console.error('OCR error:', error);
    throw error;
  }
};

// Parse OCR text into table rows
export const parseBloombergTable = (text: string): ExtractedTableRow[] => {
  const rows: ExtractedTableRow[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let rowNumber = 0;
  
  for (const line of lines) {
    // Skip header lines
    if (line.includes('Security') || line.includes('Ticker') || line.includes('Position')) {
      continue;
    }
    
    // Try to parse as data row
    // Bloomberg format: NO Security Ticker Source Position PosChg %Out CurrMV FilingDate
    
    // Pattern for rows starting with number
    const rowMatch = line.match(/^(\d+)\s+(.+)/);
    if (rowMatch) {
      rowNumber++;
      const parts = line.split(/\s{2,}/); // Split by 2+ spaces
      
      if (parts.length >= 4) {
        rows.push({
          rowNumber,
          rank: parts[0]?.trim() || String(rowNumber),
          name: parts[1]?.trim() || '',
          ticker: parts[2]?.trim() || '',
          field: 'ULT-AGG',
          position: parts[3]?.trim() || '',
          posChg: parts[4]?.trim() || '',
          pctOut: parts[5]?.trim() || '',
          currMV: parts[6]?.trim() || '',
          filingDate: parts[7]?.trim() || ''
        });
      }
    }
  }
  
  return rows;
};

// Advanced table parsing with better pattern matching
export const parseBloombergTableAdvanced = (text: string): ExtractedTableRow[] => {
  const rows: ExtractedTableRow[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  // Common patterns in Bloomberg terminal
  const tickerPattern = /[A-Z0-9]+\s+(US|JP|HK|LN|GY|FP|CN|IN|AU|SP|TB|IT)/i;
  const numberPattern = /[\d,]+(?:\.\d+)?/;
  const datePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}/;
  const percentPattern = /[+-]?\d+(?:\.\d+)?%?/;
  const marketValuePattern = /[\d,.]+(?:MLN|BLN|K)?/i;
  
  let rowNumber = 0;
  
  for (const line of lines) {
    // Skip headers and empty lines
    if (!line.trim() || 
        line.includes('Security') && line.includes('Ticker') ||
        line.includes('Position') && line.includes('Source')) {
      continue;
    }
    
    // Check if line starts with a row number
    const startsWithNumber = /^\d+[\s\)]/.test(line.trim());
    
    if (startsWithNumber || tickerPattern.test(line)) {
      rowNumber++;
      
      // Try to extract structured data
      const tickerMatch = line.match(tickerPattern);
      const dateMatch = line.match(datePattern);
      const numbers = line.match(new RegExp(numberPattern.source, 'g')) || [];
      
      // Extract name (text before ticker)
      let name = '';
      if (tickerMatch && tickerMatch.index !== undefined) {
        const beforeTicker = line.substring(0, tickerMatch.index);
        name = beforeTicker.replace(/^\d+[\s\)]+/, '').trim();
      }
      
      rows.push({
        rowNumber,
        rank: String(rowNumber),
        name: name || `Row ${rowNumber}`,
        ticker: tickerMatch ? tickerMatch[0] : '',
        field: 'ULT-AGG',
        position: numbers[0] || '',
        posChg: numbers[1] || '',
        pctOut: numbers[2] || '',
        currMV: numbers[3] || '',
        filingDate: dateMatch ? dateMatch[0] : ''
      });
    }
  }
  
  return rows;
};

// Process multiple images
export const processMultipleImages = async (
  files: File[],
  onProgress?: (progress: ProcessingProgress) => void
): Promise<ExtractedTableRow[]> => {
  const allRows: ExtractedTableRow[] = [];
  let globalRowNumber = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (onProgress) {
      onProgress({
        current: i,
        total: files.length,
        status: `Processing image ${i + 1}/${files.length}`,
        percentage: (i / files.length) * 100
      });
    }
    
    try {
      const result = await runOCR(file, (p) => {
        if (onProgress) {
          onProgress({
            current: i,
            total: files.length,
            status: `Image ${i + 1}: ${p.status}`,
            percentage: ((i + p.percentage / 100) / files.length) * 100
          });
        }
      });
      
      const rows = parseBloombergTableAdvanced(result.text);
      
      // Renumber rows to be continuous
      for (const row of rows) {
        globalRowNumber++;
        row.rowNumber = globalRowNumber;
        row.rank = String(globalRowNumber);
        allRows.push(row);
      }
    } catch (error) {
      console.error(`Error processing image ${i + 1}:`, error);
    }
  }
  
  if (onProgress) {
    onProgress({
      current: files.length,
      total: files.length,
      status: 'Complete',
      percentage: 100
    });
  }
  
  return allRows;
};

// Convert to Excel format
export const convertToExcelData = (rows: ExtractedTableRow[]): Record<string, string> => {
  const data: Record<string, string> = {};
  
  // Headers
  const headers = ['Rk', 'Name', 'Ticker', 'Field', 'Position', 'Pos Chg', '% Out', 'Curr MV', 'Filing Date'];
  headers.forEach((header, idx) => {
    const col = String.fromCharCode(65 + idx);
    data[`${col}1`] = header;
  });
  
  // Data rows
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    data[`A${rowNum}`] = row.rank || String(row.rowNumber);
    data[`B${rowNum}`] = row.name;
    data[`C${rowNum}`] = row.ticker;
    data[`D${rowNum}`] = row.field;
    data[`E${rowNum}`] = row.position;
    data[`F${rowNum}`] = row.posChg;
    data[`G${rowNum}`] = row.pctOut;
    data[`H${rowNum}`] = row.currMV;
    data[`I${rowNum}`] = row.filingDate;
  });
  
  return data;
};
