import { useState, useRef } from 'react';
import { X, ChevronLeft, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Panel {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface MobilePanelStackProps {
  panels: Panel[];
  activePanel: Panel | null;
  onPanelSelect: (panel: Panel) => void;
  onPanelClose: (id: string) => void;
  onBack: () => void;
}

export function MobilePanelStack({ 
  panels, 
  activePanel, 
  onPanelSelect, 
  onPanelClose,
  onBack 
}: MobilePanelStackProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) {
      setCurrentY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 150) {
      onBack();
    }
    setCurrentY(0);
    setIsDragging(false);
  };

  // Panel List View
  if (!activePanel) {
    return (
      <div className="flex-1 flex flex-col safe-area-top">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-bold text-terminal-green">Active Panels</h2>
          <p className="text-sm text-muted-foreground">
            {panels.length} panel{panels.length !== 1 ? 's' : ''} open
          </p>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {panels.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-2">No panels open</p>
                <p className="text-sm">Tap + to add a panel</p>
              </div>
            ) : (
              panels.map((panel) => (
                <div
                  key={panel.id}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer active:bg-accent/50"
                    onClick={() => onPanelSelect(panel)}
                  >
                    <span className="font-medium text-terminal-green">{panel.title}</span>
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPanelClose(panel.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Active Panel View (Full Screen)
  return (
    <div 
      className="fixed inset-0 bg-background z-50 flex flex-col safe-area-top safe-area-bottom"
      style={{ transform: `translateY(${currentY}px)` }}
    >
      {/* Header with drag handle */}
      <div 
        className="bg-background border-b border-border"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator */}
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        
        <div className="flex items-center justify-between px-4 pb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-terminal-green -ml-2"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <span className="font-bold text-terminal-green truncate max-w-[200px]">
            {activePanel.title}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPanelClose(activePanel.id)}
            className="text-destructive"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Panel Content */}
      <div ref={contentRef} className="flex-1 overflow-auto touch-scroll">
        {activePanel.component}
      </div>
    </div>
  );
}
