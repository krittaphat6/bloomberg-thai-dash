// Enhanced Bloomberg-specific OCR Engine
// Optimized for Bloomberg Terminal screenshots with orange/yellow headers and white/green/red data

import Tesseract from 'tesseract.js';

export interface BloombergOCRResult {
  text: string;
  confidence: number;
  rows: ParsedBloombergRow[];
  processedImageUrl: string;
  debugImageUrl?: string;
}

export interface ParsedBloombergRow {
  rank: string;
  security: string;
  ticker: string;
  source: string;
  position: string;
  posChg: string;
  pctOut: string;
  currMV: string;
  filingDate: string;
  confidence: number;
}

export interface OCRProgress {
  stage: 'preprocess' | 'detect' | 'ocr' | 'parse';
  progress: number;
  message: string;
}

// Known Bloomberg securities for matching
const KNOWN_SECURITIES: Record<string, string> = {
  // Treasury
  'US TREASURY FRN': 'US TREASURY FRN',
  'TREASURY FRN': 'US TREASURY FRN',
  'TREASURY BILL': 'TREASURY BILL',
  // Major stocks
  'MICROSOFT': 'Microsoft Corp',
  'MICROSOFT CORP': 'Microsoft Corp',
  'NVIDIA': 'NVIDIA Corp',
  'NVIDIA CORP': 'NVIDIA Corp',
  'APPLE': 'Apple Inc',
  'APPLE INC': 'Apple Inc',
  'ALPHABET': 'Alphabet Inc Class A Common Shares',
  'GOOGLE': 'Alphabet Inc Class A Common Shares',
  'EXXON': 'Exxon Mobil Corp',
  'EXXON MOBIL': 'Exxon Mobil Corp',
  'META': 'Meta Platforms Inc Class A',
  'META PLATFORMS': 'Meta Platforms Inc Class A',
  'BROADCOM': 'Broadcom Inc',
  'HOME DEPOT': 'Home Depot Inc/The',
  'JPMORGAN': 'JPMorgan Chase & Co',
  'JP MORGAN': 'JPMorgan Chase & Co',
  'CHEVRON': 'Chevron Corp',
  'UNITEDHEALTH': 'UnitedHealth Group Inc',
  'COCA-COLA': 'Coca-Cola Co/The',
  'ABBVIE': 'AbbVie Inc',
  'TOYOTA': 'Toyota Motor Corp',
  'ORACLE': 'Oracle Corp',
  'BAE SYSTEMS': 'BAE Systems PLC',
  'RHEINMETALL': 'Rheinmetall AG',
  'VISA': 'Visa Inc Class A Common Shares',
  'WALMART': 'Walmart Inc',
  'T-MOBILE': 'T-Mobile US Inc',
  'MCDONALDS': "McDonald's Corp",
  'MERCK': 'Merck & Co Inc',
  'SAFRAN': 'Safran SA',
  'AIRBUS': 'Airbus SE',
  'PROCTER': 'Procter & Gamble Co/The',
  'ABBOTT': 'Abbott Laboratories',
  'LVMH': 'LVMH Moet Hennessy Louis Vuitton SE LVMH',
  'VERIZON': 'Verizon Communications Inc',
  'ROLLS-ROYCE': 'Rolls-Royce Holdings PLC',
  'LEONARDO': 'Leonardo SpA Ordinary Shares',
  'AT&T': 'AT&T Inc',
  'AMAZON': 'Amazon.com Inc',
  'TAIWAN SEMICONDUCTOR': 'Taiwan Semiconductor Manufacturing Co Ltd',
  'MITSUBISHI': 'Mitsubishi UFJ Financial Group Inc',
  'GILEAD': 'Gilead Sciences Inc',
  'NESTLE': 'Nestle SA',
  'BASF': 'BASF SE',
  'FERROVIAL': 'Ferrovial SE',
  'SUBARU': 'Subaru Corp',
  'RAYMOND JAMES': 'Raymond James Financial Inc',
  'NTPC': 'NTPC Ltd',
  'GEN DIGITAL': 'Gen Digital Inc',
  'JB HUNT': 'JB Hunt Transport Services Inc',
  'KEYENCE': 'Keyence Corp',
  'DATADOG': 'Datadog Inc Class A',
  'NEXTERA': 'NextEra Energy Inc',
  'AXIS BANK': 'Axis Bank Ltd',
  'FOMENTO': 'Fomento Economico Mexicano SAB de CV UBD UNIT',
  'SHELL': 'Shell PLC',
  'TARGET': 'Target Corp',
  'ONEMAIN': 'OneMain Holdings Inc',
  'NOVARTIS': 'Novartis AG',
  'SAAB': 'Saab AB Class B Common Shares',
  'BANK OF AMERICA': 'Bank of America Corp',
  'CISCO': 'Cisco Systems Inc',
  'CATERPILLAR': 'Caterpillar Inc',
  'BANCO BILBAO': 'Banco Bilbao Vizcaya Argentaria SA',
  'DASSAULT': 'Dassault Aviation SA',
  'AMERICAN EXPRESS': 'American Express Co',
  'MASTERCARD': 'Mastercard Inc Class A Common Stock',
  'RELIANCE': 'Reliance Industries Ltd Ordinary Shares',
  'CHARLES SCHWAB': 'Charles Schwab Corp/The Common Voting',
  'SUMITOMO MITSUI': 'Sumitomo Mitsui Financial Group Inc',
  'ASML': 'ASML Holding NV',
  'DEUTSCHE TELEKOM': 'Deutsche Telekom AG',
  'HDFC BANK': 'HDFC Bank Ltd',
  'AUTOMATIC DATA': 'Automatic Data Processing Inc',
  'IBM': 'International Business Machines Corp',
  'INDITEX': 'Industria de Diseno Textil SA',
  'TENCENT': 'Tencent Holdings Ltd',
  'COSTCO': 'Costco Wholesale Corp',
  'TJX': 'TJX Cos Inc/The',
  'SALESFORCE': 'Salesforce Inc',
  'PHILIP MORRIS': 'Philip Morris International Inc',
  'TOKIO MARINE': 'Tokio Marine Holdings Inc',
  'SAP': 'SAP SE',
  'GSK': 'GSK PLC',
  'BP': 'BP PLC',
  'CUMMINS': 'Cummins Inc',
  'FORD': 'Ford Motor Co Common Shares',
  'FEDEX': 'FedEx Corp',
  'REGENERON': 'Regeneron Pharmaceuticals Inc Common Stock',
  'ALIBABA': 'Alibaba Group Holding Ltd',
  'PFIZER': 'Pfizer Inc',
  'SCHNEIDER': 'Schneider Electric SE',
  'CSX': 'CSX Corp',
  'INFOSYS': 'Infosys Ltd',
  'QUALCOMM': 'QUALCOMM Inc',
  'TAKEDA': 'Takeda Pharmaceutical Co Ltd',
  'MORGAN STANLEY': 'Morgan Stanley',
  'MICRON': 'Micron Technology Inc',
  'CITIGROUP': 'Citigroup Inc',
  'SUMITOMO': 'Sumitomo Corp',
  'WELLS FARGO': 'Wells Fargo & Co',
  'SANOFI': 'Sanofi SA Common',
  'SHERWIN-WILLIAMS': 'Sherwin-Williams Co/The',
  'TATA': 'Tata Consultancy Services Ltd',
  'CHUGAI': 'Chugai Pharmaceutical Co Ltd',
  'SHIN-ETSU': 'Shin-Etsu Chemical Co Ltd',
  'SAMSUNG': 'Samsung Electronics Co Ltd',
  'STRYKER': 'Stryker Corp',
  'ING': 'ING Groep NV',
  'FERGUSON': 'Ferguson Enterprises Inc',
  'BRISTOL-MYERS': 'Bristol-Myers Squibb Co',
  'CORNING': 'Corning Inc',
  'HERMES': 'Hermes International SCA',
  'SK HYNIX': 'SK hynix Inc',
  'ICBC': 'Industrial & Commercial Bank of China Ltd H Share',
  'PAYPAL': 'PayPal Holdings Inc',
  'COMCAST': 'Comcast Corp Class A',
  'HENSOLDT': 'Hensoldt AG',
  'ECOLAB': 'Ecolab Inc',
  'KLA': 'KLA Corp',
  'VOLVO': 'Volvo AB Class B Common Shares',
  'UBS': 'UBS Group AG',
};

