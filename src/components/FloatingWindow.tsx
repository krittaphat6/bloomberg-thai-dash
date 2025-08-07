import { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, X, Move } from 'lucide-react';

interface FloatingWindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  isMaximized?: boolean;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
}

const FloatingWindow = ({
  id,
  title,
  children,
  onClose,
  onMinimize,
  onMaximize,
  isMaximized = false,
  initialPosition = { x: 50, y: 50 },
  initialSize = { width: 500, height: 400 }
}: FloatingWindowProps) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
      
      if (isResizing) {
        const newWidth = Math.max(300, resizeStart.width + (e.clientX - resizeStart.x));
        const newHeight = Math.max(200, resizeStart.height + (e.clientY - resizeStart.y));
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  if (isMaximized) {
    return (
      <div className="fixed inset-0 bg-background border border-border z-50">
        <div className="flex items-center justify-between px-3 py-2 bg-terminal-panel border-b border-border drag-handle cursor-move">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-terminal-gray" />
            <span className="text-sm font-medium text-terminal-green">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className="w-6 h-6 flex items-center justify-center hover:bg-terminal-amber/20 hover:text-terminal-amber transition-colors rounded"
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onMaximize()}
              className="w-6 h-6 flex items-center justify-center hover:bg-terminal-green/20 hover:text-terminal-green transition-colors rounded"
              title="Restore"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center hover:bg-terminal-red/20 hover:text-terminal-red transition-colors rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto h-[calc(100%-3rem)]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={windowRef}
      className="fixed bg-background border border-border shadow-2xl z-40 rounded-lg overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        boxShadow: '0 10px 50px rgba(0, 0, 0, 0.3)'
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 bg-terminal-panel border-b border-border drag-handle cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-terminal-gray" />
          <span className="text-sm font-medium text-terminal-green">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMinimize}
            className="w-6 h-6 flex items-center justify-center hover:bg-terminal-amber/20 hover:text-terminal-amber transition-colors rounded"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onMaximize}
            className="w-6 h-6 flex items-center justify-center hover:bg-terminal-green/20 hover:text-terminal-green transition-colors rounded"
            title="Maximize"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center hover:bg-terminal-red/20 hover:text-terminal-red transition-colors rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto" style={{ height: 'calc(100% - 2.5rem)' }}>
        {children}
      </div>
      
      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-terminal-panel/50 hover:bg-terminal-panel"
        onMouseDown={handleResizeMouseDown}
        style={{
          background: 'linear-gradient(-45deg, transparent 0%, transparent 30%, hsl(var(--border)) 30%, hsl(var(--border)) 40%, transparent 40%, transparent 60%, hsl(var(--border)) 60%, hsl(var(--border)) 70%, transparent 70%)'
        }}
      />
    </div>
  );
};

export default FloatingWindow;