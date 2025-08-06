import { useState } from 'react';
import { Plus, Maximize2, Minimize2 } from 'lucide-react';
import DraggableTab from './DraggableTab';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface TabData {
  id: string;
  title: string;
  component: React.ReactNode;
  closable: boolean;
  isMaximized?: boolean;
}

interface TabManagerProps {
  tabs: TabData[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
  onTabDragStart: (id: string, e: React.DragEvent) => void;
  onTabDragOver: (id: string, e: React.DragEvent) => void;
  onTabDrop: (id: string, e: React.DragEvent) => void;
  draggedTab: string | null;
}

const TabManager = ({
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  onTabAdd,
  onTabDragStart,
  onTabDragOver,
  onTabDrop,
  draggedTab
}: TabManagerProps) => {
  const [maximizedTab, setMaximizedTab] = useState<string | null>(null);

  const handleMaximize = (tabId: string) => {
    setMaximizedTab(maximizedTab === tabId ? null : tabId);
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  if (maximizedTab) {
    const maximizedTabData = tabs.find(tab => tab.id === maximizedTab);
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex bg-background/50 border-b border-border">
          <div className="flex items-center gap-2 px-4 py-2 bg-terminal-panel border-b-2 border-b-terminal-green text-terminal-green">
            <span className="text-sm font-medium">{maximizedTabData?.title}</span>
            <button
              onClick={() => setMaximizedTab(null)}
              className="w-4 h-4 flex items-center justify-center hover:bg-terminal-amber/20 rounded"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-background">
          {maximizedTabData?.component}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex bg-background/50 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <div key={tab.id} className="relative flex">
            <DraggableTab
              id={tab.id}
              title={tab.title}
              isActive={activeTab === tab.id}
              onActivate={() => onTabChange(tab.id)}
              onClose={() => onTabClose(tab.id)}
              onDragStart={onTabDragStart}
              onDragOver={onTabDragOver}
              onDrop={onTabDrop}
              isDragging={draggedTab === tab.id}
            />
            {activeTab === tab.id && (
              <button
                onClick={() => handleMaximize(tab.id)}
                className="absolute top-2 right-8 w-4 h-4 flex items-center justify-center hover:bg-terminal-amber/20 rounded z-10"
              >
                <Maximize2 className="w-3 h-3 text-terminal-gray hover:text-terminal-white" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={onTabAdd}
          className="flex items-center gap-2 px-4 py-2 min-w-[60px] border-r border-border/30 cursor-pointer hover:bg-background/80 text-terminal-gray hover:text-terminal-green transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">ADD</span>
        </button>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={100} minSize={20}>
          <div className="h-full bg-background">
            {activeTabData?.component}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default TabManager;