// Bloomberg Image Processing Pipeline
import { BloombergGridDetector } from './BloombergGridDetector';
import { BloombergCharRecognizer } from './BloombergCharRecognizer';
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

export class BloombergProcessor {
  private gridDetector: BloombergGridDetector;
  private charRecognizer: BloombergCharRecognizer;
  private onProgress?: (progress: ProcessingProgress) => void;
  
  constructor(onProgress?: (progress: ProcessingProgress) => void) {
    this.gridDetector = new BloombergGridDetector();
    this.charRecognizer = new BloombergCharRecognizer();
    this.onProgress = onProgress;
  }
  
  async processImage(file: File, imageIndex: number = 0): Promise<ExtractedRow[]> {
    const imageData = await this.gridDetector.loadImage(file);
    const gridInfo = this.gridDetector.detectGrid(imageData);
    
    const rows: ExtractedRow[] = [];
    const columns = BLOOMBERG_LAYOUT.columns;
    const lineHeight = BLOOMBERG_LAYOUT.lineHeight;
    
    for (let rowIdx = 0; rowIdx < gridInfo.rows.length; rowIdx++) {
      const rowY = gridInfo.rows[rowIdx];
      const cells: ExtractedCell[] = [];
      
      // Update progress
      if (this.onProgress) {
        this.onProgress({
          current: rowIdx + 1,
          total: gridInfo.rows.length,
          currentImage: imageIndex + 1,
          totalImages: 1,
          status: `Processing row ${rowIdx + 1}/${gridInfo.rows.length}`
        });
      }
      
      for (const column of columns) {
        const cellImage = this.gridDetector.extractCellImage(
          imageData,
          column.startX,
          rowY,
          column.width,
          lineHeight
        );
        
        const text = this.charRecognizer.recognizeCell(cellImage);
        const color = this.charRecognizer.detectCellTextColor(cellImage);
        
        // Calculate confidence based on recognition quality
        const confidence = this.calculateConfidence(text, column.name);
        
        cells.push({
          column: column.name,
          value: text,
          confidence,
          originalColor: color
        });
      }
      
      // Extract row number from first cell
      const rowNumberCell = cells.find(c => c.column === 'NO');
      let rowNumber = rowIdx + 1;
      if (rowNumberCell && /^\d+$/.test(rowNumberCell.value)) {
        rowNumber = parseInt(rowNumberCell.value, 10);
      }
      
      rows.push({
        rowNumber,
        cells,
        imageIndex
      });
      
      // Small delay to prevent UI freeze
      if (rowIdx % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
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
          total: 0,
          currentImage: i + 1,
          totalImages: files.length,
          status: `Loading image ${i + 1}/${files.length}`
        });
      }
      
      const rows = await this.processImage(file, i);
      
      // Renumber rows to be continuous across images
      for (const row of rows) {
        row.rowNumber = globalRowNumber++;
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
  
  private calculateConfidence(text: string, columnName: string): number {
    if (!text || !text.trim()) return 0.3;
    
    // Column-specific validation
    switch (columnName) {
      case 'NO':
        // Should be a number
        if (/^\d+$/.test(text.trim())) return 0.95;
        return 0.4;
        
      case 'Position':
      case 'Pos Chg':
      case 'Curr MV':
      case '% Out':
        // Should be a number (possibly with commas, +/-, %)
        if (/^[+-]?[\d,]+\.?\d*%?$/.test(text.replace(/\s/g, ''))) return 0.9;
        return 0.5;
        
      case 'Filing Date':
        // Should be a date format
        if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text)) return 0.9;
        if (/\d{4}-\d{2}-\d{2}/.test(text)) return 0.9;
        return 0.5;
        
      case 'Ticker':
        // Usually uppercase letters with optional exchange suffix
        if (/^[A-Z]{1,5}(\s+(US|JP|HK|LN))?$/i.test(text.trim())) return 0.9;
        return 0.6;
        
      case 'Security':
      case 'Source':
        // Text - just needs to have characters
        if (text.trim().length > 0) return 0.8;
        return 0.4;
        
      default:
        return text.trim().length > 0 ? 0.7 : 0.3;
    }
  }
}

export default BloombergProcessor;
