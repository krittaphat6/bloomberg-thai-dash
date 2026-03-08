import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, CheckCircle, Download, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Papa from 'papaparse';

interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'CFD' | 'STOCK';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  lotSize?: number;
  contractSize?: number;
  leverage?: number;
  pnl?: number;
  pnlPercentage?: number;
  status: 'OPEN' | 'CLOSED';
  strategy: string;
  notes?: string;
  tags?: string[];
  commission?: number;
  swap?: number;
  dividends?: number;
  mfe?: number;
  mae?: number;
  mfePercent?: number;
  maePercent?: number;
  entryTime?: string;
  exitTime?: string;
}

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (trades: Trade[], replaceMode?: boolean) => void;
  existingTrades: Trade[];
  targetFolderId?: string;
}

interface ImportStep {
  step: 'upload' | 'preview' | 'mapping' | 'validation' | 'import';
  completed: boolean;
}

interface ColumnMapping {
  csvColumn: string;
  tradeField: keyof Trade | '';
  sampleValue: string;
}

// ABLE v3.1 format headers
const ABLE_V3_HEADERS = [
  'เทรด #', 'ประเภท', 'วันที่ และ เวลา', 'สัญญาณ', 'ราคา USD',
  'ขนาดของสถานะ (ปริมาณ)', 'ขนาดของสถานะ (มูลค่า)',
  'P&L สุทธิ USD', 'P&L สุทธิ %',
  'Favorable excursion USD', 'Favorable excursion %',
  'Adverse excursion USD', 'Adverse excursion %',
  'P&L สะสม USD', 'P&L สะสม %'
];

// Thai OANDA mapping (old format)
const THAI_OANDA_MAPPING: Record<string, string> = {
  'ซื้อขาย #': 'id',
  'ประเภท': 'side',
  'วัน/เวลา': 'date',
  'สัญญาณ': 'symbol',
  'ราคา USD': 'entryPrice',
  'ขนาดของสถานะ (ปริมาณ)': 'quantity',
  'ขนาดของสถานะ (มูลค่า)': 'lotSize',
  'P&L สุทธิ USD': 'pnl',
  'P&L สุทธิ %': 'pnlPercentage',
};

const TRADE_FIELD_OPTIONS = [
  { value: 'id', label: 'Trade ID' },
  { value: 'date', label: 'Date' },
  { value: 'symbol', label: 'Symbol' },
  { value: 'side', label: 'Side (LONG/SHORT)' },
  { value: 'type', label: 'Type (CFD/STOCK)' },
  { value: 'entryPrice', label: 'Entry Price' },
  { value: 'exitPrice', label: 'Exit Price' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'lotSize', label: 'Lot Size' },
  { value: 'leverage', label: 'Leverage' },
  { value: 'pnl', label: 'P&L' },
  { value: 'pnlPercentage', label: 'P&L %' },
  { value: 'status', label: 'Status' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'commission', label: 'Commission' },
  { value: 'swap', label: 'Swap' },
  { value: 'notes', label: 'Notes' }
];

