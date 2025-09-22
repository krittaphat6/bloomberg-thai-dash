import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from '@/components/ui/card';
import { Group } from 'lucide-react';

interface GroupNodeData {
  label?: string;
  background?: string;
  backgroundStyle?: 'cover' | 'fit' | 'repeat';
  children?: string[];
}

export function GroupNode({ id, data, selected }: NodeProps<GroupNodeData>) {
  return (
    <Card className={`min-w-[300px] min-h-[200px] bg-background/50 border-2 border-dashed transition-all ${
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

      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Group className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm text-muted-foreground">
            {data.label || 'Group'}
          </span>
        </div>
        
        <div 
          className="w-full h-full min-h-32 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"
          style={{
            backgroundImage: data.background ? `url(${data.background})` : undefined,
            backgroundSize: data.backgroundStyle || 'cover',
            backgroundRepeat: data.backgroundStyle === 'repeat' ? 'repeat' : 'no-repeat',
            backgroundPosition: 'center'
          }}
        >
          <div className="text-xs text-muted-foreground text-center p-4">
            Drop nodes here to group them
            <br />
            <span className="text-xs">{data.children?.length || 0} items</span>
          </div>
        </div>
      </div>
    </Card>
  );
}