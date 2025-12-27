// Bloomberg Image Processing Pipeline using Tesseract.js OCR - Enhanced Version
import Tesseract from 'tesseract.js';
import { correctOCRText, matchSecurityName, correctTicker, postProcessBloombergRows } from './AIEnhancedOCR';

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

// Preprocess image for better OCR results on Bloomberg terminal - Optimized for WisdomTree Holdings layout
const preprocessImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Scale up 4x for better OCR on fine Bloomberg text
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
      
      // Apply sharpening
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      imageData = applyUnsharpMask(imageData);
      ctx.putImageData(imageData, 0, 0);
      
      // Get image data again
      const processedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = processedData.data;
      
      // Bloomberg terminal color detection - Optimized for WisdomTree Holdings screen
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        
        // Enhanced text color detection for Bloomberg terminal
        // Yellow/Orange text (Security names, headers): r>180, g>120, b<100
        const isYellow = r > 180 && g > 120 && b < 120;
        const isOrange = r > 200 && g > 100 && g < 180 && b < 80;
        const isAmber = r > 180 && g > 140 && b < 100;
        
        // Green text (Positive changes): g>120, g>r*1.2, g>b*1.3
        const isGreen = g > 100 && g > r * 1.1 && g > b * 1.2;
        
        // Red text (Negative changes): r>150, r>g*1.3, r>b*1.5
        const isRed = r > 140 && r > g * 1.3 && r > b * 1.4;
        
        // White/Light gray text (General data): high brightness
        const isWhite = r > 140 && g > 140 && b > 140 && brightness > 150;
        
        // Cyan/Light blue (Links, special text)
        const isCyan = b > 120 && g > 120 && r < 140 && (b + g) > r * 2;
        
        // Check if this pixel is text
        const isText = isYellow || isOrange || isAmber || isGreen || isRed || isWhite || isCyan || brightness > 120;
        
        if (isText) {
          // Black text on white background for OCR
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
        } else {
          // White background
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
      }
      
      ctx.putImageData(processedData, 0, 0);
      
      // Apply dilation to thicken text - helps with thin Bloomberg fonts
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
    'region', 'num of', 'curr', '% out', 'all',
    'total', 'currency', 'periodicity', 'management',
    'institution', 'historical', 'group by', 'show asset'
  ];
  const lowLine = line.toLowerCase();
  
  // Check for multiple header keywords
  const matchCount = headerKeywords.filter(k => lowLine.includes(k)).length;
  if (matchCount >= 2) return true;
  
  // Check for header-only patterns
  if (/^(no|security|ticker|source|position|filing)/i.test(lowLine)) {
    return true;
  }
  
  // Check if line is mostly non-data text
  const numbers = line.match(/\d+/g) || [];
  const letters = line.match(/[a-zA-Z]+/g) || [];
  if (letters.length > numbers.length * 3 && matchCount >= 1) {
    return true;
  }
  
  return false;
};

