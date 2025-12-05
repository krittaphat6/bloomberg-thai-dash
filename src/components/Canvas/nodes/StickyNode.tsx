import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GripVertical, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface StickyNodeData {
  text: string;
  color: string;
  onChange?: (data: any) => void;
}

const STICKY_COLORS = [
  { name: 'Yellow', value: '#fef08a', text: '#713f12' },
  { name: 'Pink', value: '#fecdd3', text: '#9f1239' },
  { name: 'Blue', value: '#bfdbfe', text: '#1e3a8a' },
  { name: 'Green', value: '#bbf7d0', text: '#14532d' },
  { name: 'Purple', value: '#e9d5ff', text: '#581c87' },
  { name: 'Orange', value: '#fed7aa', text: '#9a3412' },
];

export default function StickyNode({ data, selected }: NodeProps<StickyNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.text || '');
  const [color, setColor] = useState(data.color || '#fef08a');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentColor = STICKY_COLORS.find(c => c.value === color) || STICKY_COLORS[0];

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    data.onChange?.({ text, color });
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    data.onChange?.({ text, color: newColor });
  };

  return (
    <div
      className={`min-w-[180px] min-h-[180px] rounded-lg transition-all duration-200 shadow-lg ${
        selected ? 'ring-2 ring-foreground/50 shadow-xl' : ''
      }`}
      style={{ backgroundColor: color }}
      onDoubleClick={() => setIsEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-foreground/50 !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-foreground/50 !w-2 !h-2" />
      
      <div 
        className="drag-handle flex items-center justify-between px-2 py-1 cursor-grab active:cursor-grabbing"
        style={{ borderBottom: `1px solid ${currentColor.text}20` }}
      >
        <div className="flex items-center gap-1">
          <GripVertical className="w-3 h-3" style={{ color: currentColor.text + '50' }} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-black/10"
            >
              <Palette className="w-3 h-3" style={{ color: currentColor.text + '70' }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="end">
            <div className="flex gap-1">
              {STICKY_COLORS.map((c) => (
                <button
                  key={c.value}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c.value ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => handleColorChange(c.value)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="p-3 h-[calc(100%-28px)]">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Escape' && handleBlur()}
            className="w-full h-full bg-transparent border-none outline-none resize-none font-handwriting text-lg"
            style={{ color: currentColor.text }}
            placeholder="Write something..."
          />
        ) : (
          <p 
            className="font-handwriting text-lg whitespace-pre-wrap"
            style={{ color: currentColor.text }}
          >
            {text || 'Double-click to write...'}
          </p>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-foreground/50 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-foreground/50 !w-2 !h-2" />
    </div>
  );
}
