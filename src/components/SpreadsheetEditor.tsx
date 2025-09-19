import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Minus, 
  Download, 
  Upload, 
  Save,
  Trash2,
  Copy,
  Clipboard,
  Calculator,
  Table,
  Grid,
  FileSpreadsheet
} from 'lucide-react';

interface Cell {
  id: string;
  row: number;
  col: number;
  value: string | number;
  formula?: string;
  type: 'text' | 'number' | 'formula' | 'date';
  style?: {
    fontWeight?: 'bold' | 'normal';
    fontStyle?: 'italic' | 'normal';
    textAlign?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    color?: string;
  };
}

interface SpreadsheetData {
  cells: { [key: string]: Cell };
  rows: number;
  cols: number;
  name: string;
}

interface SpreadsheetEditorProps {
  data?: SpreadsheetData;
  onChange?: (data: SpreadsheetData) => void;
  readOnly?: boolean;
}

export const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({
  data,
  onChange,
  readOnly = false
}) => {
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData>(
    data || {
      cells: {},
      rows: 20,
      cols: 10,
      name: 'New Spreadsheet'
    }
  );
  
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ startRow: number; startCol: number; endRow: number; endCol: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [formulaBar, setFormulaBar] = useState('');
  const [clipboard, setClipboard] = useState<{ [key: string]: Cell }>({});

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCell) {
      const cellKey = `${selectedCell.row}-${selectedCell.col}`;
      const cell = spreadsheet.cells[cellKey];
      setFormulaBar(cell?.formula || cell?.value?.toString() || '');
    }
  }, [selectedCell, spreadsheet.cells]);

  const getCellKey = (row: number, col: number) => `${row}-${col}`;
  
  const getColumnLabel = (col: number) => {
    let label = '';
    while (col >= 0) {
      label = String.fromCharCode(65 + (col % 26)) + label;
      col = Math.floor(col / 26) - 1;
    }
    return label;
  };

  const updateCell = useCallback((row: number, col: number, value: string | number, formula?: string) => {
    const cellKey = getCellKey(row, col);
    const newSpreadsheet = {
      ...spreadsheet,
      cells: {
        ...spreadsheet.cells,
        [cellKey]: {
          id: cellKey,
          row,
          col,
          value,
          formula,
          type: formula ? 'formula' : (typeof value === 'number' ? 'number' : 'text') as 'text' | 'number' | 'formula' | 'date'
        }
      }
    };
    
    setSpreadsheet(newSpreadsheet);
    onChange?.(newSpreadsheet);
  }, [spreadsheet, onChange]);

  const evaluateFormula = (formula: string, row: number, col: number): number | string => {
    if (!formula.startsWith('=')) return formula;
    
    try {
      // Simple formula evaluation (SUM, AVERAGE, etc.)
      let expression = formula.slice(1);
      
      // Replace cell references with values
      expression = expression.replace(/[A-Z]+[0-9]+/g, (cellRef) => {
        const colMatch = cellRef.match(/[A-Z]+/);
        const rowMatch = cellRef.match(/[0-9]+/);
        
        if (colMatch && rowMatch) {
          const refCol = colMatch[0].split('').reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1;
          const refRow = parseInt(rowMatch[0]) - 1;
          const refCellKey = getCellKey(refRow, refCol);
          const refCell = spreadsheet.cells[refCellKey];
          return refCell?.value?.toString() || '0';
        }
        return '0';
      });

      // Handle SUM function
      if (expression.includes('SUM(')) {
        expression = expression.replace(/SUM\(([A-Z0-9:]+)\)/g, (match, range) => {
          // Simple range sum implementation
          return '0'; // Simplified for demo
        });
      }

      // Evaluate basic math expressions
      return Function(`"use strict"; return (${expression})`)() || 0;
    } catch (error) {
      return '#ERROR';
    }
  };

  const handleCellClick = (row: number, col: number, event: React.MouseEvent) => {
    if (event.shiftKey && selectedCell) {
      // Range selection
      setSelectedRange({
        startRow: Math.min(selectedCell.row, row),
        startCol: Math.min(selectedCell.col, col),
        endRow: Math.max(selectedCell.row, row),
        endCol: Math.max(selectedCell.col, col)
      });
    } else {
      setSelectedCell({ row, col });
      setSelectedRange(null);
    }
  };

  const handleFormulaBarSubmit = () => {
    if (selectedCell && formulaBar !== undefined) {
      let value: string | number = formulaBar;
      let formula: string | undefined;
      
      if (formulaBar.startsWith('=')) {
        formula = formulaBar;
        value = evaluateFormula(formulaBar, selectedCell.row, selectedCell.col);
      } else if (!isNaN(Number(formulaBar)) && formulaBar.trim() !== '') {
        value = Number(formulaBar);
      }
      
      updateCell(selectedCell.row, selectedCell.col, value, formula);
    }
  };

  const addRow = () => {
    setSpreadsheet(prev => ({ ...prev, rows: prev.rows + 1 }));
  };

  const addColumn = () => {
    setSpreadsheet(prev => ({ ...prev, cols: prev.cols + 1 }));
  };

  const copySelection = () => {
    if (selectedRange) {
      const copied: { [key: string]: Cell } = {};
      for (let row = selectedRange.startRow; row <= selectedRange.endRow; row++) {
        for (let col = selectedRange.startCol; col <= selectedRange.endCol; col++) {
          const cellKey = getCellKey(row, col);
          if (spreadsheet.cells[cellKey]) {
            copied[`${row - selectedRange.startRow}-${col - selectedRange.startCol}`] = spreadsheet.cells[cellKey];
          }
        }
      }
      setClipboard(copied);
    } else if (selectedCell) {
      const cellKey = getCellKey(selectedCell.row, selectedCell.col);
      if (spreadsheet.cells[cellKey]) {
        setClipboard({ '0-0': spreadsheet.cells[cellKey] });
      }
    }
  };

  const pasteSelection = () => {
    if (selectedCell && Object.keys(clipboard).length > 0) {
      const newCells = { ...spreadsheet.cells };
      
      Object.entries(clipboard).forEach(([relativeKey, cell]) => {
        const [relRow, relCol] = relativeKey.split('-').map(Number);
        const newRow = selectedCell.row + relRow;
        const newCol = selectedCell.col + relCol;
        const newCellKey = getCellKey(newRow, newCol);
        
        newCells[newCellKey] = {
          ...cell,
          id: newCellKey,
          row: newRow,
          col: newCol,
          type: cell.type as 'text' | 'number' | 'formula' | 'date'
        };
      });
      
      setSpreadsheet(prev => ({ ...prev, cells: newCells }));
    }
  };

  const exportToCSV = () => {
    let csv = '';
    for (let row = 0; row < spreadsheet.rows; row++) {
      const rowData = [];
      for (let col = 0; col < spreadsheet.cols; col++) {
        const cellKey = getCellKey(row, col);
        const cell = spreadsheet.cells[cellKey];
        rowData.push(cell?.value?.toString() || '');
      }
      csv += rowData.join(',') + '\n';
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spreadsheet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isCellSelected = (row: number, col: number) => {
    if (selectedRange) {
      return row >= selectedRange.startRow && row <= selectedRange.endRow &&
             col >= selectedRange.startCol && col <= selectedRange.endCol;
    }
    return selectedCell?.row === row && selectedCell?.col === col;
  };

  return (
    <Card className="w-full h-full bg-background border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <FileSpreadsheet className="h-5 w-5" />
          Excel-Style Spreadsheet Editor
        </CardTitle>
        
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={copySelection} disabled={readOnly}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={pasteSelection} disabled={readOnly}>
            <Clipboard className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={addRow} disabled={readOnly}>
            <Plus className="h-4 w-4 mr-1" />
            Row
          </Button>
          <Button variant="outline" size="sm" onClick={addColumn} disabled={readOnly}>
            <Plus className="h-4 w-4 mr-1" />
            Column
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
        
        {/* Formula Bar */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium min-w-16">
            {selectedCell ? `${getColumnLabel(selectedCell.col)}${selectedCell.row + 1}` : ''}
          </span>
          <Input
            value={formulaBar}
            onChange={(e) => setFormulaBar(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFormulaBarSubmit()}
            placeholder="Enter value or formula (=SUM(A1:A5))"
            className="flex-1"
            disabled={readOnly}
          />
          <Button size="sm" onClick={handleFormulaBarSubmit} disabled={readOnly}>
            <Calculator className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[600px]" ref={gridRef}>
          <table className="w-full border-collapse border border-border">
            {/* Column headers */}
            <thead>
              <tr>
                <th className="w-12 h-8 border border-border bg-muted text-xs font-medium sticky top-0 z-10"></th>
                {Array.from({ length: spreadsheet.cols }, (_, col) => (
                  <th key={col} className="min-w-24 h-8 border border-border bg-muted text-xs font-medium sticky top-0 z-10">
                    {getColumnLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            
            {/* Rows */}
            <tbody>
              {Array.from({ length: spreadsheet.rows }, (_, row) => (
                <tr key={row}>
                  {/* Row header */}
                  <td className="w-12 h-8 border border-border bg-muted text-xs font-medium text-center sticky left-0 z-10">
                    {row + 1}
                  </td>
                  
                  {/* Cells */}
                  {Array.from({ length: spreadsheet.cols }, (_, col) => {
                    const cellKey = getCellKey(row, col);
                    const cell = spreadsheet.cells[cellKey];
                    const isSelected = isCellSelected(row, col);
                    
                    return (
                      <td
                        key={col}
                        className={`min-w-24 h-8 border border-border cursor-cell relative ${
                          isSelected ? 'bg-primary/20' : 'hover:bg-muted/50'
                        }`}
                        onClick={(e) => handleCellClick(row, col, e)}
                      >
                        <Input
                          value={cell?.value?.toString() || ''}
                          onChange={(e) => updateCell(row, col, e.target.value)}
                          className="border-0 bg-transparent h-full px-1 text-xs"
                          style={{
                            textAlign: cell?.style?.textAlign || 'left',
                            fontWeight: cell?.style?.fontWeight || 'normal',
                            fontStyle: cell?.style?.fontStyle || 'normal',
                            backgroundColor: cell?.style?.backgroundColor || 'transparent',
                            color: cell?.style?.color || 'inherit'
                          }}
                          readOnly={readOnly}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 border-2 border-primary pointer-events-none" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};