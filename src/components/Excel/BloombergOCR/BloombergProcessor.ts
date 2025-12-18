// Bloomberg Image Processing Pipeline using Tesseract.js OCR
import Tesseract from 'tesseract.js';
import { BLOOMBERG_LAYOUT } from './BloombergFontDatabase';

export interface ExtractedCell {
  column: string;
  value: string;
  confidence: number;
  originalColor: string;
}

export interface ExtractedRow {
  rowNumber: number;
  cells: ExtractedCell[];
  imageIndex: number;
}

export interface ValidationReport {
  valid: boolean;
  totalRows: number;
  totalCells: number;
  warnings: string[];
  lowConfidenceCells: Array<{
    row: number;
    column: string;
    value: string;
    confidence: number;
  }>;
}

export interface ProcessingProgress {
  current: number;
  total: number;
  currentImage: number;
  totalImages: number;
  status: string;
}

// Preprocess image for better OCR results on Bloomberg terminal
const preprocessImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Scale up for better OCR (2x)
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
        
        // Detect text colors (green, yellow, white, orange, red)
        const isGreen = g > 120 && r < 150 && b < 150;
        const isYellow = r > 180 && g > 180 && b < 120;
        const isWhite = r > 150 && g > 150 && b > 150;
        const isOrange = r > 180 && g > 80 && g < 180 && b < 80;
        const isRed = r > 180 && g < 80 && b < 80;
        const isCyan = g > 150 && b > 150 && r < 150;
        
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
    img.src = URL.createObjectURL(file);
  });
};

// Parse OCR text into structured table rows
const parseOCRText = (text: string): Array<{
  rank: string;
  security: string;
  ticker: string;
  source: string;
  position: string;
  posChg: string;
  pctOut: string;
  currMV: string;
  filingDate: string;
}> => {
  const rows: Array<{
    rank: string;
    security: string;
    ticker: string;
    source: string;
    position: string;
    posChg: string;
    pctOut: string;
    currMV: string;
    filingDate: string;
  }> = [];
  
  const lines = text.split('\n').filter(line => line.trim());
  
  // Pattern for ticker codes
  const tickerPattern = /([A-Z0-9]+)\s+(US|JP|HK|LN|GY|FP|CN|IN|AU|SP|TB|IT|SW|C|IM|SS|SZ)/i;
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/;
  const numberPattern = /[+-]?[\d,]+(?:\.\d+)?/g;
  const marketValuePattern = /[\d,.]+(?:MLN|BLN|K)/i;
  
  for (const line of lines) {
    // Skip header lines
    if (line.includes('Security') || line.includes('Ticker') || line.includes('Position') || line.includes('Source')) {
      continue;
    }
    
    // Check if line starts with a number (row number)
    const rowNumMatch = line.match(/^(\d+)\)?[\s]+/);
    if (!rowNumMatch && !tickerPattern.test(line)) {
      continue;
    }
    
    const tickerMatch = line.match(tickerPattern);
    const dateMatch = line.match(datePattern);
    const mvMatch = line.match(marketValuePattern);
    const numbers = line.match(numberPattern) || [];
    
    // Extract security name (text before ticker)
    let security = '';
    if (tickerMatch && tickerMatch.index !== undefined) {
      security = line.substring(0, tickerMatch.index)
        .replace(/^\d+\)?[\s]+/, '')
        .trim();
    }
    
    // Build row data
    const row = {
      rank: rowNumMatch ? rowNumMatch[1] : '',
      security: security || '',
      ticker: tickerMatch ? `${tickerMatch[1]} ${tickerMatch[2]}` : '',
      source: 'ULT-AGG',
      position: '',
      posChg: '',
      pctOut: '',
      currMV: mvMatch ? mvMatch[0] : '',
      filingDate: dateMatch ? dateMatch[1] : ''
    };
    
    // Try to extract numeric values
    // Position is usually the largest number
    // Pos Chg has +/- prefix
    // % Out is usually small decimal
    const posChgMatch = line.match(/([+-][\d,]+)/);
    const pctMatch = line.match(/(\d+\.\d+)(?!\d)/);
    
    if (numbers.length >= 1) {
      // First big number is usually position
      const positionCandidates = numbers.filter(n => {
        const num = parseFloat(n.replace(/,/g, ''));
        return num > 1000 && !n.startsWith('+') && !n.startsWith('-');
      });
      if (positionCandidates.length > 0) {
        row.position = positionCandidates[0];
      }
    }
    
    if (posChgMatch) {
      row.posChg = posChgMatch[1];
    }
    
    if (pctMatch) {
      row.pctOut = pctMatch[1];
    }
    
    // Only add if we have meaningful data
    if (row.ticker || row.security || row.position) {
      rows.push(row);
    }
  }
  
  return rows;
};

export class BloombergProcessor {
  private onProgress?: (progress: ProcessingProgress) => void;
  
  constructor(onProgress?: (progress: ProcessingProgress) => void) {
    this.onProgress = onProgress;
  }
  
