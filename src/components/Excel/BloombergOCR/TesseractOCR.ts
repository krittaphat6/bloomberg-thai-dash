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
        // Scale up 4x for better OCR accuracy on Bloomberg text
        const scale = 4;
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
        // Enhanced detection for camera-captured Bloomberg screens
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate brightness and saturation
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max > 0 ? (max - min) / max : 0;
          
          // Bloomberg-specific color detection (more aggressive for camera photos)
          // Yellow/Orange/Amber text (Security names, headers)
          const isYellow = r > 140 && g > 100 && b < 130 && r > b * 1.5;
          const isOrange = r > 160 && g > 80 && g < 180 && b < 100;
          const isAmber = r > 150 && g > 110 && b < 120;
          const isGold = r > 180 && g > 120 && b < 100;
          
          // Green text (Positive changes)
          const isGreen = g > 80 && g > r * 1.15 && g > b * 1.2;
          const isBrightGreen = g > 120 && g > r && g > b;
          
          // Red text (Negative changes)  
          const isRed = r > 120 && r > g * 1.3 && r > b * 1.3;
          
          // White/Light gray text (General data)
          const isWhite = r > 130 && g > 130 && b > 130 && brightness > 140;
          const isLightGray = r > 100 && g > 100 && b > 100 && saturation < 0.2 && brightness > 110;
          
          // Cyan/Light blue (Links, special text)
          const isCyan = b > 100 && g > 100 && r < 130 && (b + g) > r * 1.8;
          const isLightBlue = b > 130 && g > 130 && r < 160;
          
          // Check if this pixel is Bloomberg text
          const isText = isYellow || isOrange || isAmber || isGold ||
                         isGreen || isBrightGreen || isRed ||
                         isWhite || isLightGray || isCyan || isLightBlue ||
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
   * Parse Bloomberg text into structured rows - Enhanced algorithm
   */
  static parseBloombergText(text: string): string[][] {
    const lines = text.split('\n').filter(line => line.trim());
    const rows: string[][] = [];
    
    // WisdomTree Holdings ticker patterns - comprehensive
    const tickerPatterns = [
      // Standard US/International tickers: MSFT US, NVDA US, 7203 JP
      /([A-Z]{2,6})\s+(US|JP|HK|LN|GY|GR|FP|CN|IN|AU|SP|TB|SS|SW|TT|NA|KS|SM|IM|PW)\b/i,
      // Japanese numeric: 7203 JP
      /(\d{4,6})\s+(JP|HK|TT|KS)\b/i,
      // Treasury floaters: TF Float 0..., TF Float 1...
      /TF\s*Float\s*[\d\.]+/i,
      // Bond tickers: B 0 02/05
      /B\s+\d+\s+\d{2}\/\d{2}/i,
    ];
    
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/;
    const positionPattern = /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g;
    const posChgPattern = /([+-]\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?)/;
    const mvPattern = /([\d,.]+)\s*(BLN|MLN|M|B)\b/i;
    
    // Security name keywords from WisdomTree Holdings data
    const securityKeywords = [
      'TREASURY', 'FRN', 'BILL', 'Microsoft', 'NVIDIA', 'Apple', 'Alphabet',
      'Google', 'Meta', 'Exxon', 'Mobil', 'Broadcom', 'Home Depot', 'JPMorgan',
      'Chase', 'Chevron', 'UnitedHealth', 'Coca-Cola', 'AbbVie', 'Toyota', 'Oracle',
      'Corp', 'Inc', 'Ltd', 'Co', 'Class', 'Common', 'Shares', 'Platforms'
    ];
    
    let rowCounter = 1;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (this.isHeaderRow([trimmedLine])) continue;
      if (trimmedLine.length < 12) continue;
      
      // Initialize row values
      let rowNum = '';
      let security = '';
      let ticker = '';
      let position = '';
      let posChg = '';
      let pctOut = '';
      let currMV = '';
      let filingDate = '';
      
      // Extract row number - handles 1), 2), 10) or just 1, 2, 10
      const rowNumMatch = trimmedLine.match(/^(\d{1,2})[\s\)\.\]]+/);
      if (rowNumMatch) {
        rowNum = rowNumMatch[1];
      }
      
      // Extract ticker
      let tickerFound = false;
      let tickerMatch: RegExpMatchArray | null = null;
      for (const pattern of tickerPatterns) {
        tickerMatch = trimmedLine.match(pattern);
        if (tickerMatch) {
          ticker = tickerMatch[0].trim().toUpperCase();
          tickerFound = true;
          break;
        }
      }
      
      // Extract security name
      if (tickerFound && tickerMatch && tickerMatch.index !== undefined) {
        const tickerIndex = tickerMatch.index;
        if (tickerIndex > 0) {
          let nameStart = rowNumMatch ? rowNumMatch[0].length : 0;
          let potentialName = trimmedLine.substring(nameStart, tickerIndex).trim();
          potentialName = potentialName
            .replace(/^[\s\-\)\.\]]+/, '')
            .replace(/[\s\-\)\.\]]+$/, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (potentialName.length > 2) {
            const hasSecurityWord = securityKeywords.some(kw => 
              potentialName.toLowerCase().includes(kw.toLowerCase())
            );
            if (hasSecurityWord || /^[A-Za-z\s&\.]+$/.test(potentialName) || potentialName.length > 5) {
              security = potentialName;
            }
          }
        }
      }
      
      // Skip if no ticker found
      if (!tickerFound) continue;
      
      // Extract filing date
      const dateMatch = trimmedLine.match(datePattern);
      if (dateMatch) {
        filingDate = dateMatch[1];
      }
      
      // Extract position change
      const posChgMatch = trimmedLine.match(posChgPattern);
      if (posChgMatch) {
        posChg = posChgMatch[1].replace(/\s/g, '');
      }
      
      // Extract market value
      const mvMatch = trimmedLine.match(mvPattern);
      if (mvMatch) {
        currMV = mvMatch[0];
      }
      
      // Extract numbers for position and % out
      const allNumbers = [...trimmedLine.matchAll(positionPattern)];
      const numbers = allNumbers
        .map(m => m[1])
        .filter(n => {
          if (n === rowNum) return false;
          if (posChg.includes(n)) return false;
          if (currMV.includes(n)) return false;
          if (filingDate.includes(n)) return false;
          return true;
        });
      
      // Find position
      for (const num of numbers) {
        const val = parseFloat(num.replace(/,/g, ''));
        if (!isNaN(val) && val > 100000 && !num.includes('.')) {
          if (!position) position = num;
        }
      }
      
      // Find % out
      for (const num of numbers) {
        const val = parseFloat(num.replace(/,/g, ''));
        if (!isNaN(val) && val > 0 && val < 100 && num.includes('.')) {
          if (!pctOut && num !== position) pctOut = num;
        }
      }
      
      // Assign row number if not found
      if (!rowNum && (tickerFound || position)) {
        rowNum = String(rowCounter);
      }
      
      // Build row array
      const row = [
        rowNum || String(rowCounter),
        security,
        ticker,
        'ULT-AGG',
        position,
        posChg,
        pctOut,
        currMV,
        filingDate
      ];
      
      if (ticker || security || position) {
        rows.push(row);
        rowCounter++;
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
      'holdings', 'region', 'num of', '%', 'curr', 'name', 'rk',
      'total', 'currency', 'periodicity', 'management'
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
