// Bloomberg Grid Detection Algorithm
import { BLOOMBERG_COLORS, BLOOMBERG_LAYOUT, isBackgroundColor, isHeaderColor } from './BloombergFontDatabase';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface GridInfo {
  headerY: number;
  rows: number[];
  columns: number[];
  width: number;
  height: number;
}

export class BloombergGridDetector {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }
  
  async loadImage(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
        resolve(imageData);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  
  detectGrid(imageData: ImageData): GridInfo {
    const { width, height } = imageData;
    
    // Detect header row (orange/yellow background)
    const headerY = this.detectHeaderRow(imageData);
    
    // Detect data rows
    const rows = this.detectRows(imageData, headerY);
    
    // Detect columns
    const columns = this.detectColumns(imageData, headerY);
    
    return {
      headerY,
      rows,
      columns,
      width,
      height
    };
  }
  
  private detectHeaderRow(imageData: ImageData): number {
    const { width, height, data } = imageData;
    
    for (let y = 0; y < Math.min(height, 100); y++) {
      let headerPixels = 0;
      const samplePoints = Math.min(20, width / 10);
      
      for (let i = 0; i < samplePoints; i++) {
        const x = Math.floor((i / samplePoints) * width);
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        if (isHeaderColor(r, g, b)) {
          headerPixels++;
        }
      }
      
      // If more than 50% of sample points are header color
      if (headerPixels > samplePoints * 0.5) {
        return y;
      }
    }
    
    return 0;
  }
  
  detectRows(imageData: ImageData, headerY: number = 0): number[] {
    const { width, height, data } = imageData;
    const rows: number[] = [];
    const lineHeight = BLOOMBERG_LAYOUT.lineHeight;
    
    // Start scanning after header
    let startY = headerY + 15;
    
    // Look for row boundaries by analyzing horizontal lines
    let lastWasData = false;
    
    for (let y = startY; y < height; y++) {
      const rowType = this.analyzeRowColor(imageData, y);
      
      if (rowType === 'data' && !lastWasData) {
        rows.push(y);
        lastWasData = true;
      } else if (rowType !== 'data') {
        lastWasData = false;
      }
      
      // Skip ahead to avoid detecting same row multiple times
      if (lastWasData) {
        y += Math.floor(lineHeight * 0.7);
      }
    }
    
    // If no rows detected, estimate based on line height
    if (rows.length === 0) {
      const estimatedRowCount = Math.floor((height - startY) / lineHeight);
      for (let i = 0; i < estimatedRowCount; i++) {
        rows.push(startY + i * lineHeight);
      }
    }
    
    return rows;
  }
  
  detectColumns(imageData: ImageData, headerY: number = 0): number[] {
    const { width, data } = imageData;
    const columns: number[] = [];
    
    // Use predefined column positions as base
    const baseColumns = BLOOMBERG_LAYOUT.columns.map(c => c.startX);
    
    // Try to detect actual column boundaries by looking for vertical separators
    // or color transitions in the header area
    
    const scanY = headerY + 5;
    let lastWasLight = false;
    let transitionCount = 0;
    
    for (let x = 0; x < width; x++) {
      const idx = (scanY * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      const isLight = (r + g + b) / 3 > 128;
      
      if (isLight !== lastWasLight) {
        if (transitionCount > 0 && x > 20) {
          columns.push(x);
        }
        transitionCount++;
        lastWasLight = isLight;
      }
    }
    
    // If detection didn't work well, use predefined columns
    if (columns.length < 3) {
      return baseColumns;
    }
    
    // Merge detected columns with base columns
    // Using a tolerance of 20 pixels
    const mergedColumns: number[] = [0];
    for (const baseCol of baseColumns.slice(1)) {
      const nearestDetected = columns.find(c => Math.abs(c - baseCol) < 30);
      mergedColumns.push(nearestDetected || baseCol);
    }
    
    return mergedColumns.filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  }
  
  analyzeRowColor(imageData: ImageData, y: number): 'header' | 'data' | 'empty' {
    const { width, data } = imageData;
    
    let headerCount = 0;
    let dataCount = 0;
    let emptyCount = 0;
    const sampleCount = 10;
    
    for (let i = 0; i < sampleCount; i++) {
      const x = Math.floor((i / sampleCount) * width * 0.8) + width * 0.1;
      const idx = (y * width + Math.floor(x)) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      if (isHeaderColor(r, g, b)) {
        headerCount++;
      } else if (isBackgroundColor(r, g, b)) {
        // Check if there's text nearby
        const hasText = this.hasTextNearby(imageData, Math.floor(x), y, 10);
        if (hasText) {
          dataCount++;
        } else {
          emptyCount++;
        }
      } else {
        dataCount++;
      }
    }
    
    if (headerCount > sampleCount * 0.3) return 'header';
    if (dataCount > emptyCount) return 'data';
    return 'empty';
  }
  
  private hasTextNearby(imageData: ImageData, x: number, y: number, radius: number): boolean {
    const { width, height, data } = imageData;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = x + dx;
        const py = y + dy;
        
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // Check for non-background colors (text)
          if (!isBackgroundColor(r, g, b)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  extractCellImage(
    imageData: ImageData, 
    x: number, 
    y: number, 
    cellWidth: number, 
    cellHeight: number
  ): ImageData {
    const { width, data } = imageData;
    const cellData = new Uint8ClampedArray(cellWidth * cellHeight * 4);
    
    for (let cy = 0; cy < cellHeight; cy++) {
      for (let cx = 0; cx < cellWidth; cx++) {
        const srcX = x + cx;
        const srcY = y + cy;
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (cy * cellWidth + cx) * 4;
        
        cellData[dstIdx] = data[srcIdx] || 0;
        cellData[dstIdx + 1] = data[srcIdx + 1] || 0;
        cellData[dstIdx + 2] = data[srcIdx + 2] || 0;
        cellData[dstIdx + 3] = data[srcIdx + 3] || 255;
      }
    }
    
    return new ImageData(cellData, cellWidth, cellHeight);
  }
  
  getPixelColor(imageData: ImageData, x: number, y: number): RGB {
    const { width, data } = imageData;
    const idx = (y * width + x) * 4;
    
    return {
      r: data[idx] || 0,
      g: data[idx + 1] || 0,
      b: data[idx + 2] || 0
    };
  }
  
  isColorSimilar(color1: RGB, color2: RGB, threshold: number = 50): boolean {
    return (
      Math.abs(color1.r - color2.r) < threshold &&
      Math.abs(color1.g - color2.g) < threshold &&
      Math.abs(color1.b - color2.b) < threshold
    );
  }
  
  findColorTransitions(imageData: ImageData, y: number): number[] {
    const { width, data } = imageData;
    const transitions: number[] = [];
    
    let prevR = data[(y * width) * 4];
    let prevG = data[(y * width) * 4 + 1];
    let prevB = data[(y * width) * 4 + 2];
    
    for (let x = 1; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
      
      if (diff > 100) {
        transitions.push(x);
      }
      
      prevR = r;
      prevG = g;
      prevB = b;
    }
    
    return transitions;
  }
}

export default BloombergGridDetector;
