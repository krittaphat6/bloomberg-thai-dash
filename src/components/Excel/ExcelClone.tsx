import { useState, useRef, useCallback, useEffect } from 'react';
import { ExcelRibbon } from './ExcelRibbon';
import { ExcelFormulaBar } from './ExcelFormulaBar';
import { ExcelGrid } from './ExcelGrid';
import { ExcelSheetTabs } from './ExcelSheetTabs';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

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
  };

  const handleCellSelect = (cellAddress: string) => {
    setActiveCell(cellAddress);
    const cellValue = currentSheet?.data[cellAddress] || '';
    setFormulaValue(cellValue);
  };

  const handleFormulaChange = (value: string) => {
    setFormulaValue(value);
    updateCellData(activeCell, value);
  };

  useEffect(() => {
    if (onSave && currentSheet) {
      onSave(currentSheet.data);
    }
  }, [currentSheet?.data, onSave]);

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground">
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