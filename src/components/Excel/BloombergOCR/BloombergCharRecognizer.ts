// Bloomberg Character Recognition Algorithm
import { 
  BLOOMBERG_CHAR_PATTERNS, 
  BLOOMBERG_LAYOUT,
  comparePatterns,
  getCharPattern,
  isBackgroundColor,
  detectTextColor
} from './BloombergFontDatabase';

export interface RecognizedChar {
  char: string;
  confidence: number;
}

export class BloombergCharRecognizer {
  private charWidth: number;
  private charHeight: number;
  private patterns: Record<string, number[][]>;
  
  constructor() {
    this.charWidth = BLOOMBERG_LAYOUT.charWidth;
    this.charHeight = 8; // Using 8 rows from the pattern
    this.patterns = BLOOMBERG_CHAR_PATTERNS;
  }
  
  recognizeCell(cellImageData: ImageData): string {
    // Preprocess the cell image
    const processed = this.preprocessCell(cellImageData);
    
    // Detect text color for sign detection
    const textColor = this.detectCellTextColor(cellImageData);
    
    // Calculate how many characters might fit
    const maxChars = Math.ceil(cellImageData.width / this.charWidth);
    
    let result = '';
    let x = 0;
    let consecutiveSpaces = 0;
    
    while (x < cellImageData.width && consecutiveSpaces < 3) {
      const charRegion = this.extractCharacterRegion(processed, x);
      
      if (charRegion) {
        const recognized = this.recognizeCharacter(charRegion);
        
        if (recognized.char === ' ') {
          consecutiveSpaces++;
        } else {
          consecutiveSpaces = 0;
        }
        
        if (recognized.confidence > 0.4 || recognized.char === ' ') {
          result += recognized.char;
        } else if (recognized.confidence > 0.2) {
          result += recognized.char; // Accept lower confidence
        }
      }
      
      x += this.charWidth;
    }
    
    // Post-process the result
    result = this.postProcessText(result.trim(), textColor);
    
    return result;
  }
  
  recognizeCharacter(charImageData: ImageData): RecognizedChar {
    const pattern = this.imageToPattern(charImageData);
    
    // Check if this is mostly empty (space)
    const filledCount = pattern.flat().filter(p => p === 1).length;
    if (filledCount < 3) {
      return { char: ' ', confidence: 0.9 };
    }
    
    let bestMatch = { char: '?', confidence: 0 };
    
    for (const [char, charPattern] of Object.entries(this.patterns)) {
      if (!charPattern || charPattern.length === 0) continue;
      
      const similarity = comparePatterns(pattern, charPattern);
      
      if (similarity > bestMatch.confidence) {
        bestMatch = { char, confidence: similarity };
      }
    }
    
    // If confidence is too low, try common substitutions
    if (bestMatch.confidence < 0.5) {
      const alternateMatch = this.tryAlternateMatches(pattern);
      if (alternateMatch.confidence > bestMatch.confidence) {
        return alternateMatch;
      }
    }
    
    return bestMatch;
  }
  
