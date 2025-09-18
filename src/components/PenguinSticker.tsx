import { useState, useRef, useEffect } from "react";
import penguinImage from "@/assets/penguin-sticker.png";

const PenguinSticker = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleClose = () => {
    setIsVisible(false);
    setPosition({ x: 0, y: 0 }); // Reset position
  };

  return (
    <>
      {/* Click trigger - centered */}
      <div 
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 cursor-pointer"
        onClick={() => setIsVisible(!isVisible)}
      >
        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center hover:bg-primary/30 transition-colors">
          <span className="text-xs">🐧</span>
        </div>
      </div>
      
      {/* Penguin sticker - draggable when visible */}
      {isVisible && (
        <div 
          ref={dragRef}
          className={`fixed z-50 ${isDragging ? '' : 'animate-bounce'}`}
          style={{
            top: position.y || '4rem',
            right: position.x ? 'auto' : '0.5rem',
            left: position.x ? `${position.x}px` : 'auto',
            transform: position.x ? `translateY(${position.y}px)` : 'none'
          }}
        >
          <img 
            src={penguinImage} 
            alt="Cute penguin sticker"
            className={`w-16 h-16 hover:scale-110 transition-transform duration-200 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleClose}
            draggable={false}
          />
          <div className="text-xs text-center text-muted-foreground mt-1">
            Double click to close
          </div>
        </div>
      )}
    </>
  );
};

export default PenguinSticker;