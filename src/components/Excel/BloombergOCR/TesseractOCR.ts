// Tesseract.js based OCR for Bloomberg Terminal images - Improved Version
import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  rows: string[][];
}

export interface ProcessingProgress {
  status: string;
  progress: number;
}

/**
 * Bloomberg OCR using Tesseract.js (FREE - runs in browser)
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
        // Scale up 2x for better OCR accuracy
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Bloomberg terminal: colored text on dark background
        // Convert to black text on white background for OCR
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Detect text colors (green, yellow, white, orange, red, cyan)
          const isGreen = g > 100 && r < 150 && b < 150;
          const isYellow = r > 180 && g > 180 && b < 150;
          const isWhite = r > 140 && g > 140 && b > 140;
          const isOrange = r > 160 && g > 80 && g < 180 && b < 100;
          const isRed = r > 150 && g < 100 && b < 100;
          const isCyan = g > 130 && b > 130 && r < 150;
          
          // Make text black, background white
          if (isGreen || isYellow || isWhite || isOrange || isRed || isCyan) {
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
    
    if (typeof imageSource === 'string') {
      imageUrl = imageSource;
    } else {
      // Preprocess the image first
      if (onProgress) onProgress({ status: 'Preprocessing...', progress: 5 });
      imageUrl = await this.preprocessImage(imageSource);
    }
    
    if (onProgress) onProgress({ status: 'Starting OCR...', progress: 10 });
    
    const result = await Tesseract.recognize(
      imageUrl,
      'eng',
      {
        logger: (m) => {
          if (onProgress && m.status === 'recognizing text') {
            onProgress({
              status: 'Recognizing text...',
              progress: 10 + Math.round((m.progress || 0) * 80)
            });
          }
        }
      }
    );

    const text = result.data.text;
    const confidence = result.data.confidence;
    
    if (onProgress) onProgress({ status: 'Parsing results...', progress: 95 });
    
    // Parse text into rows
    const rows = this.parseBloombergText(text);
    
    if (onProgress) onProgress({ status: 'Complete', progress: 100 });
    
    return { text, confidence, rows };
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
    const percentPattern = /(\d+\.\d+)/;
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
      
      // Try to identify specific numbers
      let position = '';
      let posChg = '';
      let pctOut = '';
      let currMV = '';
      
      // Find position change (usually has +/- prefix in context)
      const posChgMatch = trimmedLine.match(/([+-]\s*[\d,]+)/);
      if (posChgMatch) {
        posChg = posChgMatch[1].replace(/\s/g, '');
      }
      
      // Find percentage (small decimal number)
      const pctMatch = trimmedLine.match(/(\d+\.\d{2,4})\s*$/);
      if (pctMatch) {
        pctOut = pctMatch[1];
      }
      
      // Identify position (large number without decimal)
      for (const num of cleanNumbers) {
        const numVal = parseFloat(num);
        if (numVal > 10000 && !num.includes('.')) {
          if (!position) position = num;
        }
      }
      
      // Find market value (MLN, BLN, or large decimal number)
      const mvMatch = trimmedLine.match(/([\d,.]+)\s*(?:MLN|BLN|M|B)/i);
      if (mvMatch) {
        currMV = mvMatch[0];
      }
      
      // Build row
      const row = [
        rowNum,           // Rk
        security,         // Name
        ticker,           // Ticker
        'ULT-AGG',        // Field (default)
        position,         // Position
        posChg,           // Pos Chg
        pctOut,           // % Out
        currMV,           // Curr MV
        filingDate        // Filing Date
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
      'holdings', 'region', 'num of', '%', 'curr'
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
        
        // Map row data to columns
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