export default function CSVImportDialog({ open, onOpenChange, onImport, existingTrades, targetFolderId }: CSVImportDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<ImportStep['step']>('upload');
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [fullCsvData, setFullCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedTrades, setParsedTrades] = useState<Trade[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [conflicts, setConflicts] = useState<{ existing: Trade; new: Trade }[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<'able_v3' | 'thai_oanda' | 'generic'>('generic');

  useEffect(() => {
    if (currentStep === 'preview' && fullCsvData.length > 0 && parsedTrades.length === 0) {
      autoProcessData();
    }
  }, [currentStep, fullCsvData.length, parsedTrades.length]);

  const steps: ImportStep[] = [
    { step: 'upload', completed: currentStep !== 'upload' },
    { step: 'preview', completed: ['mapping', 'validation', 'import'].includes(currentStep) },
    { step: 'mapping', completed: ['validation', 'import'].includes(currentStep) },
    { step: 'validation', completed: currentStep === 'import' },
    { step: 'import', completed: false }
  ];

  const detectFormat = (headers: string[]): 'able_v3' | 'thai_oanda' | 'generic' => {
    // Check for ABLE v3.1 format (has 'เทรด #' and 'Favorable excursion')
    if (headers.some(h => h.includes('เทรด #')) && headers.some(h => h.includes('Favorable excursion'))) {
      return 'able_v3';
    }
    // Check for Thai OANDA format  
    if (headers.some(h => h.includes('ซื้อขาย #') || h === 'วัน/เวลา')) {
      return 'thai_oanda';
    }
    return 'generic';
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({ title: "Invalid File", description: "Please upload a CSV file", variant: "destructive" });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({ title: "Parse Error", description: "Error parsing CSV file", variant: "destructive" });
          return;
        }
        const headers = results.meta.fields || [];
        const data = results.data as Record<string, string>[];
        const format = detectFormat(headers);
        
        setCsvHeaders(headers);
        setCsvData(data.slice(0, 10));
        setFullCsvData(data);
        setDetectedFormat(format);
        
        // Auto-create mappings
        const mappings: ColumnMapping[] = headers.map(header => {
          const thaiMapping = THAI_OANDA_MAPPING[header];
          return {
            csvColumn: header,
            tradeField: (thaiMapping as keyof Trade) || '',
            sampleValue: String(data[0]?.[header] || '')
          };
        });
        setColumnMappings(mappings);
        setCurrentStep('preview');
        
        toast({ title: "File Uploaded", description: `Loaded ${data.length} rows • Format: ${format === 'able_v3' ? 'ABLE v3.1' : format === 'thai_oanda' ? 'Thai OANDA' : 'Generic'}` });
      }
    });
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    if (csvFile) {
      const event = { target: { files: [csvFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(event);
    }
  }, [handleFileUpload]);

  const updateColumnMapping = (csvColumn: string, tradeField: keyof Trade | '') => {
    setColumnMappings(prev => prev.map(mapping => mapping.csvColumn === csvColumn ? { ...mapping, tradeField } : mapping));
  };

  /** Process ABLE v3.1 format: paired rows (entry + exit per trade) */
  const processAbleV3Format = () => {
    const trades: Trade[] = [];
    const tradeMap = new Map<string, { entry?: Record<string, string>; exit?: Record<string, string> }>();
    
    fullCsvData.forEach(row => {
      const tradeNum = row['เทรด #']?.trim();
      const type = row['ประเภท']?.trim() || '';
      if (!tradeNum) return;
      
      if (!tradeMap.has(tradeNum)) tradeMap.set(tradeNum, {});
      const pair = tradeMap.get(tradeNum)!;
      
      if (type.includes('การเข้าสถานะ') || type.includes('เข้าสถานะ')) {
        pair.entry = row;
      } else if (type.includes('ออกจากสถานะ') || type.includes('ออก')) {
        pair.exit = row;
      }
    });
    
    tradeMap.forEach((pair, tradeNum) => {
      const entry = pair.entry;
      const exit = pair.exit;
      if (!entry) return; // Need at least entry
      
      const typeStr = entry['ประเภท'] || '';
      const side: 'LONG' | 'SHORT' = (typeStr.includes('Long') || typeStr.includes('ซื้อ')) ? 'LONG' : 'SHORT';
      
      const entryPrice = parseFloat(entry['ราคา USD']) || 0;
      const exitPrice = exit ? (parseFloat(exit['ราคา USD']) || 0) : undefined;
      const quantity = parseFloat(entry['ขนาดของสถานะ (ปริมาณ)']) || 1;
      const positionValue = parseFloat(entry['ขนาดของสถานะ (มูลค่า)']) || 0;
      
      // Use exit row for P&L since it has the final values
      const pnlRow = exit || entry;
      const pnl = parseFloat(pnlRow['P&L สุทธิ USD']) || 0;
      const pnlPct = parseFloat(pnlRow['P&L สุทธิ %']) || 0;
      
      const mfe = parseFloat(pnlRow['Favorable excursion USD']) || undefined;
      const mfePct = parseFloat(pnlRow['Favorable excursion %']) || undefined;
      const mae = parseFloat(pnlRow['Adverse excursion USD']) || undefined;
      const maePct = parseFloat(pnlRow['Adverse excursion %']) || undefined;
      
      const entryDateTime = entry['วันที่ และ เวลา'] || '';
      const exitDateTime = exit ? (exit['วันที่ และ เวลา'] || '') : '';
      const dateStr = entryDateTime.split(' ')[0] || '';
      
      // Extract symbol from signal field
      const signal = entry['สัญญาณ'] || '';
      // Signal looks like "Short 0.27 lots" or "Long 0.28 lots" - symbol comes from filename/context
      // Since symbol isn't in the data, we'll use the filename or default
      let symbol = 'BTCUSD'; // Default, will be overridden if available
      
      if (entryPrice > 0 && dateStr) {
        trades.push({
          id: `able-${Date.now()}-${tradeNum}`,
          date: dateStr,
          symbol,
          side,
          type: 'CFD',
          entryPrice,
          exitPrice,
          quantity,
          lotSize: positionValue,
          pnl: exit ? pnl : undefined,
          pnlPercentage: exit ? pnlPct : undefined,
          status: exit ? 'CLOSED' : 'OPEN',
          strategy: 'ABLE v3.1 Import',
          leverage: 1,
          contractSize: 1,
          mfe,
          mae,
          mfePercent: mfePct,
          maePercent: maePct,
          entryTime: entryDateTime,
          exitTime: exitDateTime || undefined,
        });
      }
    });
    
    return trades;
  };

  /** Process Thai OANDA format */
  const processThaiOandaFormat = () => {
    const trades: Trade[] = [];
    fullCsvData.forEach((row, index) => {
      try {
        const trade: Trade = {
          id: `oanda-${Date.now()}-${index}`,
          date: row['วัน/เวลา'] ? row['วัน/เวลา'].split(' ')[0] : '',
          symbol: row['สัญญาณ'] === 'XAU' ? 'XAUUSD' : (row['สัญญาณ'] || 'UNKNOWN') + (row['สัญญาณ'] && !row['สัญญาณ'].includes('USD') ? 'USD' : ''),
          side: row['ประเภท'] && (row['ประเภท'].includes('ซื้อ') || row['ประเภท'].includes('Long')) ? 'LONG' : 'SHORT',
          type: 'CFD',
          entryPrice: parseFloat(row['ราคา USD']) || 0,
          quantity: parseInt(row['ขนาดของสถานะ (ปริมาณ)']) || 1,
          lotSize: parseFloat(row['ขนาดของสถานะ (มูลค่า)']) || 1,
          pnl: parseFloat(row['P&L สุทธิ USD']) || 0,
          pnlPercentage: parseFloat(row['P&L สุทธิ %']) || 0,
          status: 'CLOSED',
          strategy: 'OANDA Import',
        };
        if (!trade.exitPrice && trade.entryPrice && trade.quantity && trade.pnl) {
          trade.exitPrice = trade.side === 'LONG' 
            ? trade.entryPrice + (trade.pnl / trade.quantity)
            : trade.entryPrice - (trade.pnl / trade.quantity);
        }
        if (trade.symbol && trade.date && trade.entryPrice > 0) trades.push(trade);
      } catch (e) { console.error('Row error:', e); }
    });
    return trades;
  };

  /** Process generic CSV using column mappings */
  const processGenericFormat = () => {
    const trades: Trade[] = [];
    fullCsvData.forEach((row, index) => {
      try {
        const trade: Partial<Trade> = { id: `imported-${Date.now()}-${index}`, status: 'CLOSED', strategy: 'Imported', type: 'CFD' };
        columnMappings.forEach(mapping => {
          if (mapping.tradeField && row[mapping.csvColumn] !== undefined && row[mapping.csvColumn] !== '') {
            const value = row[mapping.csvColumn];
            switch (mapping.tradeField) {
              case 'date':
                let dateValue: Date;
                if (value.includes('/')) {
                  const [day, month, year] = value.split('/');
                  dateValue = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else dateValue = new Date(value);
                if (!isNaN(dateValue.getTime())) trade.date = dateValue.toISOString().split('T')[0];
                break;
              case 'side':
                if (value.includes('ซื้อ') || value.includes('Long') || value.toUpperCase().includes('BUY')) trade.side = 'LONG';
                else if (value.includes('ขาย') || value.includes('Short') || value.toUpperCase().includes('SELL')) trade.side = 'SHORT';
                break;
              case 'symbol':
                let symbol = String(value).toUpperCase().trim();
                if (symbol.includes('XAU') && !symbol.includes('USD')) symbol = 'XAUUSD';
                trade.symbol = symbol;
                break;
              case 'entryPrice': case 'exitPrice': case 'quantity': case 'pnl': case 'pnlPercentage':
              case 'commission': case 'swap': case 'leverage': case 'lotSize':
                const numValue = parseFloat(String(value).replace(/[,\s]/g, ''));
                if (!isNaN(numValue)) (trade as Record<string, unknown>)[mapping.tradeField] = numValue;
                break;
              default:
                (trade as Record<string, unknown>)[mapping.tradeField] = String(value);
            }
          }
        });
        if (trade.pnl !== undefined && !trade.exitPrice && trade.entryPrice && trade.quantity) {
          trade.exitPrice = trade.side === 'LONG'
            ? trade.entryPrice + (trade.pnl / trade.quantity)
            : trade.entryPrice - (trade.pnl / trade.quantity);
        }
        if (trade.symbol && trade.date && trade.side && trade.entryPrice) trades.push(trade as Trade);
      } catch (e) { console.error('Row error:', e); }
    });
    return trades;
  };

  const autoProcessData = () => {
    let trades: Trade[] = [];
    
    if (detectedFormat === 'able_v3') {
      trades = processAbleV3Format();
    } else if (detectedFormat === 'thai_oanda') {
      trades = processThaiOandaFormat();
    } else {
      trades = processGenericFormat();
    }
    
    // Check conflicts
    const newConflicts: { existing: Trade; new: Trade }[] = [];
    const cleanTrades: Trade[] = [];
    trades.forEach(trade => {
      const existing = existingTrades.find(t => t.symbol === trade.symbol && t.date === trade.date && Math.abs((t.entryPrice || 0) - (trade.entryPrice || 0)) < 0.01);
      if (existing) newConflicts.push({ existing, new: trade });
      else cleanTrades.push(trade);
    });
    
    setParsedTrades(cleanTrades);
    setConflicts(newConflicts);
    toast({ title: "Data Processed", description: `Found ${cleanTrades.length} valid trades (${detectedFormat === 'able_v3' ? 'ABLE v3.1' : detectedFormat === 'thai_oanda' ? 'Thai OANDA' : 'Generic'} format)` });
  };

  const handleNextStep = () => {
    if (currentStep === 'preview') {
      if (parsedTrades.length === 0) autoProcessData();
      // For known formats, skip mapping and go to validation
      if (detectedFormat === 'able_v3' || detectedFormat === 'thai_oanda') {
        setCurrentStep('validation');
      } else {
        setCurrentStep('mapping');
      }
    } else if (currentStep === 'mapping') {
      if (parsedTrades.length === 0) autoProcessData();
      setCurrentStep('validation');
    }
  };

  const handleBackStep = () => {
    if (currentStep === 'mapping') setCurrentStep('preview');
    else if (currentStep === 'validation') setCurrentStep('mapping');
  };

  const handleImport = async (mode: 'replace' | 'append' = 'append') => {
    setCurrentStep('import');
    setImportProgress(0);
    for (let i = 0; i <= 100; i += 10) {
      setImportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    onImport(parsedTrades, mode === 'replace');
    toast({ title: mode === 'replace' ? "Trades Replaced" : "Import Successful", description: `${mode === 'replace' ? 'Replaced' : 'Added'} ${parsedTrades.length} trades` });
    // Reset
    setCsvData([]); setCsvHeaders([]); setColumnMappings([]); setParsedTrades([]);
    setConflicts([]); setCurrentStep('upload'); setDetectedFormat('generic');
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse([{ 'Trade ID': 'TRADE-001', 'Date': '2024-01-15', 'Symbol': 'EURUSD', 'Side': 'LONG', 'Entry Price': 1.095, 'Exit Price': 1.102, 'Quantity': 1, 'P&L': 700, 'Status': 'CLOSED', 'Strategy': 'Scalping' }]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trading_journal_template.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-terminal-green" />
            CSV Import Wizard - Trading Journal
            {detectedFormat !== 'generic' && (
              <Badge variant="outline" className="ml-2 text-xs bg-terminal-green/10 text-terminal-green border-terminal-green/30">
                {detectedFormat === 'able_v3' ? '✓ ABLE v3.1' : '✓ Thai OANDA'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full gap-4">
          {/* Steps Sidebar */}
          <div className="w-64 border-r border-border pr-4">
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={step.step} className={`p-3 rounded-lg border transition-colors ${
                  currentStep === step.step ? 'border-terminal-green bg-terminal-green/10' :
                  step.completed ? 'border-terminal-amber bg-terminal-amber/10' : 'border-border'
                }`}>
                  <div className="flex items-center gap-2">
                    {step.completed ? <CheckCircle className="h-4 w-4 text-terminal-amber" /> :
                     currentStep === step.step ? <div className="h-4 w-4 rounded-full bg-terminal-green animate-pulse" /> :
                     <div className="h-4 w-4 rounded-full border border-muted-foreground" />}
                    <span className="text-sm font-medium capitalize">{index + 1}. {step.step}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-border space-y-2">
              <Button onClick={downloadTemplate} variant="outline" size="sm" className="w-full text-xs">
                <Download className="h-3 w-3 mr-1" /> Download Template
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            {/* Upload Step */}
            {currentStep === 'upload' && (
              <div className="flex items-center justify-center h-full">
                <div className="border-2 border-dashed border-terminal-green/30 rounded-lg p-12 text-center hover:border-terminal-green/50 transition-colors w-full max-w-lg"
                  onDragOver={handleDragOver} onDrop={handleDrop}>
                  <Upload className="h-12 w-12 text-terminal-green mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Drop your CSV file here</h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Supports: ABLE v3.1, Thai OANDA, and generic CSV formats
                  </p>
                  <label>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    <Button asChild><span>Browse Files</span></Button>
                  </label>
                </div>
              </div>
            )}

            {/* Preview Step */}
            {currentStep === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Data Preview</h3>
                  <div className="flex gap-2">
                    <Badge variant="outline">{fullCsvData.length} rows</Badge>
                    <Badge variant="outline">{csvHeaders.length} columns</Badge>
                  </div>
                </div>
                <div className="overflow-auto border rounded-lg max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>{csvHeaders.slice(0, 8).map(h => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}</TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>{csvHeaders.slice(0, 8).map(h => <TableCell key={h} className="text-xs whitespace-nowrap">{row[h]}</TableCell>)}</TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedTrades.length > 0 && (
                  <Alert className="border-terminal-green/30 bg-terminal-green/5">
                    <AlertDescription className="text-xs text-terminal-green">
                      ✓ พบ {parsedTrades.length} เทรดจากข้อมูล ({detectedFormat === 'able_v3' ? 'ABLE v3.1' : detectedFormat === 'thai_oanda' ? 'Thai OANDA' : 'Generic'})
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setCurrentStep('upload'); setCsvData([]); setFullCsvData([]); setParsedTrades([]); }}>Back</Button>
                  <Button onClick={handleNextStep} className="bg-terminal-green text-black">
                    {detectedFormat !== 'generic' ? `Import ${parsedTrades.length} Trades →` : 'Continue to Mapping →'}
                  </Button>
                </div>
              </div>
            )}

            {/* Mapping Step */}
            {currentStep === 'mapping' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Column Mapping</h3>
                  {detectedFormat !== 'generic' && (
                    <Alert className="w-auto border-terminal-green/30 bg-terminal-green/5">
                      <AlertDescription className="text-xs text-terminal-green">
                        ✓ Auto-detected {detectedFormat === 'able_v3' ? 'ABLE v3.1' : 'Thai OANDA'} format — {parsedTrades.length} trades found
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {detectedFormat === 'generic' && (
                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    {columnMappings.map((mapping) => (
                      <div key={mapping.csvColumn} className="flex items-center gap-3 p-2 border border-border/30 rounded">
                        <span className="text-xs w-40 truncate font-mono">{mapping.csvColumn}</span>
                        <span className="text-xs text-muted-foreground w-32 truncate">{mapping.sampleValue}</span>
                        <Select value={mapping.tradeField || 'skip'} onValueChange={(v) => updateColumnMapping(mapping.csvColumn, v === 'skip' ? '' : v as keyof Trade)}>
                          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">— Skip —</SelectItem>
                            {TRADE_FIELD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBackStep}>Back</Button>
                  <Button onClick={handleNextStep} className="bg-terminal-green text-black">
                    Validate ({parsedTrades.length} trades)
                  </Button>
                </div>
              </div>
            )}

            {/* Validation Step */}
            {currentStep === 'validation' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Validation Results</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Import Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Total Rows:</span><span>{fullCsvData.length}</span></div>
                        <div className="flex justify-between"><span>Valid Trades:</span><span className="text-terminal-green">{parsedTrades.length}</span></div>
                        <div className="flex justify-between"><span>Conflicts:</span><span className="text-terminal-amber">{conflicts.length}</span></div>
                        <div className="flex justify-between"><span>Will Import:</span><span className="text-terminal-green font-bold">{parsedTrades.length}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Sample Trade</h4>
                      {parsedTrades[0] ? (
                        <div className="space-y-1 text-xs font-mono">
                          <div>{parsedTrades[0].symbol} — {parsedTrades[0].side}</div>
                          <div>Entry: {parsedTrades[0].entryPrice}</div>
                          <div>P&L: {parsedTrades[0].pnl?.toFixed(2)}</div>
                          <div>Date: {parsedTrades[0].date}</div>
                          {parsedTrades[0].mfe !== undefined && <div>MFE: {parsedTrades[0].mfe.toFixed(2)}</div>}
                          {parsedTrades[0].mae !== undefined && <div>MAE: {parsedTrades[0].mae.toFixed(2)}</div>}
                        </div>
                      ) : <span className="text-muted-foreground text-sm">No valid trades</span>}
                    </CardContent>
                  </Card>
                </div>
                
                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{validationErrors.join(', ')}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBackStep}>Back to Mapping</Button>
                  <div className="flex gap-2">
                    <Button onClick={() => handleImport('replace')} variant="destructive" disabled={parsedTrades.length === 0}>
                      Replace All ({parsedTrades.length} trades)
                    </Button>
                    <Button onClick={() => handleImport('append')} className="bg-terminal-green text-black" disabled={parsedTrades.length === 0}>
                      Add to Existing ({parsedTrades.length} trades)
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Import Step */}
            {currentStep === 'import' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="text-4xl">🚀</div>
                  <h3 className="text-lg font-semibold">Importing Trades...</h3>
                  <Progress value={importProgress} className="w-64" />
                  <p className="text-sm text-muted-foreground">{importProgress}% complete</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
