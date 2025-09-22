import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Star, Calendar } from 'lucide-react';

interface FileNodeData {
  file: string;
  subpath?: string;
  preview?: boolean;
  note?: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    updatedAt: Date;
    isFavorite: boolean;
  };
}

export function FileNode({ id, data, selected }: NodeProps<FileNodeData>) {
  const { note } = data;

  return (
    <Card className={`w-64 bg-background border-2 transition-all ${
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

      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm truncate">
              {note?.title || 'Unknown Note'}
            </span>
          </div>
          {note?.isFavorite && (
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
          )}
        </div>
      </CardHeader>

      {data.preview && note && (
        <CardContent className="p-3 pt-0">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground line-clamp-3">
              {note.content.slice(0, 120)}...
            </p>
            
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {note.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs h-5">
                    #{tag}
                  </Badge>
                ))}
                {note.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs h-5">
                    +{note.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {note.updatedAt.toLocaleDateString()}
            </div>
          </div>
          
          {data.subpath && (
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
              <span className="text-muted-foreground">Section: </span>
              <span className="font-medium">{data.subpath}</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}