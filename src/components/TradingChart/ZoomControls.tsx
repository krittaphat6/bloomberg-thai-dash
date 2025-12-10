import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ZoomControlsProps {
  zoomLevel: number; // 10-500
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomChange: (level: number) => void;
  showSlider?: boolean;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomChange,
  showSlider = false,
}) => {
  return (
    <div className="flex items-center gap-1">
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0 text-terminal-green hover:bg-terminal-green/20" 
        onClick={onZoomOut}
        title="Zoom Out (Ctrl+-)"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      
      {showSlider ? (
        <div className="w-24 px-2">
          <Slider
            value={[zoomLevel]}
            min={10}
            max={500}
            step={10}
            onValueChange={([v]) => onZoomChange(v)}
            className="cursor-pointer"
          />
        </div>
      ) : (
        <div 
          className="w-14 text-center text-xs font-mono text-terminal-green cursor-pointer hover:text-terminal-cyan"
          onClick={onZoomReset}
          title="Reset Zoom (Ctrl+0)"
        >
          {zoomLevel}%
        </div>
      )}
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0 text-terminal-green hover:bg-terminal-green/20" 
        onClick={onZoomIn}
        title="Zoom In (Ctrl++)"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0 text-terminal-green hover:bg-terminal-green/20" 
        onClick={onZoomReset}
        title="Reset Zoom (Ctrl+0)"
      >
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ZoomControls;
