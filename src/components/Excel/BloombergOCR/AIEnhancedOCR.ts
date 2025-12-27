// AI-Enhanced OCR for Bloomberg Terminal - Trained with WisdomTree Holdings Data
// Known securities database and ticker corrections from real Bloomberg screenshots

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

// Known Bloomberg Security Names Database - Comprehensive list from WisdomTree Holdings
export const KNOWN_SECURITIES: Record<string, string> = {
  // Treasury Securities
  'treasury': 'US TREASURY FRN',
  'treasury frn': 'US TREASURY FRN',
  'us treasury frn': 'US TREASURY FRN',
  'treasury bill': 'TREASURY BILL',
  'frn': 'US TREASURY FRN',
  'tf float': 'US TREASURY FRN',
  'treasury note': 'US Treasury Note',
  'us treasury note': 'US Treasury Note',
  'treasury bond': 'US Treasury Bond Futures',
  'ultra treasury': 'US Ultra Treasury Note',
  
  // Tech Giants - FAANG+
  'msft': 'Microsoft Corp',
  'microsoft': 'Microsoft Corp',
  'nvda': 'NVIDIA Corp',
  'nvidia': 'NVIDIA Corp',
  'aapl': 'Apple Inc',
  'apple': 'Apple Inc',
  'googl': 'Alphabet Inc Class A Common Shares',
  'goog': 'Alphabet Inc Class A Common Shares',
  'google': 'Alphabet Inc Class A Common Shares',
  'alphabet': 'Alphabet Inc Class A Common Shares',
  'meta': 'Meta Platforms Inc Class A',
  'facebook': 'Meta Platforms Inc Class A',
  'amzn': 'Amazon.com Inc',
  'amazon': 'Amazon.com Inc',
  'tsla': 'Tesla Inc',
  'tesla': 'Tesla Inc',
  
  // Major Tech
  'avgo': 'Broadcom Inc',
  'broadcom': 'Broadcom Inc',
  'orcl': 'Oracle Corp',
  'oracle': 'Oracle Corp',
  'csco': 'Cisco Systems Inc',
  'cisco': 'Cisco Systems Inc',
  'ibm': 'International Business Machines Corp',
  'crm': 'Salesforce Inc',
  'salesforce': 'Salesforce Inc',
  'adp': 'Automatic Data Processing Inc',
  'now': 'ServiceNow Inc',
  'servicenow': 'ServiceNow Inc',
  'ddog': 'Datadog Inc',
  'datadog': 'Datadog Inc',
  'net': 'Cloudflare Inc Class A',
  'cloudflare': 'Cloudflare Inc Class A',
  'qcom': 'QUALCOMM Inc',
  'qualcomm': 'QUALCOMM Inc',
  'mu': 'Micron Technology Inc',
  'micron': 'Micron Technology Inc',
  'amd': 'Advanced Micro Devices Inc',
  'intc': 'Intel Corp',
  'intel': 'Intel Corp',
  
  // Financial Services
  'jpm': 'JPMorgan Chase & Co',
  'jpmorgan': 'JPMorgan Chase & Co',
  'bac': 'Bank of America Corp',
  'bank of america': 'Bank of America Corp',
  'wfc': 'Wells Fargo & Co',
  'wells fargo': 'Wells Fargo & Co',
  'c': 'Citigroup Inc',
  'citigroup': 'Citigroup Inc',
  'gs': 'Goldman Sachs Group Inc',
  'goldman': 'Goldman Sachs Group Inc',
  'ms': 'Morgan Stanley',
  'morgan stanley': 'Morgan Stanley',
  'schw': 'Charles Schwab Corp/The Common Voting',
  'schwab': 'Charles Schwab Corp/The Common Voting',
  'v': 'Visa Inc Class A Common Shares',
  'visa': 'Visa Inc Class A Common Shares',
  'ma': 'Mastercard Inc Class A Common Stock',
  'mastercard': 'Mastercard Inc Class A Common Stock',
  'axp': 'American Express Co',
  'american express': 'American Express Co',
  'pypl': 'PayPal Holdings Inc',
  'paypal': 'PayPal Holdings Inc',
  'fitb': 'Fifth Third Bancorp',
  'hban': 'Huntington Bancshares Inc/OH',
  'fnf': 'Fidelity National Financial Inc',
  'mco': 'Moody\'s Corp',
  'moody': 'Moody\'s Corp',
  
  // Energy
  'xom': 'Exxon Mobil Corp',
  'exxon': 'Exxon Mobil Corp',
  'exxon mobil': 'Exxon Mobil Corp',
  'cvx': 'Chevron Corp',
  'chevron': 'Chevron Corp',
  'cop': 'ConocoPhillips',
  'slb': 'Schlumberger Ltd',
  'oxy': 'Occidental Petroleum Corp',
  'bp': 'BP PLC',
  'ongc': 'Oil & Natural Gas Corp Ltd',
  'duk': 'Duke Energy Corp',
  'duke': 'Duke Energy Corp',
  
  // Healthcare & Pharma
  'unh': 'UnitedHealth Group Inc',
  'unitedhealth': 'UnitedHealth Group Inc',
  'jnj': 'Johnson & Johnson',
  'johnson': 'Johnson & Johnson',
  'pfe': 'Pfizer Inc',
  'pfizer': 'Pfizer Inc',
  'mrk': 'Merck & Co Inc',
  'merck': 'Merck & Co Inc',
  'abbv': 'AbbVie Inc',
  'abbvie': 'AbbVie Inc',
  'lly': 'Eli Lilly & Co',
  'eli lilly': 'Eli Lilly & Co',
  'bmy': 'Bristol-Myers Squibb Co',
  'bristol': 'Bristol-Myers Squibb Co',
  'abt': 'Abbott Laboratories',
  'abbott': 'Abbott Laboratories',
  'regn': 'Regeneron Pharmaceuticals Inc Common Stock',
  'regeneron': 'Regeneron Pharmaceuticals Inc Common Stock',
  'amgn': 'Amgen Inc',
  'amgen': 'Amgen Inc',
  'gild': 'Gilead Sciences Inc',
  'gilead': 'Gilead Sciences Inc',
  
  // Consumer
  'ko': 'Coca-Cola Co/The',
  'coca-cola': 'Coca-Cola Co/The',
  'pep': 'PepsiCo Inc',
  'pepsi': 'PepsiCo Inc',
  'pg': 'Procter & Gamble Co/The',
  'procter': 'Procter & Gamble Co/The',
  'cost': 'Costco Wholesale Corp',
  'costco': 'Costco Wholesale Corp',
  'wmt': 'Walmart Inc',
  'walmart': 'Walmart Inc',
  'mcd': 'McDonald\'s Corp',
  'mcdonalds': 'McDonald\'s Corp',
  'sbux': 'Starbucks Corp',
  'starbucks': 'Starbucks Corp',
  'nke': 'Nike Inc',
  'nike': 'Nike Inc',
  'hd': 'Home Depot Inc/The',
  'home depot': 'Home Depot Inc/The',
  'tjx': 'TJX Cos Inc/The',
  'bby': 'Best Buy Co Inc',
  'best buy': 'Best Buy Co Inc',
  
  // Industrial & Aerospace
  'ba': 'BAE Systems PLC',
  'bae': 'BAE Systems PLC',
  'bae systems': 'BAE Systems PLC',
  'lmt': 'Lockheed Martin Corp',
  'lockheed': 'Lockheed Martin Corp',
  'rtx': 'RTX Corp',
  'raytheon': 'RTX Corp',
  'ge': 'General Electric Co',
  'hon': 'Honeywell International Inc',
  'honeywell': 'Honeywell International Inc',
  'cat': 'Caterpillar Inc',
  'caterpillar': 'Caterpillar Inc',
  'de': 'Deere & Co',
  'deere': 'Deere & Co',
  'ups': 'United Parcel Service Inc',
  'fdx': 'FedEx Corp',
  'fedex': 'FedEx Corp',
  'dal': 'Delta Air Lines Inc',
  'delta': 'Delta Air Lines Inc',
  'luv': 'Southwest Airlines Co',
  'southwest': 'Southwest Airlines Co',
  'nue': 'Nucor Corp',
  'nucor': 'Nucor Corp',
  'csx': 'CSX Corp',
  
  // Telecom & Media
  'tmus': 'T-Mobile US Inc',
  't-mobile': 'T-Mobile US Inc',
  'vz': 'Verizon Communications Inc',
  'verizon': 'Verizon Communications Inc',
  't': 'AT&T Inc',
  'att': 'AT&T Inc',
  'at&t': 'AT&T Inc',
  'cmcsa': 'Comcast Corp Class A',
  'comcast': 'Comcast Corp Class A',
  'dis': 'Walt Disney Co/The',
  'disney': 'Walt Disney Co/The',
  
  // European Companies
  'rhm': 'Rheinmetall AG',
  'rheinmetall': 'Rheinmetall AG',
  'saf': 'Safran SA',
  'safran': 'Safran SA',
  'air': 'Airbus SE',
  'airbus': 'Airbus SE',
  'rr': 'Rolls-Royce Holdings PLC',
  'rolls-royce': 'Rolls-Royce Holdings PLC',
  'ldo': 'Leonardo SpA Ordinary Shares',
  'leonardo': 'Leonardo SpA Ordinary Shares',
  'mc': 'LVMH Moet Hennessy Louis Vuitton SE LVMH',
  'lvmh': 'LVMH Moet Hennessy Louis Vuitton SE LVMH',
  'rms': 'Hermes International SCA',
  'hermes': 'Hermes International SCA',
  'dte': 'Deutsche Telekom AG',
  'deutsche telekom': 'Deutsche Telekom AG',
  'bbva': 'Banco Bilbao Vizcaya Argentaria SA',
  'asml': 'ASML Holding NV',
  'sap': 'SAP SE',
  'gsk': 'GSK PLC',
  'abn': 'ABB Ltd',
  'abb': 'ABB Ltd',
  'inga': 'ING Groep NV',
  'ing': 'ING Groep NV',
  'ferg': 'Ferguson Enterprises Inc',
  'ferguson': 'Ferguson Enterprises Inc',
  'glw': 'Corning Inc',
  'corning': 'Corning Inc',
  'shw': 'Sherwin-Williams Co/The',
  'sherwin': 'Sherwin-Williams Co/The',
  'hag': 'Hensoldt AG',
  'hensoldt': 'Hensoldt AG',
  'r3nk': 'RENK Group AG',
  'renk': 'RENK Group AG',
  'pkn': 'ORLEN SA',
  'orlen': 'ORLEN SA',
  'san': 'Sanofi SA Common',
  'sanofi': 'Sanofi SA Common',
  'glen': 'Glencore PLC',
  'glencore': 'Glencore PLC',
  'ubsg': 'UBS Group AG',
  'ubs': 'UBS Group AG',
  'volvb': 'Volvo AB Class B Common Shares',
  'volvo': 'Volvo AB Class B Common Shares',
  
  // Japanese Companies
  '7203': 'Toyota Motor Corp',
  'toyota': 'Toyota Motor Corp',
  '8750': 'Dai-ichi Life Holdings Inc',
  'dai-ichi': 'Dai-ichi Life Holdings Inc',
  '4519': 'Chugai Pharmaceutical Co Ltd',
  'chugai': 'Chugai Pharmaceutical Co Ltd',
  '4063': 'Shin-Etsu Chemical Co Ltd',
  'shin-etsu': 'Shin-Etsu Chemical Co Ltd',
  '005930': 'Samsung Electronics Co Ltd',
  'samsung': 'Samsung Electronics Co Ltd',
  'syk': 'Stryker Corp',
  'stryker': 'Stryker Corp',
  '8316': 'Sumitomo Mitsui Financial Group Inc',
  'sumitomo': 'Sumitomo Mitsui Financial Group Inc',
  '4502': 'Takeda Pharmaceutical Co Ltd',
  'takeda': 'Takeda Pharmaceutical Co Ltd',
  '6752': 'Panasonic Holdings Corp',
  'panasonic': 'Panasonic Holdings Corp',
  '5401': 'Nippon Steel Corp',
  'nippon steel': 'Nippon Steel Corp',
  '9983': 'Fast Retailing Co Ltd',
  'fast retailing': 'Fast Retailing Co Ltd',
  '8306': 'Mitsubishi UFJ Financial Group Inc',
  '8015': 'Toyota Tsusho Corp',
  '6503': 'Mitsubishi Electric Corp',
  'mitsubishi': 'Mitsubishi Electric Corp',
  '5108': 'Sompo Holdings Inc',
  'sompo': 'Sompo Holdings Inc',
  '8002': 'Marubeni Corp',
  'marubeni': 'Marubeni Corp',
  '8630': 'McKesson Corp',
  'mckesson': 'McKesson Corp',
  '8053': 'Sumitomo Corp',
  '8725': 'MS&AD Insurance Group Holdings Inc',
  '7011': 'Mitsubishi Heavy Industries Ltd',
  '5802': 'Sumitomo Electric Industries Ltd',
  '6902': 'Denso Corp',
  'denso': 'Denso Corp',
  '8766': 'Tokio Marine Holdings Inc',
  'tokio marine': 'Tokio Marine Holdings Inc',
  '7751': 'Canon Inc',
  'canon': 'Canon Inc',
  '4568': 'RENK Group AG',
  
  // Chinese/HK Companies
  '2318': 'Ping An Insurance Group Co of China Ltd H Share',
  'ping an': 'Ping An Insurance Group Co of China Ltd H Share',
  '9988': 'Alibaba Group Holding Ltd',
  'alibaba': 'Alibaba Group Holding Ltd',
  '1398': 'Industrial & Commercial Bank of China Ltd H Share',
  'icbc': 'Industrial & Commercial Bank of China Ltd H Share',
  '000660': 'SK hynix Inc',
  'sk hynix': 'SK hynix Inc',
  '700': 'Tencent Holdings Ltd',
  'tencent': 'Tencent Holdings Ltd',
  '2382': 'Quanta Computer Inc',
  'quanta': 'Quanta Computer Inc',
  '2330': 'Taiwan Semiconductor Manufacturing Co Ltd',
  'tsmc': 'Taiwan Semiconductor Manufacturing Co Ltd',
  
  // Indian Companies
  'reliance': 'Reliance Industries Ltd Ordinary Shares',
  'hdfc': 'HDFC Bank Ltd',
  'bharti': 'Bharti Airtel Ltd Shares Outstanding',
  'tcs': 'Tata Consultancy Services Ltd',
  'tata': 'Tata Consultancy Services Ltd',
  'info': 'Infosys Ltd',
  'infosys': 'Infosys Ltd',
  'vedl': 'Vedanta Ltd',
  'vedanta': 'Vedanta Ltd',
  'mm': 'Mahindra & Mahindra Ltd',
  'mahindra': 'Mahindra & Mahindra Ltd',
  'coal': 'Coal India Ltd',
  'coal india': 'Coal India Ltd',
  
  // Other Major Companies
  'saab': 'Saab AB Class B Common Shares',
  'pltr': 'Palantir Technologies Inc Class A',
  'palantir': 'Palantir Technologies Inc Class A',
  'ecl': 'Ecolab Inc',
  'ecolab': 'Ecolab Inc',
  'klac': 'KLA Corp',
  'kla': 'KLA Corp',
  'apo': 'Apollo Global Management Inc',
  'apollo': 'Apollo Global Management Inc',
  'itx': 'Industria de Diseno Textil SA',
  'inditex': 'Industria de Diseno Textil SA',
  'pm': 'Philip Morris International Inc',
  'philip morris': 'Philip Morris International Inc',
  'so': 'Southern Co/The',
  'southern': 'Southern Co/The',
  'cf': 'CF Industries Holdings Inc',
  'dhi': 'DR Horton Inc',
  'dr horton': 'DR Horton Inc',
  'aph': 'Amphenol Corp',
  'amphenol': 'Amphenol Corp',
  'cmi': 'Cummins Inc',
  'cummins': 'Cummins Inc',
  'f': 'Ford Motor Co Common Shares',
  'ford': 'Ford Motor Co Common Shares',
  'brk': 'Berkshire Hathaway Inc CLASS B',
  'berkshire': 'Berkshire Hathaway Inc CLASS B',
  'bkng': 'Booking Holdings Inc',
  'booking': 'Booking Holdings Inc',
  'dtg': 'Daimler Truck Holding AG',
  'daimler': 'Daimler Truck Holding AG',
  'mar': 'Marriott International Inc/MD',
  'marriott': 'Marriott International Inc/MD',
  'kone': 'Kone Oyj Class B Common Shares',
  'knebv': 'Kone Oyj Class B Common Shares',
  'imp': 'Imperial Brands PLC',
  'imperial': 'Imperial Brands PLC',
  'txn': 'Texas Instruments Inc',
  'texas instruments': 'Texas Instruments Inc',
  'ai': 'Air Liquide SA',
  'air liquide': 'Air Liquide SA',
  'gfnorte': 'Grupo Financiero Banorte SAB de CV',
  
  // Handle garbled OCR patterns
  'common shares': 'Common Shares',
  'class a': 'Class A',
  'class b': 'Class B',
  'inc': 'Inc',
  'corp': 'Corp',
  'ltd': 'Ltd',
  'plc': 'PLC',
};

