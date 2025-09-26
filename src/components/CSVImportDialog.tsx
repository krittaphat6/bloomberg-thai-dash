import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, AlertTriangle, CheckCircle, X, Download } from 'lucide-react';
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
}

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (trades: Trade[], replaceMode?: boolean) => void;
  existingTrades: Trade[];
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

const THAI_OANDA_MAPPING = {
  'ซื้อขาย #': 'id',
  'ประเภท': 'side',               // ✅ Fixed: maps to 'side' for LONG/SHORT
  'วัน/เวลา': 'date', 
  'สัญญาณ': 'symbol',
  'ราคา USD': 'entryPrice',
  'ขนาดของสถานะ (ปริมาณ)': 'quantity',
  'ขนาดของสถานะ (มูลค่า)': 'lotSize',
  'P&L สุทธิ USD': 'pnl',
  'P&L สุทธิ %': 'pnlPercentage',
  // Ignored columns
  'กำไรติดต่อกัน USD': '',
  'กำไรติดต่อกัน %': '',
  'ถอยลง USD': '',
  'ถอยลง %': '',
  'P&L สะสม USD': '',
  'P&L สะสม %': ''
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

export default function CSVImportDialog({ open, onOpenChange, onImport, existingTrades }: CSVImportDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<ImportStep['step']>('upload');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [fullCsvData, setFullCsvData] = useState<any[]>([]); // Store full data for processing
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedTrades, setParsedTrades] = useState<Trade[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [conflicts, setConflicts] = useState<{ existing: Trade; new: Trade }[]>([]);

  // Auto-process Thai OANDA data when entering preview step
  useEffect(() => {
    if (currentStep === 'preview' && fullCsvData.length > 0 && parsedTrades.length === 0) {
      autoProcessThaiOandaData();
    }
  }, [currentStep, fullCsvData.length, parsedTrades.length]);

  const steps: ImportStep[] = [
    { step: 'upload', completed: currentStep !== 'upload' },
    { step: 'preview', completed: ['mapping', 'validation', 'import'].includes(currentStep) },
    { step: 'mapping', completed: ['validation', 'import'].includes(currentStep) },
    { step: 'validation', completed: currentStep === 'import' },
    { step: 'import', completed: false }
  ];

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast({
            title: "Parse Error",
            description: "Error parsing CSV file",
            variant: "destructive"
          });
          return;
        }

        const headers = results.meta.fields || [];
        const data = results.data as any[];

        setCsvHeaders(headers);
        setCsvData(data.slice(0, 10)); // Preview first 10 rows
        setFullCsvData(data); // Store full data for processing
        
        
        // Auto-detect Thai OANDA format and create mappings
        const mappings: ColumnMapping[] = headers.map(header => {
          const thaiMapping = THAI_OANDA_MAPPING[header as keyof typeof THAI_OANDA_MAPPING];
          const sampleValue = data[0]?.[header] || '';
          
          return {
            csvColumn: header,
            tradeField: (thaiMapping as keyof Trade) || '',
            sampleValue: String(sampleValue)
          };
        });

        setColumnMappings(mappings);
        setCurrentStep('preview');
        
        toast({
          title: "File Uploaded",
          description: `Loaded ${data.length} rows with ${headers.length} columns`
        });
      },
      error: (error) => {
        toast({
          title: "Upload Error",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));
    
    if (csvFile) {
      const event = { target: { files: [csvFile] } } as any;
      handleFileUpload(event);
    }
  }, [handleFileUpload]);

  const updateColumnMapping = (csvColumn: string, tradeField: keyof Trade | '') => {
    setColumnMappings(prev => prev.map(mapping => 
      mapping.csvColumn === csvColumn 
        ? { ...mapping, tradeField }
        : mapping
    ));
  };

  const validateMappings = () => {
    const errors: string[] = [];
    const requiredFields = ['symbol', 'date', 'side', 'entryPrice'];
    const mappedFields = columnMappings.filter(m => m.tradeField).map(m => m.tradeField);

    requiredFields.forEach(field => {
      if (!mappedFields.includes(field as keyof Trade)) {
        errors.push(`Required field '${field}' is not mapped`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return false;
    }

    return true;
  };

  const parseTradesFromCSV = () => {
    const trades: Trade[] = [];
    const newConflicts: { existing: Trade; new: Trade }[] = [];

    // Use fullCsvData instead of Papa.parse
    fullCsvData.forEach((row, index) => {
      try {
        const trade: Partial<Trade> = {
          id: `imported-${Date.now()}-${index}`,
          status: 'CLOSED',
          strategy: 'Imported',
          type: 'CFD',
          tags: ['imported']
        };

        // Map CSV columns to trade fields
        columnMappings.forEach(mapping => {
          if (mapping.tradeField && row[mapping.csvColumn] !== undefined && row[mapping.csvColumn] !== '') {
            const value = row[mapping.csvColumn];

            switch (mapping.tradeField) {
              case 'date':
                // Parse date formats including YYYY-MM-DD and DD/MM/YYYY
                let dateValue;
                if (value.includes('/')) {
                  const [day, month, year] = value.split('/');
                  dateValue = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else if (value.includes('-')) {
                  dateValue = new Date(value);
                } else {
                  dateValue = new Date(value);
                }
                if (!isNaN(dateValue.getTime())) {
                  trade.date = dateValue.toISOString().split('T')[0];
                }
                break;
              case 'side':
                // Handle Thai side mapping and new formats
                if (value.includes('ซื้อ') || value.includes('การซื้อสถานะ') || value.includes('Long') || value.toUpperCase().includes('BUY')) {
                  trade.side = 'LONG';
                } else if (value.includes('ขาย') || value.includes('การขายสถานะ') || value.includes('Short') || value.toUpperCase().includes('SELL')) {
                  trade.side = 'SHORT';
                }
                break;
              case 'symbol':
                // Auto-detect and fix symbols - add USD suffix for forex symbols
                let symbol = String(value).toUpperCase().trim();
                if (symbol.includes('XAU') && !symbol.includes('USD')) {
                  symbol = 'XAUUSD';
                } else if (['PDL4', 'ATH', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'].some(curr => symbol.includes(curr)) && !symbol.includes('USD')) {
                  symbol = symbol + 'USD';
                }
                trade.symbol = symbol;
                break;
              case 'type':
                trade.type = 'CFD'; // Set all OANDA imports as CFD
                break;
              case 'entryPrice':
              case 'exitPrice':
              case 'quantity':
              case 'pnl':
              case 'pnlPercentage':
              case 'commission':
              case 'swap':
              case 'leverage':
              case 'lotSize':
                // Remove commas, spaces and parse as float
                const numValue = parseFloat(String(value).replace(/[,\s]/g, ''));
                if (!isNaN(numValue)) {
                  (trade as any)[mapping.tradeField] = numValue;
                }
                break;
              default:
                (trade as any)[mapping.tradeField] = String(value);
            }
          }
        });

        // Auto-detect trade type from symbol and set defaults
        if (trade.symbol) {
          trade.type = 'CFD';
          trade.leverage = trade.leverage || 100;
          trade.lotSize = trade.lotSize || 1;
          trade.contractSize = 100000;
        }

        // Calculate exitPrice if not provided but P&L exists
        if (trade.pnl !== undefined && !trade.exitPrice && trade.entryPrice && trade.quantity) {
          if (trade.side === 'LONG') {
            trade.exitPrice = trade.entryPrice + (trade.pnl / trade.quantity);
          } else {
            trade.exitPrice = trade.entryPrice - (trade.pnl / trade.quantity);
          }
        }

        // Set status as CLOSED for all imports with strategy "Imported"
        trade.status = 'CLOSED';
        trade.strategy = trade.strategy || 'Imported';

        // Check for required fields - only require basic fields
        if (!trade.symbol || !trade.date || !trade.side || !trade.entryPrice) {
          console.warn('Skipping incomplete trade at row', index, trade);
          return;
        }

        // Check for conflicts with existing trades
        const existingTrade = existingTrades.find(t => 
          t.symbol === trade.symbol && 
          t.date === trade.date && 
          Math.abs((t.entryPrice || 0) - (trade.entryPrice || 0)) < 0.01
        );

        if (existingTrade) {
          newConflicts.push({ existing: existingTrade, new: trade as Trade });
        } else {
          trades.push(trade as Trade);
        }
      } catch (error) {
        console.error('Error parsing trade at row', index, error);
      }
    });

    setParsedTrades(trades);
    setConflicts(newConflicts);
    setCurrentStep('validation');
  };

  const handleNextStep = () => {
    if (currentStep === 'preview') {
      // Process data before going to mapping
      if (parsedTrades.length === 0) {
        autoProcessThaiOandaData();
      }
      setCurrentStep('mapping');
    } else if (currentStep === 'mapping') {
      if (validateMappings()) {
        parseTradesFromCSV();
      }
    }
    // Removed validation step since we now have direct import buttons
  };

  const handleBackStep = () => {
    if (currentStep === 'mapping') {
      setCurrentStep('preview');
    } else if (currentStep === 'validation') {
      setCurrentStep('mapping');
    } else if (currentStep === 'import') {
      setCurrentStep('validation');
    }
  };

  const handleQuickImport = () => {
    // Auto-map and import directly using Thai OANDA format
    autoProcessThaiOandaData();
    setTimeout(() => {
      setCurrentStep('validation');
    }, 100);
  };

  const autoProcessThaiOandaData = () => {
    console.log('Processing CSV data:', fullCsvData.length, 'rows');
    console.log('Sample row:', fullCsvData[0]);
    
    const trades: Trade[] = [];
    const newConflicts: { existing: Trade; new: Trade }[] = [];
    
    fullCsvData.forEach((row, index) => {
      try {
        // Auto-process Thai OANDA data format
        const trade: Trade = {
          id: `oanda-${Date.now()}-${index}`,
          date: row['วัน/เวลา'] ? row['วัน/เวลา'].split(' ')[0] : '',
          symbol: row['สัญญาณ'] === 'XAU' ? 'XAUUSD' : 
                  (row['สัญญาณ'] || 'UNKNOWN') + (row['สัญญาณ'] && !row['สัญญาณ'].includes('USD') ? 'USD' : ''),
          side: row['ประเภท'] && (row['ประเภท'].includes('ซื้อ') || row['ประเภท'].includes('การซื้อสถานะ') || row['ประเภท'].includes('Long')) ? 'LONG' : 'SHORT',
          type: 'CFD',
          entryPrice: parseFloat(row['ราคา USD']) || 0,
          quantity: parseInt(row['ขนาดของสถานะ (ปริมาณ)']) || 1,
          lotSize: parseFloat(row['ขนาดของสถานะ (มูลค่า)']) || 1,
          pnl: parseFloat(row['P&L สุทธิ USD']) || 0,
          pnlPercentage: parseFloat(row['P&L สุทธิ %']) || 0,
          status: 'CLOSED',
          strategy: 'OANDA Import',
          leverage: 100,
          contractSize: 100000
        };
        
        // Calculate exitPrice if missing
        if (!trade.exitPrice && trade.entryPrice && trade.quantity && trade.pnl) {
          if (trade.side === 'LONG') {
            trade.exitPrice = trade.entryPrice + (trade.pnl / trade.quantity);
          } else {
            trade.exitPrice = trade.entryPrice - (trade.pnl / trade.quantity);
          }
        }
        
        // Validate required fields
        if (trade.symbol && trade.date && trade.entryPrice > 0) {
          // Check for conflicts with existing trades
          const existingTrade = existingTrades.find(t => 
            t.symbol === trade.symbol && 
            t.date === trade.date && 
            Math.abs((t.entryPrice || 0) - (trade.entryPrice || 0)) < 0.01
          );

          if (existingTrade) {
            newConflicts.push({ existing: existingTrade, new: trade });
          } else {
            trades.push(trade);
          }
        }
      } catch (error) {
        console.error('Error processing row:', error);
      }
    });
    
    setParsedTrades(trades);
    setConflicts(newConflicts);
    console.log('Auto-processed trades:', trades.length);
    
    toast({
      title: "Data Processed",
      description: `Successfully processed ${trades.length} trades from Thai OANDA format`
    });
  };

  const autoMapThaiOanda = () => {
    const mappings: ColumnMapping[] = csvHeaders.map(header => {
      const thaiMapping = THAI_OANDA_MAPPING[header as keyof typeof THAI_OANDA_MAPPING];
      const sampleValue = csvData[0]?.[header] || '';
      
      return {
        csvColumn: header,
        tradeField: (thaiMapping as keyof Trade) || '',
        sampleValue: String(sampleValue)
      };
    });

    setColumnMappings(mappings);
    toast({
      title: "Auto-Mapping Applied",
      description: "Thai OANDA format has been automatically mapped"
    });
  };

  const handleImport = async (mode: 'replace' | 'append' = 'append') => {
    setCurrentStep('import');
    setImportProgress(0);

    // Simulate import progress
    for (let i = 0; i <= 100; i += 10) {
      setImportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (mode === 'replace') {
      // Replace all existing trades
      onImport(parsedTrades, true); // true = replace mode
      
      toast({
        title: "Trades Replaced",
        description: `Replaced all trades with ${parsedTrades.length} new trades`
      });
    } else {
      // Append to existing trades
      onImport(parsedTrades, false); // false = append mode
      
      toast({
        title: "Import Successful", 
        description: `Added ${parsedTrades.length} trades to existing journal`
      });
    }

    // Reset state
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMappings([]);
    setParsedTrades([]);
    setConflicts([]);
    setCurrentStep('upload');
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Trade ID': 'TRADE-001',
        'Date': '2024-01-15',
        'Symbol': 'EURUSD',
        'Side': 'LONG',
        'Type': 'CFD',
        'Entry Price': 1.0950,
        'Exit Price': 1.1020,
        'Quantity': 1,
        'Lot Size': 1,
        'Leverage': 100,
        'P&L': 700,
        'P&L %': 6.39,
        'Status': 'CLOSED',
        'Strategy': 'Scalping',
        'Commission': 5
      }
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trading_journal_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-terminal-green" />
            CSV Import Wizard - Trading Journal
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full gap-4">
          {/* Steps Sidebar */}
          <div className="w-64 border-r border-border pr-4">
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.step}
                  className={`p-3 rounded-lg border transition-colors ${
                    currentStep === step.step
                      ? 'border-terminal-green bg-terminal-green/10'
                      : step.completed
                      ? 'border-terminal-amber bg-terminal-amber/10'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {step.completed ? (
                      <CheckCircle className="h-4 w-4 text-terminal-amber" />
                    ) : currentStep === step.step ? (
                      <div className="h-4 w-4 rounded-full bg-terminal-green animate-pulse" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted-foreground" />
                    )}
                    <span className="text-sm font-medium capitalize">
                      {index + 1}. {step.step}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Download Template
              </Button>
            </div>
            
            <div className="mt-4">
              <Button
                onClick={() => window.open('/sample-thai-oanda.csv', '_blank')}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Thai OANDA Sample
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <Tabs value={currentStep} className="h-full">
              {/* Upload Step */}
              <TabsContent value="upload" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Upload CSV File</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="border-2 border-dashed border-terminal-green/30 rounded-lg p-8 text-center hover:border-terminal-green/50 transition-colors cursor-pointer"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('csv-upload')?.click()}
                    >
                      <Upload className="h-12 w-12 text-terminal-green mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Upload Trading Data</h3>
                      <p className="text-muted-foreground mb-4">
                        Drag and drop your CSV file here, or click to select
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports Thai OANDA format and standard trading formats
                      </p>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>

                    <div className="mt-6 space-y-2">
                      <h4 className="font-medium text-sm">Supported Formats:</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Badge variant="outline">Thai OANDA Format</Badge>
                        <Badge variant="outline">MetaTrader 4/5</Badge>
                        <Badge variant="outline">Interactive Brokers</Badge>
                        <Badge variant="outline">Custom CSV</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Preview Step */}
              <TabsContent value="preview" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Data Preview</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Button onClick={autoMapThaiOanda} variant="outline" size="sm">
                        Auto-Map Thai OANDA Format
                      </Button>
                      <Button onClick={handleQuickImport} variant="outline" size="sm" className="text-terminal-green">
                        Quick Import (Auto-mapped)
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {csvData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            {fullCsvData.length} total rows • Showing first 10
                          </Badge>
                          <Badge variant="outline" className="text-terminal-green">
                            {csvHeaders.length} columns detected
                          </Badge>
                        </div>
                        
                        <div className="border rounded-lg overflow-auto max-h-96">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {csvHeaders.map(header => (
                                  <TableHead key={header} className="whitespace-nowrap">
                                    {header}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {csvData.map((row, index) => (
                                <TableRow key={index}>
                                  {csvHeaders.map(header => (
                                    <TableCell key={header} className="whitespace-nowrap text-xs">
                                      {String(row[header] || '')}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <Alert>
                          <FileText className="h-4 w-4" />
                          <AlertDescription>
                            Preview shows the first 10 rows. All {fullCsvData.length} rows will be processed during import.
                          </AlertDescription>
                        </Alert>

                        <div className="flex justify-between pt-4 border-t">
                          <Button onClick={() => setCurrentStep('upload')} variant="outline">
                            Back to Upload
                          </Button>
                          <div className="flex gap-2">
                            <Button onClick={handleNextStep} className="bg-terminal-green hover:bg-terminal-green/90">
                              Continue to Mapping
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        No data to preview. Please upload a CSV file first.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Mapping Step */}
              <TabsContent value="mapping" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Column Mapping</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {columnMappings.length > 0 ? (
                      <div className="space-y-4">
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Map CSV columns to trade fields. Required fields: Symbol, Date, Side, Entry Price
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-3 max-h-96 overflow-auto">
                          {columnMappings.map(mapping => (
                            <div key={mapping.csvColumn} className="grid grid-cols-3 gap-4 items-center p-3 border rounded-lg">
                              <div>
                                <p className="font-medium text-sm">{mapping.csvColumn}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  Sample: {mapping.sampleValue}
                                </p>
                              </div>
                              
                              <Select
                                value={mapping.tradeField}
                                onValueChange={(value) => updateColumnMapping(mapping.csvColumn, value as keyof Trade | '')}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">-- Skip Column --</SelectItem>
                                  {TRADE_FIELD_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <div className="text-right">
                                {['symbol', 'date', 'side', 'entryPrice'].includes(mapping.tradeField) && (
                                  <Badge className="bg-terminal-amber/20 text-terminal-amber">Required</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between pt-4 border-t">
                          <Button onClick={handleBackStep} variant="outline">
                            Back to Preview
                          </Button>
                          <div className="flex gap-2">
                            <Button onClick={handleNextStep} className="bg-terminal-green hover:bg-terminal-green/90">
                              Continue to Validation
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        No columns to map. Please upload a CSV file first.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Validation Step */}
              <TabsContent value="validation" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Validation Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {validationErrors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-medium mb-2">Validation Errors:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {validationErrors.map((error, index) => (
                                <li key={index} className="text-sm">{error}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {conflicts.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-medium mb-2">Duplicate Trades Found:</div>
                            <div className="text-sm">
                              {conflicts.length} trades match existing entries and will be skipped.
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Import Summary</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Total Rows:</span>
                                <span className="font-medium">{fullCsvData.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Valid Trades:</span>
                                <span className="font-medium text-terminal-green">{parsedTrades.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Conflicts:</span>
                                <span className="font-medium text-terminal-amber">{conflicts.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Will Import:</span>
                                <span className="font-medium text-terminal-green">{parsedTrades.length}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Sample Trade</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {parsedTrades.length > 0 && (
                              <div className="space-y-1 text-xs">
                                <div><strong>Symbol:</strong> {parsedTrades[0].symbol}</div>
                                <div><strong>Date:</strong> {parsedTrades[0].date}</div>
                                <div><strong>Side:</strong> {parsedTrades[0].side}</div>
                                <div><strong>Entry:</strong> ${parsedTrades[0].entryPrice}</div>
                                <div><strong>P&L:</strong> ${parsedTrades[0].pnl || 'N/A'}</div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {parsedTrades.length > 0 && (
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium mb-3">Preview Import Data</h4>
                          <div className="max-h-64 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Symbol</TableHead>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Side</TableHead>
                                  <TableHead>Entry Price</TableHead>
                                  <TableHead>P&L</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {parsedTrades.slice(0, 5).map((trade, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{trade.symbol}</TableCell>
                                    <TableCell>{trade.date}</TableCell>
                                    <TableCell>
                                      <Badge variant={trade.side === 'LONG' ? 'default' : 'secondary'}>
                                        {trade.side}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>${trade.entryPrice?.toFixed(2)}</TableCell>
                                    <TableCell className={trade.pnl && trade.pnl > 0 ? 'text-terminal-green' : 'text-red-500'}>
                                      ${trade.pnl?.toFixed(2) || 'N/A'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between pt-4 border-t">
                        <Button onClick={handleBackStep} variant="outline">
                          Back to Mapping
                        </Button>
                        
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleImport('replace')}
                            variant="destructive"
                            disabled={parsedTrades.length === 0}
                          >
                            Replace All ({parsedTrades.length} trades)
                          </Button>
                          
                          <Button 
                            onClick={() => handleImport('append')}
                            className="bg-terminal-green hover:bg-terminal-green/90"
                            disabled={parsedTrades.length === 0}
                          >
                            Add to Existing ({parsedTrades.length} trades)
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Import Step */}
              <TabsContent value="import" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Importing Trades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6 text-center">
                      <div className="space-y-2">
                        <CheckCircle className="h-16 w-16 text-terminal-green mx-auto" />
                        <h3 className="text-xl font-medium">Import in Progress</h3>
                        <p className="text-muted-foreground">
                          Processing {parsedTrades.length} trades...
                        </p>
                      </div>

                      <div className="w-full max-w-md mx-auto">
                        <Progress value={importProgress} className="w-full" />
                        <p className="text-sm text-muted-foreground mt-2">
                          {importProgress}% Complete
                        </p>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>• Validating trade data</p>
                        <p>• Checking for duplicates</p>
                        <p>• Adding to trading journal</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}