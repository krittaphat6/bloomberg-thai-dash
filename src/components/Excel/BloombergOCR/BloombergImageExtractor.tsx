import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, RefreshCw, Check, X, AlertTriangle, FileSpreadsheet, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ImageUploadSlot } from './ImageUploadSlot';
import { ResultsPreview } from './ResultsPreview';
import { BloombergProcessor, ExtractedRow, ValidationReport, DebugInfo } from './BloombergProcessor';
import { OCRDebugger } from './OCRDebugger';

interface ImageSlot {
  slot: number;
  file: File | null;
  dataUrl: string;
  status: 'empty' | 'ready' | 'processing' | 'done' | 'error';
  progress: number;
}

interface BloombergImageExtractorProps {
  onInsertData: (data: Record<string, any>) => void;
  onClose: () => void;
}

export const BloombergImageExtractor: React.FC<BloombergImageExtractorProps> = ({
  onInsertData,
  onClose
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadSlot, setCurrentUploadSlot] = useState<number | null>(null);
  
  // Image slots state
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>(
    Array.from({ length: 10 }, (_, i) => ({
      slot: i + 1,
      file: null,
      dataUrl: '',
      status: 'empty' as const,
      progress: 0
    }))
  );
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState({ current: 0, total: 0 });
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Results state
  const [results, setResults] = useState<ExtractedRow[]>([]);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  
  // Stats
  const uploadedCount = imageSlots.filter(s => s.file !== null).length;
  const processedCount = imageSlots.filter(s => s.status === 'done').length;
  
  const handleImageUpload = useCallback((slotIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSlots(prev => prev.map((slot, i) => 
        i === slotIndex 
          ? { ...slot, file, dataUrl: e.target?.result as string, status: 'ready' as const }
          : slot
      ));
    };
    reader.readAsDataURL(file);
  }, []);
  
  const handleImageRemove = useCallback((slotIndex: number) => {
    setImageSlots(prev => prev.map((slot, i) => 
      i === slotIndex 
        ? { slot: i + 1, file: null, dataUrl: '', status: 'empty' as const, progress: 0 }
        : slot
    ));
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUploadSlot !== null) {
      handleImageUpload(currentUploadSlot, file);
    }
    e.target.value = '';
    setCurrentUploadSlot(null);
  };

  const triggerFileInput = (slotIndex: number) => {
    setCurrentUploadSlot(slotIndex);
    fileInputRef.current?.click();
  };
  
  const handleProcessAll = async () => {
    const filesToProcess = imageSlots.filter(s => s.file !== null);
    
    if (filesToProcess.length === 0) {
      toast({
        title: "ไม่มีรูปภาพ",
        description: "กรุณาอัพโหลดรูปภาพ Bloomberg อย่างน้อย 1 รูป",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    setResults([]);
    setValidation(null);
    
    // Update all ready slots to processing
    setImageSlots(prev => prev.map(slot => 
      slot.file ? { ...slot, status: 'processing' as const, progress: 0 } : slot
    ));
    
    try {
      const processor = new BloombergProcessor((progress) => {
        setOverallProgress({ current: progress.current, total: progress.total });
        setProcessingStatus(progress.status);
        
        // Update individual slot progress
        if (progress.currentImage > 0) {
          setImageSlots(prev => prev.map((slot, i) => {
            const slotsWithFiles = prev.filter(s => s.file !== null);
            const currentIndex = progress.currentImage - 1;
            if (slotsWithFiles[currentIndex] && slot.slot === slotsWithFiles[currentIndex].slot) {
              return { ...slot, progress: progress.current };
            }
            return slot;
          }));
        }
      });
      
      const files = filesToProcess.map(s => s.file!);
      const extractedRows = await processor.processMultipleImages(files);
      
      // Mark all as done
      setImageSlots(prev => prev.map(slot => 
        slot.file ? { ...slot, status: 'done' as const, progress: 100 } : slot
      ));
      
      // Validate results
      const validationReport = processor.validateResults(extractedRows);
      
      setResults(extractedRows);
      setValidation(validationReport);
      setActiveTab('preview');
      
      toast({
        title: "ประมวลผลเสร็จสิ้น!",
        description: `พบ ${extractedRows.length} แถว จาก ${filesToProcess.length} รูป`,
      });
      
    } catch (error) {
      console.error('Processing error:', error);
      
      // Mark all as error
      setImageSlots(prev => prev.map(slot => 
        slot.status === 'processing' ? { ...slot, status: 'error' as const } : slot
      ));
      
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };
  
  const handleEditCell = (rowNumber: number, column: string, newValue: string) => {
    setResults(prev => prev.map(row => 
      row.rowNumber === rowNumber
        ? {
            ...row,
            cells: row.cells.map(cell => 
              cell.column === column ? { ...cell, value: newValue, confidence: 1 } : cell
            )
          }
        : row
    ));
    
    // Update validation
    if (validation) {
      setValidation({
        ...validation,
        lowConfidenceCells: validation.lowConfidenceCells.filter(
          c => !(c.row === rowNumber && c.column === column)
        )
      });
    }
  };
  
  const handleInsertToSheet = () => {
    if (results.length === 0) {
      toast({
        title: "ไม่มีข้อมูล",
        description: "กรุณาประมวลผลรูปภาพก่อน",
        variant: "destructive"
      });
      return;
    }
    
    const processor = new BloombergProcessor();
    const excelData = processor.convertToExcelData(results);
    
    onInsertData(excelData);
    
    toast({
      title: "นำเข้าข้อมูลสำเร็จ!",
      description: `เพิ่ม ${results.length} แถว ลงในสเปรดชีต`,
    });
  };
  
  const handleReset = () => {
    setImageSlots(Array.from({ length: 10 }, (_, i) => ({
      slot: i + 1,
      file: null,
      dataUrl: '',
      status: 'empty' as const,
      progress: 0
    })));
    setResults([]);
    setValidation(null);
    setActiveTab('upload');
  };
  
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-[1200px] h-[800px] flex flex-col p-0 gap-0">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-border bg-card">
          <DialogTitle className="flex items-center gap-2 text-terminal-green">
            <Camera className="h-5 w-5 text-terminal-amber" />
            Bloomberg Image to Excel (Tesseract OCR - ฟรี!)
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            แปลงรูปภาพ Bloomberg Terminal เป็นข้อมูลตาราง Excel โดยใช้ OCR
          </p>
        </DialogHeader>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-3 p-3 border-b border-border bg-muted/20">
          <div className="bg-background/50 p-2 rounded border border-border">
            <div className="text-[10px] text-terminal-amber mb-0.5">รูปที่อัพโหลด</div>
            <div className="text-lg font-bold text-foreground">{uploadedCount}</div>
          </div>
          <div className="bg-background/50 p-2 rounded border border-border">
            <div className="text-[10px] text-terminal-amber mb-0.5">ประมวลผลแล้ว</div>
            <div className="text-lg font-bold text-terminal-green">{processedCount}</div>
          </div>
          <div className="bg-background/50 p-2 rounded border border-border">
            <div className="text-[10px] text-terminal-amber mb-0.5">แถวที่พบ</div>
            <div className="text-lg font-bold text-terminal-cyan">{results.length}</div>
          </div>
          <div className="bg-background/50 p-2 rounded border border-border">
            <div className="text-[10px] text-terminal-amber mb-0.5">ต้องตรวจสอบ</div>
            <div className={cn(
              "text-lg font-bold",
              validation?.lowConfidenceCells.length ? "text-terminal-amber" : "text-terminal-green"
            )}>
              {validation?.lowConfidenceCells.length || 0}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-3 mt-2 grid w-[300px] grid-cols-2">
            <TabsTrigger value="upload" className="text-xs">
              📁 อัพโหลดรูป
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs" disabled={results.length === 0}>
              📊 ตัวอย่างผลลัพธ์ {results.length > 0 && `(${results.length})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="flex-1 overflow-auto p-3">
            {/* Upload Instructions */}
            <div className="mb-4 p-3 bg-terminal-cyan/10 border border-terminal-cyan/30 rounded">
              <h3 className="text-sm font-bold text-terminal-cyan mb-1">📁 อัพโหลดรูป Bloomberg (1-10 รูป)</h3>
              <p className="text-xs text-muted-foreground">
                คลิกที่ช่องหรือลากรูปภาพมาวาง • รองรับรูป PNG, JPG • ขนาดแนะนำ: ความกว้างอย่างน้อย 800px
              </p>
            </div>
            
            {/* Image Slots Grid */}
            <div className="grid grid-cols-5 gap-3 justify-items-center">
              {imageSlots.map((slot, index) => (
                <ImageUploadSlot
                  key={slot.slot}
                  slotNumber={slot.slot}
                  image={slot.file}
                  status={slot.status}
                  progress={slot.progress}
                  dataUrl={slot.dataUrl}
                  onUpload={(file) => handleImageUpload(index, file)}
                  onRemove={() => handleImageRemove(index)}
                />
              ))}
            </div>
            
            {/* Processing Progress */}
            {isProcessing && (
              <div className="mt-4 p-3 bg-terminal-amber/10 border border-terminal-amber/30 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-terminal-amber flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังประมวลผล...
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {overallProgress.current}%
                  </span>
                </div>
                <Progress 
                  value={overallProgress.current} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">{processingStatus}</p>
              </div>
            )}
            
            {/* Validation Warnings */}
            {validation && validation.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-terminal-amber/10 border border-terminal-amber/30 rounded">
                <h4 className="text-sm font-bold text-terminal-amber flex items-center gap-1 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  คำเตือน
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {validation.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            {results.length > 0 && validation && (
              <ResultsPreview
                results={results}
                onEdit={handleEditCell}
                lowConfidenceCells={validation.lowConfidenceCells}
              />
            )}
          </TabsContent>
        </Tabs>
        
        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isProcessing}>
              <RefreshCw className="h-4 w-4 mr-1" />
              รีเซ็ต
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              ยกเลิก
            </Button>
            
            {activeTab === 'upload' ? (
              <Button 
                size="sm" 
                onClick={handleProcessAll}
                disabled={isProcessing || uploadedCount === 0}
                className="bg-terminal-amber text-black hover:bg-terminal-amber/90"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    กำลังประมวลผล...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    ประมวลผลทั้งหมด ({uploadedCount})
                  </>
                )}
              </Button>
            ) : (
              <Button 
                size="sm" 
                onClick={handleInsertToSheet}
                disabled={results.length === 0}
                className="bg-terminal-green text-black hover:bg-terminal-green/90"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                นำเข้าสเปรดชีต ({results.length} แถว)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BloombergImageExtractor;
