import { Plus, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

interface Sheet {
  id: string;
  name: string;
  data: Record<string, any>;
}

interface ExcelSheetTabsProps {
  sheets: Sheet[];
  activeSheetId: string;
  onSheetChange: (sheetId: string) => void;
  onSheetAdd: () => void;
}

export const ExcelSheetTabs = ({ sheets, activeSheetId, onSheetChange, onSheetAdd }: ExcelSheetTabsProps) => {
  const [contextMenu, setContextMenu] = useState<{ sheetId: string; x: number; y: number } | null>(null);

  const handleRightClick = (e: React.MouseEvent, sheetId: string) => {
    e.preventDefault();
    setContextMenu({
      sheetId,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleClickOutside = () => {
    setContextMenu(null);
  };

  return (
    <div className="flex items-center bg-gray-100 border-t border-gray-300 relative" onClick={handleClickOutside}>
      {/* Navigation arrows */}
      <div className="flex border-r border-gray-300">
        <button className="px-2 py-1 hover:bg-gray-200 text-gray-600">‹</button>
        <button className="px-2 py-1 hover:bg-gray-200 text-gray-600">›</button>
        <button className="px-2 py-1 hover:bg-gray-200 text-gray-600">⟨</button>
        <button className="px-2 py-1 hover:bg-gray-200 text-gray-600">⟩</button>
      </div>

      {/* Sheet Tabs */}
      <div className="flex">
        {sheets.map(sheet => (
          <div
            key={sheet.id}
            className={`relative border-r border-gray-300 ${
              activeSheetId === sheet.id 
                ? 'bg-white border-t-2 border-t-blue-500 -mb-px' 
                : 'hover:bg-gray-200'
            }`}
          >
            <button
              onClick={() => onSheetChange(sheet.id)}
              onContextMenu={(e) => handleRightClick(e, sheet.id)}
              className="px-4 py-1 text-sm min-w-0 max-w-32 truncate"
            >
              {sheet.name}
            </button>
          </div>
        ))}
        
        {/* Add Sheet Button */}
        <button
          onClick={onSheetAdd}
          className="px-2 py-1 hover:bg-gray-200 text-gray-600 border-r border-gray-300"
          title="Add Sheet"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Sheet Menu Button */}
      <button className="px-2 py-1 hover:bg-gray-200 text-gray-600 ml-auto">
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="absolute bg-white border border-gray-300 shadow-lg z-50 py-1"
          style={{ left: contextMenu.x, top: contextMenu.y - 100 }}
        >
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-gray-100">Insert...</button>
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-gray-100">Delete</button>
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-gray-100">Rename</button>
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-gray-100">Move or Copy...</button>
          <hr className="my-1 border-gray-300" />
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-gray-100">Protect Sheet...</button>
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-gray-100">Tab Color</button>
        </div>
      )}
    </div>
  );
};