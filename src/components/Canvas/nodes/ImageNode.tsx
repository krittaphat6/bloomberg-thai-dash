import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Image, Upload, ExternalLink } from 'lucide-react';

interface ImageNodeData {
  file?: string;
  alt?: string;
  url?: string;
}

export function ImageNode({ id, data, selected }: NodeProps<ImageNodeData>) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const imageUrl = data.url || data.file;
  const hasImage = imageUrl && !imageError;

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

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

      <CardContent className="p-3">
        {hasImage ? (
          <div className="space-y-2">
            <div className="relative">
              <img
                src={imageUrl}
                alt={data.alt || 'Canvas image'}
                className="w-full h-auto max-h-48 object-cover rounded"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
            
            {data.alt && (
              <p className="text-xs text-muted-foreground">
                {data.alt}
              </p>
            )}
            
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs flex-1"
                onClick={() => window.open(imageUrl, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-32 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
              <div className="text-center">
                <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  No image loaded
                </p>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              className="w-full h-6 text-xs"
            >
              <Upload className="h-3 w-3 mr-1" />
              Upload Image
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}