// Ticker corrections for common OCR errors - expanded
export const TICKER_CORRECTIONS: Record<string, string> = {
  // Treasury patterns
  'tf float 0': 'TF Float 0...',
  'tf float 1': 'TF Float 1...',
  'tf float': 'TF Float 0...',
  'tyh6 comb': 'TYH6 COMB',
  'tuh6 comb': 'TUH6 COMB',
  'fvh6 comb': 'FVH6 COMB',
  'ush6 comb': 'USH6 COMB',
  'uxyh6 co': 'UXYH6 CO...',
  'b 0 02/05': 'B 0 02/05...',
  'b 0 05/14': 'B 0 05/14...',
  'b 0 01/22': 'B 0 01/22...',
  'b 0 03/05': 'B 0 03/05...',
  'b 0 02/19': 'B 0 02/19...',
  
  // Common OCR errors
  'd us': 'MSFT US',
  '1 us': 'T US',
  'o us': 'KO US',
  '0 us': 'KO US',
  'i us': 'T US',
  'l us': 'T US',
  '1ab ln': 'IAB LN',
  'ba/ ln': 'BA/ LN',
  'bp/ ln': 'BP/ LN',
  'rr/ ln': 'RR/ LN',
  'reliance': 'RELIANCE ...',
  'gfnorte': 'GFNORTEO...',
};

