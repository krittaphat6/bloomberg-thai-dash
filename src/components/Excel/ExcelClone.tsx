import { useState, useRef, useCallback, useEffect } from 'react';
import { ExcelRibbon } from './ExcelRibbon';
import { ExcelFormulaBar } from './ExcelFormulaBar';
import { ExcelGrid } from './ExcelGrid';
import { ExcelSheetTabs } from './ExcelSheetTabs';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExcelCloneProps {
  initialData?: any;
  onSave?: (data: any) => void;
}

interface Sheet {
  id: string;
  name: string;
  data: Record<string, any>;
}

export const ExcelClone = ({ initialData, onSave }: ExcelCloneProps) => {
  const { toast } = useToast();
  const [activeCell, setActiveCell] = useState('A1');
  const [selectedRange, setSelectedRange] = useState<string[]>([]);
  const [formulaValue, setFormulaValue] = useState('');
  const [sheets, setSheets] = useState<Sheet[]>([
    { id: 'sheet1', name: 'Sheet1', data: initialData || {} },
    { id: 'sheet2', name: 'Sheet2', data: {} },
    { id: 'sheet3', name: 'Sheet3', data: {} }
  ]);
  const [activeSheetId, setActiveSheetId] = useState('sheet1');
  
  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentSheet = sheets.find(s => s.id === activeSheetId);

  const getCellAddress = (row: number, col: number) => {
    let label = '';
    let num = col;
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    return `${label}${row + 1}`;
  };

  const handleExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
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
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '',
            raw: false 
          });
          
          const sheetData: Record<string, any> = {};
          
          (jsonData as any[][]).forEach((row, rowIndex) => {
            row.forEach((cellValue, colIndex) => {
              if (cellValue !== '') {
                const address = getCellAddress(rowIndex, colIndex);
                sheetData[address] = cellValue;
              }
            });
          });
          
          importedSheets.push({
            id: `imported-${index + 1}`,
            name: sheetName,
            data: sheetData
          });
        });
        
        setSheets(importedSheets);
        setActiveSheetId(importedSheets[0]?.id || '');
        
        toast({
          title: "Import Successful!",
          description: `Imported ${importedSheets.length} sheets from ${file.name}`
        });
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "Import Failed",
          description: "Could not read the Excel file. Please check the file format.",
          variant: "destructive"
        });
      }
    };
    
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const addNewSheet = () => {
    const newSheetNumber = sheets.length + 1;
    const newSheet: Sheet = {
      id: `sheet${newSheetNumber}`,
      name: `Sheet${newSheetNumber}`,
      data: {}
    };
    setSheets(prev => [...prev, newSheet]);
  };

  const updateCellData = (cellAddress: string, value: any) => {
    setSheets(prev => prev.map(sheet => 
      sheet.id === activeSheetId 
        ? { ...sheet, data: { ...sheet.data, [cellAddress]: value } }
        : sheet
    ));
    setHasUnsavedChanges(true);
  };

  const saveSpreadsheet = useCallback(async () => {
    setIsSaving(true);
    try {
      if (onSave && currentSheet) {
        onSave(currentSheet.data);
      }
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      toast({
        title: "Saved successfully",
        description: "Your spreadsheet has been saved",
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Could not save your spreadsheet",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }, [onSave, currentSheet, toast]);

  // Auto-save after 3 seconds of inactivity
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveSpreadsheet();
      }, 3000);
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, saveSpreadsheet]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveSpreadsheet();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveSpreadsheet]);

  // Warning before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleCellSelect = (cellAddress: string) => {
    setActiveCell(cellAddress);
    const cellValue = currentSheet?.data[cellAddress] || '';
    setFormulaValue(cellValue);
  };

  const handleFormulaChange = (value: string) => {
    setFormulaValue(value);
    updateCellData(activeCell, value);
  };


  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground">
      {/* Save Button and Status */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-md border border-border">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={saveSpreadsheet}
            disabled={isSaving || !hasUnsavedChanges}
            className="h-7 px-2 hover:bg-terminal-green/10"
          >
            <Save className={cn(
              "h-3.5 w-3.5 text-terminal-green",
              isSaving && "animate-pulse"
            )} />
          </Button>
          <span className={cn(
            "text-xs font-medium",
            isSaving && "text-terminal-amber",
            !isSaving && lastSaved && "text-terminal-green",
            !isSaving && !lastSaved && "text-muted-foreground"
          )}>
            {isSaving ? "Saving..." : 
             lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 
             "Not saved"}
          </span>
        </div>
      </div>
      
      {/* Excel Ribbon Menu */}
      <ExcelRibbon onExcelImport={handleExcelImport} />
      
      {/* Formula Bar */}
      <ExcelFormulaBar 
        activeCell={activeCell}
        formulaValue={formulaValue}
        onFormulaChange={handleFormulaChange}
      />
      
      {/* Main Spreadsheet Grid */}
      <div className="flex-1 overflow-hidden">
        <ExcelGrid
          activeCell={activeCell}
          selectedRange={selectedRange}
          onCellSelect={handleCellSelect}
          onRangeSelect={setSelectedRange}
          data={currentSheet?.data || {}}
          onCellChange={updateCellData}
        />
      </div>
      
      {/* Sheet Tabs */}
      <ExcelSheetTabs
        sheets={sheets}
        activeSheetId={activeSheetId}
        onSheetChange={setActiveSheetId}
        onSheetAdd={addNewSheet}
      />
    </div>
  );
};