  private tryAlternateMatches(pattern: number[][]): RecognizedChar {
    // Try matching with shifted patterns (common OCR issue)
    const shifts = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 }
    ];
    
    let bestMatch = { char: '?', confidence: 0 };
    
    for (const shift of shifts) {
      const shiftedPattern = this.shiftPattern(pattern, shift.dx, shift.dy);
      
      for (const [char, charPattern] of Object.entries(this.patterns)) {
        if (!charPattern || charPattern.length === 0) continue;
        
        const similarity = comparePatterns(shiftedPattern, charPattern);
        
        if (similarity > bestMatch.confidence) {
          bestMatch = { char, confidence: similarity * 0.9 }; // Penalty for shifted match
        }
      }
    }
    
    return bestMatch;
  }
  
  private shiftPattern(pattern: number[][], dx: number, dy: number): number[][] {
    const height = pattern.length;
    const width = pattern[0]?.length || 0;
    const shifted: number[][] = [];
    
    for (let y = 0; y < height; y++) {
      shifted[y] = [];
      for (let x = 0; x < width; x++) {
        const srcX = x - dx;
        const srcY = y - dy;
        
        if (srcY >= 0 && srcY < height && srcX >= 0 && srcX < width) {
          shifted[y][x] = pattern[srcY][srcX];
        } else {
          shifted[y][x] = 0;
        }
      }
    }
    
    return shifted;
  }
  
  extractCharacterRegion(cellImageData: ImageData, charIndex: number): ImageData | null {
    const startX = charIndex;
    const { width, height, data } = cellImageData;
    
    if (startX >= width) return null;
    
    const charWidth = Math.min(this.charWidth, width - startX);
    const charHeight = Math.min(this.charHeight, height);
    
    const charData = new Uint8ClampedArray(charWidth * charHeight * 4);
    
    for (let y = 0; y < charHeight; y++) {
      for (let x = 0; x < charWidth; x++) {
        const srcIdx = (y * width + startX + x) * 4;
        const dstIdx = (y * charWidth + x) * 4;
        
        charData[dstIdx] = data[srcIdx] || 0;
        charData[dstIdx + 1] = data[srcIdx + 1] || 0;
        charData[dstIdx + 2] = data[srcIdx + 2] || 0;
        charData[dstIdx + 3] = 255;
      }
    }
    
    return new ImageData(charData, charWidth, charHeight);
  }
  
  preprocessCell(cellImageData: ImageData): ImageData {
    const { width, height, data } = cellImageData;
    const processed = new Uint8ClampedArray(data.length);
    
    // Binary threshold - convert to black and white
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // If it's background color, set to black (0)
      // If it's text color, set to white (255)
      const isBackground = isBackgroundColor(r, g, b);
      const value = isBackground ? 0 : 255;
      
      processed[i] = value;
      processed[i + 1] = value;
      processed[i + 2] = value;
      processed[i + 3] = 255;
    }
    
    return new ImageData(processed, width, height);
  }
  
  detectCellTextColor(cellImageData: ImageData): 'white' | 'green' | 'red' | 'yellow' {
    const { data } = cellImageData;
    
    let greenCount = 0;
    let redCount = 0;
    let yellowCount = 0;
    let whiteCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      if (isBackgroundColor(r, g, b)) continue;
      
      const color = detectTextColor(r, g, b);
      if (color === 'green') greenCount++;
      else if (color === 'red') redCount++;
      else if (color === 'yellow') yellowCount++;
      else whiteCount++;
    }
    
    const maxCount = Math.max(greenCount, redCount, yellowCount, whiteCount);
    
    if (maxCount === greenCount && greenCount > 10) return 'green';
    if (maxCount === redCount && redCount > 10) return 'red';
    if (maxCount === yellowCount && yellowCount > 10) return 'yellow';
    return 'white';
  }
  
  postProcessText(text: string, color: 'white' | 'green' | 'red' | 'yellow'): string {
    // Clean up common OCR errors
    let result = text
      .replace(/\s+/g, ' ')  // Multiple spaces to single
      .replace(/[|l]/g, '1') // Common | or l to 1 in numbers
      .replace(/O(?=\d)/g, '0') // O before digit to 0
      .trim();
    
    // If it looks like a number, add sign based on color
    if (/^[\d,.\s]+$/.test(result) || /^[\d,.\s-+]+$/.test(result)) {
      result = this.postProcessNumber(result, color);
    }
    
    return result;
  }
  
  postProcessNumber(text: string, color: 'green' | 'red' | 'white' | 'yellow'): string {
    // Remove existing signs first
    let cleanNumber = text.replace(/^[+-]/, '').trim();
    
    // Add sign based on color
    if (color === 'green' && !text.startsWith('+') && !text.startsWith('-')) {
      return '+' + cleanNumber;
    }
    if (color === 'red' && !text.startsWith('-')) {
      return '-' + cleanNumber;
    }
    
    return text;
  }
  
  private imageToPattern(imageData: ImageData): number[][] {
    const { width, height, data } = imageData;
    const pattern: number[][] = [];
    
    const patternHeight = Math.min(8, height);
    const patternWidth = Math.min(8, width);
    
    for (let y = 0; y < patternHeight; y++) {
      pattern[y] = [];
      for (let x = 0; x < patternWidth; x++) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        pattern[y][x] = brightness > 128 ? 1 : 0;
      }
    }
    
    return pattern;
  }
}

export default BloombergCharRecognizer;
