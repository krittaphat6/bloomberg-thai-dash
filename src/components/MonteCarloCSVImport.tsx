import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Check, X, ArrowRight, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';

interface TradeData {
  tradeNum?: number;
  type?: string;
  signal?: string;
  dateTime?: string;
  price?: number;
  contracts?: number;
  profit?: number;
  runningPnl?: number;
}

interface CSVImportProps {
  onImport: (config: {
    winRate: number;
    avgWin: number;
    avgLoss: number;
    totalTrades: number;
    maxConsecutiveLosses: number;
    maxConsecutiveWins: number;
    profitFactor: number;
    trades: TradeData[];
  }) => void;
  onClose: () => void;
}

const COLUMN_MAPPINGS = {
  tradeNum: ['Trade #', 'trade', 'tradeno', 'trade_num', 'number', '#'],
  type: ['Type', 'type', 'direction', 'side', 'order_type'],
  signal: ['Signal', 'signal', 'entry_signal', 'action'],
  dateTime: ['Date/Time', 'date', 'datetime', 'time', 'timestamp', 'entry_time'],
  price: ['Price', 'price', 'entry_price', 'avg_price', 'fill_price'],
  contracts: ['Contracts', 'contracts', 'qty', 'quantity', 'lots', 'size', 'volume'],
  profit: ['Profit', 'profit', 'pnl', 'p&l', 'net_profit', 'realized_pnl', 'profit/loss'],
  runningPnl: ['Running P&L', 'running_pnl', 'cumulative', 'cum_pnl', 'balance']
};

