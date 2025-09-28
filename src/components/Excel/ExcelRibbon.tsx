import { useState } from 'react';
import { 
  Copy, Scissors, ClipboardPaste, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Palette, Type,
  Calculator, FileSpreadsheet, Save, Download, Upload
} from 'lucide-react';

export const ExcelRibbon = () => {
  const [activeTab, setActiveTab] = useState('Home');
  
  return (
    <div className="border-b border-gray-300 bg-white">
      {/* Ribbon Tabs */}
      <div className="flex border-b border-gray-200">
        {['File', 'Home', 'Insert', 'Draw', 'Page Layout', 'Formulas', 'Data', 'Review', 'View'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
              activeTab === tab ? 'border-b-2 border-blue-500 bg-blue-50' : ''
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Ribbon Content */}
      <div className="p-2 bg-gray-50 min-h-[80px]">
        {activeTab === 'Home' && <HomeRibbon />}
        {activeTab === 'Insert' && <InsertRibbon />}
        {activeTab === 'Formulas' && <FormulasRibbon />}
        {activeTab === 'Data' && <DataRibbon />}
      </div>
    </div>
  );
};

const HomeRibbon = () => (
  <div className="flex gap-6">
    {/* Clipboard */}
    <div className="flex flex-col items-start border-r pr-4">
      <div className="text-xs text-gray-600 mb-2">Clipboard</div>
      <div className="flex gap-1">
        <button className="p-2 hover:bg-gray-200 rounded flex flex-col items-center">
          <Copy className="h-5 w-5" />
          <span className="text-xs mt-1">Copy</span>
        </button>
        <button className="p-2 hover:bg-gray-200 rounded flex flex-col items-center">
          <Scissors className="h-5 w-5" />
          <span className="text-xs mt-1">Cut</span>
        </button>
        <button className="p-2 hover:bg-gray-200 rounded flex flex-col items-center">
          <ClipboardPaste className="h-5 w-5" />
          <span className="text-xs mt-1">Paste</span>
        </button>
      </div>
    </div>
    
    {/* Font */}
    <div className="flex flex-col border-r pr-4">
      <div className="text-xs text-gray-600 mb-2">Font</div>
      <div className="flex gap-2 items-center">
        <select className="text-sm border rounded px-2 py-1 w-24">
          <option>Calibri</option>
          <option>Arial</option>
          <option>Times New Roman</option>
        </select>
        <select className="text-sm border rounded px-2 py-1 w-16">
          <option>11</option>
          <option>12</option>
          <option>14</option>
          <option>16</option>
          <option>18</option>
        </select>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-gray-200 rounded border">
            <Bold className="h-4 w-4" />
          </button>
          <button className="p-1 hover:bg-gray-200 rounded border">
            <Italic className="h-4 w-4" />
          </button>
          <button className="p-1 hover:bg-gray-200 rounded border">
            <Underline className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
    
    {/* Alignment */}
    <div className="flex flex-col border-r pr-4">
      <div className="text-xs text-gray-600 mb-2">Alignment</div>
      <div className="flex gap-1">
        <button className="p-1 hover:bg-gray-200 rounded border">
          <AlignLeft className="h-4 w-4" />
        </button>
        <button className="p-1 hover:bg-gray-200 rounded border">
          <AlignCenter className="h-4 w-4" />
        </button>
        <button className="p-1 hover:bg-gray-200 rounded border">
          <AlignRight className="h-4 w-4" />
        </button>
      </div>
    </div>

    {/* Format */}
    <div className="flex flex-col">
      <div className="text-xs text-gray-600 mb-2">Format</div>
      <div className="flex gap-1">
        <button className="p-1 hover:bg-gray-200 rounded border">
          <Palette className="h-4 w-4" />
        </button>
        <button className="p-1 hover:bg-gray-200 rounded border">
          <Type className="h-4 w-4" />
        </button>
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