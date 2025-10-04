import { useState, useEffect, useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Settings, RotateCcw, Layout as LayoutIcon, Clock, Network, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Panel Components
import { NewsPanel } from '@/components/dashboard/NewsPanel';
import { IndicesPanel } from '@/components/dashboard/IndicesPanel';
import { PeersPanel } from '@/components/dashboard/PeersPanel';
import { HoldersPanel } from '@/components/dashboard/HoldersPanel';
import { BoardPanel } from '@/components/dashboard/BoardPanel';
import { BalanceSheetPanel } from '@/components/dashboard/BalanceSheetPanel';
import { LayoutSettings } from '@/components/dashboard/LayoutSettings';
import { PanelHeader } from '@/components/dashboard/PanelHeader';
import { NetworkNotesGraph } from '@/components/NetworkNotesGraph';

const defaultLayout: Layout[] = [
  { i: 'relationship-map', x: 0, y: 0, w: 7, h: 10, minW: 4, minH: 6 },
  { i: 'news', x: 7, y: 0, w: 5, h: 5, minW: 3, minH: 4 },
  { i: 'indices', x: 7, y: 5, w: 5, h: 5, minW: 3, minH: 4 },
  { i: 'peers', x: 0, y: 10, w: 4, h: 6, minW: 3, minH: 4 },
  { i: 'holders', x: 4, y: 10, w: 4, h: 6, minW: 3, minH: 4 },
  { i: 'board', x: 8, y: 10, w: 4, h: 6, minW: 3, minH: 4 },
  { i: 'balance', x: 0, y: 16, w: 12, h: 6, minW: 6, minH: 4 }
];

const templates = {
  trading: [
    { i: 'relationship-map', x: 0, y: 0, w: 8, h: 12, minW: 4, minH: 6 },
    { i: 'indices', x: 8, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'news', x: 8, y: 6, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'peers', x: 0, y: 12, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 'holders', x: 6, y: 12, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 'board', x: 0, y: 18, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'balance', x: 4, y: 18, w: 8, h: 6, minW: 6, minH: 4 }
  ],
  analysis: [
    { i: 'relationship-map', x: 0, y: 0, w: 6, h: 10, minW: 4, minH: 6 },
    { i: 'balance', x: 6, y: 0, w: 6, h: 10, minW: 6, minH: 4 },
    { i: 'peers', x: 0, y: 10, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'holders', x: 4, y: 10, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'board', x: 8, y: 10, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'news', x: 0, y: 16, w: 6, h: 5, minW: 3, minH: 4 },
    { i: 'indices', x: 6, y: 16, w: 6, h: 5, minW: 3, minH: 4 }
  ],
  overview: defaultLayout
};

export default function RelationshipDashboard() {
  const [layout, setLayout] = useState<Layout[]>(defaultLayout);
  const [visiblePanels, setVisiblePanels] = useState<Record<string, boolean>>({
    'relationship-map': true,
    'news': true,
    'indices': true,
    'peers': true,
    'holders': true,
    'board': true,
    'balance': true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load saved layout and preferences
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout');
    const savedPanels = localStorage.getItem('visible-panels');
    
    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout));
      } catch (e) {
        console.error('Failed to load layout:', e);
      }
    }
    
    if (savedPanels) {
      try {
        setVisiblePanels(JSON.parse(savedPanels));
      } catch (e) {
        console.error('Failed to load panel visibility:', e);
      }
    }
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save layout changes
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout);
    localStorage.setItem('dashboard-layout', JSON.stringify(newLayout));
  }, []);

  // Reset to default layout
  const handleReset = useCallback(() => {
    setLayout(defaultLayout);
    localStorage.setItem('dashboard-layout', JSON.stringify(defaultLayout));
  }, []);

  // Apply template
  const handleTemplateChange = useCallback((template: string) => {
    const newLayout = templates[template as keyof typeof templates] || defaultLayout;
    setLayout(newLayout);
    localStorage.setItem('dashboard-layout', JSON.stringify(newLayout));
  }, []);

  // Panel visibility
  const handleApplySettings = useCallback((panels: Record<string, boolean>) => {
    setVisiblePanels(panels);
    localStorage.setItem('visible-panels', JSON.stringify(panels));
  }, []);

  const handleMaximize = useCallback((panelId: string) => {
    setMaximizedPanel(panelId);
  }, []);

  const handleCloseMaximize = useCallback(() => {
    setMaximizedPanel(null);
  }, []);

  const handleClosePanel = useCallback((panelId: string) => {
    setVisiblePanels(prev => ({
      ...prev,
      [panelId]: false
    }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (maximizedPanel) {
          handleCloseMaximize();
        } else if (showSettings) {
          setShowSettings(false);
        }
      }
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedPanel, showSettings, handleReset, handleCloseMaximize]);

  // Filter layout to only show visible panels
  const filteredLayout = layout.filter(item => visiblePanels[item.i]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Dashboard Header */}
      <header className="h-16 bg-gray-800 border-b border-gray-700 px-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Network className="h-6 w-6 text-blue-400" />
          <h1 className="text-lg font-semibold">Able Terminal - Relationship Dashboard</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
          </div>
          
          <Select onValueChange={handleTemplateChange}>
            <SelectTrigger className="w-40 h-9 bg-gray-700 border-gray-600">
              <LayoutIcon className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Layout" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="trading">Trading View</SelectItem>
              <SelectItem value="analysis">Analysis View</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="h-9"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-9"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="p-4">
        <GridLayout
          className="layout"
          layout={filteredLayout}
          cols={12}
          rowHeight={40}
          width={1400}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          isDraggable={true}
          isResizable={true}
          compactType="vertical"
          preventCollision={false}
        >
          {/* Relationship Map Panel */}
          {visiblePanels['relationship-map'] && (
            <div key="relationship-map" className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col">
              <PanelHeader
                title="Relationship Map"
                icon={<Network className="h-4 w-4" />}
                subtitle="Network visualization"
                onMaximize={() => handleMaximize('relationship-map')}
                onClose={() => handleClosePanel('relationship-map')}
              />
              <div className="flex-1 overflow-hidden">
                <NetworkNotesGraph />
              </div>
            </div>
          )}

          {/* News Panel */}
          {visiblePanels['news'] && (
            <div key="news">
              <NewsPanel
                onMaximize={() => handleMaximize('news')}
                onClose={() => handleClosePanel('news')}
              />
            </div>
          )}

          {/* Indices Panel */}
          {visiblePanels['indices'] && (
            <div key="indices">
              <IndicesPanel
                onMaximize={() => handleMaximize('indices')}
                onClose={() => handleClosePanel('indices')}
              />
            </div>
          )}

          {/* Peers Panel */}
          {visiblePanels['peers'] && (
            <div key="peers">
              <PeersPanel
                onMaximize={() => handleMaximize('peers')}
                onClose={() => handleClosePanel('peers')}
              />
            </div>
          )}

          {/* Holders Panel */}
          {visiblePanels['holders'] && (
            <div key="holders">
              <HoldersPanel
                onMaximize={() => handleMaximize('holders')}
                onClose={() => handleClosePanel('holders')}
              />
            </div>
          )}

          {/* Board Panel */}
          {visiblePanels['board'] && (
            <div key="board">
              <BoardPanel
                onMaximize={() => handleMaximize('board')}
                onClose={() => handleClosePanel('board')}
              />
            </div>
          )}

          {/* Balance Sheet Panel */}
          {visiblePanels['balance'] && (
            <div key="balance">
              <BalanceSheetPanel
                onMaximize={() => handleMaximize('balance')}
                onClose={() => handleClosePanel('balance')}
              />
            </div>
          )}
        </GridLayout>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <LayoutSettings
          visiblePanels={visiblePanels}
          onApply={handleApplySettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Maximized Panel Overlay */}
      {maximizedPanel && (
        <div className="fixed inset-0 z-50 bg-black/95 animate-fade-in">
          <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Maximized View</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseMaximize}
              >
                <X className="h-4 w-4 mr-2" />
                Close (ESC)
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              {maximizedPanel === 'relationship-map' && (
                <div className="h-full bg-gray-800 rounded-lg border border-gray-700">
                  <NetworkNotesGraph />
                </div>
              )}
              {maximizedPanel === 'news' && (
                <NewsPanel
                  onMaximize={() => {}}
                  onClose={handleCloseMaximize}
                />
              )}
              {maximizedPanel === 'indices' && (
                <IndicesPanel
                  onMaximize={() => {}}
                  onClose={handleCloseMaximize}
                />
              )}
              {maximizedPanel === 'peers' && (
                <PeersPanel
                  onMaximize={() => {}}
                  onClose={handleCloseMaximize}
                />
              )}
              {maximizedPanel === 'holders' && (
                <HoldersPanel
                  onMaximize={() => {}}
                  onClose={handleCloseMaximize}
                />
              )}
              {maximizedPanel === 'board' && (
                <BoardPanel
                  onMaximize={() => {}}
                  onClose={handleCloseMaximize}
                />
              )}
              {maximizedPanel === 'balance' && (
                <BalanceSheetPanel
                  onMaximize={() => {}}
                  onClose={handleCloseMaximize}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