const MonteCarloCSVImport: React.FC<CSVImportProps> = ({ onImport, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [parsedTrades, setParsedTrades] = useState<TradeData[]>([]);
  const [calculatedStats, setCalculatedStats] = useState<any>(null);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.csv')) {
      handleFile(droppedFile);
    } else {
      toast.error('Please upload a CSV file');
    }
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  // Parse CSV file
  const handleFile = (file: File) => {
    setFile(file);
    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const cols = results.meta.fields || [];
        
        setRawData(data);
        setHeaders(cols);
        
        // Auto-detect column mappings
        const autoMappings: Record<string, string> = {};
        
        Object.entries(COLUMN_MAPPINGS).forEach(([key, possibleNames]) => {
          const match = cols.find(col => 
            possibleNames.some(name => 
              col.toLowerCase().includes(name.toLowerCase())
            )
          );
          if (match) {
            autoMappings[key] = match;
          }
        });
        
        setMappings(autoMappings);
        setStep('mapping');
        setIsProcessing(false);
        
        toast.success(`Loaded ${data.length} rows from CSV`);
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('Failed to parse CSV file');
        setIsProcessing(false);
      }
    });
  };

  // Update column mapping
  const updateMapping = (key: string, value: string) => {
    setMappings(prev => ({ ...prev, [key]: value }));
  };

  // Process mapped data
  const processMappedData = () => {
    if (!mappings.profit) {
      toast.error('Please map the Profit column');
      return;
    }

    setIsProcessing(true);

    const trades: TradeData[] = rawData.map((row, idx) => {
      const profit = parseFloat(row[mappings.profit]) || 0;
      
      return {
        tradeNum: mappings.tradeNum ? parseInt(row[mappings.tradeNum]) : idx + 1,
        type: mappings.type ? row[mappings.type] : undefined,
        signal: mappings.signal ? row[mappings.signal] : undefined,
        dateTime: mappings.dateTime ? row[mappings.dateTime] : undefined,
        price: mappings.price ? parseFloat(row[mappings.price]) : undefined,
        contracts: mappings.contracts ? parseFloat(row[mappings.contracts]) : undefined,
        profit
      };
    }).filter(t => !isNaN(t.profit!));

    // Calculate statistics
    const wins = trades.filter(t => (t.profit || 0) > 0);
    const losses = trades.filter(t => (t.profit || 0) < 0);
    
    const totalWins = wins.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.profit || 0), 0));
    
    const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    // Calculate consecutive streaks
    let maxConsecWins = 0;
    let maxConsecLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    trades.forEach(t => {
      if ((t.profit || 0) > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecWins = Math.max(maxConsecWins, currentWinStreak);
      } else if ((t.profit || 0) < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecLosses = Math.max(maxConsecLosses, currentLossStreak);
      }
    });

    const stats = {
      winRate,
      avgWin,
      avgLoss,
      totalTrades: trades.length,
      totalWins: wins.length,
      totalLosses: losses.length,
      maxConsecutiveWins: maxConsecWins,
      maxConsecutiveLosses: maxConsecLosses,
      profitFactor,
      totalPnL: totalWins - totalLosses
    };

    setParsedTrades(trades);
    setCalculatedStats(stats);
    setStep('preview');
    setIsProcessing(false);
  };

  // Confirm import
  const confirmImport = () => {
    if (!calculatedStats) return;

    onImport({
      winRate: calculatedStats.winRate,
      avgWin: calculatedStats.avgWin,
      avgLoss: calculatedStats.avgLoss,
      totalTrades: calculatedStats.totalTrades,
      maxConsecutiveLosses: calculatedStats.maxConsecutiveLosses,
      maxConsecutiveWins: calculatedStats.maxConsecutiveWins,
      profitFactor: calculatedStats.profitFactor,
      trades: parsedTrades
    });

    toast.success('Trade data imported successfully!');
    onClose();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-500">
          <FileSpreadsheet className="w-5 h-5" />
          Import TradingView CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-green-500/30 rounded-lg p-8 text-center hover:border-green-500/60 transition-colors cursor-pointer"
            onClick={() => document.getElementById('csv-input')?.click()}
          >
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-12 h-12 mx-auto mb-4 text-green-500/60" />
            <p className="text-lg font-medium">Drop your TradingView CSV here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-4">
              Supports TradingView strategy tester export format
            </p>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                File: <span className="text-foreground">{file?.name}</span> ({rawData.length} trades)
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <RefreshCw className="w-4 h-4 mr-1" /> Change File
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(COLUMN_MAPPINGS).map(([key, _]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                    {key === 'profit' && <span className="text-red-500">*</span>}
                  </Label>
                  <Select
                    value={mappings[key] || ''}
                    onValueChange={(v) => updateMapping(key, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Not mapped --</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview first few rows */}
            <div className="mt-4">
              <Label className="text-xs text-muted-foreground">Data Preview (first 3 rows)</Label>
              <ScrollArea className="h-24 mt-1 border rounded p-2 bg-muted/20">
                <pre className="text-xs font-mono">
                  {rawData.slice(0, 3).map((row, i) => (
                    <div key={i} className="truncate">
                      {mappings.profit && `Profit: ${row[mappings.profit]}`}
                      {mappings.type && ` | Type: ${row[mappings.type]}`}
                      {mappings.price && ` | Price: ${row[mappings.price]}`}
                    </div>
                  ))}
                </pre>
              </ScrollArea>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={processMappedData} 
                disabled={!mappings.profit || isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? 'Processing...' : 'Process Data'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Confirm */}
        {step === 'preview' && calculatedStats && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-500">{calculatedStats.winRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-500">{calculatedStats.profitFactor.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Profit Factor</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/10 border-amber-500/20">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-500">{calculatedStats.totalTrades}</p>
                  <p className="text-xs text-muted-foreground">Total Trades</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">Avg Win</span>
                <span className="text-green-500 font-mono">${calculatedStats.avgWin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">Avg Loss</span>
                <span className="text-red-500 font-mono">${calculatedStats.avgLoss.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">Max Consec Wins</span>
                <span className="font-mono">{calculatedStats.maxConsecutiveWins}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">Max Consec Losses</span>
                <span className="font-mono">{calculatedStats.maxConsecutiveLosses}</span>
              </div>
              <div className="col-span-2 flex justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">Total P&L</span>
                <span className={`font-mono font-bold ${calculatedStats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${calculatedStats.totalPnL.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={confirmImport}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                Use These Values
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonteCarloCSVImport;
