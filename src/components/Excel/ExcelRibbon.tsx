import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Copy, Scissors, ClipboardPaste, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Palette, Type,
  Calculator, FileSpreadsheet, Save, Download, Upload
} from 'lucide-react';

export const ExcelRibbon = () => {
  const [activeTab, setActiveTab] = useState('Home');
  
  const tabs = ['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View'];
  
  return (
    <div className="border-b bg-white">
      {/* Ribbon Tabs */}
      <div className="flex bg-[#2B579A]">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm text-white hover:bg-[#3A6DB5] transition-colors ${
              activeTab === tab ? 'bg-white text-black' : ''
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Ribbon Content */}
      <div className="p-2 bg-[#F3F3F3] border-b min-h-[80px]">
        {activeTab === 'Home' && <HomeRibbon />}
        {activeTab === 'Insert' && <InsertRibbon />}
        {activeTab === 'Formulas' && <FormulasRibbon />}
        {activeTab === 'Data' && <DataRibbon />}
      </div>
    </div>
  );
};

const HomeRibbon = () => (
  <div className="flex items-center gap-2">
    {/* Clipboard Group */}
    <div className="flex flex-col border-r pr-4">
      <span className="text-[10px] text-gray-600 mb-1">Clipboard</span>
      <div className="flex gap-1">
        <Button variant="ghost" className="h-12 flex flex-col items-center justify-center p-1 hover:bg-gray-200">
          <ClipboardPaste className="h-5 w-5 mb-0.5" />
          <span className="text-[9px]">Paste</span>
        </Button>
        <div className="flex flex-col gap-0.5">
          <Button variant="ghost" className="h-5 p-1 hover:bg-gray-200">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" className="h-5 p-1 hover:bg-gray-200">
            <Scissors className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
    
    {/* Font Group */}
    <div className="flex flex-col border-r pr-4">
      <span className="text-[10px] text-gray-600 mb-1">Font</span>
      <div className="flex gap-1 items-center">
        <select className="text-xs border rounded h-6 px-1 bg-white">
          <option>Calibri</option>
          <option>Arial</option>
          <option>Times New Roman</option>
        </select>
        <select className="text-xs border rounded h-6 w-12 px-1 bg-white">
          <option>11</option>
          <option>12</option>
          <option>14</option>
          <option>16</option>
          <option>18</option>
        </select>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-200">
          <Bold className="h-3 w-3" />
        </Button>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-200">
          <Italic className="h-3 w-3" />
        </Button>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-200">
          <Underline className="h-3 w-3" />
        </Button>
      </div>
    </div>
    
    {/* Alignment Group */}
    <div className="flex flex-col border-r pr-4">
      <span className="text-[10px] text-gray-600 mb-1">Alignment</span>
      <div className="flex gap-1">
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-200">
          <AlignLeft className="h-3 w-3" />
        </Button>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-200">
          <AlignCenter className="h-3 w-3" />
        </Button>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-200">
          <AlignRight className="h-3 w-3" />
        </Button>
      </div>
    </div>

    {/* Format Group */}
    <div className="flex flex-col">
      <span className="text-[10px] text-gray-600 mb-1">Format</span>
      <div className="flex gap-1">
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-200">
          <Palette className="h-3 w-3" />
        </Button>
        <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-gray-200">
          <Type className="h-3 w-3" />
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

const DataRibbon = () => (
  <div className="flex gap-6">
    <div className="flex flex-col items-start border-r pr-4">
      <div className="text-xs text-gray-600 mb-2">Get Data</div>
      <div className="flex gap-1">
        <button className="p-2 hover:bg-gray-200 rounded flex flex-col items-center">
          <Upload className="h-5 w-5" />
          <span className="text-xs mt-1">Import</span>
        </button>
        <button className="p-2 hover:bg-gray-200 rounded flex flex-col items-center">
          <Download className="h-5 w-5" />
          <span className="text-xs mt-1">Export</span>
        </button>
      </div>
    </div>
    
    <div className="flex flex-col items-start">
      <div className="text-xs text-gray-600 mb-2">Sort & Filter</div>
      <div className="flex gap-1">
        <button className="px-3 py-1 text-sm border rounded hover:bg-gray-200">Sort A-Z</button>
        <button className="px-3 py-1 text-sm border rounded hover:bg-gray-200">Filter</button>
      </div>
    </div>
  </div>
);