// Ticker corrections for common OCR errors
const TICKER_CORRECTIONS: Record<string, string> = {
  'MSPT': 'MSFT',
  'NVOA': 'NVDA',
  'AAPL': 'AAPL',
  'GOOQL': 'GOOGL',
  'GOOGI': 'GOOGL',
  'MFTA': 'META',
  'AVGO': 'AVGO',
  'HO': 'HD',
  'JPN': 'JPM',
  'CVX': 'CVX',
  'UNH': 'UNH',
  'K0': 'KO',
  'ABBV': 'ABBV',
  '72O3': '7203',
  'ORCL': 'ORCL',
  'BA/': 'BA/',
  'RHN': 'RHM',
  'WNT': 'WMT',
  'TNUS': 'TMUS',
  'NCD': 'MCD',
  'NRK': 'MRK',
  'SAF': 'SAF',
  'A1R': 'AIR',
  'ABT': 'ABT',
  'NC': 'MC',
  'VZ': 'VZ',
  'RR/': 'RR/',
  'LDO': 'LDO',
  'ANZN': 'AMZN',
  '233O': '2330',
  '83O6': '8306',
  'G1LD': 'GILD',
};

export class BloombergOCREngine {
  private worker: Tesseract.Worker | null = null;
  
  /**
   * Enhanced image preprocessing specifically for Bloomberg Terminal photos
   */
  async preprocessImage(file: File, onProgress?: (p: OCRProgress) => void): Promise<{ dataUrl: string; debugUrl: string }> {
    onProgress?.({ stage: 'preprocess', progress: 0, message: 'Loading image...' });
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        reject(new Error('Cannot get canvas context'));
        return;
      }
      
