import { useState } from 'react';
import { Plus } from 'lucide-react';
import FloatingWindow from './FloatingWindow';

interface PanelData {
  id: string;
  title: string;
  component: React.ReactNode;
  isMaximized?: boolean;
  isMinimized?: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

interface TabManagerProps {
  onTabAdd: () => void;
  panels: PanelData[];
  onPanelClose: (panelId: string) => void;
  onPanelMaximize: (panelId: string) => void;
  onPanelMinimize: (panelId: string) => void;
  onPanelRestore: (panelId: string) => void;
  onPanelReorder: (panels: PanelData[]) => void;
}

const TabManager = ({
  onTabAdd,
  panels,
  onPanelClose,
  onPanelMaximize,
  onPanelMinimize,
  onPanelRestore,
  onPanelReorder
}: TabManagerProps) => {
  const [draggedPanel, setDraggedPanel] = useState<string | null>(null);
  const maximizedPanel = panels.find(p => p.isMaximized);
  const visiblePanels = panels.filter(p => !p.isMinimized);
  
  const getDefaultSize = () => {
    if (visiblePanels.length === 0) return 100;
    return Math.max(100 / visiblePanels.length, 20);
  };

  const handleDragStart = (id: string, e: React.DragEvent) => {
    setDraggedPanel(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (id: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedPanel && draggedPanel !== id) {
      const draggedIndex = panels.findIndex(p => p.id === draggedPanel);
      const targetIndex = panels.findIndex(p => p.id === id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newPanels = [...panels];
        const draggedPanelData = newPanels[draggedIndex];
        newPanels.splice(draggedIndex, 1);
        newPanels.splice(targetIndex, 0, draggedPanelData);
        onPanelReorder(newPanels);
      }
    }
    setDraggedPanel(null);
  };

  return (
    <div className="flex-1 flex flex-col relative">
      <div className="flex bg-background/50 border-b border-border overflow-x-auto">
        <button
          onClick={onTabAdd}
          className="flex items-center gap-2 px-4 py-2 min-w-[60px] border-r border-border/30 cursor-pointer hover:bg-background/80 text-terminal-gray hover:text-terminal-green transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">ADD</span>
        </button>
      </div>

      {/* Minimized panels taskbar */}
      {panels.some(p => p.isMinimized) && (
        <div className="flex bg-terminal-panel border-b border-border p-2 gap-2">
          {panels.filter(p => p.isMinimized).map(panel => (
            <button
              key={panel.id}
              onClick={() => onPanelRestore(panel.id)}
              className="px-3 py-1 bg-background/50 hover:bg-background/80 border border-border rounded text-xs text-terminal-gray hover:text-terminal-green transition-colors"
            >
              {panel.title}
            </button>
          ))}
        </div>
      )}

      {/* Desktop area for floating windows */}
      <div className="flex-1 bg-background relative overflow-hidden">
        {panels.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-terminal-gray">Click ADD to add panels</div>
          </div>
        ) : (
          panels.filter(p => !p.isMinimized).map((panel, index) => (
            <FloatingWindow
              key={panel.id}
              id={panel.id}
              title={panel.title}
              onClose={() => onPanelClose(panel.id)}
              onMinimize={() => onPanelMinimize(panel.id)}
              onMaximize={() => onPanelMaximize(panel.id)}
              isMaximized={panel.isMaximized}
              initialPosition={panel.position || { x: 50 + index * 30, y: 50 + index * 30 }}
              initialSize={panel.size || { width: 500, height: 400 }}
            >
              {panel.component}
            </FloatingWindow>
          ))
        )}
      </div>
    </div>
  );
};

export default TabManager;