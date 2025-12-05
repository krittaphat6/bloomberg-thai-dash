import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GripVertical, FileText, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NoteNodeData {
  title: string;
  content: string;
  tags?: string[];
  onChange?: (data: any) => void;
}

export default function NoteNodeV2({ data, selected }: NodeProps<NoteNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(data.title || 'New Note');
  const [content, setContent] = useState(data.content || '');

  const handleBlur = () => {
    setIsEditing(false);
    data.onChange?.({ title, content });
  };

  return (
    <div
      className={`min-w-[250px] rounded-lg bg-gradient-to-br from-amber-950/50 to-card/90 backdrop-blur-sm border-2 transition-all duration-200 ${
        selected 
          ? 'border-terminal-amber shadow-lg shadow-terminal-amber/20' 
          : 'border-terminal-amber/30 hover:border-terminal-amber/50'
      }`}
      onDoubleClick={() => setIsEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-terminal-amber !w-3 !h-3 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!bg-terminal-amber !w-3 !h-3 !border-2 !border-background" />
      
      <div className="drag-handle flex items-center gap-2 px-3 py-2 border-b border-terminal-amber/20 cursor-grab active:cursor-grabbing bg-terminal-amber/5">
        <GripVertical className="w-3 h-3 text-terminal-amber/50" />
        <FileText className="w-4 h-4 text-terminal-amber" />
        {isEditing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            className="flex-1 bg-transparent border-none outline-none text-terminal-amber font-semibold text-sm"
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold text-terminal-amber truncate">{title}</span>
        )}
      </div>
      
      <div className="p-3">
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Escape' && handleBlur()}
            className="w-full min-h-[80px] bg-transparent border-none outline-none resize-none text-foreground/80 text-sm"
            placeholder="Write your note..."
          />
        ) : (
          <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-4">
            {content || 'Double-click to edit...'}
          </p>
        )}
        
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-terminal-amber/10">
            {data.tags.map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-terminal-amber/30 text-terminal-amber">
                <Tag className="w-2 h-2 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-terminal-amber !w-3 !h-3 !border-2 !border-background" />
      <Handle type="source" position={Position.Right} className="!bg-terminal-amber !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
