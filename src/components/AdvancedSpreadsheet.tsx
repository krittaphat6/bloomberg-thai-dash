import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  Table2, 
  Plus, 
  Download, 
  Upload, 
  Search, 
  Filter,
  SortAsc,
  SortDesc,
  Palette,
  Copy,
  Scissors,
  ClipboardPaste,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Merge,
  Split,
  Calculator,
  BarChart3,
  PieChart,
  TrendingUp,
  Save,
  Undo,
  Redo,
  Grid,
  Lock,
  Unlock
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { HyperFormula } from 'hyperformula';
import * as XLSX from 'xlsx';

interface Cell {
  value: any;
  formula?: string;
  format?: CellFormat;
  comment?: string;
  hyperlink?: string;
  locked?: boolean;
}

interface CellFormat {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  numberFormat?: string;
  wrapText?: boolean;
}

interface Sheet {
  id: string;
  name: string;
  cells: Record<string, Cell>;
  rowHeights: Record<number, number>;
  columnWidths: Record<string, number>;
  frozenRows: number;
  frozenColumns: number;
  protected?: boolean;
  password?: string;
}

interface Chart {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  dataRange: string;
  position: { row: number; col: number };
  size: { width: number; height: number };
}

interface Filter {
  column: string;
  values: string[];
  condition?: 'equals' | 'contains' | 'greater' | 'less';
}

interface Sort {
  column: string;
  direction: 'asc' | 'desc';
}