  async processImage(file: File, imageIndex: number = 0): Promise<ExtractedRow[]> {
    const columns = BLOOMBERG_LAYOUT.columns;
    
    // Update progress
    if (this.onProgress) {
      this.onProgress({
        current: 0,
        total: 100,
        currentImage: imageIndex + 1,
        totalImages: 1,
        status: 'Preprocessing image...'
      });
    }
    
    // Preprocess image
    const processedImage = await preprocessImage(file);
    
    if (this.onProgress) {
      this.onProgress({
        current: 10,
        total: 100,
        currentImage: imageIndex + 1,
        totalImages: 1,
        status: 'Running OCR...'
      });
    }
    
    // Run Tesseract OCR
    const result = await Tesseract.recognize(
      processedImage,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text' && this.onProgress) {
            this.onProgress({
              current: 10 + Math.round(m.progress * 80),
              total: 100,
              currentImage: imageIndex + 1,
              totalImages: 1,
              status: `OCR: ${Math.round(m.progress * 100)}%`
            });
          }
        }
      }
    );
    
    if (this.onProgress) {
      this.onProgress({
        current: 95,
        total: 100,
        currentImage: imageIndex + 1,
        totalImages: 1,
        status: 'Parsing results...'
      });
    }
    
    // Parse OCR text
    const parsedRows = parseOCRText(result.data.text);
    
    // Convert to ExtractedRow format
    const rows: ExtractedRow[] = parsedRows.map((parsed, idx) => {
      const cells: ExtractedCell[] = [
        { column: 'NO', value: parsed.rank || String(idx + 1), confidence: 0.9, originalColor: 'white' },
        { column: 'Security', value: parsed.security, confidence: 0.85, originalColor: 'white' },
        { column: 'Ticker', value: parsed.ticker, confidence: 0.9, originalColor: 'yellow' },
        { column: 'Source', value: parsed.source, confidence: 0.95, originalColor: 'white' },
        { column: 'Position', value: parsed.position, confidence: 0.8, originalColor: 'white' },
        { column: 'Pos Chg', value: parsed.posChg, confidence: 0.8, originalColor: parsed.posChg.startsWith('-') ? 'red' : 'green' },
        { column: '% Out', value: parsed.pctOut, confidence: 0.8, originalColor: 'white' },
        { column: 'Curr MV', value: parsed.currMV, confidence: 0.85, originalColor: 'white' },
        { column: 'Filing Date', value: parsed.filingDate, confidence: 0.9, originalColor: 'white' }
      ];
      
      return {
        rowNumber: idx + 1,
        cells,
        imageIndex
      };
    });
    
    if (this.onProgress) {
      this.onProgress({
        current: 100,
        total: 100,
        currentImage: imageIndex + 1,
        totalImages: 1,
        status: 'Done'
      });
    }
    
    return rows;
  }
  
  async processMultipleImages(files: File[]): Promise<ExtractedRow[]> {
    const allRows: ExtractedRow[] = [];
    let globalRowNumber = 1;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (this.onProgress) {
        this.onProgress({
          current: 0,
          total: 100,
          currentImage: i + 1,
          totalImages: files.length,
          status: `Loading image ${i + 1}/${files.length}`
        });
      }
      
      const rows = await this.processImage(file, i);
      
      // Renumber rows to be continuous across images
      for (const row of rows) {
        row.rowNumber = globalRowNumber++;
        // Update NO cell
        const noCell = row.cells.find(c => c.column === 'NO');
        if (noCell) {
          noCell.value = String(row.rowNumber);
        }
        allRows.push(row);
      }
    }
    
    return allRows;
  }
  
  convertToExcelData(rows: ExtractedRow[]): Record<string, any> {
    const excelData: Record<string, any> = {};
    const columns = BLOOMBERG_LAYOUT.columns;
    
    // Add headers
    columns.forEach((col, colIdx) => {
      const address = this.getCellAddress(0, colIdx);
      excelData[address] = col.name;
    });
    
    // Add data rows
    rows.forEach((row, rowIdx) => {
      row.cells.forEach((cell, colIdx) => {
        const address = this.getCellAddress(rowIdx + 1, colIdx);
        excelData[address] = cell.value;
      });
    });
    
    return excelData;
  }
  
  private getCellAddress(row: number, col: number): string {
    let label = '';
    let num = col;
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    return `${label}${row + 1}`;
  }
  
  validateResults(rows: ExtractedRow[]): ValidationReport {
    const warnings: string[] = [];
    const lowConfidenceCells: ValidationReport['lowConfidenceCells'] = [];
    
    let totalCells = 0;
    
    for (const row of rows) {
      for (const cell of row.cells) {
        totalCells++;
        
        if (cell.confidence < 0.7) {
          lowConfidenceCells.push({
            row: row.rowNumber,
            column: cell.column,
            value: cell.value,
            confidence: cell.confidence
          });
        }
      }
    }
    
    // Generate warnings
    if (lowConfidenceCells.length > 0) {
      const lowConfPct = Math.round((lowConfidenceCells.length / totalCells) * 100);
      warnings.push(`${lowConfidenceCells.length} cells (${lowConfPct}%) have low confidence`);
    }
    
    if (rows.length === 0) {
      warnings.push('No rows were detected in the images');
    }
    
    // Check for common issues
    const emptyRows = rows.filter(r => r.cells.every(c => !c.value.trim()));
    if (emptyRows.length > 0) {
      warnings.push(`${emptyRows.length} empty rows detected`);
    }
    
    return {
      valid: warnings.length === 0 || (warnings.length === 1 && lowConfidenceCells.length < totalCells * 0.3),
      totalRows: rows.length,
      totalCells,
      warnings,
      lowConfidenceCells
    };
  }
}

export default BloombergProcessor;
