import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GripVertical, Video, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface VideoNodeData {
  url: string;
  platform?: 'youtube' | 'vimeo';
  onChange?: (data: any) => void;
}

function getEmbedUrl(url: string): { embedUrl: string; platform: string } | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return { embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`, platform: 'youtube' };
  }
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`, platform: 'vimeo' };
  }
  
  return null;
}

export default function VideoNode({ data, selected }: NodeProps<VideoNodeData>) {
  const [inputUrl, setInputUrl] = useState(data.url || '');
  const [embedData, setEmbedData] = useState(() => data.url ? getEmbedUrl(data.url) : null);

  const handleSubmit = () => {
    const result = getEmbedUrl(inputUrl);
    if (result) {
      setEmbedData(result);
      data.onChange?.({ url: inputUrl, platform: result.platform });
    }
  };

  return (
    <div
      className={`min-w-[400px] rounded-lg bg-gradient-to-br from-red-950/50 to-card/90 backdrop-blur-sm border-2 transition-all duration-200 overflow-hidden ${
        selected 
          ? 'border-red-500 shadow-lg shadow-red-500/20' 
          : 'border-red-500/30 hover:border-red-500/50'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3 !h-3 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!bg-red-500 !w-3 !h-3 !border-2 !border-background" />
      
      <div className="drag-handle flex items-center gap-2 px-3 py-2 border-b border-red-500/20 cursor-grab active:cursor-grabbing bg-red-500/5">
        <GripVertical className="w-3 h-3 text-red-500/50" />
        <Video className="w-4 h-4 text-red-500" />
        <span className="text-sm font-medium text-red-500">Video</span>
      </div>
      
      {embedData ? (
        <div className="aspect-video">
          <iframe
            src={embedData.embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="p-4">
          <div className="flex gap-2">
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Paste YouTube or Vimeo URL..."
              className="flex-1 bg-background/50 border-red-500/30 focus:border-red-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600"
              onClick={handleSubmit}
            >
              <Link className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Supports YouTube & Vimeo
          </p>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-red-500 !w-3 !h-3 !border-2 !border-background" />
      <Handle type="source" position={Position.Right} className="!bg-red-500 !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
