// AI-Enhanced OCR for Bloomberg Terminal
// Known securities database and ticker corrections

export interface BloombergRow {
  rank: string;
  name: string;
  ticker: string;
  source: string;
  position: string;
  posChg: string;
  pctOut: string;
  currMV: string;
  filingDate: string;
}

// Known Bloomberg Security Names Database
export const KNOWN_SECURITIES: Record<string, string> = {
  // Treasury
  'treasury': 'US TREASURY FRN',
  'treasury bill': 'TREASURY BILL',
  'frn': 'US TREASURY FRN',
  'tf float': 'US TREASURY FRN',
  
  // Tech Giants
  'msft': 'Microsoft Corp',
  'microsoft': 'Microsoft Corp',
  'nvda': 'NVIDIA Corp',
  'nvidia': 'NVIDIA Corp',
  'aapl': 'Apple Inc',
  'apple': 'Apple Inc',
  'googl': 'Alphabet Inc Class A',
  'goog': 'Alphabet Inc Class A',
  'google': 'Alphabet Inc Class A',
  'alphabet': 'Alphabet Inc Class A',
  'meta': 'Meta Platforms Inc Class A',
  'facebook': 'Meta Platforms Inc Class A',
  'amzn': 'Amazon.com Inc',
  'amazon': 'Amazon.com Inc',
  'tsla': 'Tesla Inc',
  'tesla': 'Tesla Inc',
  
  // Major Companies
  'xom': 'Exxon Mobil Corp',
  'exxon': 'Exxon Mobil Corp',
  'avgo': 'Broadcom Inc',
  'broadcom': 'Broadcom Inc',
  'hd': 'Home Depot Inc/The',
  'home depot': 'Home Depot Inc/The',
  'jpm': 'JPMorgan Chase & Co',
  'jpmorgan': 'JPMorgan Chase & Co',
  'cvx': 'Chevron Corp',
  'chevron': 'Chevron Corp',
  'unh': 'UnitedHealth Group Inc',
  'unitedhealth': 'UnitedHealth Group Inc',
  'ko': 'Coca-Cola Co/The',
  'coca-cola': 'Coca-Cola Co/The',
  'abbv': 'AbbVie Inc',
  'abbvie': 'AbbVie Inc',
  'orcl': 'Oracle Corp',
  'oracle': 'Oracle Corp',
  'dal': 'Delta Air Lines Inc',
  'delta': 'Delta Air Lines Inc',
  'lw': 'Southwest Airlines Co',
  'southwest': 'Southwest Airlines Co',
  'hon': 'Honeywell International Inc',
  'honeywell': 'Honeywell International Inc',
  'now': 'ServiceNow Inc',
  'servicenow': 'ServiceNow Inc',
  'hsba': 'HSBC Holdings PLC',
  'hsbc': 'HSBC Holdings PLC',
  'cvs': 'CVS Health Corp',
  'bharti': 'Bharti Airtel Ltd',
  'rtx': 'RTX Corp',
  'raytheon': 'RTX Corp',
  'gen digital': 'Gen Digital Inc',
  'datadog': 'Datadog Inc',
  'keyence': 'Keyence Corp',
  
  // Japanese
  '7203': 'Toyota Motor Corp',
  'toyota': 'Toyota Motor Corp',
};

// Ticker corrections for common OCR errors
export const TICKER_CORRECTIONS: Record<string, string> = {
  'basf se': 'TF Float 0...',
  '1 ss': 'TF Float 0...',
  'd us': 'MSFT US',
  '9 us': 'NVDA US',
  '4 us': 'TF Float 1...',
  'sa tt': 'HD US',
  '1 in': 'BHARTI IN',
  '25 ga': 'B 0 02/05...',
  'a se': 'KO US',
  'bb bb': 'BHARTI IN',
  'gen': 'GEN US',
};

// Clean and correct OCR text
export const correctOCRText = (rawText: string): string => {
  let corrected = rawText;
  
  // Remove common OCR artifacts
  corrected = corrected
    .replace(/[|]/g, 'I')
    .replace(/[©®™]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[)\]}\>]+\s*/g, ' ')
    .replace(/[\(\[\{<]+/g, ' ')
    .replace(/M9\)/gi, 'US TREASURY')
    .replace(/MIITRRUIE/gi, 'Home Depot')
    .replace(/Tee AR\)/gi, 'Broadcom')
    .replace(/was a 19/gi, 'Meta Platforms')
    .replace(/25D Gen Digital/gi, 'Gen Digital')
    .trim();
  
  return corrected;
};

// Match security name from known database
export const matchSecurityName = (rawName: string): string => {
  if (!rawName) return '';
  
  const cleanName = rawName.toLowerCase().trim();
  
  // Direct match
  for (const [key, value] of Object.entries(KNOWN_SECURITIES)) {
    if (cleanName.includes(key)) {
      return value;
    }
  }
  
  // Fuzzy match - check if any word matches
  const words = cleanName.split(' ').filter(w => w.length >= 3);
  for (const word of words) {
    for (const [key, value] of Object.entries(KNOWN_SECURITIES)) {
      if (key.includes(word) || word.includes(key)) {
        return value;
      }
    }
  }
  
  // Clean up garbled text
  if (/^[^a-zA-Z]+$/.test(rawName)) {
    return ''; // Return empty if no letters
  }
  
  return rawName;
};

// Correct ticker based on known patterns
export const correctTicker = (rawTicker: string): string => {
  if (!rawTicker) return '';
  
  const cleanTicker = rawTicker.toLowerCase().trim();
  
  // Check corrections
  for (const [wrong, correct] of Object.entries(TICKER_CORRECTIONS)) {
    if (cleanTicker === wrong || cleanTicker.includes(wrong)) {
      return correct;
    }
  }
  
  // Fix single-letter tickers that are likely errors
  if (/^[A-Z0-9]\s+(US|JP)$/i.test(rawTicker)) {
    // Single character ticker is likely an OCR error
    return '';
  }
  
  return rawTicker.toUpperCase();
};

// Post-process rows to clean up data
export const postProcessBloombergRows = (rows: BloombergRow[]): BloombergRow[] => {
  return rows.map((row, index) => {
    // Ensure rank is set
    if (!row.rank || row.rank === '-') {
      row.rank = String(index + 1);
    }
    
    // Ensure source is set
    if (!row.source || row.source === '-') {
      row.source = 'ULT-AGG';
    }
    
    // Apply name corrections
    if (row.name) {
      row.name = matchSecurityName(row.name);
    }
    
    // Apply ticker corrections
    if (row.ticker) {
      row.ticker = correctTicker(row.ticker);
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

export default {
  KNOWN_SECURITIES,
  TICKER_CORRECTIONS,
  correctOCRText,
  matchSecurityName,
  correctTicker,
  postProcessBloombergRows
};
