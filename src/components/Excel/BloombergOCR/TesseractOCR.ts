// Tesseract.js based OCR for Bloomberg Terminal images - Enhanced Version
import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  rows: string[][];
  processedImageUrl?: string;
}

export interface ProcessingProgress {
  status: string;
  progress: number;
}

// Unsharp Mask for sharpening
const applyUnsharpMask = (imageData: ImageData): ImageData => {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data);
  
  // 3x3 sharpening kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4 + c;
        output[idx] = Math.max(0, Math.min(255, sum));
      }
    }
  }
  
  return new ImageData(output, width, height);
};

// Dilation to thicken text
const dilateImage = (imageData: ImageData, iterations: number): ImageData => {
  const { width, height, data } = imageData;
  let current = new Uint8ClampedArray(data);
  
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Uint8ClampedArray(current);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // If current pixel is white (background)
        if (current[idx] > 200) {
          // Check neighbors
          let hasBlackNeighbor = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nidx = ((y + dy) * width + (x + dx)) * 4;
              if (current[nidx] < 50) {
                hasBlackNeighbor = true;
                break;
              }
            }
            if (hasBlackNeighbor) break;
          }
          
          if (hasBlackNeighbor) {
            next[idx] = 0;
            next[idx + 1] = 0;
            next[idx + 2] = 0;
          }
        }
      }
    }
    
    current = next;
  }
  
  return new ImageData(current, width, height);
};

/**
 * Bloomberg OCR using Tesseract.js - Enhanced
 */
export class TesseractOCR {
  
  /**
   * Preprocess image for better OCR (Bloomberg terminal specific)
   */
  static async preprocessImage(imageFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Scale up 3x for better OCR accuracy
        const scale = 3;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Disable smoothing for sharper text
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Apply sharpening first
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        imageData = applyUnsharpMask(imageData);
        ctx.putImageData(imageData, 0, 0);
        
        // Get image data again for color processing
        const processedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = processedData.data;
        
        // Bloomberg terminal: colored text on dark background
        // Convert to black text on white background for OCR
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate brightness
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          
          // Enhanced Bloomberg text color detection
          const isGreen = g > 80 && g > r * 1.3 && g > b * 1.3;
          const isYellow = r > 150 && g > 150 && b < 120 && Math.abs(r - g) < 60;
          const isOrange = r > 180 && g > 100 && g < 200 && b < 80;
          const isAmber = r > 200 && g > 140 && g < 220 && b < 100;
          const isWhite = r > 150 && g > 150 && b > 150;
          const isRed = r > 150 && r > g * 1.5 && r > b * 1.5;
          const isCyan = b > 100 && g > 100 && r < 120;
          const isLightBlue = b > 150 && g > 150 && r < 180;
          
          // Check if pixel is text
          const isText = isGreen || isYellow || isOrange || isAmber || 
                         isWhite || isRed || isCyan || isLightBlue || 
                         brightness > 100;
          
          // Convert to black text on white background
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
        
        ctx.putImageData(processedData, 0, 0);
        
        // Apply dilation to thicken text
        const finalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dilated = dilateImage(finalData, 1);
        ctx.putImageData(dilated, 0, 0);
        
        resolve(canvas.toDataURL('image/png', 1.0));
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  }

  /**
   * Process single image and extract text
   */
  static async processImage(
    imageSource: string | File,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<OCRResult> {
    
    let imageUrl: string;
    let processedImageUrl: string | undefined;
    
    if (typeof imageSource === 'string') {
      imageUrl = imageSource;
      processedImageUrl = imageSource;
    } else {
      // Preprocess the image first
      if (onProgress) onProgress({ status: 'Preprocessing...', progress: 5 });
      imageUrl = await this.preprocessImage(imageSource);
      processedImageUrl = imageUrl;
    }
    
    if (onProgress) onProgress({ status: 'Starting OCR...', progress: 10 });
    
    // Use createWorker for better control
    const worker = await Tesseract.createWorker('eng');
    
    // Set parameters for table recognition
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,+-/%()$ ',
      preserve_interword_spaces: '1',
    });
    
    const result = await worker.recognize(imageUrl);

    await worker.terminate();

    const text = result.data.text;
    const confidence = result.data.confidence;
    
    if (onProgress) onProgress({ status: 'Parsing results...', progress: 95 });
    
    // Parse text into rows
    const rows = this.parseBloombergText(text);
    
    if (onProgress) onProgress({ status: 'Complete', progress: 100 });
    