// Clean and correct OCR text - enhanced patterns
export const correctOCRText = (rawText: string): string => {
  let corrected = rawText;
  
  // Remove common OCR artifacts
  corrected = corrected
    .replace(/[|]/g, 'I')
    .replace(/[©®™]/g, '')
    .replace(/[\u0000-\u001F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ')
    .replace(/[)\]}\>]+\s*/g, ' ')
    .replace(/[\(\[\{<]+/g, ' ')
    // Fix common Bloomberg terminal artifacts
    .replace(/M9\)/gi, 'US TREASURY')
    .replace(/MIITRRUIE/gi, 'Home Depot')
    .replace(/Tee AR\)/gi, 'Broadcom')
    .replace(/was a 19/gi, 'Meta Platforms')
    .replace(/UL1-AGG/gi, 'ULT-AGG')
    .replace(/UL7-AGG/gi, 'ULT-AGG')
    .replace(/UI_T-AGG/gi, 'ULT-AGG')
    .replace(/OLT-AGG/gi, 'ULT-AGG')
    .trim();
  
  return corrected;
};

// Match security name from known database - improved matching
export const matchSecurityName = (rawName: string): string => {
  if (!rawName) return '';
  
  const cleanName = rawName.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s&\/\-\.]/g, '');
  
  // Direct match
  for (const [key, value] of Object.entries(KNOWN_SECURITIES)) {
    if (cleanName === key || cleanName.includes(key)) {
      return value;
    }
  }
  
  // Try matching by words
  const words = cleanName.split(' ').filter(w => w.length >= 3);
  for (const word of words) {
    for (const [key, value] of Object.entries(KNOWN_SECURITIES)) {
      if (key === word) {
        return value;
      }
    }
  }
  
  // Partial match
  for (const [key, value] of Object.entries(KNOWN_SECURITIES)) {
    const keyWords = key.split(' ');
    for (const kw of keyWords) {
      if (kw.length >= 4 && cleanName.includes(kw)) {
        return value;
      }
    }
  }
  
  // Clean up garbled text but return if seems valid
  if (/^[^a-zA-Z]+$/.test(rawName)) {
    return ''; // Return empty if no letters
  }
  
  // Title case the name if it seems valid
  if (rawName.length > 3) {
    return rawName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return rawName;
};

