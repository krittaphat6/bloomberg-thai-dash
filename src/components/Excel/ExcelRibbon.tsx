import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Copy, Scissors, ClipboardPaste, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Palette, Type,
  Calculator, FileSpreadsheet, Save, Download, Upload, Camera
} from 'lucide-react';

interface ExcelRibbonProps {
  onExcelImport?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBloombergImport?: () => void;
}

export const ExcelRibbon = ({ onExcelImport, onBloombergImport }: ExcelRibbonProps) => {
  const [activeTab, setActiveTab] = useState('Home');
  
  const tabs = ['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View'];
  
  return (
    <div className="border-b bg-card">
      {/* Ribbon Tabs */}
      <div className="flex bg-background border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm transition-colors ${
              activeTab === tab ? 'bg-terminal-green text-black font-semibold' : 'text-terminal-green hover:bg-terminal-green/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Ribbon Content */}
      <div className="p-2 bg-muted/30 border-b min-h-[80px]">
        {activeTab === 'File' && <FileRibbon onExcelImport={onExcelImport} />}
        {activeTab === 'Home' && <HomeRibbon />}
        {activeTab === 'Insert' && <InsertRibbon />}
        {activeTab === 'Formulas' && <FormulasRibbon />}
        {activeTab === 'Data' && <DataRibbon onBloombergImport={onBloombergImport} />}
      </div>
    </div>
  );
};