    return { text, confidence, rows, processedImageUrl };
  }

  /**
   * Process multiple images in sequence
   */
  static async processMultipleImages(
    images: File[],
    onProgress?: (imageIndex: number, progress: ProcessingProgress) => void
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const result = await this.processImage(
        images[i],
        (progress) => onProgress?.(i, progress)
      );
      results.push(result);
    }
    
    return results;
  }

  /**
   * Parse Bloomberg text into structured rows - Improved algorithm
   */
  static parseBloombergText(text: string): string[][] {
    const lines = text.split('\n').filter(line => line.trim());
    const rows: string[][] = [];
    
    // Common patterns
    const tickerPattern = /([A-Z0-9]{1,10})\s+(US|JP|HK|LN|GY|FP|CN|IN|AU|SP|TB|IT|SW|C|IM|SS|SZ|KS|TT|PM|IJ|MK|NZ|AB|AV|BB|CT|DC|FH|GA|GR|ID|IR|LI|MC|NA|NO|PL|PW|RO|SM|SE|VX)\b/i;
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/;
    const numberWithCommas = /[\d,]+(?:\.\d+)?/g;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip header lines
      if (this.isHeaderRow([trimmedLine])) continue;
      if (trimmedLine.length < 10) continue;
      
      // Check if line starts with a row number or contains a ticker
      const startsWithNumber = /^\d+[\s\)\.]+/.test(trimmedLine);
      const hasTicker = tickerPattern.test(trimmedLine);
      
      if (!startsWithNumber && !hasTicker) continue;
      
      // Extract row number
      const rowNumMatch = trimmedLine.match(/^(\d+)[\s\)\.]*/);
      const rowNum = rowNumMatch ? rowNumMatch[1] : '';
      
      // Extract ticker
      const tickerMatch = trimmedLine.match(tickerPattern);
      const ticker = tickerMatch ? `${tickerMatch[1]} ${tickerMatch[2]}` : '';
      
      // Extract security name (text before ticker)
      let security = '';
      if (tickerMatch && tickerMatch.index !== undefined) {
        security = trimmedLine
          .substring(0, tickerMatch.index)
          .replace(/^\d+[\s\)\.]+/, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
      
      // Extract date
      const dateMatch = trimmedLine.match(datePattern);
      const filingDate = dateMatch ? dateMatch[1] : '';
      
      // Extract numbers
      const numbers = trimmedLine.match(numberWithCommas) || [];
      const cleanNumbers = numbers
        .filter(n => n !== rowNum && !n.includes('/'))
        .map(n => n.replace(/,/g, ''));
      
      // Identify specific values
      let position = '';
      let posChg = '';
      let pctOut = '';
      let currMV = '';
      
      // Find position change (usually has +/- prefix)
      const posChgMatch = trimmedLine.match(/([+-]\s*[\d,]+)/);
      if (posChgMatch) {
        posChg = posChgMatch[1].replace(/\s/g, '');
      }
      
      // Find percentage (small decimal number)
      const pctMatch = trimmedLine.match(/(\d+\.\d{2,4})\s*$/);
      if (pctMatch) {
        pctOut = pctMatch[1];
      } else {
        for (const num of cleanNumbers) {
          const val = parseFloat(num);
          if (!isNaN(val) && val < 100 && num.includes('.') && val > 0) {
            if (!pctOut) pctOut = num;
          }
        }
      }
      
      // Find position (large integer)
      for (const num of cleanNumbers) {
        const numVal = parseFloat(num);
        if (numVal > 10000 && !num.includes('.') && !num.startsWith('+') && !num.startsWith('-')) {
          if (!position) position = num;
        }
      }
      
      // Find market value
      const mvMatch = trimmedLine.match(/([\d,.]+)\s*(?:MLN|BLN|M|B)/i);
      if (mvMatch) {
        currMV = mvMatch[0];
      }
      
      // Build row
      const row = [
        rowNum,
        security,
        ticker,
        'ULT-AGG',
        position,
        posChg,
        pctOut,
        currMV,
        filingDate
      ];
      
      // Only add if we have meaningful data
      if (ticker || security || position) {
        rows.push(row);
      }
    }
    
    return rows;
  }

  /**
   * Check if row is a header row
   */
  static isHeaderRow(row: string[]): boolean {
    const headerKeywords = [
      'security', 'ticker', 'position', 'source', 'filing',
      'no.', 'pos chg', 'pct', 'mkt val', 'date', 'field',
      'holdings', 'region', 'num of', '%', 'curr', 'name', 'rk'
    ];
    const rowText = row.join(' ').toLowerCase();
    const matchCount = headerKeywords.filter(keyword => rowText.includes(keyword)).length;
    return matchCount >= 2;
  }

  /**
   * Clean cell value
   */
  static cleanCellValue(value: string): string {
    let cleaned = value.trim();
    cleaned = cleaned.replace(/[|]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    return cleaned;
  }

  /**
   * Convert row/col to Excel cell address (A1, B2, etc.)
   */
  static getCellAddress(row: number, col: number): string {
    let label = '';
    let num = col;
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    return `${label}${row + 1}`;
  }

  /**
   * Format results for Excel
   */
  static formatForExcel(results: OCRResult[]): Record<string, any> {
    const excelData: Record<string, any> = {};
    let rowIndex = 0;

    // Add headers
    const headers = ['Rk', 'Name', 'Ticker', 'Field', 'Position', 'Pos Chg', '% Out', 'Curr MV', 'Filing Date'];
    headers.forEach((header, colIndex) => {
      const cellAddress = this.getCellAddress(rowIndex, colIndex);
      excelData[cellAddress] = header;
    });
    rowIndex++;

    // Add data from all images
    for (const result of results) {
      for (const row of result.rows) {
        // Skip header rows
        if (this.isHeaderRow(row)) continue;
        
        row.forEach((cell, colIndex) => {
          if (colIndex < headers.length) {
            const cellAddress = this.getCellAddress(rowIndex, colIndex);
            excelData[cellAddress] = this.cleanCellValue(cell || '');
          }
        });
        
        rowIndex++;
      }
    }

    return excelData;
  }
}

export default TesseractOCR;
