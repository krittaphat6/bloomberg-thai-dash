import React, { useState, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GripVertical, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageNodeData {
  url: string;
  alt?: string;
  onChange?: (data: any) => void;
}

export default function ImageNodeV2({ data, selected }: NodeProps<ImageNodeData>) {
  const [url, setUrl] = useState(data.url || '');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newUrl = e.target?.result as string;
        setUrl(newUrl);
        data.onChange?.({ url: newUrl, alt: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div
      className={`min-w-[200px] rounded-lg bg-gradient-to-br from-purple-950/50 to-card/90 backdrop-blur-sm border-2 transition-all duration-200 overflow-hidden ${
        selected 
          ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
          : 'border-purple-500/30 hover:border-purple-500/50'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-background" />
      
      <div className="drag-handle flex items-center gap-2 px-3 py-2 border-b border-purple-500/20 cursor-grab active:cursor-grabbing bg-purple-500/5">
        <GripVertical className="w-3 h-3 text-purple-500/50" />
        <ImageIcon className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium text-purple-500 truncate flex-1">{data.alt || 'Image'}</span>
        {url && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-purple-500/50 hover:text-purple-500"
            onClick={() => {
              setUrl('');
              data.onChange?.({ url: '', alt: '' });
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      <div 
        className={`relative ${!url ? 'p-4' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {url ? (
          <img 
            src={url} 
            alt={data.alt || 'Image'} 
            className="w-full h-auto object-contain max-h-[400px]"
          />
        ) : (
          <div 
            className={`flex flex-col items-center justify-center min-h-[150px] border-2 border-dashed rounded-lg transition-colors ${
              isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-purple-500/30'
            }`}
          >
            <Upload className="w-8 h-8 text-purple-500/50 mb-2" />
            <p className="text-xs text-muted-foreground text-center px-2">
              Drag & drop image<br />or click to upload
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-purple-500"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse
            </Button>
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-background" />
      <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
