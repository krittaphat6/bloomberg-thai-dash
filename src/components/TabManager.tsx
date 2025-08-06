import { useState } from 'react';
import { Plus, Maximize2, Minimize2, X } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface PanelData {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface TabManagerProps {
  onTabAdd: () => void;
  panels: PanelData[];
  onPanelClose: (panelId: string) => void;
}

const TabManager = ({
  onTabAdd,
  panels,
  onPanelClose
}: TabManagerProps) => {
  const getDirection = (index: number) => {
    if (panels.length <= 2) return 'horizontal';
    return index % 2 === 0 ? 'horizontal' : 'vertical';
  };

  const getDefaultSize = () => {
    if (panels.length === 0) return 100;
    return Math.max(100 / panels.length, 20);
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
      ) : (
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {panels.map((panel, index) => (
            <div key={panel.id}>
              {index > 0 && <ResizableHandle withHandle />}
              <ResizablePanel defaultSize={getDefaultSize()} minSize={15}>
                <div className="h-full bg-background flex flex-col">
                  <div className="flex items-center justify-between px-3 py-2 bg-terminal-panel border-b border-border">
                    <span className="text-sm font-medium text-terminal-green">{panel.title}</span>
                    <button
                      onClick={() => onPanelClose(panel.id)}
                      className="w-4 h-4 flex items-center justify-center hover:bg-terminal-red/20 hover:text-terminal-red transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {panel.component}
                  </div>
                </div>
              </ResizablePanel>
            </div>
          ))}
        </ResizablePanelGroup>
      )}
    </div>
  );
};

export default TabManager;