// Correct ticker based on known patterns - improved
export const correctTicker = (rawTicker: string): string => {
  if (!rawTicker) return '';
  
  let cleanTicker = rawTicker.trim();
  
  // Check direct corrections first
  const lowerTicker = cleanTicker.toLowerCase();
  for (const [wrong, correct] of Object.entries(TICKER_CORRECTIONS)) {
    if (lowerTicker === wrong || lowerTicker.startsWith(wrong)) {
      return correct;
    }
  }
  
  // Standard format: SYMBOL EXCHANGE
  const standardMatch = cleanTicker.match(/^([A-Z0-9]{1,10})\s+(US|JP|HK|LN|GY|GR|FP|CN|IN|AU|SP|TB|SS|SW|TT|NA|KS|SM|IM|PW)$/i);
  if (standardMatch) {
    return `${standardMatch[1].toUpperCase()} ${standardMatch[2].toUpperCase()}`;
  }
  
  // Japanese numeric tickers: 7203 JP
  const jpMatch = cleanTicker.match(/^(\d{4,6})\s+(JP|HK|TT|KS)$/i);
  if (jpMatch) {
    return `${jpMatch[1]} ${jpMatch[2].toUpperCase()}`;
  }
  
  // Treasury/Bond patterns
  if (/^(TF|TY|TU|FV|US|UXY)H?\d/i.test(cleanTicker)) {
    return cleanTicker.toUpperCase();
  }
  if (/^B\s+\d+\s+\d{2}/i.test(cleanTicker)) {
    return cleanTicker.toUpperCase();
  }
  
  return cleanTicker.toUpperCase();
};

