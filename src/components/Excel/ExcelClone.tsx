import { useState, useRef, useCallback, useEffect } from 'react';
import { ExcelRibbon } from './ExcelRibbon';
import { ExcelFormulaBar } from './ExcelFormulaBar';
import { ExcelGrid } from './ExcelGrid';
import { ExcelSheetTabs } from './ExcelSheetTabs';

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
    <div className="w-full h-full flex flex-col bg-white text-black">
      {/* Excel Ribbon Menu */}
      <ExcelRibbon />
      
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