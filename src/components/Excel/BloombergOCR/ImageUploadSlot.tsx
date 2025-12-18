import React, { useCallback } from 'react';
import { Upload, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadSlotProps {
  slotNumber: number;
  image: File | null;
  status: 'empty' | 'ready' | 'processing' | 'done' | 'error';
  progress?: number;
  onUpload: (file: File) => void;
  onRemove: () => void;
  dataUrl?: string;
}

export const ImageUploadSlot: React.FC<ImageUploadSlotProps> = ({
  slotNumber,
  image,
  status,
  progress = 0,
  onUpload,
  onRemove,
  dataUrl
}) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onUpload(file);
    }
  }, [onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  }, [onUpload]);

  const statusConfig = {
    empty: {
      border: 'border-border border-dashed',
      bg: 'bg-background/30',
      icon: <Upload className="h-6 w-6 text-muted-foreground" />,
      text: 'ว่าง',
      textColor: 'text-muted-foreground'
    },
    ready: {
      border: 'border-terminal-cyan border-solid',
      bg: 'bg-terminal-cyan/10',
      icon: <CheckCircle className="h-4 w-4 text-terminal-cyan" />,
      text: 'พร้อม',
      textColor: 'text-terminal-cyan'
    },
    processing: {
      border: 'border-terminal-amber border-solid',
      bg: 'bg-terminal-amber/10',
      icon: <Loader2 className="h-4 w-4 text-terminal-amber animate-spin" />,
      text: 'กำลังประมวลผล',
      textColor: 'text-terminal-amber'
    },
    done: {
      border: 'border-terminal-green border-solid',
      bg: 'bg-terminal-green/10',
      icon: <CheckCircle className="h-4 w-4 text-terminal-green" />,
      text: 'เสร็จสิ้น',
      textColor: 'text-terminal-green'
    },
    error: {
      border: 'border-destructive border-solid',
      bg: 'bg-destructive/10',
      icon: <AlertCircle className="h-4 w-4 text-destructive" />,
      text: 'ผิดพลาด',
      textColor: 'text-destructive'
    }
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'relative w-[150px] h-[120px] rounded border-2 transition-all duration-200',
        config.border,
        config.bg,
        status === 'empty' && 'hover:border-terminal-cyan hover:bg-terminal-cyan/5 cursor-pointer'
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Slot Number */}
      <div className="absolute top-1 left-2 text-[10px] text-terminal-amber font-bold">
        ช่อง {slotNumber}
      </div>

      {/* Remove Button */}
      {image && status !== 'processing' && (
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 p-0.5 rounded bg-background/80 hover:bg-destructive/20 transition-colors z-10"
        >
          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </button>
      )}

      {/* Content */}
      <div className="flex flex-col items-center justify-center h-full pt-4">
        {image && dataUrl ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <img 
              src={dataUrl} 
              alt={`Slot ${slotNumber}`}
              className="max-w-[130px] max-h-[70px] object-contain rounded"
            />
            {/* Progress bar for processing */}
            {status === 'processing' && progress > 0 && (
              <div className="absolute bottom-8 left-2 right-2">
                <div className="h-1 bg-background/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-terminal-amber transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {config.icon}
            <span className="text-[10px] text-muted-foreground mt-2">
              คลิกหรือลาก
            </span>
          </>
        )}
      </div>

      {/* Status Badge */}
      <div className={cn(
        'absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium',
        config.bg
      )}>
        {status !== 'empty' && config.icon}
        <span className={config.textColor}>{config.text}</span>
      </div>

      {/* Hidden file input */}
      {status === 'empty' && (
        <label className="absolute inset-0 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
};

export default ImageUploadSlot;