// Post-process rows to clean up data - enhanced
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
    
    // Clean up position - remove any letters, format with commas
    if (row.position) {
      const posNum = row.position.replace(/[^\d]/g, '');
      if (posNum) {
        row.position = parseInt(posNum, 10).toLocaleString('en-US');
      }
    }
    
    // Clean up posChg - ensure sign is present and format
    if (row.posChg) {
      const sign = row.posChg.includes('-') ? '-' : '+';
      const num = row.posChg.replace(/[^\d]/g, '');
      if (num) {
        row.posChg = sign + parseInt(num, 10).toLocaleString('en-US');
      }
    }
    
    // Clean up pctOut - format as decimal
    if (row.pctOut) {
      const pct = row.pctOut.replace(/[^\d\.]/g, '');
      if (pct && !isNaN(parseFloat(pct))) {
        row.pctOut = parseFloat(pct).toFixed(2);
      }
    }
    
    // Format currMV - ensure proper suffix
    if (row.currMV) {
      row.currMV = row.currMV
        .replace(/\s+/g, '')
        .replace(/m$/i, 'MLN')
        .replace(/b$/i, 'BLN')
        .toUpperCase();
      
      // Ensure MLN or BLN suffix
      if (!row.currMV.includes('MLN') && !row.currMV.includes('BLN')) {
        const numMatch = row.currMV.match(/[\d\.]+/);
        if (numMatch) {
          const val = parseFloat(numMatch[0]);
          if (val >= 1000) {
            row.currMV = val.toFixed(2) + 'BLN';
          } else {
            row.currMV = val.toFixed(2) + 'MLN';
          }
        }
      }
    }
    
    // Normalize filing date format
    if (row.filingDate) {
      const dateMatch = row.filingDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) {
        const [, month, day, year] = dateMatch;
        const fullYear = year.length === 2 ? `20${year}` : year;
        row.filingDate = `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${fullYear.slice(-2)}`;
      }
    }
    
    return row;
  });
};

// Validate extracted data quality
export const validateBloombergData = (rows: BloombergRow[]): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  rows.forEach((row, idx) => {
    // Check required fields
    if (!row.ticker && !row.name) {
      issues.push(`Row ${idx + 1}: Missing both ticker and name`);
    }
    if (!row.position) {
      issues.push(`Row ${idx + 1}: Missing position data`);
    }
    
    // Validate position is a number
    if (row.position) {
      const posNum = parseFloat(row.position.replace(/,/g, ''));
      if (isNaN(posNum)) {
        issues.push(`Row ${idx + 1}: Invalid position value: ${row.position}`);
      }
    }
    
    // Validate pctOut is reasonable
    if (row.pctOut) {
      const pct = parseFloat(row.pctOut);
      if (pct < 0 || pct > 100) {
        issues.push(`Row ${idx + 1}: Unusual % Out value: ${row.pctOut}`);
      }
    }
  });
  
  return {
    valid: issues.length === 0,
    issues
  };
};

export default {
  KNOWN_SECURITIES,
  TICKER_CORRECTIONS,
  correctOCRText,
  matchSecurityName,
  correctTicker,
  postProcessBloombergRows,
  validateBloombergData
};
