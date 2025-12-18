// Bloomberg Image Processing Pipeline using Tesseract.js OCR - Improved Version
import Tesseract from 'tesseract.js';

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

// Column definitions for Bloomberg data
const BLOOMBERG_COLUMNS = [
  'Rk',
  'Name', 
  'Ticker',
  'Field',
  'Position',
  'Pos Chg',
  '% Out',
  'Curr MV',
  'Filing Date'
];

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
        
        // Detect text colors (green, yellow, white, orange, red, cyan, amber)
        const isGreen = g > 100 && r < 150 && b < 150;
        const isYellow = r > 180 && g > 180 && b < 150;
        const isWhite = r > 130 && g > 130 && b > 130;
        const isOrange = r > 160 && g > 80 && g < 180 && b < 100;
        const isRed = r > 150 && g < 100 && b < 100;
        const isCyan = g > 120 && b > 120 && r < 150;
        const isAmber = r > 200 && g > 150 && g < 200 && b < 80;
        
        // Make text black, background white
        if (isGreen || isYellow || isWhite || isOrange || isRed || isCyan || isAmber) {
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

// Check if line is a header
const isHeaderLine = (line: string): boolean => {
  const headerKeywords = [
    'security', 'ticker', 'position', 'source', 'filing',
    'no.', 'pos chg', 'pct', 'mkt val', 'field', 'holdings', 
    'region', 'num of', 'curr', '% out'
  ];
  const lowLine = line.toLowerCase();
  const matchCount = headerKeywords.filter(k => lowLine.includes(k)).length;
  return matchCount >= 2;
};

// Parse OCR text into structured table rows - Improved algorithm
const parseOCRText = (text: string): Array<{
  rank: string;
  name: string;
  ticker: string;
  field: string;
  position: string;
  posChg: string;
  pctOut: string;
  currMV: string;
  filingDate: string;
}> => {
  const rows: Array<{
    rank: string;
    name: string;
    ticker: string;
    field: string;
    position: string;
    posChg: string;
    pctOut: string;
    currMV: string;
    filingDate: string;
  }> = [];
  
  const lines = text.split('\n').filter(line => line.trim());
  
  // Common patterns
  const tickerPattern = /([A-Z0-9]{1,10})\s+(US|JP|HK|LN|GY|FP|CN|IN|AU|SP|TB|IT|SW|C|IM|SS|SZ|KS|TT|PM|IJ|MK|NZ|AB|AV|BB|CT|DC|FH|GA|GR|ID|IR|LI|MC|NA|NO|PL|PW|RO|SM|SE|VX)\b/i;
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/;
  const numberPattern = /[+-]?[\d,]+(?:\.\d+)?/g;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip headers and short lines
    if (isHeaderLine(trimmedLine)) continue;
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
    let name = '';
    if (tickerMatch && tickerMatch.index !== undefined) {
      name = trimmedLine
        .substring(0, tickerMatch.index)
        .replace(/^\d+[\s\)\.]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Extract date
    const dateMatch = trimmedLine.match(datePattern);
    const filingDate = dateMatch ? dateMatch[1] : '';
    
    // Extract all numbers
    const numbers = trimmedLine.match(numberPattern) || [];
    const cleanNumbers = numbers
      .filter(n => n !== rowNum && !n.includes('/'))
      .map(n => n.trim());
    
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
    
    // Find percentage (small decimal number, usually 0.XX)
    for (const num of cleanNumbers) {
      const val = parseFloat(num.replace(/,/g, ''));
      if (!isNaN(val) && val < 100 && num.includes('.') && val > 0) {
        if (!pctOut) pctOut = num;
      }
    }
    
    // Find position (large integer)
    for (const num of cleanNumbers) {
      const val = parseFloat(num.replace(/,/g, ''));
      if (!isNaN(val) && val > 10000 && !num.includes('.') && !num.startsWith('+') && !num.startsWith('-')) {
        if (!position) position = num;
      }
    }
    
    // Find market value (with MLN/BLN suffix or large decimal)
    const mvMatch = trimmedLine.match(/([\d,.]+)\s*(MLN|BLN|M|B)/i);
    if (mvMatch) {
      currMV = mvMatch[0];
    } else {
      // Look for large decimal numbers that could be market value
      for (const num of cleanNumbers) {
        const val = parseFloat(num.replace(/,/g, ''));
        if (!isNaN(val) && val > 100 && num.includes('.') && num !== pctOut) {
          if (!currMV) currMV = num;
        }
      }
    }
    
    // Build row
    const row = {
      rank: rowNum,
      name: name,
      ticker: ticker,
      field: 'ULT-AGG',
      position: position,
      posChg: posChg,
      pctOut: pctOut,
      currMV: currMV,
      filingDate: filingDate
    };
    
    // Only add if we have meaningful data
    if (ticker || name || position) {
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
        { column: 'Rk', value: parsed.rank || String(idx + 1), confidence: 0.9, originalColor: 'white' },
        { column: 'Name', value: parsed.name, confidence: 0.85, originalColor: 'white' },
        { column: 'Ticker', value: parsed.ticker, confidence: 0.9, originalColor: 'yellow' },
        { column: 'Field', value: parsed.field, confidence: 0.95, originalColor: 'white' },
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
        // Update Rk cell
        const rkCell = row.cells.find(c => c.column === 'Rk');
        if (rkCell) {
          rkCell.value = String(row.rowNumber);
        }
        allRows.push(row);
      }
    }
    
    return allRows;
  }
  
  convertToExcelData(rows: ExtractedRow[]): Record<string, any> {
    const excelData: Record<string, any> = {};
    
    // Add headers
    BLOOMBERG_COLUMNS.forEach((col, colIdx) => {
      const address = this.getCellAddress(0, colIdx);
      excelData[address] = col;
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
    
    // Check for empty important cells
    const emptyTickers = rows.filter(r => {
      const ticker = r.cells.find(c => c.column === 'Ticker');
      return !ticker?.value.trim();
    });
    if (emptyTickers.length > 0) {
      warnings.push(`${emptyTickers.length} rows missing ticker`);
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
