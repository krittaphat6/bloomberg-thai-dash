import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, RefreshCw, Check, X, AlertTriangle, FileSpreadsheet, Upload, Loader2, Bug, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ImageUploadSlot } from './ImageUploadSlot';
import { ResultsPreview } from './ResultsPreview';
import { BloombergOCREngine, ParsedBloombergRow, BloombergOCRResult } from './BloombergOCREngine';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImageSlot {
  slot: number;
  file: File | null;
  dataUrl: string;
  status: 'empty' | 'ready' | 'processing' | 'done' | 'error';
  progress: number;
  processedImageUrl?: string;
  rawText?: string;
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
  const [activeTab, setActiveTab] = useState<'upload' | 'preview' | 'debug'>('upload');
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
  const [overallProgress, setOverallProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Results state
  const [results, setResults] = useState<ParsedBloombergRow[]>([]);
  const [rawOCRText, setRawOCRText] = useState<string>('');
  const [debugImageUrl, setDebugImageUrl] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState(0);
  
  // Stats
  const uploadedCount = imageSlots.filter(s => s.file !== null).length;
  const processedCount = imageSlots.filter(s => s.status === 'done').length;
  const lowConfidenceCells = results.filter(r => r.confidence < 0.5).map((r, idx) => ({
    row: idx,
    column: 'security',
    value: r.security,
    confidence: r.confidence
  }));
  
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
    setRawOCRText('');
    setDebugImageUrl('');
    
    // Update all ready slots to processing
    setImageSlots(prev => prev.map(slot => 
      slot.file ? { ...slot, status: 'processing' as const, progress: 0 } : slot
    ));
    
    try {
      const engine = new BloombergOCREngine();
      const allRows: ParsedBloombergRow[] = [];
      let allRawText = '';
      let lastDebugUrl = '';
      let totalConfidence = 0;
      
      for (let i = 0; i < filesToProcess.length; i++) {
        const slot = filesToProcess[i];
        setProcessingStatus(`กำลังประมวลผลรูปที่ ${i + 1}/${filesToProcess.length}...`);
        
        const result = await engine.processImage(slot.file!, (progress) => {
          const overallPct = Math.round(((i + progress.progress / 100) / filesToProcess.length) * 100);
          setOverallProgress(overallPct);
          setProcessingStatus(progress.message);
          
          // Update individual slot
          setImageSlots(prev => prev.map((s, idx) => 
            s.slot === slot.slot ? { ...s, progress: progress.progress } : s
          ));
        });
        
        allRows.push(...result.rows);
        allRawText += `\n--- รูปที่ ${i + 1} (ความแม่นยำ: ${Math.round(result.confidence)}%) ---\n${result.text}\n`;
        lastDebugUrl = result.debugImageUrl || '';
        totalConfidence += result.confidence;
        
        // Mark slot as done
        setImageSlots(prev => prev.map(s => 
          s.slot === slot.slot 
            ? { ...s, status: 'done' as const, progress: 100, processedImageUrl: result.processedImageUrl, rawText: result.text } 
            : s
        ));
      }
      
      setResults(allRows);
      setRawOCRText(allRawText);
      setDebugImageUrl(lastDebugUrl);
      setOcrConfidence(Math.round(totalConfidence / filesToProcess.length));
      setActiveTab('preview');
      
      toast({
        title: "ประมวลผลเสร็จสิ้น!",
        description: `พบ ${allRows.length} แถว จาก ${filesToProcess.length} รูป (ความแม่นยำเฉลี่ย: ${Math.round(totalConfidence / filesToProcess.length)}%)`,
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
  
  const handleEditCell = (rowIdx: number, column: string, newValue: string) => {
    setResults(prev => prev.map((row, idx) => 
      idx === rowIdx
        ? { ...row, [column]: newValue, confidence: 1 }
        : row
    ));
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
    
    const excelData = BloombergOCREngine.toExcelData(results);
    
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
    setRawOCRText('');
    setDebugImageUrl('');
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
            Bloomberg OCR Engine (Enhanced)
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            แปลงรูปภาพ Bloomberg Terminal เป็นข้อมูลตาราง Excel - ปรับปรุงใหม่สำหรับภาพถ่ายหน้าจอ
          </p>
        </DialogHeader>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-5 gap-3 p-3 border-b border-border bg-muted/20">
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
            <div className="text-[10px] text-terminal-amber mb-0.5">ความแม่นยำ OCR</div>
            <div className={cn(
              "text-lg font-bold",
              ocrConfidence >= 70 ? "text-terminal-green" : ocrConfidence >= 50 ? "text-terminal-amber" : "text-destructive"
            )}>
              {ocrConfidence}%
            </div>
          </div>
          <div className="bg-background/50 p-2 rounded border border-border">
            <div className="text-[10px] text-terminal-amber mb-0.5">ต้องตรวจสอบ</div>
            <div className={cn(
              "text-lg font-bold",
              lowConfidenceCells.length > 0 ? "text-terminal-amber" : "text-terminal-green"
            )}>
              {lowConfidenceCells.length}
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-3 mt-2 grid w-[450px] grid-cols-3">
            <TabsTrigger value="upload" className="text-xs">
              📁 อัพโหลดรูป
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs" disabled={results.length === 0}>
              📊 ผลลัพธ์ {results.length > 0 && `(${results.length})`}
            </TabsTrigger>
            <TabsTrigger value="debug" className="text-xs" disabled={!rawOCRText}>
              🔧 Debug OCR
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="flex-1 overflow-auto p-3">
            {/* Upload Instructions */}
            <div className="mb-4 p-3 bg-terminal-cyan/10 border border-terminal-cyan/30 rounded">
              <h3 className="text-sm font-bold text-terminal-cyan mb-1">📁 อัพโหลดรูป Bloomberg (1-10 รูป)</h3>
              <p className="text-xs text-muted-foreground">
                คลิกที่ช่องหรือลากรูปภาพมาวาง • รองรับรูป PNG, JPG • ใช้ได้กับภาพถ่ายหน้าจอและ screenshot
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
                    {overallProgress}%
                  </span>
                </div>
                <Progress 
                  value={overallProgress} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">{processingStatus}</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            {results.length > 0 && (
              <ResultsPreview
                results={results}
                onEdit={handleEditCell}
                lowConfidenceCells={lowConfidenceCells}
              />
            )}
          </TabsContent>
          
          <TabsContent value="debug" className="flex-1 overflow-hidden p-3">
            <div className="h-full flex flex-col gap-3">
              <div className="text-sm font-bold text-terminal-amber flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Debug OCR - ดู Raw Text และ Processed Image
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
                {/* Processed Image */}
                <div className="flex flex-col border border-border rounded overflow-hidden">
                  <div className="px-2 py-1 bg-muted text-xs font-bold border-b border-border">
                    Processed Image (What OCR Sees)
                  </div>
                  <div className="flex-1 overflow-auto p-2 bg-white">
                    {debugImageUrl && (
                      <img src={debugImageUrl} alt="Processed" className="max-w-full" />
                    )}
                  </div>
                </div>
                
                {/* Raw OCR Text */}
                <div className="flex flex-col border border-border rounded overflow-hidden">
                  <div className="px-2 py-1 bg-muted text-xs font-bold border-b border-border">
                    Raw OCR Text (ความแม่นยำ: {ocrConfidence}%)
                  </div>
                  <ScrollArea className="flex-1 p-2">
                    <pre className="text-[10px] whitespace-pre-wrap font-mono text-muted-foreground">
                      {rawOCRText || 'ยังไม่มีข้อมูล'}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
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
                    <Eye className="h-4 w-4 mr-1" />
                    ประมวลผล OCR ({uploadedCount})
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
