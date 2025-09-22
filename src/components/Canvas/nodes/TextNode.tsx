import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '../CanvasProvider';

interface TextNodeData {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  editing?: boolean;
}

export function TextNode({ id, data, selected }: NodeProps<TextNodeData>) {
  const { updateNode } = useCanvasStore();
  const [isEditing, setIsEditing] = useState(data.editing || false);
  const [text, setText] = useState(data.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    updateNode(id, { text, editing: false });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setText(data.text || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <Card className={`p-3 min-w-[200px] bg-background border-2 transition-all ${
      selected ? 'border-primary shadow-lg' : 'border-border hover:border-primary/50'
    }`}>
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-primary border-2 border-background"
      />

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-16 resize-none border-0 p-0 focus:ring-0"
            style={{
              fontSize: data.fontSize || 14,
              fontFamily: data.fontFamily || 'inherit',
              textAlign: data.textAlign || 'left'
            }}
          />
          <div className="flex gap-1 justify-end">
            <Button size="sm" onClick={handleSave} className="h-6 px-2 text-xs">
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} className="h-6 px-2 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="cursor-text min-h-16 p-1 rounded"
          onClick={() => setIsEditing(true)}
          style={{
            fontSize: data.fontSize || 14,
            fontFamily: data.fontFamily || 'inherit',
            textAlign: data.textAlign || 'left'
          }}
        >
          {text || 'Click to edit...'}
        </div>
      )}
    </Card>
  );
}