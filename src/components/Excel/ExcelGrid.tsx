import { useState, useRef, useEffect } from 'react';

interface ExcelGridProps {
  activeCell: string;
  selectedRange: string[];
  onCellSelect: (cellAddress: string) => void;
  onRangeSelect: (range: string[]) => void;
  data: Record<string, any>;
  onCellChange: (cellAddress: string, value: any) => void;
}

export const ExcelGrid = ({ 
  activeCell, 
  selectedRange, 
  onCellSelect, 
  onRangeSelect, 
  data,
  onCellChange 
}: ExcelGridProps) => {
  const ROWS = 1000;
  const COLS = 26;
  const [isSelecting, setIsSelecting] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const getColumnLabel = (index: number): string => {
    let label = '';
    let num = index;
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    return label;
  };

  const getCellAddress = (row: number, col: number): string => 
    `${getColumnLabel(col)}${row + 1}`;

  const parseCellAddress = (address: string): { row: number; col: number } => {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { row: 0, col: 0 };
    
    const colStr = match[1];
    const rowNum = parseInt(match[2]) - 1;
    
    let colNum = 0;
    for (let i = 0; i < colStr.length; i++) {
      colNum = colNum * 26 + (colStr.charCodeAt(i) - 64);
    }
    colNum -= 1;
    
    return { row: rowNum, col: colNum };
  };

  const handleCellClick = (cellAddress: string, event: React.MouseEvent) => {
    event.preventDefault();
    onCellSelect(cellAddress);
    
    if (event.shiftKey && selectedRange.length > 0) {
      // Range selection
      const startCell = selectedRange[0] || activeCell;
      const start = parseCellAddress(startCell);
      const end = parseCellAddress(cellAddress);
      
      const minRow = Math.min(start.row, end.row);
      const maxRow = Math.max(start.row, end.row);
      const minCol = Math.min(start.col, end.col);
      const maxCol = Math.max(start.col, end.col);
      
      const range: string[] = [];
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          range.push(getCellAddress(row, col));
        }
      }
      onRangeSelect(range);
    } else {
      onRangeSelect([cellAddress]);
    }
  };

  const handleCellChange = (cellAddress: string, value: string) => {
    onCellChange(cellAddress, value);
  };

  const scrollToCell = (cellAddress: string) => {
    const { row, col } = parseCellAddress(cellAddress);
    const cellElement = gridRef.current?.querySelector(`[data-cell="${cellAddress}"]`);
    if (cellElement) {
      cellElement.scrollIntoView({ block: 'center', inline: 'center' });
    }
  };

  useEffect(() => {
    if (activeCell) {
      scrollToCell(activeCell);
    }
  }, [activeCell]);

  return (
    <div className="relative overflow-auto h-full bg-white" ref={gridRef}>
      <table className="border-collapse table-fixed">
        {/* Header Row */}
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="w-12 h-6 bg-[#F3F3F3] border border-gray-300 text-xs sticky left-0 z-20"></th>
            {Array.from({ length: COLS }, (_, col) => (
              <th
                key={col}
                className="w-20 h-6 bg-[#F3F3F3] border border-gray-300 text-xs font-normal text-center select-none"
              >
                {getColumnLabel(col)}
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Data Rows */}
        <tbody>
          {Array.from({ length: ROWS }, (_, row) => (
            <tr key={row}>
              <td className="w-12 h-6 bg-[#F3F3F3] border border-gray-300 text-xs text-center sticky left-0 z-10 select-none">
                {row + 1}
              </td>
              {Array.from({ length: COLS }, (_, col) => {
                const cellAddress = getCellAddress(row, col);
                const isActive = activeCell === cellAddress;
                const isSelected = selectedRange.includes(cellAddress);
                
                return (
                  <ExcelCell
                    key={col}
                    cellAddress={cellAddress}
                    value={data[cellAddress] || ''}
                    isActive={isActive}
                    isSelected={isSelected}
                    onClick={(e) => handleCellClick(cellAddress, e)}
                    onChange={(value) => handleCellChange(cellAddress, value)}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface ExcelCellProps {
  cellAddress: string;
  value: any;
  isActive: boolean;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onChange: (value: string) => void;
}

const ExcelCell = ({ cellAddress, value, isActive, isSelected, onClick, onChange }: ExcelCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(String(value || ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onChange(editValue);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditValue(String(value || ''));
      setIsEditing(false);
    } else if (e.key === 'F2') {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(String(value || ''));
  }, [value]);

  return (
    <td
      data-cell={cellAddress}
      className={`w-20 h-6 border border-gray-300 text-xs cursor-cell relative ${
        isActive ? 'border-[#217346] border-2 bg-white z-10' :
        isSelected ? 'bg-[#E7F4F9]' : 'bg-white hover:bg-gray-50'
      }`}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          className="w-full h-full border-none outline-none bg-transparent p-1 text-xs"
        />
      ) : (
        <div className="w-full h-full p-1 text-xs overflow-hidden whitespace-nowrap">
          {String(value || '')}
        </div>
      )}
      
      {isActive && !isEditing && (
        <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-[#217346] border border-white cursor-se-resize"></div>
      )}
    </td>
  );
};