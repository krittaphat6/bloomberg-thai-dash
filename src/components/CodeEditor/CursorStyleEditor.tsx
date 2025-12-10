import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  FileText, 
  Folder, 
  FolderOpen,
  Plus, 
  X, 
  ChevronRight,
  ChevronDown,
  Terminal,
  Settings,
  Search,
  GitBranch,
  Loader2,
  Trash2,
  TrendingUp,
  Save,
  FolderOpen as LibraryIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { PineScriptRunner, OHLCData } from '@/utils/PineScriptRunner';
import { 
  SavedScript, 
  saveScript, 
  loadAllScripts, 
  generateScriptId,
  PINE_TEMPLATES,
} from '@/utils/PineScriptStorage';
import ScriptManager from './ScriptManager';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

interface EditorTab {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
  scriptId?: string; // For Pine Script files linked to saved scripts
}

interface TerminalOutput {
  type: 'output' | 'error' | 'info';
  content: string;
  timestamp: Date;
}

type EditorMode = 'python' | 'pinescript';

const DEFAULT_PYTHON_FILES: FileNode[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'main',
        name: 'main.py',
        type: 'file',
        language: 'python',
        content: `# ABLE Terminal - Python Editor
import numpy as np
import pandas as pd

def hello_world():
    """Simple hello world function"""
    print("Hello from ABLE Terminal!")
    return "Success"

def calculate_returns(prices):
    """Calculate daily returns from price series"""
    returns = np.diff(prices) / prices[:-1]
    return returns

# Example usage
if __name__ == "__main__":
    hello_world()
    
    # Generate sample data
    np.random.seed(42)
    prices = np.random.randn(100).cumsum() + 100
    returns = calculate_returns(prices)
    
    print(f"Average return: {np.mean(returns):.4f}")
    print(f"Volatility: {np.std(returns):.4f}")
`
      },
      {
        id: 'utils',
        name: 'utils.py',
        type: 'file',
        language: 'python',
        content: `# Utility functions
import numpy as np

def moving_average(data, window):
    """Calculate moving average"""
    return np.convolve(data, np.ones(window)/window, mode='valid')

def normalize(data):
    """Normalize data to 0-1 range"""
    return (data - np.min(data)) / (np.max(data) - np.min(data))

def sharpe_ratio(returns, risk_free_rate=0.02):
    """Calculate Sharpe Ratio"""
    excess_return = np.mean(returns) * 252 - risk_free_rate
    volatility = np.std(returns) * np.sqrt(252)
    return excess_return / volatility if volatility > 0 else 0
`
      }
    ]
  }
];

const DEFAULT_PINE_CODE = `//@version=5
indicator("My Indicator", overlay=true)

// Input parameters
length = input(20, "Length")
mult = input(2.0, "Multiplier")

// Calculate SMA
sma_value = ta.sma(close, length)

// Plot
plot(sma_value, color=color.blue, title="SMA")
`;

