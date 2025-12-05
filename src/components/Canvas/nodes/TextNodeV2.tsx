import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GripVertical } from 'lucide-react';

interface TextNodeData {
  text: string;
  fontSize?: number;
  onChange?: (data: any) => void;
}

export default function TextNodeV2({ data, selected }: NodeProps<TextNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    data.onChange?.({ text });
  };

  return (
    <div
      className={`min-w-[150px] rounded-lg bg-card/90 backdrop-blur-sm border-2 transition-all duration-200 ${
        selected 
          ? 'border-terminal-green shadow-lg shadow-terminal-green/20' 
          : 'border-terminal-green/30 hover:border-terminal-green/50'
      }`}
      onDoubleClick={() => setIsEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-terminal-green !w-3 !h-3 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!bg-terminal-green !w-3 !h-3 !border-2 !border-background" />
      
      <div className="drag-handle flex items-center gap-1 px-2 py-1 border-b border-terminal-green/20 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3 h-3 text-terminal-green/50" />
        <span className="text-[10px] text-terminal-green/50 uppercase tracking-wider">Text</span>
      </div>
      
      <div className="p-3">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleBlur();
            }}
            className="w-full min-h-[60px] bg-transparent border-none outline-none resize-none text-foreground"
            style={{ fontSize: data.fontSize || 14 }}
          />
        ) : (
          <p 
            className="text-foreground whitespace-pre-wrap"
            style={{ fontSize: data.fontSize || 14 }}
          >
            {text || 'Double-click to edit...'}
          </p>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-terminal-green !w-3 !h-3 !border-2 !border-background" />
      <Handle type="source" position={Position.Right} className="!bg-terminal-green !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
