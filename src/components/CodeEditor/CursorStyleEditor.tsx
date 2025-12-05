import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

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
}

interface TerminalOutput {
  type: 'output' | 'error' | 'info';
  content: string;
  timestamp: Date;
}

const DEFAULT_FILES: FileNode[] = [
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
import matplotlib.pyplot as plt

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
    
    # Create a simple plot
    plt.figure(figsize=(10, 6))
    plt.subplot(2, 1, 1)
    plt.plot(prices)
    plt.title('Price Series')
    plt.subplot(2, 1, 2)
    plt.plot(returns)
    plt.title('Returns')
    plt.tight_layout()
    plt.show()
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
  },
  {
    id: 'tests',
    name: 'tests',
    type: 'folder',
    isOpen: false,
    children: [
      {
        id: 'test_main',
        name: 'test_main.py',
        type: 'file',
        language: 'python',
        content: `# Unit tests
import unittest

class TestMain(unittest.TestCase):
    def test_hello(self):
        self.assertEqual(1 + 1, 2)
        
    def test_returns(self):
        import numpy as np
        prices = np.array([100, 110, 105, 115])
        returns = np.diff(prices) / prices[:-1]
        self.assertEqual(len(returns), 3)

if __name__ == '__main__':
    unittest.main()
`
      }
    ]
  }
];

export default function CursorStyleEditor() {
  // File system state
  const [files, setFiles] = useState<FileNode[]>(DEFAULT_FILES);
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'files' | 'search' | 'git'>('files');
  
  const editorRef = useRef<any>(null);
  const pyodideRef = useRef<any>(null);

  // Terminal output helper
  const addTerminalOutput = useCallback((type: 'output' | 'error' | 'info', content: string) => {
    setTerminalOutput(prev => [...prev, { type, content, timestamp: new Date() }]);
  }, []);

  // Initialize Pyodide
  useEffect(() => {
    const initPyodide = async () => {
      try {
        addTerminalOutput('info', '🐍 Loading Python runtime...');
        
        // Check if Pyodide script is already loaded
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
        
        // Setup matplotlib for web
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
        addTerminalOutput('info', '✅ Python runtime ready! Type code and click Run.');
        
      } catch (err) {
        addTerminalOutput('error', `Failed to initialize Python: ${err}`);
      }
    };

    initPyodide();
  }, [addTerminalOutput]);

  // Run Python code
  const runCode = useCallback(async () => {
    const activeTab = openTabs.find(t => t.id === activeTabId);
    if (!activeTab || !pyodideReady || !pyodideRef.current) {
      if (!pyodideReady) {
        toast.error('Python is still loading...');
      }
      return;
    }

    setIsRunning(true);
    addTerminalOutput('info', `▶ Running ${activeTab.name}...`);

    try {
      // Capture stdout
      pyodideRef.current.runPython(`
import sys
from io import StringIO
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = StringIO()
sys.stderr = StringIO()
      `);

      // Run the code
      await pyodideRef.current.runPythonAsync(activeTab.content);

      // Get output
      const stdout = pyodideRef.current.runPython(`sys.stdout.getvalue()`);
      const stderr = pyodideRef.current.runPython(`sys.stderr.getvalue()`);

      // Check for plots
      const hasPlot = pyodideRef.current.runPython(`
import matplotlib.pyplot as plt
len(plt.get_fignums()) > 0
      `);

      // Reset stdout/stderr
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
    } finally {
      setIsRunning(false);
    }
  }, [activeTabId, openTabs, pyodideReady, addTerminalOutput]);

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
    const newFile: FileNode = {
      id: `file-${Date.now()}`,
      name: 'untitled.py',
      type: 'file',
      language: 'python',
      content: '# New file\n'
    };
    
    // Add to first folder
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

  // Handle editor mount
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Set up keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      toast.success('File saved!');
      setOpenTabs(prev => prev.map(t => 
        t.id === activeTabId ? { ...t, isDirty: false } : t
      ));
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode);
  };

  // Render file tree
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

  const activeTab = openTabs.find(t => t.id === activeTabId);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] rounded-lg overflow-hidden">
      {/* Title Bar */}
      <div className="h-9 bg-[#323233] flex items-center justify-between px-4 text-xs border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <span className="text-[#00ff00] font-bold">ABLE</span>
          <span>Python Editor</span>
        </div>
        <div className="flex items-center gap-2">
          {pyodideReady ? (
            <span className="text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              Python Ready
            </span>
          ) : (
            <span className="text-yellow-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading Python...
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
          <Button
            variant="ghost"
            size="icon"
            className={`w-10 h-10 rounded ${sidebarTab === 'git' ? 'text-white bg-[#3c3c3c]' : 'text-gray-500'}`}
            onClick={() => setSidebarTab('git')}
          >
            <GitBranch className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="w-10 h-10 text-gray-500 rounded">
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Sidebar */}
        <div className="w-56 bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
          <div className="p-2 text-xs font-semibold text-[#bbbbbb] uppercase flex items-center justify-between">
            <span>{sidebarTab === 'files' ? 'Explorer' : sidebarTab === 'search' ? 'Search' : 'Source Control'}</span>
            {sidebarTab === 'files' && (
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={createNewFile}>
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {sidebarTab === 'files' && (
            <ScrollArea className="flex-1">
              <div className="p-1">
                {renderFileTree(files)}
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
          
          {sidebarTab === 'git' && (
            <div className="p-2 text-xs text-gray-500">
              No source control providers registered.
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
                <FileText className="w-4 h-4 text-blue-400" />
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
            <Button
              size="sm"
              onClick={runCode}
              disabled={!pyodideReady || isRunning || !activeTab}
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
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Open a file to start editing</p>
                  <p className="text-sm mt-2">Click on a file in the Explorer</p>
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
          <span>Python 3.11 (Pyodide)</span>
          <span>{activeTab?.name || 'No file'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>Spaces: 4</span>
        </div>
      </div>
    </div>
  );
}