export default function AdvancedSpreadsheet() {
  const { toast } = useToast();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [formulaBar, setFormulaBar] = useState('');
  const [clipboard, setClipboard] = useState<{cells: Record<string, Cell>; cut: boolean} | null>(null);
  const [undoStack, setUndoStack] = useState<Sheet[]>([]);
  const [redoStack, setRedoStack] = useState<Sheet[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sorts, setSorts] = useState<Sort[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<CellFormat>({});
  
  const hyperFormula = useRef<HyperFormula | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Initialize HyperFormula
  useEffect(() => {
    hyperFormula.current = HyperFormula.buildEmpty({
      licenseKey: 'internal-use-in-handsontable',
      useColumnIndex: true,
    });
  }, []);

  // Initialize with default sheet
  useEffect(() => {
    if (sheets.length === 0) {
      const defaultSheet: Sheet = {
        id: 'sheet1',
        name: 'Sheet1',
        cells: {},
        rowHeights: {},
        columnWidths: {},
        frozenRows: 0,
        frozenColumns: 0
      };
      setSheets([defaultSheet]);
      setActiveSheetId('sheet1');
    }
  }, [sheets.length]);

  const activeSheet = useMemo(() => {
    return sheets.find(s => s.id === activeSheetId);
  }, [sheets, activeSheetId]);

  // Convert column number to letter (A, B, C, ... AA, AB, etc.)
  const columnToLetter = useCallback((col: number): string => {
    let result = '';
    while (col >= 0) {
      result = String.fromCharCode(65 + (col % 26)) + result;
      col = Math.floor(col / 26) - 1;
    }
    return result;
  }, []);

  // Convert letter to column number
  const letterToColumn = useCallback((letter: string): number => {
    let result = 0;
    for (let i = 0; i < letter.length; i++) {
      result = result * 26 + (letter.charCodeAt(i) - 65 + 1);
    }
    return result - 1;
  }, []);

  // Get cell address from row and column
  const getCellAddress = useCallback((row: number, col: number): string => {
    return `${columnToLetter(col)}${row + 1}`;
  }, [columnToLetter]);

  // Parse cell address to row and column
  const parseCellAddress = useCallback((address: string): {row: number, col: number} => {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { row: 0, col: 0 };
    return {
      row: parseInt(match[2]) - 1,
      col: letterToColumn(match[1])
    };
  }, [letterToColumn]);

  // Update cell value
  const updateCell = useCallback((address: string, value: any, formula?: string) => {
    if (!activeSheet) return;

    const oldSheets = [...sheets];
    setUndoStack(prev => [...prev, ...oldSheets].slice(-50)); // Keep last 50 states
    setRedoStack([]);

    setSheets(prev => prev.map(sheet => {
      if (sheet.id === activeSheetId) {
        const newCells = { ...sheet.cells };
        
        if (formula) {
          // Handle formula
          newCells[address] = {
            ...newCells[address],
            formula,
            value: evaluateFormula(formula)
          };
        } else {
          // Handle regular value
          newCells[address] = {
            ...newCells[address],
            value,
            formula: undefined
          };
        }
        
        return { ...sheet, cells: newCells };
      }
      return sheet;
    }));
  }, [activeSheet, activeSheetId, sheets]);

  // Evaluate formula using HyperFormula
  const evaluateFormula = useCallback((formula: string): any => {
    if (!hyperFormula.current) return formula;
    
    try {
      // Remove leading = if present
      const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;
      
      // Simple formula evaluation for common functions
      if (cleanFormula.match(/^SUM\([A-Z]\d+:[A-Z]\d+\)$/)) {
        const range = cleanFormula.match(/([A-Z]\d+):([A-Z]\d+)/);
        if (range) {
          return evaluateRange(range[1], range[2], 'SUM');
        }
      }
      
      if (cleanFormula.match(/^AVERAGE\([A-Z]\d+:[A-Z]\d+\)$/)) {
        const range = cleanFormula.match(/([A-Z]\d+):([A-Z]\d+)/);
        if (range) {
          return evaluateRange(range[1], range[2], 'AVERAGE');
        }
      }
      
      // Basic arithmetic
      if (cleanFormula.match(/^[\d\+\-\*\/\(\)\s\.]+$/)) {
        return Function(`"use strict"; return (${cleanFormula})`)();
      }
      
      return formula;
    } catch (error) {
      return '#ERROR!';
    }
  }, []);

  const evaluateRange = useCallback((start: string, end: string, func: string): number => {
    if (!activeSheet) return 0;
    
    const startPos = parseCellAddress(start);
    const endPos = parseCellAddress(end);
    const values: number[] = [];
    
    for (let row = startPos.row; row <= endPos.row; row++) {
      for (let col = startPos.col; col <= endPos.col; col++) {
        const address = getCellAddress(row, col);
        const cell = activeSheet.cells[address];
        if (cell && !isNaN(Number(cell.value))) {
          values.push(Number(cell.value));
        }
      }
    }
    
    switch (func) {
      case 'SUM':
        return values.reduce((sum, val) => sum + val, 0);
      case 'AVERAGE':
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      case 'COUNT':
        return values.length;
      case 'MAX':
        return Math.max(...values);
      case 'MIN':
        return Math.min(...values);
      default:
        return 0;
    }
  }, [activeSheet, parseCellAddress, getCellAddress]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
          e.preventDefault();
          undo();
          break;
        case 'y':
          e.preventDefault();
          redo();
          break;
        case 'c':
          e.preventDefault();
          copy();
          break;
        case 'v':
          e.preventDefault();
          paste();
          break;
        case 'x':
          e.preventDefault();
          cut();
          break;
        case 's':
          e.preventDefault();
          saveToLocal();
          break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [activeSheet!, ...prev].slice(0, 50));
    setUndoStack(prev => prev.slice(0, -1));
    
    setSheets(prev => prev.map(sheet => 
      sheet.id === activeSheetId ? previousState : sheet
    ));
  }, [undoStack, activeSheet, activeSheetId]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[0];
    setUndoStack(prev => [...prev, activeSheet!].slice(-50));
    setRedoStack(prev => prev.slice(1));
    
    setSheets(prev => prev.map(sheet => 
      sheet.id === activeSheetId ? nextState : sheet
    ));
  }, [redoStack, activeSheet, activeSheetId]);

  const copy = useCallback(() => {
    if (!activeSheet || selectedCells.length === 0) return;
    
    const copiedCells: Record<string, Cell> = {};
    selectedCells.forEach(address => {
      if (activeSheet.cells[address]) {
        copiedCells[address] = { ...activeSheet.cells[address] };
      }
    });
    
    setClipboard({ cells: copiedCells, cut: false });
    toast({ title: "Copied", description: `${selectedCells.length} cells copied` });
  }, [activeSheet, selectedCells, toast]);

  const cut = useCallback(() => {
    if (!activeSheet || selectedCells.length === 0) return;
    
    const copiedCells: Record<string, Cell> = {};
    selectedCells.forEach(address => {
      if (activeSheet.cells[address]) {
        copiedCells[address] = { ...activeSheet.cells[address] };
      }
    });
    
    setClipboard({ cells: copiedCells, cut: true });
    
    // Clear original cells if cut
    setSheets(prev => prev.map(sheet => {
      if (sheet.id === activeSheetId) {
        const newCells = { ...sheet.cells };
        selectedCells.forEach(address => {
          delete newCells[address];
        });
        return { ...sheet, cells: newCells };
      }
      return sheet;
    }));
    
    toast({ title: "Cut", description: `${selectedCells.length} cells cut` });
  }, [activeSheet, selectedCells, activeSheetId, toast]);

  const paste = useCallback(() => {
    if (!clipboard || !activeSheet || selectedCells.length === 0) return;
    
    const targetCell = selectedCells[0];
    const targetPos = parseCellAddress(targetCell);
    const clipboardAddresses = Object.keys(clipboard.cells);
    
    if (clipboardAddresses.length === 0) return;
    
    const firstClipboardPos = parseCellAddress(clipboardAddresses[0]);
    
    setSheets(prev => prev.map(sheet => {
      if (sheet.id === activeSheetId) {
        const newCells = { ...sheet.cells };
        
        clipboardAddresses.forEach(address => {
          const clipPos = parseCellAddress(address);
          const offsetRow = clipPos.row - firstClipboardPos.row;
          const offsetCol = clipPos.col - firstClipboardPos.col;
          const newAddress = getCellAddress(targetPos.row + offsetRow, targetPos.col + offsetCol);
          
          newCells[newAddress] = { ...clipboard.cells[address] };
        });
        
        return { ...sheet, cells: newCells };
      }
      return sheet;
    }));
    
    toast({ title: "Pasted", description: `${clipboardAddresses.length} cells pasted` });
  }, [clipboard, activeSheet, selectedCells, parseCellAddress, getCellAddress, activeSheetId, toast]);

  const addSheet = useCallback(() => {
    const newSheet: Sheet = {
      id: `sheet${sheets.length + 1}`,
      name: `Sheet${sheets.length + 1}`,
      cells: {},
      rowHeights: {},
      columnWidths: {},
      frozenRows: 0,
      frozenColumns: 0
    };
    
    setSheets(prev => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
  }, [sheets.length]);

  const deleteSheet = useCallback((sheetId: string) => {
    if (sheets.length <= 1) {
      toast({ title: "Cannot delete", description: "Must have at least one sheet", variant: "destructive" });
      return;
    }
    
    setSheets(prev => prev.filter(s => s.id !== sheetId));
    
    if (activeSheetId === sheetId) {
      const remainingSheets = sheets.filter(s => s.id !== sheetId);
      setActiveSheetId(remainingSheets[0]?.id || '');
    }
  }, [sheets, activeSheetId, toast]);

  const saveToLocal = useCallback(() => {
    localStorage.setItem('advanced-spreadsheet', JSON.stringify({
      sheets,
      charts,
      activeSheetId
    }));
    toast({ title: "Saved", description: "Spreadsheet saved to local storage" });
  }, [sheets, charts, activeSheetId, toast]);

  const loadFromLocal = useCallback(() => {
    const saved = localStorage.getItem('advanced-spreadsheet');
    if (saved) {
      const data = JSON.parse(saved);
      setSheets(data.sheets || []);
      setCharts(data.charts || []);
      setActiveSheetId(data.activeSheetId || '');
      toast({ title: "Loaded", description: "Spreadsheet loaded from local storage" });
    }
  }, [toast]);

  const exportToExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    
    sheets.forEach(sheet => {
      const worksheet = XLSX.utils.aoa_to_sheet([]);
      
      Object.entries(sheet.cells).forEach(([address, cell]) => {
        const pos = parseCellAddress(address);
        XLSX.utils.sheet_add_aoa(worksheet, [[cell.value]], { origin: { r: pos.row, c: pos.col } });
      });
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });
    
    XLSX.writeFile(workbook, 'spreadsheet.xlsx');
    toast({ title: "Exported", description: "Spreadsheet exported to Excel" });
  }, [sheets, parseCellAddress, toast]);

  const importFromExcel = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const importedSheets: Sheet[] = [];
        
        workbook.SheetNames.forEach((sheetName, index) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          const cells: Record<string, Cell> = {};
          
          (jsonData as any[][]).forEach((row, rowIndex) => {
            row.forEach((cellValue, colIndex) => {
              if (cellValue !== '') {
                const address = getCellAddress(rowIndex, colIndex);
                cells[address] = { value: cellValue };
              }
            });
          });
          
          importedSheets.push({
            id: `imported${index + 1}`,
            name: sheetName,
            cells,
            rowHeights: {},
            columnWidths: {},
            frozenRows: 0,
            frozenColumns: 0
          });
        });
        
        setSheets(importedSheets);
        setActiveSheetId(importedSheets[0]?.id || '');
        
        toast({ title: "Imported", description: `Imported ${importedSheets.length} sheets from Excel` });
      } catch (error) {
        toast({ title: "Import Error", description: "Failed to import Excel file", variant: "destructive" });
      }
    };
    
    reader.readAsArrayBuffer(file);
  }, [getCellAddress, toast]);

  const applyFormat = useCallback((format: Partial<CellFormat>) => {
    if (!activeSheet || selectedCells.length === 0) return;
    
    setSheets(prev => prev.map(sheet => {
      if (sheet.id === activeSheetId) {
        const newCells = { ...sheet.cells };
        
        selectedCells.forEach(address => {
          newCells[address] = {
            ...newCells[address],
            format: {
              ...newCells[address]?.format,
              ...format
            }
          };
        });
        
        return { ...sheet, cells: newCells };
      }
      return sheet;
    }));
    
    setShowFormatDialog(false);
  }, [activeSheet, selectedCells, activeSheetId]);

  const renderGrid = useMemo(() => {
    if (!activeSheet) return null;
    
    const rows = 100;
    const cols = 26;
    
    return (
      <div className="overflow-auto border border-border rounded" style={{ height: '600px' }}>
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="w-12 h-8 bg-muted border border-border text-xs"></th>
              {Array.from({ length: cols }, (_, i) => (
                <th key={i} className="w-20 h-8 bg-muted border border-border text-xs font-medium">
                  {columnToLetter(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr key={rowIndex}>
                <td className="w-12 h-8 bg-muted border border-border text-xs text-center font-medium">
                  {rowIndex + 1}
                </td>
                {Array.from({ length: cols }, (_, colIndex) => {
                  const address = getCellAddress(rowIndex, colIndex);
                  const cell = activeSheet.cells[address];
                  const isSelected = selectedCells.includes(address);
                  const isEditing = editingCell === address;
                  
                  return (
                    <td
                      key={colIndex}
                      className={`w-20 h-8 border border-border text-xs p-1 cursor-cell ${
                        isSelected ? 'bg-terminal-green/20 border-terminal-green' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedCells([address]);
                        setEditingCell(null);
                        setFormulaBar(cell?.formula || cell?.value?.toString() || '');
                      }}
                      onDoubleClick={() => {
                        setEditingCell(address);
                        setFormulaBar(cell?.formula || cell?.value?.toString() || '');
                      }}
                      style={{
                        backgroundColor: cell?.format?.backgroundColor,
                        color: cell?.format?.color,
                        fontWeight: cell?.format?.fontWeight,
                        fontStyle: cell?.format?.fontStyle,
                        textAlign: cell?.format?.alignment,
                        fontSize: cell?.format?.fontSize ? `${cell.format.fontSize}px` : undefined
                      }}
                    >
                      {isEditing ? (
                        <Input
                          value={formulaBar}
                          onChange={(e) => setFormulaBar(e.target.value)}
                          onBlur={() => {
                            updateCell(address, formulaBar, formulaBar.startsWith('=') ? formulaBar : undefined);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateCell(address, formulaBar, formulaBar.startsWith('=') ? formulaBar : undefined);
                              setEditingCell(null);
                            } else if (e.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                          className="w-full h-full border-none p-0 text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="truncate block">
                          {cell?.value?.toString() || ''}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [activeSheet, selectedCells, editingCell, formulaBar, getCellAddress, columnToLetter, updateCell]);

  return (
    <Card className="w-full h-full bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-terminal-green">
          <Table2 className="h-5 w-5" />
          EXCEL-STYLE SPREADSHEET - Professional Data Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 p-2 bg-muted rounded">
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={saveToLocal}>
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={undo} disabled={undoStack.length === 0}>
              <Undo className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={redo} disabled={redoStack.length === 0}>
              <Redo className="h-3 w-3" />
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={cut}>
              <Scissors className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={paste}>
              <ClipboardPaste className="h-3 w-3" />
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex gap-1">
            <Dialog open={showFormatDialog} onOpenChange={setShowFormatDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Palette className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Format Cells</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="font">
                  <TabsList>
                    <TabsTrigger value="font">Font</TabsTrigger>
                    <TabsTrigger value="alignment">Alignment</TabsTrigger>
                    <TabsTrigger value="border">Border</TabsTrigger>
                    <TabsTrigger value="number">Number</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="font" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Font Size</Label>
                        <Input 
                          type="number" 
                          value={currentFormat.fontSize || 12}
                          onChange={(e) => setCurrentFormat(prev => ({...prev, fontSize: parseInt(e.target.value)}))}
                        />
                      </div>
                      <div>
                        <Label>Font Color</Label>
                        <Input 
                          type="color" 
                          value={currentFormat.color || '#000000'}
                          onChange={(e) => setCurrentFormat(prev => ({...prev, color: e.target.value}))}
                        />
                      </div>
                      <div>
                        <Label>Background Color</Label>
                        <Input 
                          type="color" 
                          value={currentFormat.backgroundColor || '#ffffff'}
                          onChange={(e) => setCurrentFormat(prev => ({...prev, backgroundColor: e.target.value}))}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={currentFormat.fontWeight === 'bold' ? 'default' : 'outline'}
                        onClick={() => setCurrentFormat(prev => ({...prev, fontWeight: prev.fontWeight === 'bold' ? 'normal' : 'bold'}))}
                      >
                        <Bold className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant={currentFormat.fontStyle === 'italic' ? 'default' : 'outline'}
                        onClick={() => setCurrentFormat(prev => ({...prev, fontStyle: prev.fontStyle === 'italic' ? 'normal' : 'italic'}))}
                      >
                        <Italic className="h-3 w-3" />
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="alignment" className="space-y-4">
                    <div>
                      <Label>Horizontal Alignment</Label>
                      <div className="flex gap-1 mt-2">
                        <Button 
                          size="sm" 
                          variant={currentFormat.alignment === 'left' ? 'default' : 'outline'}
                          onClick={() => setCurrentFormat(prev => ({...prev, alignment: 'left'}))}
                        >
                          <AlignLeft className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant={currentFormat.alignment === 'center' ? 'default' : 'outline'}
                          onClick={() => setCurrentFormat(prev => ({...prev, alignment: 'center'}))}
                        >
                          <AlignCenter className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant={currentFormat.alignment === 'right' ? 'default' : 'outline'}
                          onClick={() => setCurrentFormat(prev => ({...prev, alignment: 'right'}))}
                        >
                          <AlignRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="number" className="space-y-4">
                    <div>
                      <Label>Number Format</Label>
                      <Select 
                        value={currentFormat.numberFormat || 'general'} 
                        onValueChange={(value) => setCurrentFormat(prev => ({...prev, numberFormat: value}))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="currency">Currency</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="time">Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowFormatDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => applyFormat(currentFormat)}>
                    Apply
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={exportToExcel}>
              <Download className="h-3 w-3" />
              Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => document.getElementById('excel-import')?.click()}>
              <Upload className="h-3 w-3" />
              Import
            </Button>
            <input
              id="excel-import"
              type="file"
              accept=".xlsx,.xls"
              onChange={importFromExcel}
              className="hidden"
            />
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search cells..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        {/* Formula Bar */}
        <div className="flex items-center gap-2 p-2 bg-muted rounded">
          <span className="text-xs font-medium min-w-16">
            {selectedCells[0] || 'A1'}
          </span>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={formulaBar}
            onChange={(e) => setFormulaBar(e.target.value)}
            placeholder="Enter formula or value..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selectedCells[0]) {
                updateCell(selectedCells[0], formulaBar, formulaBar.startsWith('=') ? formulaBar : undefined);
              }
            }}
          />
        </div>

        {/* Sheet Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {sheets.map(sheet => (
              <Button
                key={sheet.id}
                size="sm"
                variant={activeSheetId === sheet.id ? 'default' : 'outline'}
                onClick={() => setActiveSheetId(sheet.id)}
                className="relative group"
              >
                {sheet.name}
                {sheets.length > 1 && (
                  <button
                    className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSheet(sheet.id);
                    }}
                  >
                    ×
                  </button>
                )}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={addSheet}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Grid */}
        <div ref={gridRef} className="border rounded">
          {renderGrid}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground p-2 bg-muted rounded">
          <div className="flex gap-4">
            <span>Cells: {Object.keys(activeSheet?.cells || {}).length}</span>
            <span>Selected: {selectedCells.length}</span>
            {selectedCells.length > 0 && (
              <span>
                Sum: {selectedCells.reduce((sum, addr) => {
                  const val = activeSheet?.cells[addr]?.value;
                  return sum + (isNaN(Number(val)) ? 0 : Number(val));
                }, 0).toFixed(2)}
              </span>
            )}
          </div>
          <div>
            Sheet: {activeSheet?.name} | Ready
          </div>
        </div>
      </CardContent>
    </Card>
  );
}