import React, { useState, useCallback } from 'react';
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
  onImport: (trades: Trade[]) => void;
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
  'ประเภท': 'type',
  'วัน/เวลา': 'date', 
  'สัญญาณ': 'symbol',
  'ราคา USD': 'entryPrice',
  'ขนาดของสถานะ (ปริมาณ)': 'quantity',
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
          tags: ['imported']
        };

        // Map CSV columns to trade fields
        columnMappings.forEach(mapping => {
          if (mapping.tradeField && row[mapping.csvColumn] !== undefined && row[mapping.csvColumn] !== '') {
            const value = row[mapping.csvColumn];

            switch (mapping.tradeField) {
              case 'date':
                // Parse Thai date format DD/MM/YYYY or standard formats
                let dateValue;
                if (value.includes('/')) {
                  const [day, month, year] = value.split('/');
                  dateValue = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                } else {
                  dateValue = new Date(value);
                }
                if (!isNaN(dateValue.getTime())) {
                  trade.date = dateValue.toISOString().split('T')[0];
                }
                break;
              case 'side':
                // Handle Thai side mapping: ซื้อ = LONG, ขาย = SHORT
                if (value.includes('ซื้อ') || value.toUpperCase().includes('BUY')) {
                  trade.side = 'LONG';
                } else if (value.includes('ขาย') || value.toUpperCase().includes('SELL')) {
                  trade.side = 'SHORT';
                }
                break;
              case 'symbol':
                // Auto-detect and fix symbols
                let symbol = String(value).toUpperCase();
                if (symbol.includes('XAU') && !symbol.includes('USD')) {
                  symbol = 'XAUUSD';
                }
                trade.symbol = symbol;
                break;
              case 'type':
                trade.type = value.toUpperCase().includes('CFD') ? 'CFD' : 'STOCK';
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

        // Auto-detect trade type from symbol
        if (trade.symbol) {
          if (trade.symbol.includes('USD') || trade.symbol.includes('EUR') || 
              trade.symbol.includes('GBP') || trade.symbol.includes('XAU')) {
            trade.type = 'CFD';
            trade.leverage = trade.leverage || 100;
            trade.lotSize = trade.lotSize || 1;
            trade.contractSize = 100000;
          } else {
            trade.type = 'STOCK';
            trade.leverage = 1;
          }
        }

        // Calculate exitPrice if not provided but P&L exists
        if (trade.pnl !== undefined && !trade.exitPrice && trade.entryPrice && trade.quantity) {
          if (trade.side === 'LONG') {
            trade.exitPrice = trade.entryPrice + (trade.pnl / trade.quantity);
          } else {
            trade.exitPrice = trade.entryPrice - (trade.pnl / trade.quantity);
          }
        }

        // Set status based on P&L existence
        if (trade.pnl !== undefined) {
          trade.status = 'CLOSED';
        } else {
          trade.status = 'OPEN';
        }

        // Check for required fields
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

  const handleImport = async () => {
    setCurrentStep('import');
    setImportProgress(0);

    // Simulate import progress
    for (let i = 0; i <= 100; i += 10) {
      setImportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    onImport(parsedTrades);
    
    toast({
      title: "Import Successful",
      description: `Imported ${parsedTrades.length} trades successfully`
    });

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
                    <p className="text-sm text-muted-foreground">
                      First 10 rows of your CSV file
                    </p>
                  </CardHeader>
                  <CardContent>
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
                                <TableCell key={header} className="whitespace-nowrap">
                                  {String(row[header] || '')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button onClick={() => setCurrentStep('mapping')}>
                        Next: Column Mapping
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Mapping Step */}
              <TabsContent value="mapping" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Column Mapping</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Map CSV columns to trade fields
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-auto">
                      {columnMappings.map(mapping => (
                        <div key={mapping.csvColumn} className="flex items-center gap-4">
                          <div className="w-48">
                            <Badge variant="outline" className="w-full justify-start">
                              {mapping.csvColumn}
                            </Badge>
                          </div>
                          <div className="flex-1">
                            <Select
                              value={mapping.tradeField}
                              onValueChange={(value) => updateColumnMapping(mapping.csvColumn, value as keyof Trade)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select field..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Skip Column</SelectItem>
                                {TRADE_FIELD_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-32 text-xs text-muted-foreground truncate">
                            {mapping.sampleValue}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {validationErrors.length > 0 && (
                      <Alert className="mt-4" variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside">
                            {validationErrors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex justify-end mt-4">
                      <Button 
                        onClick={() => {
                          if (validateMappings()) {
                            parseTradesFromCSV();
                          }
                        }}
                      >
                        Next: Validation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Validation Step */}
              <TabsContent value="validation" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Import Validation</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Review parsed trades and resolve conflicts
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-terminal-green" />
                          <span className="text-sm">{parsedTrades.length} trades ready</span>
                        </div>
                        {conflicts.length > 0 && (
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-terminal-amber" />
                            <span className="text-sm">{conflicts.length} conflicts</span>
                          </div>
                        )}
                      </div>

                      {conflicts.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Found {conflicts.length} potential duplicate trades. These will be skipped during import.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="border rounded-lg overflow-auto max-h-64">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Symbol</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Side</TableHead>
                              <TableHead>Entry</TableHead>
                              <TableHead>P&L</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedTrades.slice(0, 10).map((trade, index) => (
                              <TableRow key={index}>
                                <TableCell>{trade.symbol}</TableCell>
                                <TableCell>{trade.date}</TableCell>
                                <TableCell>
                                  <Badge variant={trade.side === 'LONG' ? 'default' : 'destructive'}>
                                    {trade.side}
                                  </Badge>
                                </TableCell>
                                <TableCell>${trade.entryPrice?.toFixed(4)}</TableCell>
                                <TableCell className={trade.pnl! > 0 ? 'text-terminal-green' : 'text-red-500'}>
                                  ${trade.pnl?.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{trade.status}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleImport}>
                          Import {parsedTrades.length} Trades
                        </Button>
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
                  <CardContent className="flex flex-col items-center justify-center h-full">
                    <div className="w-full max-w-md space-y-4">
                      <Progress value={importProgress} className="w-full" />
                      <p className="text-center text-sm text-muted-foreground">
                        Importing {parsedTrades.length} trades... {importProgress}%
                      </p>
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