const FileRibbon = ({ onExcelImport }: { onExcelImport?: (event: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <div className="p-4 bg-card">
    <div className="space-y-2">
      <Button 
        variant="outline" 
        className="w-full justify-start border-terminal-green text-terminal-green hover:bg-terminal-green/10"
        onClick={() => document.getElementById('excel-file-input')?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        Import Excel File (.xlsx, .xls)
      </Button>
      <input
        id="excel-file-input"
        type="file"
        accept=".xlsx,.xls"
        onChange={onExcelImport}
        className="hidden"
      />
      <Button 
        variant="outline" 
        className="w-full justify-start border-terminal-green text-terminal-green hover:bg-terminal-green/10"
      >
        <Download className="h-4 w-4 mr-2" />
        Export to Excel
      </Button>
      <Button 
        variant="outline" 
        className="w-full justify-start border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10"
      >
        <Save className="h-4 w-4 mr-2" />
        Save Spreadsheet
      </Button>
    </div>
  </div>
);

const HomeRibbon = () => (
  <div className="flex items-center gap-2">
    {/* Clipboard Group */}
    <div className="flex flex-col border-r border-border pr-4">
      <span className="text-[10px] text-muted-foreground mb-1">Clipboard</span>
      <div className="flex gap-1">
        <Button variant="ghost" className="h-12 flex flex-col items-center justify-center p-1 hover:bg-terminal-green/10">
          <ClipboardPaste className="h-5 w-5 mb-0.5 text-terminal-green" />
          <span className="text-[9px]">Paste</span>
        </Button>
        <div className="flex flex-col gap-0.5">
          <Button variant="ghost" className="h-5 p-1 hover:bg-terminal-green/10">
            <Copy className="h-3 w-3 text-terminal-green" />
          </Button>
          <Button variant="ghost" className="h-5 p-1 hover:bg-terminal-green/10">
            <Scissors className="h-3 w-3 text-terminal-green" />
          </Button>
        </div>
      </div>
    </div>
    
    {/* Font Group */}
    <div className="flex flex-col border-r border-border pr-4">
      <span className="text-[10px] text-muted-foreground mb-1">Font</span>
      <div className="flex gap-1 items-center">
        <select className="text-xs border border-border rounded h-6 px-1 bg-background text-foreground">
          <option>JetBrains Mono</option>
          <option>Calibri</option>
          <option>Arial</option>
        </select>
        <select className="text-xs border border-border rounded h-6 w-12 px-1 bg-background text-foreground">
          <option>11</option>
          <option>12</option>
          <option>14</option>
          <option>16</option>
          <option>18</option>
        </select>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-terminal-green/10">
          <Bold className="h-3 w-3 text-terminal-green" />
        </Button>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-terminal-green/10">
          <Italic className="h-3 w-3 text-terminal-green" />
        </Button>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-terminal-green/10">
          <Underline className="h-3 w-3 text-terminal-green" />
        </Button>
      </div>
    </div>
    
    {/* Alignment Group */}
    <div className="flex flex-col border-r border-border pr-4">
      <span className="text-[10px] text-muted-foreground mb-1">Alignment</span>
      <div className="flex gap-1">
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-terminal-green/10">
          <AlignLeft className="h-3 w-3 text-terminal-green" />
        </Button>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-terminal-green/10">
          <AlignCenter className="h-3 w-3 text-terminal-green" />
        </Button>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-terminal-green/10">
          <AlignRight className="h-3 w-3 text-terminal-green" />
        </Button>
      </div>
    </div>

    {/* Format Group */}
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground mb-1">Format</span>
      <div className="flex gap-1">
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-terminal-green/10">
          <Palette className="h-3 w-3 text-terminal-green" />
        </Button>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-terminal-green/10">
          <Type className="h-3 w-3 text-terminal-green" />
        </Button>
      </div>
    </div>
  </div>
);

const InsertRibbon = () => (
  <div className="flex gap-6">
    <div className="flex flex-col items-start">
      <div className="text-xs text-gray-600 mb-2">Tables</div>
      <button className="p-2 hover:bg-gray-200 rounded flex flex-col items-center">
        <FileSpreadsheet className="h-5 w-5" />
        <span className="text-xs mt-1">Table</span>
      </button>
    </div>
  </div>
);

const FormulasRibbon = () => (
  <div className="flex gap-6">
    <div className="flex flex-col items-start">
      <div className="text-xs text-gray-600 mb-2">Function Library</div>
      <div className="flex gap-1">
        <button className="px-3 py-1 text-sm border rounded hover:bg-gray-200">SUM</button>
        <button className="px-3 py-1 text-sm border rounded hover:bg-gray-200">AVERAGE</button>
        <button className="px-3 py-1 text-sm border rounded hover:bg-gray-200">COUNT</button>
        <button className="px-3 py-1 text-sm border rounded hover:bg-gray-200">MAX</button>
        <button className="px-3 py-1 text-sm border rounded hover:bg-gray-200">MIN</button>
      </div>
    </div>
  </div>
);

const DataRibbon = ({ onBloombergImport }: { onBloombergImport?: () => void }) => (
  <div className="flex gap-6">
    <div className="flex flex-col items-start border-r pr-4">
      <div className="text-xs text-muted-foreground mb-2">Get Data</div>
      <div className="flex gap-1">
        <button className="p-2 hover:bg-muted rounded flex flex-col items-center">
          <Upload className="h-5 w-5 text-terminal-green" />
          <span className="text-xs mt-1">Import</span>
        </button>
        <button className="p-2 hover:bg-muted rounded flex flex-col items-center">
          <Download className="h-5 w-5 text-terminal-green" />
          <span className="text-xs mt-1">Export</span>
        </button>
      </div>
    </div>
    
    <div className="flex flex-col items-start border-r pr-4">
      <div className="text-xs text-muted-foreground mb-2">Bloomberg Import</div>
      <Button
        variant="outline"
        size="sm"
        className="border-terminal-amber text-terminal-amber hover:bg-terminal-amber/10"
        onClick={onBloombergImport}
      >
        <Camera className="h-4 w-4 mr-2" />
        Import from Images
      </Button>
    </div>
    
    <div className="flex flex-col items-start">
      <div className="text-xs text-muted-foreground mb-2">Sort & Filter</div>
      <div className="flex gap-1">
        <button className="px-3 py-1 text-sm border border-border rounded hover:bg-muted">Sort A-Z</button>
        <button className="px-3 py-1 text-sm border border-border rounded hover:bg-muted">Filter</button>
      </div>
    </div>
  </div>
);