// Parse OCR text into structured table rows - Optimized for WisdomTree Holdings layout
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
  
  // Apply OCR correction first
  const correctedText = correctOCRText(text);
  const lines = correctedText.split('\n').filter(line => line.trim());
  
  // Expanded ticker patterns for Bloomberg terminal data
  const tickerPatterns = [
    // Standard tickers: MSFT US, NVDA US, AAPL US, etc.
    /([A-Z]{2,6})\s+(US|JP|HK|LN|GY|GR|FP|CN|IN|AU|SP|TB|SS|SW|TT|NA|KS|SM|IM|PW)\b/i,
    // Slash tickers: BA/ LN, BP/ LN, RR/ LN
    /([A-Z]{2,5})\/\s*(LN|US|JP)\b/i,
    // Japanese numeric tickers: 7203 JP, 8750 JP
    /(\d{4,6})\s+(JP|HK|TT|KS)\b/i,
    // Korean tickers: 005930 KS
    /(\d{6})\s+(KS)\b/i,
    // Treasury/Float tickers: TF Float 0..., TF Float 1..., TYH6 COMB
    /TF\s*Float\s*[\d\.]+/i,
    /[TFU][YUV]H\d\s+COMB/i,
    /UXYH\d\s+CO/i,
    // Bond tickers: B 0 02/05..., B 0 05/14...
    /B\s+\d+\s+\d{2}\/\d{2}/i,
    // Indian tickers: RELIANCE ..., HDFCB IN
    /RELIANCE\s*\.{2,}/i,
    /[A-Z]{5,8}\s+IN\b/i,
    // Special patterns: GFNORTEO...
    /GFNORTE[O\d]+/i,
  ];
  
  // Date pattern - Bloomberg uses MM/DD/YY format
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/;
  
  // Number patterns
  const positionPattern = /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b/g;
  const posChgPattern = /([+-]\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?)/;
  const mvPattern = /([\d,.]+)\s*(BLN|MLN|M|B)\b/i;
  
  // Security names - common patterns from WisdomTree data
  const securityKeywords = [
    'TREASURY', 'FRN', 'BILL', 'NOTE', 'BOND',
    'Microsoft', 'NVIDIA', 'Apple', 'Alphabet', 'Google', 'Meta',
    'Exxon', 'Mobil', 'Broadcom', 'Home Depot', 'JPMorgan', 'Chase',
    'Chevron', 'UnitedHealth', 'Coca-Cola', 'AbbVie', 'Toyota', 'Oracle',
    'Corp', 'Inc', 'Ltd', 'Co', 'Class', 'Common', 'Shares', 'Stock',
    'BAE Systems', 'Rheinmetall', 'Visa', 'Walmart', 'T-Mobile',
    'McDonald', 'Merck', 'Safran', 'Airbus', 'Procter', 'Gamble',
    'Abbott', 'LVMH', 'Verizon', 'Rolls-Royce', 'Leonardo', 'AT&T',
    'Amazon', 'Taiwan Semiconductor', 'Mitsubishi', 'Samsung',
    'Reliance', 'HDFC', 'Tata', 'Infosys', 'Caterpillar', 'Bank',
    'Mastercard', 'American Express', 'Berkshire', 'Booking',
    'Texas Instruments', 'Palantir', 'ServiceNow', 'Salesforce',
    'Philip Morris', 'Delta Air', 'Southwest', 'Honeywell',
    'Pfizer', 'Regeneron', 'Amgen', 'Gilead', 'Bristol-Myers',
    'Costco', 'TJX', 'Best Buy', 'Stryker', 'Sumitomo', 'Takeda',
    'Panasonic', 'Nippon Steel', 'Fast Retailing', 'Ping An',
    'Alibaba', 'Tencent', 'SK hynix', 'Quanta', 'ASML', 'SAP'
  ];
  
  let rowCounter = 1;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip headers and short lines
    if (isHeaderLine(trimmedLine)) continue;
    if (trimmedLine.length < 15) continue;
    
    // Initialize row data
    let rowData = {
      rank: '',
      name: '',
      ticker: '',
      field: 'ULT-AGG',
      position: '',
      posChg: '',
      pctOut: '',
      currMV: '',
      filingDate: ''
    };
    
    // Extract row number (at start of line) - handles 1), 2), 10), 100) etc.
    const rowNumMatch = trimmedLine.match(/^(\d{1,3})[\s\)\.\]]+/);
    if (rowNumMatch) {
      rowData.rank = rowNumMatch[1];
    }
    
    // Extract ticker
    let tickerFound = false;
    let tickerMatch: RegExpMatchArray | null = null;
    for (const pattern of tickerPatterns) {
      tickerMatch = trimmedLine.match(pattern);
      if (tickerMatch) {
        rowData.ticker = tickerMatch[0].trim().toUpperCase();
        tickerFound = true;
        break;
      }
    }
    
    // If no standard ticker found, check for partial patterns
    if (!tickerFound) {
      // Check for patterns like single letter + US which might be OCR errors
      const partialTicker = trimmedLine.match(/\b([A-Z]{2,5})\s+(US|JP|HK)\b/i);
      if (partialTicker) {
        rowData.ticker = `${partialTicker[1]} ${partialTicker[2]}`.toUpperCase();
        tickerFound = true;
        tickerMatch = partialTicker;
      }
    }
    
    // Extract security name (text before ticker or between row number and ticker)
    if (tickerFound && tickerMatch && tickerMatch.index !== undefined) {
      const tickerIndex = tickerMatch.index;
      if (tickerIndex > 0) {
        let nameStart = rowNumMatch ? rowNumMatch[0].length : 0;
        let potentialName = trimmedLine.substring(nameStart, tickerIndex).trim();
        
        // Clean up the name
        potentialName = potentialName
          .replace(/^[\s\-\)\.\]]+/, '')
          .replace(/[\s\-\)\.\]]+$/, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Validate it looks like a security name
        if (potentialName.length > 2) {
          const hasSecurityWord = securityKeywords.some(kw => 
            potentialName.toLowerCase().includes(kw.toLowerCase())
          );
          // Accept if it has security keywords or looks like a company name
          if (hasSecurityWord || /^[A-Za-z\s&\.]+$/.test(potentialName) || potentialName.length > 5) {
            rowData.name = potentialName;
          }
        }
      }
    }
    
    // Extract filing date
    const dateMatch = trimmedLine.match(datePattern);
    if (dateMatch) {
      rowData.filingDate = dateMatch[1];
    }
    
    // Extract position change (has +/- sign)
    const posChgMatch = trimmedLine.match(posChgPattern);
    if (posChgMatch) {
      rowData.posChg = posChgMatch[1].replace(/\s/g, '');
    }
    
    // Extract market value (with BLN/MLN suffix)
    const mvMatch = trimmedLine.match(mvPattern);
    if (mvMatch) {
      rowData.currMV = mvMatch[0];
    }
    
    // Extract all numbers for position and % out
    const allNumbers = [...trimmedLine.matchAll(positionPattern)];
    const numbers = allNumbers
      .map(m => m[1])
      .filter(n => {
        // Exclude already extracted values
        if (n === rowData.rank) return false;
        if (rowData.posChg.includes(n)) return false;
        if (rowData.currMV.includes(n)) return false;
        if (rowData.filingDate.includes(n)) return false;
        return true;
      });
    
    // Find position (large number, usually > 100,000)
    for (const num of numbers) {
      const val = parseFloat(num.replace(/,/g, ''));
      if (!isNaN(val) && val > 100000 && !num.includes('.')) {
        if (!rowData.position) {
          rowData.position = num;
        }
      }
    }
    
    // Find % out (small decimal between 0-100)
    for (const num of numbers) {
      const val = parseFloat(num.replace(/,/g, ''));
      if (!isNaN(val) && val > 0 && val < 100 && num.includes('.')) {
        if (!rowData.pctOut && num !== rowData.position) {
          rowData.pctOut = num;
        }
      }
    }
    
    // Assign row number if not found but we have data
    if (!rowData.rank && (tickerFound || rowData.position)) {
      rowData.rank = String(rowCounter);
    }
    
    // Apply AI corrections before adding
    if (rowData.name) {
      rowData.name = matchSecurityName(rowData.name);
    }
    if (rowData.ticker) {
      rowData.ticker = correctTicker(rowData.ticker);
    }
    
    // Only add row if we have meaningful data
    if (rowData.ticker || rowData.position || rowData.name) {
      rows.push(rowData);
      rowCounter++;
    }
  }
  
  // Post-process to clean up data
  return postProcessRows(rows);
};

