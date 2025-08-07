import { useState } from 'react';
import { Plus, Maximize2, Minimize2, X } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import DraggableTab from './DraggableTab';

interface PanelData {
  id: string;
  title: string;
  component: React.ReactNode;
  isMaximized?: boolean;
  isMinimized?: boolean;
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
    <div className="flex-1 flex flex-col">
      <div className="flex bg-background/50 border-b border-border overflow-x-auto">
        <button
          onClick={onTabAdd}
          className="flex items-center gap-2 px-4 py-2 min-w-[60px] border-r border-border/30 cursor-pointer hover:bg-background/80 text-terminal-gray hover:text-terminal-green transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">ADD</span>
        </button>
      </div>

      {panels.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-terminal-gray">Click ADD to add panels</div>
        </div>
      ) : maximizedPanel ? (
        <div className="flex-1 bg-background flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 bg-terminal-panel border-b border-border">
            <span className="text-sm font-medium text-terminal-green">{maximizedPanel.title}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPanelRestore(maximizedPanel.id)}
                className="w-4 h-4 flex items-center justify-center hover:bg-terminal-amber/20 hover:text-terminal-amber transition-colors"
                title="Restore"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => onPanelClose(maximizedPanel.id)}
                className="w-4 h-4 flex items-center justify-center hover:bg-terminal-red/20 hover:text-terminal-red transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {maximizedPanel.component}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Tab headers with drag functionality */}
          <div className="flex bg-background/50 border-b border-border overflow-x-auto">
            {visiblePanels.map(panel => (
              <DraggableTab
                key={panel.id}
                id={panel.id}
                title={panel.title}
                isActive={false}
                onActivate={() => {}}
                onClose={() => onPanelClose(panel.id)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={draggedPanel === panel.id}
              />
            ))}
          </div>

          {/* Minimized panels bar */}
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
          
          {/* Resizable panels */}
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {visiblePanels.map((panel, index) => (
              <div key={panel.id}>
                {index > 0 && <ResizableHandle withHandle />}
                <ResizablePanel defaultSize={getDefaultSize()} minSize={15}>
                  <div className="h-full bg-background flex flex-col">
                    <div className="flex items-center justify-between px-3 py-2 bg-terminal-panel border-b border-border">
                      <span className="text-sm font-medium text-terminal-green">{panel.title}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onPanelMinimize(panel.id)}
                          className="w-4 h-4 flex items-center justify-center hover:bg-terminal-amber/20 hover:text-terminal-amber transition-colors"
                          title="Minimize"
                        >
                          <Minimize2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onPanelMaximize(panel.id)}
                          className="w-4 h-4 flex items-center justify-center hover:bg-terminal-green/20 hover:text-terminal-green transition-colors"
                          title="Maximize"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onPanelClose(panel.id)}
                          className="w-4 h-4 flex items-center justify-center hover:bg-terminal-red/20 hover:text-terminal-red transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                      {panel.component}
                    </div>
                  </div>
                </ResizablePanel>
              </div>
            ))}
          </ResizablePanelGroup>
        </div>
      )}
    </div>
  );
};

export default TabManager;