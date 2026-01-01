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
  scriptId?: string;
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
  const [editorMode, setEditorMode] = useState<EditorMode>('python');
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_PYTHON_FILES);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'files' | 'search' | 'git'>('files');
  const [editorReady, setEditorReady] = useState(false);
  
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

  // Initialize default tab
  useEffect(() => {
    if (openTabs.length === 0 && files[0]?.children?.[0]) {
      const firstFile = files[0].children[0];
      const tab: EditorTab = {
        id: firstFile.id,
        name: firstFile.name,
        content: firstFile.content || '',
        language: firstFile.language || 'python',
        isDirty: false
      };
      setOpenTabs([tab]);
      setActiveTabId(tab.id);
    }
  }, [files]);

  // Initialize Pyodide (only when in Python mode and editor is ready)
  useEffect(() => {
    if (editorMode !== 'python' || !editorReady || pyodideReady || pyodideLoading) return;
    
    let isMounted = true;
    
    const initPyodide = async () => {
      setPyodideLoading(true);
      try {
        addTerminalOutput('info', '🐍 Loading Python runtime (Pyodide)...');
        
        // Check if already loaded
        if ((window as any).loadPyodide && pyodideRef.current) {
          setPyodideReady(true);
          setPyodideLoading(false);
          addTerminalOutput('info', '✅ Python runtime already loaded!');
          return;
        }
        
        // Load Pyodide script if not already present
        if (!(window as any).loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector('script[src*="pyodide.js"]');
            if (existingScript) {
              resolve();
              return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
            script.async = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Pyodide script'));
            
            document.head.appendChild(script);
          });
        }
        
        if (!isMounted) return;
        
        addTerminalOutput('info', '📦 Initializing Python environment...');
        
        // @ts-ignore
        const pyodide = await (window as any).loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        });
        
        if (!isMounted) return;
        
        addTerminalOutput('info', '📦 Installing packages (numpy, pandas)...');
        
        try {
          await pyodide.loadPackage(['numpy', 'pandas']);
        } catch (pkgErr) {
          console.warn('Some packages failed to load:', pkgErr);
          addTerminalOutput('info', '⚠️ Some packages may not be available');
        }
        
        if (!isMounted) return;
        
        // Setup matplotlib if available
        try {
          await pyodide.loadPackage(['matplotlib', 'micropip']);
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
        } catch (matplotErr) {
          console.warn('Matplotlib setup failed:', matplotErr);
        }
        
        if (!isMounted) return;
        
        pyodideRef.current = pyodide;
        setPyodideReady(true);
        setPyodideLoading(false);
        addTerminalOutput('info', '✅ Python runtime ready! You can now run Python code.');
        toast.success('Python runtime loaded successfully!');
        
      } catch (err: any) {
        console.error('Pyodide initialization error:', err);
        if (isMounted) {
          addTerminalOutput('error', `❌ Failed to load Python: ${err.message || err}`);
          addTerminalOutput('info', '💡 Try refreshing the page or check your internet connection');
          setPyodideLoading(false);
          toast.error('Failed to load Python runtime');
        }
      }
    };

    // Delay slightly to ensure DOM is ready
    const timer = setTimeout(initPyodide, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [editorMode, editorReady, pyodideReady, pyodideLoading, addTerminalOutput]);

  // Handle editor mount
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorReady(true);

    // Register Pine Script language
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
      tokenizer: {
        root: [
          [/\/\/@version=\d+/, 'annotation.pinescript'],
          [/\/\/.*$/, 'comment'],
          [/\b(ta|math|array|matrix|map|request|ticker|str|color|input|strategy|alert|log|runtime)\.[a-zA-Z_]\w*/, 'function.builtin'],
          [/\b(plot|hline|bgcolor|fill|plotshape|plotchar|plotarrow|plotcandle|plotbar|barcolor|alertcondition)\b/, 'function.plot'],
          [/\b(indicator|strategy|library|if|else|for|while|switch|var|varip|const|true|false|na|and|or|not|import|export|as|type|method|break|continue)\b/, 'keyword'],
          [/\b(int|float|bool|string|color|line|linefill|label|box|table|polyline|array|matrix|map|series)\b/, 'type'],
          [/\b(open|high|low|close|volume|time|timeframe|bar_index|hl2|hlc3|ohlc4|barstate|session|syminfo|timenow)\b/, 'variable.predefined'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],
          [/[a-zA-Z_]\w*(?=\()/, 'function'],
          [/[a-zA-Z_]\w*/, 'identifier'],
          [/[{}()\[\]]/, '@brackets'],
          { include: '@whitespace' }
        ],
        string_double: [
          [/[^\\"]+/, 'string'],
          [/"/, 'string', '@pop'],
          [/\\./, 'string.escape']
        ],
        whitespace: [
          [/[ \t\r\n]+/, '']
        ]
      }
    });

    // Define custom theme
    monaco.editor.defineTheme('pinescript-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'annotation.pinescript', foreground: '4EC9B0', fontStyle: 'bold' },
        { token: 'function.builtin', foreground: 'DCDCAA' },
        { token: 'function.plot', foreground: 'C586C0' },
        { token: 'variable.predefined', foreground: '9CDCFE' },
      ],
      colors: {}
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
  }, [editorMode, activeTabId]);

  // Run code
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

  // Run Pine Script
  const runPineScript = async (code: string) => {
    const versionMatch = code.match(/\/\/@version=(\d+)/);
    const version = versionMatch ? versionMatch[1] : '6';
    
    addTerminalOutput('info', `▶ Running Pine Script v${version}...`);
    
    try {
      const errors = PineScriptRunner.validateScript(code);
      const criticalErrors = errors.filter(e => e.severity === 'error');
      
      if (criticalErrors.length > 0) {
        criticalErrors.forEach(err => {
          addTerminalOutput('error', `❌ Line ${err.line}: ${err.message}`);
        });
        return;
      }

      addTerminalOutput('output', '📈 Script validated successfully');
      addTerminalOutput('info', '✅ Script executed successfully!');
      
    } catch (err) {
      addTerminalOutput('error', `Execution error: ${err}`);
    }
  };

  // Run Python code
  const runPythonCode = async (tab: EditorTab) => {
    if (!pyodideReady || !pyodideRef.current) {
      addTerminalOutput('error', '❌ Python runtime not ready. Please wait...');
      return;
    }

    addTerminalOutput('info', `▶ Running ${tab.name}...`);

    try {
      pyodideRef.current.globals.set('__name__', '__main__');
      
      let capturedOutput = '';
      pyodideRef.current.setStdout({
        batched: (text: string) => {
          capturedOutput += text;
        }
      });

      const result = await pyodideRef.current.runPythonAsync(tab.content);
      
      if (capturedOutput) {
        capturedOutput.split('\n').forEach((line: string) => {
          if (line.trim()) addTerminalOutput('output', line);
        });
      }

      if (result !== undefined && result !== null) {
        addTerminalOutput('output', `Result: ${result}`);
      }

      addTerminalOutput('info', '✅ Execution complete');

    } catch (err: any) {
      addTerminalOutput('error', `Error: ${err.message || err}`);
    }
  };

  // File tree operations
  const toggleFolder = (folderId: string) => {
    const updateFolder = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === folderId && node.type === 'folder') {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateFolder(node.children) };
        }
        return node;
      });
    };
    setFiles(updateFolder(files));
  };

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
    
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(file.id);
  };

  const closeTab = (tabId: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      return newTabs;
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (!value || !activeTabId) return;
    
    setOpenTabs(prev => prev.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, content: value, isDirty: true }
        : tab
    ));
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 py-1 px-2 hover:bg-muted/50 cursor-pointer text-xs ${
            activeTabId === node.id ? 'bg-muted/70' : ''
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => node.type === 'folder' ? toggleFolder(node.id) : openFile(node)}
        >
          {node.type === 'folder' ? (
            <>
              {node.isOpen ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              {node.isOpen ? (
                <FolderOpen className="h-3 w-3 text-terminal-amber" />
              ) : (
                <Folder className="h-3 w-3 text-terminal-amber" />
              )}
            </>
          ) : (
            <>
              <div className="w-3" />
              <FileText className="h-3 w-3 text-terminal-green" />
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

  const activeTab = openTabs.find(t => t.id === activeTabId);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-sm">
      {/* Top Bar */}
      <div className="h-9 border-b border-[#333] flex items-center justify-between px-2 bg-[#252526]">
        <div className="flex items-center gap-2">
          <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as EditorMode)}>
            <TabsList className="h-7 bg-transparent">
              <TabsTrigger value="python" className="h-6 text-xs data-[state=active]:bg-terminal-green/20">
                🐍 Python
              </TabsTrigger>
              <TabsTrigger value="pinescript" className="h-6 text-xs data-[state=active]:bg-terminal-amber/20">
                📈 Pine Script
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={runCode}
            disabled={isRunning || !activeTab || (editorMode === 'python' && !pyodideReady)}
            className="h-7 px-3 text-xs bg-terminal-green/20 text-terminal-green hover:bg-terminal-green/30"
          >
            {isRunning ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Run
          </Button>
          
          {!pyodideReady && editorMode === 'python' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading Python...
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r border-[#333] flex flex-col bg-[#252526]">
          <div className="border-b border-[#333] p-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 w-7 p-0 ${sidebarTab === 'files' ? 'bg-muted/50' : ''}`}
                onClick={() => setSidebarTab('files')}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 w-7 p-0 ${sidebarTab === 'search' ? 'bg-muted/50' : ''}`}
                onClick={() => setSidebarTab('search')}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {sidebarTab === 'files' && (
              <div className="py-1">
                <div className="px-2 py-1 text-xs text-muted-foreground uppercase tracking-wider">
                  Explorer
                </div>
                {renderFileTree(files)}
              </div>
            )}
            
            {sidebarTab === 'search' && (
              <div className="p-2">
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 text-xs bg-[#3c3c3c] border-[#555]"
                />
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="h-9 border-b border-[#333] flex items-center bg-[#252526] overflow-x-auto">
            {openTabs.map(tab => (
              <div
                key={tab.id}
                className={`h-full flex items-center gap-2 px-3 border-r border-[#333] cursor-pointer text-xs ${
                  activeTabId === tab.id ? 'bg-[#1e1e1e]' : 'bg-[#2d2d2d]'
                }`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <FileText className="h-3 w-3 text-terminal-green" />
                <span>{tab.name}</span>
                {tab.isDirty && <span className="text-terminal-amber">●</span>}
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  className="hover:bg-muted/50 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            {activeTab ? (
              <Editor
                height="100%"
                language={editorMode === 'pinescript' ? 'pinescript' : activeTab.language}
                value={activeTab.content}
                theme={editorMode === 'pinescript' ? 'pinescript-dark' : 'vs-dark'}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  glyphMargin: true,
                  folding: true,
                  lineDecorationsWidth: 10,
                  lineNumbersMinChars: 3,
                  renderWhitespace: 'selection',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  insertSpaces: true,
                  wordWrap: 'on',
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                  padding: { top: 10 }
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Open a file to start editing</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terminal */}
      {showTerminal && (
        <div className="h-48 border-t border-[#333] flex flex-col bg-[#1e1e1e]">
          <div className="h-8 border-b border-[#333] flex items-center justify-between px-2 bg-[#252526]">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-terminal-green" />
              <span className="text-xs">Terminal</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setTerminalOutput([])}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowTerminal(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-2">
            <div className="font-mono text-xs space-y-1">
              {terminalOutput.map((output, i) => (
                <div
                  key={i}
                  className={`${
                    output.type === 'error' ? 'text-red-400' :
                    output.type === 'info' ? 'text-blue-400' :
                    'text-foreground'
                  }`}
                >
                  <span className="text-muted-foreground mr-2">
                    [{output.timestamp.toLocaleTimeString()}]
                  </span>
                  {output.content}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Bottom bar */}
      <div className="h-6 border-t border-[#333] flex items-center justify-between px-2 bg-[#007acc] text-white text-xs">
        <div className="flex items-center gap-3">
          <span>{editorMode === 'python' ? '🐍 Python' : '📈 Pine Script'}</span>
          {editorMode === 'python' && (
            <span className={pyodideReady ? 'text-emerald-300' : 'text-yellow-300'}>
              {pyodideReady ? '● Ready' : '○ Loading...'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowTerminal(!showTerminal)}>
            Terminal {showTerminal ? '▼' : '▲'}
          </button>
        </div>
      </div>
    </div>
  );
}
