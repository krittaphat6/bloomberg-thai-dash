import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Bug } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OCRDebuggerProps {
  originalImage: string;
  processedImage: string;
  ocrText: string;
  confidence: number;
}

export const OCRDebugger: React.FC<OCRDebuggerProps> = ({
  originalImage,
  processedImage,
  ocrText,
  confidence
}) => {
  const [showDebug, setShowDebug] = useState(false);
  
  if (!showDebug) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDebug(true)}
        className="text-xs border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10"
      >
        <Bug className="h-3 w-3 mr-1" />
        Debug OCR
      </Button>
    );
  }
  
  return (
    <Card className="mt-4 border-terminal-amber/50 bg-card">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-terminal-amber flex items-center gap-2">
          <Bug className="h-4 w-4" />
          OCR Debug View
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDebug(false)}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Original Image:</p>
            {originalImage ? (
              <img 
                src={originalImage} 
                alt="Original" 
                className="w-full h-48 object-contain border border-border rounded bg-black"
              />
            ) : (
              <div className="w-full h-48 border border-border rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                No original image
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Preprocessed (what OCR sees):</p>
            {processedImage ? (
              <img 
                src={processedImage} 
                alt="Preprocessed" 
                className="w-full h-48 object-contain border border-border rounded bg-white"
              />
            ) : (
              <div className="w-full h-48 border border-border rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                No processed image
              </div>
            )}
          </div>
        </div>
        
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Raw OCR Text (Confidence: {confidence.toFixed(1)}%):
          </p>
          <ScrollArea className="h-48 border border-border rounded bg-muted/50">
            <pre className="text-xs p-3 whitespace-pre-wrap font-mono">
              {ocrText || '(empty - no text detected)'}
            </pre>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default OCRDebugger;
