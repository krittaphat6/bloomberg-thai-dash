import React, { useState } from 'react';
import { AlertTriangle, Check, Edit2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ParsedBloombergRow } from './BloombergOCREngine';

interface ResultsPreviewProps {
  results: ParsedBloombergRow[];
  onEdit: (rowIndex: number, column: string, newValue: string) => void;
  lowConfidenceCells: Array<{
    row: number;
    column: string;
    value: string;
    confidence: number;
  }>;
}

export const ResultsPreview: React.FC<ResultsPreviewProps> = ({
  results,
  onEdit,
  lowConfidenceCells
}) => {
  const [editingCell, setEditingCell] = useState<{ row: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredCell, setHoveredCell] = useState<{ row: number; column: string } | null>(null);

  const columns = [
    { key: 'rank', label: 'Rk' },
    { key: 'security', label: 'Security' },
    { key: 'ticker', label: 'Ticker' },
    { key: 'source', label: 'Source' },
    { key: 'position', label: 'Position' },
    { key: 'posChg', label: 'Pos Chg' },
    { key: 'pctOut', label: '% Out' },
    { key: 'currMV', label: 'Curr MV' },
    { key: 'filingDate', label: 'Filing Date' }
  ];

  const isLowConfidence = (rowIdx: number, column: string): boolean => {
    return lowConfidenceCells.some(c => c.row === rowIdx && c.column === column);
  };

  const getConfidence = (rowIdx: number, column: string): number | undefined => {
    const cell = lowConfidenceCells.find(c => c.row === rowIdx && c.column === column);
    return cell?.confidence;
  };

  const handleStartEdit = (rowIdx: number, column: string, currentValue: string) => {
    setEditingCell({ row: rowIdx, column });
    setEditValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      onEdit(editingCell.row, editingCell.column, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const getCellValue = (row: ParsedBloombergRow, key: string): string => {
    return (row as any)[key] || '';
  };

  const getCellColor = (row: ParsedBloombergRow, key: string): string => {
    const value = getCellValue(row, key);
    
    // Color positive/negative values
    if (key === 'posChg') {
      if (value.startsWith('+')) return 'text-terminal-green';
      if (value.startsWith('-')) return 'text-destructive';
    }
    
    return 'text-foreground';
  };

  // Calculate stats
  const totalCells = results.length * columns.length;
  const avgConfidence = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.confidence, 0) / results.length * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Stats Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-terminal-amber">
            แสดง {Math.min(results.length, 50)} จาก {results.length} แถว
          </span>
          <span className="text-terminal-cyan">
            • {avgConfidence}% ความแม่นยำเฉลี่ย
          </span>
          {lowConfidenceCells.length > 0 && (
            <span className="text-terminal-amber flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {lowConfidenceCells.length} เซลล์ต้องตรวจสอบ
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <div className="min-w-[900px]">
          {/* Table Header */}
          <div className="grid grid-cols-9 gap-1 px-2 py-2 bg-terminal-amber/10 border-b border-border sticky top-0">
            {columns.map(col => (
              <div 
                key={col.key} 
                className="text-[10px] font-bold text-terminal-amber truncate px-1"
              >
                {col.label}
              </div>
            ))}
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border/30">
            {results.slice(0, 50).map((row, rowIdx) => (
              <div 
                key={rowIdx}
                className="grid grid-cols-9 gap-1 px-2 py-1.5 hover:bg-muted/30 transition-colors"
              >
                {columns.map(({ key, label }) => {
                  const value = getCellValue(row, key);
                  const isEditing = editingCell?.row === rowIdx && editingCell?.column === key;
                  const isLow = isLowConfidence(rowIdx, key);
                  const confidence = getConfidence(rowIdx, key);
                  const isHovered = hoveredCell?.row === rowIdx && hoveredCell?.column === key;
                  
                  return (
                    <div
                      key={key}
                      className={cn(
                        'relative text-[11px] px-1 py-0.5 rounded truncate',
                        isLow && 'bg-terminal-amber/20 border border-terminal-amber/30',
                        !isLow && 'hover:bg-muted/50',
                        getCellColor(row, key)
                      )}
                      onMouseEnter={() => setHoveredCell({ row: rowIdx, column: key })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onDoubleClick={() => handleStartEdit(rowIdx, key, value)}
                      title={value}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-5 text-[11px] px-1 py-0"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={handleSaveEdit}>
                            <Check className="h-3 w-3 text-terminal-green" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={handleCancelEdit}>
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="truncate">{value || '-'}</span>
                          
                          {/* Confidence tooltip */}
                          {isHovered && isLow && confidence !== undefined && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-background border border-border rounded text-[10px] whitespace-nowrap z-10">
                              <span className="text-terminal-amber">
                                ความแม่นยำ: {Math.round(confidence * 100)}%
                              </span>
                            </div>
                          )}
                          
                          {/* Edit hint on hover */}
                          {isHovered && !isLow && (
                            <Edit2 className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground opacity-50" />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* More rows indicator */}
          {results.length > 50 && (
            <div className="text-center py-2 text-xs text-muted-foreground border-t border-border">
              ... และอีก {results.length - 50} แถว
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ResultsPreview;
