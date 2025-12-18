// Bloomberg Image Processing Pipeline using Tesseract.js OCR - Enhanced Version
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

export interface DebugInfo {
  originalImageUrl: string;
  processedImageUrl: string;
  rawOcrText: string;
  confidence: number;
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

// Unsharp Mask for sharpening
const applyUnsharpMask = (imageData: ImageData): ImageData => {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data);
  
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
        
        if (current[idx] > 200) {
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

// Preprocess image for better OCR results on Bloomberg terminal
const preprocessImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Scale up 3x for better OCR
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
      
      // Apply sharpening
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      imageData = applyUnsharpMask(imageData);
      ctx.putImageData(imageData, 0, 0);
      
      // Get image data again
      const processedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = processedData.data;
      
      // Bloomberg terminal color detection - Enhanced thresholds
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        
        // Enhanced text color detection
        const isGreen = g > 80 && g > r * 1.3 && g > b * 1.3;
        const isYellow = r > 150 && g > 150 && b < 120 && Math.abs(r - g) < 60;
        const isOrange = r > 180 && g > 100 && g < 200 && b < 80;
        const isAmber = r > 200 && g > 140 && g < 220 && b < 100;
        const isWhite = r > 150 && g > 150 && b > 150;
        const isRed = r > 150 && r > g * 1.5 && r > b * 1.5;
        const isCyan = b > 100 && g > 100 && r < 120;
        const isLightBlue = b > 150 && g > 150 && r < 180;
        
        const isText = isGreen || isYellow || isOrange || isAmber || 
                       isWhite || isRed || isCyan || isLightBlue || 
                       brightness > 100;
        
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
    img.src = URL.createObjectURL(file);
  });
};

// Check if line is a header
const isHeaderLine = (line: string): boolean => {
  const headerKeywords = [
    'security', 'ticker', 'position', 'source', 'filing',
    'no.', 'pos chg', 'pct', 'mkt val', 'field', 'holdings', 
    'region', 'num of', 'curr', '% out', 'name', 'rk'
  ];
  const lowLine = line.toLowerCase();
  const matchCount = headerKeywords.filter(k => lowLine.includes(k)).length;
  return matchCount >= 2;
};

// Parse OCR text into structured table rows
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
  
  const tickerPattern = /([A-Z0-9]{1,10})\s+(US|JP|HK|LN|GY|FP|CN|IN|AU|SP|TB|IT|SW|C|IM|SS|SZ|KS|TT|PM|IJ|MK|NZ|AB|AV|BB|CT|DC|FH|GA|GR|ID|IR|LI|MC|NA|NO|PL|PW|RO|SM|SE|VX)\b/i;
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/;
  const numberPattern = /[+-]?[\d,]+(?:\.\d+)?/g;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (isHeaderLine(trimmedLine)) continue;
    if (trimmedLine.length < 10) continue;
    
    const startsWithNumber = /^\d+[\s\)\.]+/.test(trimmedLine);
    const hasTicker = tickerPattern.test(trimmedLine);
    
    if (!startsWithNumber && !hasTicker) continue;
    
    const rowNumMatch = trimmedLine.match(/^(\d+)[\s\)\.]*/);
    const rowNum = rowNumMatch ? rowNumMatch[1] : '';
    
    const tickerMatch = trimmedLine.match(tickerPattern);
    const ticker = tickerMatch ? `${tickerMatch[1]} ${tickerMatch[2]}` : '';
    
    let name = '';
    if (tickerMatch && tickerMatch.index !== undefined) {
      name = trimmedLine
        .substring(0, tickerMatch.index)
        .replace(/^\d+[\s\)\.]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    const dateMatch = trimmedLine.match(datePattern);
    const filingDate = dateMatch ? dateMatch[1] : '';
    
    const numbers = trimmedLine.match(numberPattern) || [];
    const cleanNumbers = numbers
      .filter(n => n !== rowNum && !n.includes('/'))
      .map(n => n.trim());
    
    let position = '';
    let posChg = '';
    let pctOut = '';
    let currMV = '';
    
    const posChgMatch = trimmedLine.match(/([+-]\s*[\d,]+)/);
    if (posChgMatch) {
      posChg = posChgMatch[1].replace(/\s/g, '');
    }
    
    for (const num of cleanNumbers) {
      const val = parseFloat(num.replace(/,/g, ''));
      if (!isNaN(val) && val < 100 && num.includes('.') && val > 0) {
        if (!pctOut) pctOut = num;
      }
    }
    
    for (const num of cleanNumbers) {
      const val = parseFloat(num.replace(/,/g, ''));
      if (!isNaN(val) && val > 10000 && !num.includes('.') && !num.startsWith('+') && !num.startsWith('-')) {
        if (!position) position = num;
      }
    }
    
    const mvMatch = trimmedLine.match(/([\d,.]+)\s*(MLN|BLN|M|B)/i);
    if (mvMatch) {
      currMV = mvMatch[0];
    } else {
      for (const num of cleanNumbers) {
        const val = parseFloat(num.replace(/,/g, ''));
        if (!isNaN(val) && val > 100 && num.includes('.') && num !== pctOut) {
          if (!currMV) currMV = num;
        }
      }
    }
    
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
    
    if (ticker || name || position) {
      rows.push(row);
    }
  }
  
  return rows;
};

export class BloombergProcessor {
  private onProgress?: (progress: ProcessingProgress) => void;
  private debugInfo?: DebugInfo;
  
  constructor(onProgress?: (progress: ProcessingProgress) => void) {
    this.onProgress = onProgress;
  }
  
  getDebugInfo(): DebugInfo | undefined {
    return this.debugInfo;
  }
  
  async processImage(file: File, imageIndex: number = 0, originalDataUrl?: string): Promise<ExtractedRow[]> {
    if (this.onProgress) {
      this.onProgress({
        current: 0,
        total: 100,
        currentImage: imageIndex + 1,
        totalImages: 1,
        status: 'Preprocessing image...'
      });
    }
    
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
    
    // Use createWorker for better control
    const worker = await Tesseract.createWorker('eng');
    
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,+-/%()$ ',
      preserve_interword_spaces: '1',
    });
    
    const result = await worker.recognize(processedImage);
    
    await worker.terminate();
    
    // Store debug info
    this.debugInfo = {
      originalImageUrl: originalDataUrl || '',
      processedImageUrl: processedImage,
      rawOcrText: result.data.text,
      confidence: result.data.confidence
    };
    
    if (this.onProgress) {
      this.onProgress({
        current: 95,
        total: 100,
        currentImage: imageIndex + 1,
        totalImages: 1,
        status: 'Parsing results...'
      });
    }
    
    const parsedRows = parseOCRText(result.data.text);
    
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
  
  async processMultipleImages(files: File[], dataUrls?: string[]): Promise<ExtractedRow[]> {
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
      
      const rows = await this.processImage(file, i, dataUrls?.[i]);
      
      for (const row of rows) {
        row.rowNumber = globalRowNumber++;
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
    
    BLOOMBERG_COLUMNS.forEach((col, colIdx) => {
      const address = this.getCellAddress(0, colIdx);
      excelData[address] = col;
    });
    
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
    
    if (lowConfidenceCells.length > 0) {
      const lowConfPct = Math.round((lowConfidenceCells.length / totalCells) * 100);
      warnings.push(`${lowConfidenceCells.length} cells (${lowConfPct}%) have low confidence`);
    }
    
    if (rows.length === 0) {
      warnings.push('No rows were detected in the images');
    }
    
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