export default function CursorStyleEditor() {
  // Editor mode (Python or Pine Script)
  const [editorMode, setEditorMode] = useState<EditorMode>('python');
  
  // File system state
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_PYTHON_FILES);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'files' | 'search' | 'git'>('files');
  
  // Pine Script specific state
  const [pineScripts, setPineScripts] = useState<SavedScript[]>([]);
  const [showScriptManager, setShowScriptManager] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFormData, setSaveFormData] = useState({
    name: '',
    description: '',
    category: 'indicator' as SavedScript['category'],
    tags: [] as string[],
  });
  
  const editorRef = useRef<any>(null);
  const pyodideRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Terminal output helper
  const addTerminalOutput = useCallback((type: 'output' | 'error' | 'info', content: string) => {
    setTerminalOutput(prev => [...prev, { type, content, timestamp: new Date() }]);
  }, []);

  // Load Pine Scripts
  useEffect(() => {
    if (editorMode === 'pinescript') {
      setPineScripts(loadAllScripts());
    }
  }, [editorMode]);

  // Initialize Pyodide (only when in Python mode)
  useEffect(() => {
    if (editorMode !== 'python') return;
    
    const initPyodide = async () => {
      try {
        addTerminalOutput('info', '🐍 Loading Python runtime...');
        
        if ((window as any).loadPyodide) {
          await loadPyodideRuntime();
          return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        
        script.onload = loadPyodideRuntime;
        script.onerror = () => {
          addTerminalOutput('error', '❌ Failed to load Pyodide script');
        };
        
        document.head.appendChild(script);
      } catch (err) {
        addTerminalOutput('error', `Error loading Pyodide: ${err}`);
      }
    };

    const loadPyodideRuntime = async () => {
      try {
        // @ts-ignore
        const pyodide = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        });
        
        addTerminalOutput('info', '📦 Installing packages...');
        await pyodide.loadPackage(['numpy', 'pandas', 'matplotlib', 'micropip']);
        
        await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64

def show_plot():
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='#1e1e1e')
    buf.seek(0)
    img_data = base64.b64encode(buf.read()).decode()
    buf.close()
    plt.close()
    return img_data
        `);
        
        pyodideRef.current = pyodide;
        setPyodideReady(true);
        addTerminalOutput('info', '✅ Python runtime ready!');
        
      } catch (err) {
        addTerminalOutput('error', `Failed to initialize Python: ${err}`);
      }
    };

    initPyodide();
  }, [editorMode, addTerminalOutput]);

  // Register Pine Script language for Monaco (v5/v6 complete definition)
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Pine Script language with complete v5/v6 syntax
    monaco.languages.register({ id: 'pinescript' });
    
    monaco.languages.setMonarchTokensProvider('pinescript', {
      keywords: [
        'indicator', 'strategy', 'library',
        'if', 'else', 'for', 'while', 'switch',
        'var', 'varip', 'const',
        'true', 'false', 'na',
        'and', 'or', 'not',
        'import', 'export', 'as',
        'type', 'method',
        'break', 'continue'
      ],
      typeKeywords: [
        'int', 'float', 'bool', 'string', 'color',
        'line', 'linefill', 'label', 'box', 'table', 'polyline',
        'array', 'matrix', 'map', 'series'
      ],
      builtinVariables: [
        'open', 'high', 'low', 'close', 'volume',
        'time', 'timeframe', 'bar_index',
        'hl2', 'hlc3', 'ohlc4',
        'barstate', 'session', 'syminfo', 'timenow'
      ],
      namespaces: [
        'ta', 'math', 'array', 'matrix', 'map',
        'request', 'ticker', 'str', 'color',
        'input', 'strategy', 'alert', 'log', 'runtime'
      ],
      plotFunctions: [
        'plot', 'hline', 'bgcolor', 'fill',
        'plotshape', 'plotchar', 'plotarrow', 'plotcandle', 'plotbar',
        'barcolor', 'alertcondition'
      ],
      operators: [
        '=', '>', '<', '!', '~', '?', ':',
        '==', '<=', '>=', '!=', ':=',
        '&&', '||', '++', '--',
        '+', '-', '*', '/', '%',
      ],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      tokenizer: {
        root: [
          // Version directive - special highlight
          [/\/\/@version=\d+/, 'annotation.pinescript'],
          
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          
          // Namespace functions (ta.sma, math.abs, etc.)
          [/\b(ta|math|array|matrix|map|request|ticker|str|color|input|strategy|alert|log|runtime)\.[a-zA-Z_]\w*/, 'function.builtin'],
          
          // Plot functions
          [/\b(plot|hline|bgcolor|fill|plotshape|plotchar|plotarrow|plotcandle|plotbar|barcolor|alertcondition)\b/, 'function.plot'],
          
          // Keywords
          [/\b(indicator|strategy|library|if|else|for|while|switch|var|varip|const|true|false|na|and|or|not|import|export|as|type|method|break|continue)\b/, 'keyword'],
          
          // Type keywords
          [/\b(int|float|bool|string|color|line|linefill|label|box|table|polyline|array|matrix|map|series)\b/, 'type'],
          
          // Built-in variables
          [/\b(open|high|low|close|volume|time|timeframe|bar_index|hl2|hlc3|ohlc4|barstate|session|syminfo|timenow)\b/, 'variable.predefined'],
          
          // Color constants
          [/color\.(red|green|blue|yellow|orange|purple|white|black|gray|teal|aqua|lime|fuchsia|silver|maroon|navy|olive|new|rgb)/, 'constant.color'],
          
          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
          
          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],
          
          // Identifiers and function calls
          [/[a-zA-Z_]\w*(?=\()/, 'function'],
          [/[a-zA-Z_]\w*/, 'identifier'],
          
          // Delimiters
          [/[{}()\[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }],
          
          // Whitespace
          { include: '@whitespace' }
        ],
        
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],
        
        string_double: [
          [/[^\\"]+/, 'string'],
          [/"/, 'string', '@pop'],
          [/\\./, 'string.escape']
        ],
        
        string_single: [
          [/[^\\']+/, 'string'],
          [/'/, 'string', '@pop'],
          [/\\./, 'string.escape']
        ],
        
        whitespace: [
          [/[ \t\r\n]+/, '']
        ]
      }
    });

    // Define custom theme for Pine Script
    monaco.editor.defineTheme('pinescript-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'annotation.pinescript', foreground: '4EC9B0', fontStyle: 'bold' },
        { token: 'function.builtin', foreground: 'DCDCAA' },
        { token: 'function.plot', foreground: 'C586C0' },
        { token: 'variable.predefined', foreground: '9CDCFE' },
        { token: 'constant.color', foreground: 'CE9178' },
        { token: 'type', foreground: '4EC9B0' },
      ],
      colors: {}
    });

    monaco.languages.setLanguageConfiguration('pinescript', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      folding: {
        markers: {
          start: new RegExp("^\\s*//\\s*#?region\\b"),
          end: new RegExp("^\\s*//\\s*#?endregion\\b")
        }
      }
    });

    // Keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (editorMode === 'pinescript') {
        setShowSaveDialog(true);
      } else {
        toast.success('File saved!');
        setOpenTabs(prev => prev.map(t => 
          t.id === activeTabId ? { ...t, isDirty: false } : t
        ));
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode);
  };

  // Run code based on mode
  const runCode = useCallback(async () => {
    const activeTab = openTabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    setIsRunning(true);

    if (editorMode === 'pinescript') {
      await runPineScript(activeTab.content);
    } else {
      await runPythonCode(activeTab);
    }

    setIsRunning(false);
  }, [activeTabId, openTabs, editorMode]);

  // Run Pine Script with enhanced error reporting
  const runPineScript = async (code: string) => {
    // Detect version
    const versionMatch = code.match(/\/\/@version=(\d+)/);
    const version = versionMatch ? versionMatch[1] : '6';
    
    addTerminalOutput('info', `▶ Running Pine Script v${version}...`);
    
    try {
      // Validate first and show any warnings
      const errors = PineScriptRunner.validateScript(code);
      const warnings = errors.filter(e => e.severity === 'warning');
      const criticalErrors = errors.filter(e => e.severity === 'error');
      
      // Show warnings
      warnings.forEach(warn => {
        addTerminalOutput('info', `⚠️ Line ${warn.line}: ${warn.message}`);
        if (warn.suggestion) {
          addTerminalOutput('info', `   💡 ${warn.suggestion}`);
        }
      });
      
      // Stop if there are critical errors
      if (criticalErrors.length > 0) {
        criticalErrors.forEach(err => {
          addTerminalOutput('error', `❌ Line ${err.line}: ${err.message}`);
          if (err.suggestion) {
            addTerminalOutput('info', `   💡 ${err.suggestion}`);
          }
        });
        return;
      }
      
      // Generate mock data for testing
      const mockData = PineScriptRunner.generateMockOHLC(200);
      addTerminalOutput('info', `📊 Using ${mockData.length} bars of mock data`);
      
      // Enable debug mode for development
      PineScriptRunner.setDebugMode(false);
      
      const results = await PineScriptRunner.runPineScript(code, mockData);
      
      const metrics = PineScriptRunner.getLastMetrics();
      
      addTerminalOutput('info', `✅ Execution completed in ${metrics?.executionMs.toFixed(2)}ms`);
      addTerminalOutput('info', `📈 Generated ${results.length} indicator(s):`);
      
      results.forEach(result => {
        const validValues = result.values.filter(v => !isNaN(v));
        const lastValue = validValues.length > 0 ? validValues[validValues.length - 1].toFixed(4) : 'N/A';
        addTerminalOutput('output', `   • ${result.name}: ${validValues.length} points, last value: ${lastValue}`);
      });
      
      // Store results for Trading Chart
      localStorage.setItem('pine-script-preview', JSON.stringify({
        results,
        code,
        timestamp: Date.now()
      }));
      
      addTerminalOutput('info', '💾 Results saved. Open Trading Chart → Custom Indicators to visualize.');
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // Format multi-line error messages
      message.split('\n').forEach((line, i) => {
        addTerminalOutput(i === 0 ? 'error' : 'info', line);
      });
    }
  };

  // Run Python code
  const runPythonCode = async (activeTab: EditorTab) => {
    if (!pyodideReady || !pyodideRef.current) {
      toast.error('Python is still loading...');
      return;
    }

    addTerminalOutput('info', `▶ Running ${activeTab.name}...`);

    try {
      pyodideRef.current.runPython(`
import sys
from io import StringIO
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = StringIO()
sys.stderr = StringIO()
      `);

      await pyodideRef.current.runPythonAsync(activeTab.content);

      const stdout = pyodideRef.current.runPython(`sys.stdout.getvalue()`);
      const stderr = pyodideRef.current.runPython(`sys.stderr.getvalue()`);

      const hasPlot = pyodideRef.current.runPython(`
import matplotlib.pyplot as plt
len(plt.get_fignums()) > 0
      `);

      pyodideRef.current.runPython(`
sys.stdout = old_stdout
sys.stderr = old_stderr
      `);

      if (stdout) addTerminalOutput('output', stdout);
      if (stderr) addTerminalOutput('error', stderr);

      if (hasPlot) {
        const plotData = pyodideRef.current.runPython(`show_plot()`);
        addTerminalOutput('output', `[PLOT:${plotData}]`);
      }

      addTerminalOutput('info', '✅ Execution completed');

    } catch (err: any) {
      addTerminalOutput('error', `❌ Error: ${err.message || err}`);
    }
  };

  // Open file in tab
  const openFile = (file: FileNode) => {
    if (file.type !== 'file') return;

    const existingTab = openTabs.find(t => t.id === file.id);
    if (existingTab) {
      setActiveTabId(file.id);
      return;
    }

    const newTab: EditorTab = {
      id: file.id,
      name: file.name,
      content: file.content || '',
      language: file.language || 'python',
      isDirty: false
    };

    setOpenTabs([...openTabs, newTab]);
    setActiveTabId(file.id);
  };

  // Open Pine Script
  const openPineScript = (script: SavedScript) => {
    const existingTab = openTabs.find(t => t.scriptId === script.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const newTab: EditorTab = {
      id: `pine-${script.id}`,
      name: script.name,
      content: script.code,
      language: 'pinescript',
      isDirty: false,
      scriptId: script.id,
    };

    setOpenTabs([...openTabs, newTab]);
    setActiveTabId(newTab.id);
    setShowScriptManager(false);
  };

  // Create new Pine Script
  const createNewPineScript = () => {
    const newTab: EditorTab = {
      id: `pine-new-${Date.now()}`,
      name: 'untitled.pine',
      content: DEFAULT_PINE_CODE,
      language: 'pinescript',
      isDirty: true,
    };

    setOpenTabs([...openTabs, newTab]);
    setActiveTabId(newTab.id);
  };

  // Save Pine Script
  const savePineScript = () => {
    const activeTab = openTabs.find(t => t.id === activeTabId);
    if (!activeTab) return;

    const versionMatch = activeTab.content.match(/\/\/@version=(\d+)/);
    const detectedVersion = versionMatch ? (parseInt(versionMatch[1]) as 5 | 6) : 6;

    const script: SavedScript = {
      id: activeTab.scriptId || generateScriptId(),
      name: saveFormData.name || activeTab.name.replace('.pine', ''),
      description: saveFormData.description,
      code: activeTab.content,
      category: saveFormData.category,
      tags: saveFormData.tags,
      version: detectedVersion,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const saved = saveScript(script);
    
    setOpenTabs(prev => prev.map(t => 
      t.id === activeTabId 
        ? { ...t, scriptId: saved.id, name: saved.name, isDirty: false }
        : t
    ));

    setPineScripts(loadAllScripts());
    setShowSaveDialog(false);
    setSaveFormData({ name: '', description: '', category: 'indicator', tags: [] });
    
    toast.success('Script saved to library');
  };

  // Close tab
  const closeTab = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenTabs(openTabs.filter(t => t.id !== tabId));
    if (activeTabId === tabId) {
      const remaining = openTabs.filter(t => t.id !== tabId);
      setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
    }
  };

  // Update tab content
  const updateTabContent = (content: string) => {
    setOpenTabs(openTabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, content, isDirty: true }
        : tab
    ));
  };

  // Toggle folder
  const toggleFolder = (folderId: string) => {
    const updateFiles = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === folderId) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateFiles(node.children) };
        }
        return node;
      });
    };
    setFiles(updateFiles(files));
  };

  // Create new file
  const createNewFile = () => {
    if (editorMode === 'pinescript') {
      createNewPineScript();
      return;
    }

    const newFile: FileNode = {
      id: `file-${Date.now()}`,
      name: 'untitled.py',
      type: 'file',
      language: 'python',
      content: '# New file\n'
    };
    
    setFiles(prev => {
      const updated = [...prev];
      if (updated[0]?.type === 'folder' && updated[0].children) {
        updated[0].children.push(newFile);
        updated[0].isOpen = true;
      } else {
        updated.push(newFile);
      }
      return updated;
    });
    
    openFile(newFile);
  };

  // Render file tree for Python
  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <div
          className={`
            flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-[#2a2d2e] rounded text-sm
            ${activeTabId === node.id ? 'bg-[#37373d]' : ''}
          `}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => node.type === 'folder' ? toggleFolder(node.id) : openFile(node)}
        >
          {node.type === 'folder' ? (
            <>
              {node.isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
              {node.isOpen ? <FolderOpen className="w-4 h-4 text-yellow-500 shrink-0" /> : <Folder className="w-4 h-4 text-yellow-500 shrink-0" />}
            </>
          ) : (
            <>
              <span className="w-4 shrink-0" />
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {node.type === 'folder' && node.isOpen && node.children && (
          renderFileTree(node.children, depth + 1)
        )}
      </div>
    ));
  };

  // Render Pine Script list
  const renderPineScriptList = () => {
    const filteredScripts = searchQuery 
      ? pineScripts.filter(s => 
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : pineScripts;

    return (
      <div className="space-y-1">
        {/* Templates section */}
        <div className="px-2 py-1 text-[10px] text-gray-500 uppercase">Templates</div>
        {PINE_TEMPLATES.slice(0, 5).map(template => (
          <div
            key={template.id}
            className="flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-[#2a2d2e] rounded text-sm"
            onClick={() => {
              const newTab: EditorTab = {
                id: `pine-template-${Date.now()}`,
                name: template.name,
                content: template.code,
                language: 'pinescript',
                isDirty: true,
              };
              setOpenTabs([...openTabs, newTab]);
              setActiveTabId(newTab.id);
            }}
          >
            <TrendingUp className="w-4 h-4 text-green-400 shrink-0" />
            <span className="truncate">{template.name}</span>
          </div>
        ))}

        {/* Saved scripts section */}
        {pineScripts.length > 0 && (
          <>
            <div className="px-2 py-1 mt-2 text-[10px] text-gray-500 uppercase">Saved Scripts</div>
            {filteredScripts.map(script => (
              <div
                key={script.id}
                className={`
                  flex items-center gap-1 py-1 px-2 cursor-pointer hover:bg-[#2a2d2e] rounded text-sm
                  ${openTabs.find(t => t.scriptId === script.id)?.id === activeTabId ? 'bg-[#37373d]' : ''}
                `}
                onClick={() => openPineScript(script)}
              >
                <TrendingUp className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="truncate">{script.name}</span>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  const activeTab = openTabs.find(t => t.id === activeTabId);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] rounded-lg overflow-hidden">
      {/* Title Bar */}
      <div className="h-9 bg-[#323233] flex items-center justify-between px-4 text-xs border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <span className="text-[#00ff00] font-bold">ABLE</span>
          <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as EditorMode)}>
            <TabsList className="h-7 bg-[#252526]">
              <TabsTrigger value="python" className="text-xs h-6 px-3">
                🐍 Python
              </TabsTrigger>
              <TabsTrigger value="pinescript" className="text-xs h-6 px-3">
                📈 Pine Script
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          {editorMode === 'python' ? (
            pyodideReady ? (
              <span className="text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Python Ready
              </span>
            ) : (
              <span className="text-yellow-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading Python...
              </span>
            )
          ) : (
            <span className="text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Pine Script Ready
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-2 border-r border-[#3c3c3c]">
          <Button
            variant="ghost"
            size="icon"
            className={`w-10 h-10 rounded ${sidebarTab === 'files' ? 'text-white bg-[#3c3c3c]' : 'text-gray-500'}`}
            onClick={() => setSidebarTab('files')}
          >
            <FileText className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`w-10 h-10 rounded ${sidebarTab === 'search' ? 'text-white bg-[#3c3c3c]' : 'text-gray-500'}`}
            onClick={() => setSidebarTab('search')}
          >
            <Search className="w-5 h-5" />
          </Button>
          {editorMode === 'pinescript' && (
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 text-gray-500 rounded hover:text-white"
              onClick={() => setShowScriptManager(true)}
              title="Script Library"
            >
              <LibraryIcon className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="w-10 h-10 text-gray-500 rounded">
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Sidebar */}
        <div className="w-56 bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
          <div className="p-2 text-xs font-semibold text-[#bbbbbb] uppercase flex items-center justify-between">
            <span>
              {editorMode === 'python' ? 'Explorer' : 'Pine Scripts'}
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={createNewFile}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {sidebarTab === 'files' && (
            <ScrollArea className="flex-1">
              <div className="p-1">
                {editorMode === 'python' ? renderFileTree(files) : renderPineScriptList()}
              </div>
            </ScrollArea>
          )}
          
          {sidebarTab === 'search' && (
            <div className="p-2">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#3c3c3c] border-0 text-sm h-8"
              />
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="h-9 bg-[#252526] flex items-center border-b border-[#3c3c3c] overflow-x-auto">
            {openTabs.map(tab => (
              <div
                key={tab.id}
                className={`
                  h-full flex items-center gap-2 px-3 cursor-pointer border-r border-[#3c3c3c] shrink-0
                  ${activeTabId === tab.id ? 'bg-[#1e1e1e]' : 'bg-[#2d2d2d] hover:bg-[#2a2a2a]'}
                `}
                onClick={() => setActiveTabId(tab.id)}
              >
                {tab.language === 'pinescript' ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-400" />
                )}
                <span className="text-sm">{tab.name}</span>
                {tab.isDirty && <span className="w-2 h-2 bg-white rounded-full" />}
                <button
                  className="opacity-50 hover:opacity-100 ml-1"
                  onClick={(e) => closeTab(tab.id, e)}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <div className="flex-1" />
            
            {/* Action buttons */}
            {editorMode === 'pinescript' && activeTab && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const tab = openTabs.find(t => t.id === activeTabId);
                  if (tab) {
                    setSaveFormData({
                      name: tab.name.replace('.pine', ''),
                      description: '',
                      category: 'indicator',
                      tags: [],
                    });
                    setShowSaveDialog(true);
                  }
                }}
                className="mr-1 h-7"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={runCode}
              disabled={editorMode === 'python' ? (!pyodideReady || isRunning || !activeTab) : (!activeTab || isRunning)}
              className="mr-2 bg-[#00ff00] text-black hover:bg-[#00cc00] h-7"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              Run
            </Button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            {activeTab ? (
              <Editor
                height="100%"
                language={activeTab.language}
                value={activeTab.content}
                onChange={(value) => updateTabContent(value || '')}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', Monaco, 'Courier New', monospace",
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderWhitespace: 'selection',
                  bracketPairColorization: { enabled: true },
                  padding: { top: 10 }
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  {editorMode === 'pinescript' ? (
                    <>
                      <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Create or open a Pine Script</p>
                      <p className="text-sm mt-2">Click + to create new, or select a template</p>
                    </>
                  ) : (
                    <>
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Open a file to start editing</p>
                      <p className="text-sm mt-2">Click on a file in the Explorer</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div className="h-48 bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col">
              <div className="h-8 bg-[#252526] flex items-center px-4 border-b border-[#3c3c3c] shrink-0">
                <Terminal className="w-4 h-4 mr-2" />
                <span className="text-sm">Terminal</span>
                <div className="flex-1" />
                <button 
                  className="text-gray-500 hover:text-white p-1"
                  onClick={() => setTerminalOutput([])}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  className="text-gray-500 hover:text-white p-1"
                  onClick={() => setShowTerminal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ScrollArea className="flex-1 p-2 font-mono text-sm">
                {terminalOutput.map((output, i) => (
                  <div 
                    key={i} 
                    className={`
                      ${output.type === 'error' ? 'text-red-400' : ''}
                      ${output.type === 'info' ? 'text-blue-400' : ''}
                      ${output.type === 'output' ? 'text-green-400' : ''}
                    `}
                  >
                    {output.content.startsWith('[PLOT:') ? (
                      <img 
                        src={`data:image/png;base64,${output.content.slice(6, -1)}`}
                        alt="Plot"
                        className="max-w-full my-2 rounded"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap">{output.content}</pre>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
          
          {!showTerminal && (
            <button 
              className="h-6 bg-[#252526] text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1 border-t border-[#3c3c3c]"
              onClick={() => setShowTerminal(true)}
            >
              <Terminal className="w-3 h-3" /> Show Terminal
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] flex items-center justify-between px-4 text-xs text-white">
        <div className="flex items-center gap-4">
          <span>{editorMode === 'python' ? 'Python 3.11 (Pyodide)' : 'Pine Script v5'}</span>
          <span>{activeTab?.name || 'No file'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>Spaces: 4</span>
        </div>
      </div>

      {/* Script Manager Dialog */}
      <ScriptManager
        isOpen={showScriptManager}
        onClose={() => setShowScriptManager(false)}
        onSelectScript={openPineScript}
        onNewScript={createNewPineScript}
      />

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="bg-[#1e1e1e] border-[#3c3c3c]">
          <DialogHeader>
            <DialogTitle className="text-white">Save Pine Script</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Name</label>
              <Input
                value={saveFormData.name}
                onChange={(e) => setSaveFormData({ ...saveFormData, name: e.target.value })}
                placeholder="My Indicator"
                className="bg-[#2d2d2d] border-[#3c3c3c] text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Description</label>
              <Textarea
                value={saveFormData.description}
                onChange={(e) => setSaveFormData({ ...saveFormData, description: e.target.value })}
                placeholder="Describe what this script does..."
                className="bg-[#2d2d2d] border-[#3c3c3c] text-white resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Category</label>
              <Select 
                value={saveFormData.category} 
                onValueChange={(v: any) => setSaveFormData({ ...saveFormData, category: v })}
              >
                <SelectTrigger className="bg-[#2d2d2d] border-[#3c3c3c]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indicator">Indicator</SelectItem>
                  <SelectItem value="oscillator">Oscillator</SelectItem>
                  <SelectItem value="strategy">Strategy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-400">Tags (comma-separated)</label>
              <Input
                value={saveFormData.tags.join(', ')}
                onChange={(e) => setSaveFormData({ 
                  ...saveFormData, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                })}
                placeholder="trend, momentum, volatility"
                className="bg-[#2d2d2d] border-[#3c3c3c] text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={savePineScript} 
              className="bg-[#00ff00] text-black hover:bg-[#00cc00]"
              disabled={!saveFormData.name}
            >
              Save to Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