      img.onload = () => {
        onProgress?.({ stage: 'preprocess', progress: 20, message: 'Analyzing image...' });
        
        // Determine optimal scale - Bloomberg needs high res
        const scale = Math.max(2, Math.min(4, 3000 / Math.max(img.width, img.height)));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        
        // Draw with no smoothing for sharp text
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        onProgress?.({ stage: 'preprocess', progress: 40, message: 'Enhancing contrast...' });
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Step 1: Detect Bloomberg data region (orange header + data grid)
        const regionInfo = this.detectBloombergRegion(data, canvas.width, canvas.height);
        
        onProgress?.({ stage: 'preprocess', progress: 60, message: 'Converting to OCR format...' });
        
        // Step 2: Convert Bloomberg colors to black on white
        // Bloomberg uses: Orange/Yellow headers, White/Green/Red data, on black background
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate various color metrics
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
          const saturation = Math.max(r, g, b) - Math.min(r, g, b);
          
          // Bloomberg terminal colors detection
          // Orange/Amber (headers and selection): R > 180, G > 100, B < 100
          const isOrange = r > 160 && g > 80 && g < 220 && b < 100 && r > g;
          
          // Yellow: R > 180, G > 180, B < 130
          const isYellow = r > 170 && g > 170 && b < 140 && Math.abs(r - g) < 50;
          
          // White text: R > 180, G > 180, B > 180
          const isWhite = r > 160 && g > 160 && b > 160;
          
          // Green (positive values): G > R and G > B
          const isGreen = g > 100 && g > r * 1.2 && g > b * 1.2;
          
          // Red (negative values): R > G and R > B  
          const isRed = r > 140 && r > g * 1.3 && r > b * 1.3;
          
          // Cyan/Blue (links or highlights)
          const isCyan = b > 120 && g > 120 && r < 150 && b > r;
          
          // Light gray text
          const isLightGray = r > 120 && g > 120 && b > 120 && saturation < 40;
          
          // Determine if this pixel is text
          const isText = isOrange || isYellow || isWhite || isGreen || 
                        isRed || isCyan || isLightGray || brightness > 110;
          
          // Convert: text becomes black, background becomes white
          if (isText) {
            data[i] = 0;      // R
            data[i + 1] = 0;  // G
            data[i + 2] = 0;  // B
          } else {
            data[i] = 255;     // R
            data[i + 1] = 255; // G
            data[i + 2] = 255; // B
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        onProgress?.({ stage: 'preprocess', progress: 80, message: 'Sharpening text...' });
        
        // Step 3: Apply morphological dilation to thicken thin text
        const dilatedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        this.dilateText(dilatedData);
        ctx.putImageData(dilatedData, 0, 0);
        
        // Create debug image (before final processing)
        const debugUrl = canvas.toDataURL('image/png', 1.0);
        
        onProgress?.({ stage: 'preprocess', progress: 100, message: 'Preprocessing complete' });
        
        resolve({
          dataUrl: canvas.toDataURL('image/png', 1.0),
          debugUrl
        });
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
  
  /**
   * Detect Bloomberg data grid region based on orange header bar
   */
  private detectBloombergRegion(data: Uint8ClampedArray, width: number, height: number): { top: number; bottom: number; left: number; right: number } {
    let orangeRowCounts: number[] = [];
    
    // Count orange pixels per row to find header
    for (let y = 0; y < height; y++) {
      let orangeCount = 0;
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Orange detection
        if (r > 180 && g > 100 && g < 200 && b < 100) {
          orangeCount++;
        }
      }
      orangeRowCounts.push(orangeCount);
    }
    
    // Find rows with significant orange (likely header)
    const maxOrange = Math.max(...orangeRowCounts);
    const threshold = maxOrange * 0.3;
    
    let headerTop = 0;
    let headerBottom = height;
    
    for (let y = 0; y < height; y++) {
      if (orangeRowCounts[y] > threshold) {
        headerTop = Math.max(0, y - 10);
        break;
      }
    }
    
    return { top: headerTop, bottom: height, left: 0, right: width };
  }
  
  /**
   * Dilate text to make it thicker and more readable
   */
  private dilateText(imageData: ImageData): void {
    const { data, width, height } = imageData;
    const copy = new Uint8ClampedArray(data);
    
    // Simple 3x3 dilation - if any neighbor is black, make this pixel black
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Skip if already black
        if (copy[idx] === 0) continue;
        
        // Check if any neighbor is black (text)
        let hasBlackNeighbor = false;
        for (let dy = -1; dy <= 1 && !hasBlackNeighbor; dy++) {
          for (let dx = -1; dx <= 1 && !hasBlackNeighbor; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            if (copy[nIdx] < 50) {
              hasBlackNeighbor = true;
            }
          }
        }
        
        // Dilate: turn white pixel next to black into black
        if (hasBlackNeighbor) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
        }
      }
    }
  }
  
  /**
   * Run OCR on preprocessed image
   */
  async runOCR(imageDataUrl: string, onProgress?: (p: OCRProgress) => void): Promise<{ text: string; confidence: number }> {
    onProgress?.({ stage: 'ocr', progress: 0, message: 'Initializing OCR engine...' });
    
    // Create worker with English language optimized for tables
    const worker = await Tesseract.createWorker('eng');
    
    onProgress?.({ stage: 'ocr', progress: 20, message: 'Configuring OCR...' });
    
    // Configure for table/spreadsheet recognition
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,+-/%()$/ ',
      preserve_interword_spaces: '1',
    });
    
    onProgress?.({ stage: 'ocr', progress: 40, message: 'Running text recognition...' });
    
    const result = await worker.recognize(imageDataUrl);
    
    onProgress?.({ stage: 'ocr', progress: 90, message: 'Finishing OCR...' });
    
    await worker.terminate();
    
    onProgress?.({ stage: 'ocr', progress: 100, message: 'OCR complete' });
    
    return {
      text: result.data.text,
      confidence: result.data.confidence
    };
  }
  
  /**
   * Parse OCR text into structured Bloomberg rows
   */
  parseBloombergData(text: string, onProgress?: (p: OCRProgress) => void): ParsedBloombergRow[] {
    onProgress?.({ stage: 'parse', progress: 0, message: 'Parsing data...' });
    
    const rows: ParsedBloombergRow[] = [];
    const lines = text.split('\n').filter(line => line.trim().length > 10);
    
    // Skip header lines
    const dataLines = lines.filter(line => !this.isHeaderLine(line));
    
    onProgress?.({ stage: 'parse', progress: 30, message: `Found ${dataLines.length} potential data lines` });
    
    let rowNum = 1;
    
    for (const line of dataLines) {
      const parsed = this.parseSingleLine(line, rowNum);
      if (parsed) {
        rows.push(parsed);
        rowNum++;
      }
    }
    
    onProgress?.({ stage: 'parse', progress: 70, message: 'Cleaning up data...' });
    
    // Post-process: apply known corrections
    const cleaned = rows.map(row => this.cleanupRow(row));
    
    onProgress?.({ stage: 'parse', progress: 100, message: `Extracted ${cleaned.length} rows` });
    
    return cleaned;
  }
  
  /**
   * Check if line is a header
   */
  private isHeaderLine(line: string): boolean {
    const lower = line.toLowerCase();
    const headerKeywords = [
      'security', 'ticker', 'source', 'position', 'pos chg', '% out', 
      'curr mv', 'filing', 'total curr mkt', 'num of holdings',
      'periodicity', 'management', 'institution', 'historical',
      'group by', 'show asset', 'currency', 'field', 'wisdomtree',
      'holder ownership', 'type'
    ];
    
    const matchCount = headerKeywords.filter(kw => lower.includes(kw)).length;
    return matchCount >= 2;
  }
  
  /**
   * Parse a single line into Bloomberg row data
   */
  private parseSingleLine(line: string, defaultRank: number): ParsedBloombergRow | null {
    const trimmed = line.trim();
    
    // Patterns for extraction
    const patterns = {
      // Row number at start: 1), 10), 248), etc.
      rowNum: /^(\d{1,3})[\)\.\s]+/,
      
      // Standard tickers: MSFT US, NVDA US, 7203 JP, etc.
      ticker: /\b([A-Z]{1,5}|[0-9]{4,5})\s+(US|JP|HK|LN|GR|FP|CN|IN|AU|SP|TB|GY|SM|IM|SS|SW|TT|NA|KS)\b/i,
      
      // Special tickers: TF Float 0..., B 0 05/14...
      specialTicker: /\b(TF\s*Float\s*[\d\.]+|B\s+\d+\s+\d{2}\/\d{2})/i,
      
      // Combined ticker: FVH6 COMB, TYH6 COMB
      combTicker: /\b([A-Z]{3,4}\d)\s*COMB?\b/i,
      
      // Source: ULT-AGG
      source: /\bULT[-\s]?AGG\b/i,
      
      // Position: large numbers with commas (100,000+)
      position: /\b(\d{1,3}(?:,\d{3}){1,4})\b/,
      
      // Position change: +/-numbers
      posChg: /([+-]\s*\d{1,3}(?:,\d{3})*)/,
      
      // % Out: decimal numbers 0.01 - 99.99
      pctOut: /\b(\d{1,2}\.\d{1,2})\b/,
      
      // Market value: number + BLN/MLN
      currMV: /(\d+(?:\.\d+)?)\s*(BLN|MLN)\b/i,
      
      // Filing date: MM/DD/YY
      filingDate: /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/
    };
    
    // Extract row number
    const rowNumMatch = trimmed.match(patterns.rowNum);
    const rank = rowNumMatch ? rowNumMatch[1] : String(defaultRank);
    
    // Extract ticker
    let ticker = '';
    let tickerEndIndex = 0;
    
    const tickerMatch = trimmed.match(patterns.ticker);
    const specialTickerMatch = trimmed.match(patterns.specialTicker);
    const combTickerMatch = trimmed.match(patterns.combTicker);
    
    if (tickerMatch) {
      ticker = `${tickerMatch[1]} ${tickerMatch[2]}`.toUpperCase();
      tickerEndIndex = (tickerMatch.index || 0) + tickerMatch[0].length;
    } else if (specialTickerMatch) {
      ticker = specialTickerMatch[0].toUpperCase();
      tickerEndIndex = (specialTickerMatch.index || 0) + specialTickerMatch[0].length;
    } else if (combTickerMatch) {
      ticker = `${combTickerMatch[1]} COMB`.toUpperCase();
      tickerEndIndex = (combTickerMatch.index || 0) + combTickerMatch[0].length;
    }
    
    // If no ticker found, skip this line
    if (!ticker) return null;
    
    // Extract security name (text between row number and ticker)
    let security = '';
    const rowNumEndIndex = rowNumMatch ? rowNumMatch.index! + rowNumMatch[0].length : 0;
    const tickerStartIndex = tickerMatch?.index || specialTickerMatch?.index || combTickerMatch?.index || 0;
    
    if (tickerStartIndex > rowNumEndIndex) {
      security = trimmed.substring(rowNumEndIndex, tickerStartIndex).trim();
      // Clean up security name
      security = security.replace(/^[\s\-\)\.\]]+/, '').replace(/[\s\-\)\.\]]+$/, '').trim();
    }
    
    // Extract source
    const sourceMatch = trimmed.match(patterns.source);
    const source = sourceMatch ? 'ULT-AGG' : '';
    
    // Extract position
    const positionMatch = trimmed.match(patterns.position);
    const position = positionMatch ? positionMatch[1] : '';
    
    // Extract position change
    const posChgMatch = trimmed.match(patterns.posChg);
    const posChg = posChgMatch ? posChgMatch[1].replace(/\s/g, '') : '';
    
    // Extract % out
    const allDecimals = [...trimmed.matchAll(/\b(\d{1,2}\.\d{1,2})\b/g)];
    let pctOut = '';
    for (const match of allDecimals) {
      const val = parseFloat(match[1]);
      // % Out is typically between 0.01 and 10.00
      if (val >= 0.01 && val <= 15) {
        pctOut = match[1];
        break;
      }
    }
    
    // Extract market value
    const currMVMatch = trimmed.match(patterns.currMV);
    const currMV = currMVMatch ? `${currMVMatch[1]}${currMVMatch[2].toUpperCase()}` : '';
    
    // Extract filing date
    const filingDateMatch = trimmed.match(patterns.filingDate);
    const filingDate = filingDateMatch ? filingDateMatch[1] : '';
    
    // Calculate confidence based on how many fields were extracted
    const fieldsFound = [security, ticker, source, position, posChg, pctOut, currMV, filingDate]
      .filter(f => f.length > 0).length;
    const confidence = Math.min(1, fieldsFound / 6);
    
    return {
      rank,
      security,
      ticker,
      source,
      position,
      posChg,
      pctOut,
      currMV,
      filingDate,
      confidence
    };
  }
  
  /**
   * Clean up row with known corrections
   */
  private cleanupRow(row: ParsedBloombergRow): ParsedBloombergRow {
    const cleaned = { ...row };
    
    // Apply ticker corrections
    const tickerParts = cleaned.ticker.split(' ');
    if (tickerParts[0] && TICKER_CORRECTIONS[tickerParts[0]]) {
      tickerParts[0] = TICKER_CORRECTIONS[tickerParts[0]];
      cleaned.ticker = tickerParts.join(' ');
    }
    
    // Apply security name corrections
    const upperSecurity = cleaned.security.toUpperCase();
    for (const [key, value] of Object.entries(KNOWN_SECURITIES)) {
      if (upperSecurity.includes(key)) {
        cleaned.security = value;
        break;
      }
    }
    
    // Ensure source is ULT-AGG if detected
    if (!cleaned.source && cleaned.position) {
      cleaned.source = 'ULT-AGG';
    }
    
    // Clean up position change format
    if (cleaned.posChg && !cleaned.posChg.startsWith('+') && !cleaned.posChg.startsWith('-')) {
      cleaned.posChg = '+' + cleaned.posChg;
    }
    
    return cleaned;
  }
  
  /**
   * Process image end-to-end
   */
  async processImage(file: File, onProgress?: (p: OCRProgress) => void): Promise<BloombergOCRResult> {
    // Step 1: Preprocess
    const { dataUrl, debugUrl } = await this.preprocessImage(file, onProgress);
    
    // Step 2: Run OCR
    const { text, confidence } = await this.runOCR(dataUrl, onProgress);
    
    // Step 3: Parse results
    const rows = this.parseBloombergData(text, onProgress);
    
    return {
      text,
      confidence,
      rows,
      processedImageUrl: dataUrl,
      debugImageUrl: debugUrl
    };
  }
  
  /**
   * Process multiple images
   */
  async processMultipleImages(
    files: File[],
    onProgress?: (imageIndex: number, p: OCRProgress) => void
  ): Promise<BloombergOCRResult[]> {
    const results: BloombergOCRResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const result = await this.processImage(
        files[i],
        (p) => onProgress?.(i, p)
      );
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Convert results to Excel format
   */
  static toExcelData(rows: ParsedBloombergRow[]): Record<string, any> {
    const excelData: Record<string, any> = {};
    
    // Headers
    const headers = ['Rk', 'Name', 'Ticker', 'Source', 'Position', 'Pos Chg', '% Out', 'Curr MV', 'Filing Date'];
    headers.forEach((h, i) => {
      excelData[this.getCellAddress(0, i)] = h;
    });
    
    // Data rows
    rows.forEach((row, rowIdx) => {
      const values = [
        row.rank,
        row.security,
        row.ticker,
        row.source,
        row.position,
        row.posChg,
        row.pctOut,
        row.currMV,
        row.filingDate
      ];
      
      values.forEach((val, colIdx) => {
        excelData[this.getCellAddress(rowIdx + 1, colIdx)] = val;
      });
    });
    
    return excelData;
  }
  
  private static getCellAddress(row: number, col: number): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let colLabel = '';
    let c = col;
    
    do {
      colLabel = letters[c % 26] + colLabel;
      c = Math.floor(c / 26) - 1;
    } while (c >= 0);
    
    return `${colLabel}${row + 1}`;
  }
}

export default BloombergOCREngine;
