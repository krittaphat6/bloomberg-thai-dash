import { useState, useRef, useEffect } from 'react';
import { X, Move } from 'lucide-react';

interface DraggableTabProps {
  id: string;
  title: string;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onDragOver: (id: string, e: React.DragEvent) => void;
  onDrop: (id: string, e: React.DragEvent) => void;
  isDragging?: boolean;
}

const DraggableTab = ({
  id,
  title,
  isActive,
  onActivate,
  onClose,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false
}: DraggableTabProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={tabRef}
      draggable
      onDragStart={(e) => onDragStart(id, e)}
      onDragOver={(e) => onDragOver(id, e)}
      onDrop={(e) => onDrop(id, e)}
      onClick={onActivate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative flex items-center gap-2 px-4 py-2 min-w-[120px] max-w-[200px]
        border-r border-border/30 cursor-pointer select-none
        transition-all duration-200 group
        ${isActive 
          ? 'bg-terminal-panel border-b-2 border-b-terminal-green text-terminal-green' 
          : 'bg-background/50 hover:bg-background/80 text-terminal-gray hover:text-terminal-white'
        }
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
    >
      <Move className="w-3 h-3 opacity-40 group-hover:opacity-80" />
      
      <span className="flex-1 truncate text-sm font-medium">
        {title}
      </span>
      
      {(isHovered || isActive) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-4 h-4 flex items-center justify-center rounded hover:bg-terminal-red/20 hover:text-terminal-red transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-terminal-green" />
      )}
    </div>
  );
};

export default DraggableTab;