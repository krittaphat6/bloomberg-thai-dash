import React, { useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { GripVertical, Square, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface FrameNodeData {
  label: string;
  color: string;
  onChange?: (data: any) => void;
}

const FRAME_COLORS = [
  { name: 'None', value: 'transparent', border: 'border-gray-500/30' },
  { name: 'Green', value: 'rgba(34, 197, 94, 0.05)', border: 'border-terminal-green/30' },
  { name: 'Amber', value: 'rgba(245, 158, 11, 0.05)', border: 'border-terminal-amber/30' },
  { name: 'Blue', value: 'rgba(59, 130, 246, 0.05)', border: 'border-blue-500/30' },
  { name: 'Purple', value: 'rgba(168, 85, 247, 0.05)', border: 'border-purple-500/30' },
  { name: 'Red', value: 'rgba(239, 68, 68, 0.05)', border: 'border-red-500/30' },
];

export default function FrameNode({ data, selected }: NodeProps<FrameNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || 'Frame');
  const [color, setColor] = useState(data.color || 'transparent');

  const currentColor = FRAME_COLORS.find(c => c.value === color) || FRAME_COLORS[0];

  const handleBlur = () => {
    setIsEditing(false);
    data.onChange?.({ label, color });
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    data.onChange?.({ label, color: newColor });
  };

  return (
    <>
      <NodeResizer 
        minWidth={200} 
        minHeight={150}
        isVisible={selected}
        lineClassName="!border-terminal-green"
        handleClassName="!w-3 !h-3 !bg-terminal-green !border-background"
      />
      <div
        className={`w-full h-full rounded-xl border-2 border-dashed transition-all duration-200 ${currentColor.border} ${
          selected ? 'shadow-lg' : ''
        }`}
        style={{ backgroundColor: color }}
      >
        <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-background" />
        <Handle type="target" position={Position.Left} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-background" />
        
        <div 
          className="drag-handle absolute -top-8 left-0 flex items-center gap-2 px-2 py-1 rounded-t-lg cursor-grab active:cursor-grabbing bg-card/80 backdrop-blur-sm border border-b-0 border-gray-500/30"
          onDoubleClick={() => setIsEditing(true)}
        >
          <GripVertical className="w-3 h-3 text-gray-500" />
          <Square className="w-3 h-3 text-gray-500" />
          {isEditing ? (
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
              className="bg-transparent border-none outline-none text-sm font-medium text-foreground w-24"
              autoFocus
            />
          ) : (
            <span className="text-sm font-medium text-foreground">{label}</span>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 ml-1">
                <Palette className="w-3 h-3 text-gray-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex gap-1">
                {FRAME_COLORS.map((c) => (
                  <button
                    key={c.name}
                    className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                      color === c.value ? 'border-foreground' : 'border-transparent'
                    } ${c.value === 'transparent' ? 'bg-[repeating-linear-gradient(45deg,#ccc,#ccc_2px,#fff_2px,#fff_4px)]' : ''}`}
                    style={{ backgroundColor: c.value === 'transparent' ? undefined : c.value }}
                    onClick={() => handleColorChange(c.value)}
                    title={c.name}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-background" />
        <Handle type="source" position={Position.Right} className="!bg-gray-500 !w-3 !h-3 !border-2 !border-background" />
      </div>
    </>
  );
}