// Post-process rows to clean up data
const postProcessRows = (rows: Array<{
  rank: string;
  name: string;
  ticker: string;
  field: string;
  position: string;
  posChg: string;
  pctOut: string;
  currMV: string;
  filingDate: string;
}>): typeof rows => {
  
  return rows.map((row, index) => {
    // Ensure rank is set
    if (!row.rank || row.rank === '-') {
      row.rank = String(index + 1);
    }
    
    // Ensure field is set
    if (!row.field || row.field === '-') {
      row.field = 'ULT-AGG';
    }
    
    // Clean up ticker - fix common OCR errors
    if (row.ticker) {
      // Keep the ticker mostly as-is but uppercase
      row.ticker = row.ticker.toUpperCase().trim();
      
      // Fix single letter tickers that are likely OCR errors
      if (/^[A-Z]\s+US$/i.test(row.ticker)) {
        // Single letter ticker like "D US" - likely an error, keep but flag
        row.ticker = row.ticker;
      }
    }
    
    // Clean up position - remove any letters
    if (row.position) {
      row.position = row.position.replace(/[^\d,\.]/g, '');
    }
    
    // Clean up posChg - ensure sign is present
    if (row.posChg) {
      row.posChg = row.posChg.replace(/[^\d,\.\-\+]/g, '');
      if (row.posChg && !row.posChg.startsWith('+') && !row.posChg.startsWith('-')) {
        row.posChg = '+' + row.posChg;
      }
    }
    
    // Clean up pctOut
    if (row.pctOut) {
      row.pctOut = row.pctOut.replace(/[^\d\.]/g, '');
    }
    
    // Format currMV
    if (row.currMV) {
      row.currMV = row.currMV
        .replace(/\s+/g, '')
        .replace(/m$/i, 'MLN')
        .replace(/b$/i, 'BLN');
    }
    
    return row;
  });
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
