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
    <div className="flex items-center bg-background border-t border-border h-7 relative" onClick={handleClickOutside}>
      {/* Navigation arrows */}
      <div className="flex border-r border-border">
        <button className="px-2 py-1 hover:bg-terminal-green/10 text-terminal-green">‹</button>
        <button className="px-2 py-1 hover:bg-terminal-green/10 text-terminal-green">›</button>
        <button className="px-2 py-1 hover:bg-terminal-green/10 text-terminal-green">⟨</button>
        <button className="px-2 py-1 hover:bg-terminal-green/10 text-terminal-green">⟩</button>
      </div>

      {/* Sheet Tabs */}
      <div className="flex">
        {sheets.map(sheet => (
          <div
            key={sheet.id}
            className={`relative border-r border-border ${
              activeSheetId === sheet.id 
                ? 'bg-terminal-green -mb-px' 
                : 'hover:bg-terminal-green/10'
            }`}
          >
            <button
              onClick={() => onSheetChange(sheet.id)}
              onContextMenu={(e) => handleRightClick(e, sheet.id)}
              className={`px-4 py-1 text-sm min-w-0 max-w-32 truncate h-6 ${
                activeSheetId === sheet.id ? 'font-semibold text-black' : 'text-terminal-green'
              }`}
            >
              {sheet.name}
            </button>
          </div>
        ))}
        
        {/* Add Sheet Button */}
        <button
          onClick={onSheetAdd}
          className="px-2 py-1 hover:bg-terminal-green/10 text-terminal-green border-r border-border h-6"
          title="Add Sheet"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Sheet Menu Button */}
      <button className="px-2 py-1 hover:bg-terminal-green/10 text-terminal-green ml-auto h-6">
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="absolute bg-card border border-border shadow-lg z-50 py-1"
          style={{ left: contextMenu.x, top: contextMenu.y - 100 }}
        >
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-terminal-green/10 text-foreground">Insert...</button>
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-terminal-green/10 text-foreground">Delete</button>
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-terminal-green/10 text-foreground">Rename</button>
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-terminal-green/10 text-foreground">Move or Copy...</button>
          <hr className="my-1 border-border" />
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-terminal-green/10 text-foreground">Protect Sheet...</button>
          <button className="w-full px-4 py-1 text-left text-sm hover:bg-terminal-green/10 text-foreground">Tab Color</button>
        </div>
      )}
    </div>
  );
};