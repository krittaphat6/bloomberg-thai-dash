import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GripVertical, Link as LinkIcon, ExternalLink, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LinkNodeData {
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
  onChange?: (data: any) => void;
}

export default function LinkNode({ data, selected }: NodeProps<LinkNodeData>) {
  const [inputUrl, setInputUrl] = useState(data.url || '');
  const [linkData, setLinkData] = useState({
    url: data.url || '',
    title: data.title || '',
    description: data.description || '',
    favicon: data.favicon || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!inputUrl) return;
    
    setIsLoading(true);
    try {
      // Extract domain for favicon
      const urlObj = new URL(inputUrl);
      const domain = urlObj.hostname;
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      
      const newData = {
        url: inputUrl,
        title: domain,
        description: inputUrl,
        favicon
      };
      
      setLinkData(newData);
      data.onChange?.(newData);
    } catch (e) {
      // Invalid URL
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-w-[280px] rounded-lg bg-gradient-to-br from-blue-950/50 to-card/90 backdrop-blur-sm border-2 transition-all duration-200 ${
        selected 
          ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
          : 'border-blue-500/30 hover:border-blue-500/50'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background" />
      
      <div className="drag-handle flex items-center gap-2 px-3 py-2 border-b border-blue-500/20 cursor-grab active:cursor-grabbing bg-blue-500/5">
        <GripVertical className="w-3 h-3 text-blue-500/50" />
        <LinkIcon className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-blue-500">Link</span>
      </div>
      
      {linkData.url ? (
        <a
          href={linkData.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 hover:bg-blue-500/5 transition-colors group"
        >
          <div className="flex items-start gap-3">
            {linkData.favicon ? (
              <img src={linkData.favicon} alt="" className="w-8 h-8 rounded" />
            ) : (
              <Globe className="w-8 h-8 text-blue-500/50" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">{linkData.title}</span>
                <ExternalLink className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">{linkData.url}</p>
            </div>
          </div>
        </a>
      ) : (
        <div className="p-3">
          <div className="flex gap-2">
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 bg-background/50 border-blue-500/30 focus:border-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <Button
              size="sm"
              className="bg-blue-500 hover:bg-blue-600"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? '...' : <LinkIcon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background" />
      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
