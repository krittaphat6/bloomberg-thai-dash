import { useState } from 'react';
import { Menu, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ThemeSwitcher from '@/components/ThemeSwitcher';

interface Panel {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface ComponentOption {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface TabletLayoutProps {
  panels: Panel[];
  availableComponents: ComponentOption[];
  onPanelAdd: (component: ComponentOption) => void;
  onPanelClose: (id: string) => void;
  currentTime: Date;
  onSignOut: () => void;
}

export function TabletLayout({
  panels,
  availableComponents,
  onPanelAdd,
  onPanelClose,
  currentTime,
  onSignOut
}: TabletLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<Panel | null>(panels[0] || null);
  const [showComponentPicker, setShowComponentPicker] = useState(false);

  const handleSelectPanel = (panel: Panel) => {
    setActivePanel(panel);
  };

  const handleAddComponent = (component: ComponentOption) => {
    onPanelAdd(component);
    setShowComponentPicker(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5 text-terminal-green" />
          </Button>
          <span className="text-xl font-bold text-terminal-green">ABLE TERMINAL</span>
        </div>
        
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <span className="text-sm text-terminal-green font-mono">
            {currentTime.toLocaleTimeString()} EST
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-destructive"
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={cn(
            "bg-card border-r border-border transition-all duration-300 flex flex-col",
            sidebarOpen ? "w-64" : "w-0 overflow-hidden"
          )}
        >
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="font-medium text-terminal-green">Panels</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowComponentPicker(true)}
            >
              <Plus className="w-4 h-4 text-terminal-green" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {panels.map((panel) => (
                <div
                  key={panel.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                    activePanel?.id === panel.id 
                      ? "bg-terminal-green/20 text-terminal-green" 
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => handleSelectPanel(panel)}
                >
                  <span className="text-sm truncate flex-1">{panel.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-50 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPanelClose(panel.id);
                      if (activePanel?.id === panel.id) {
                        setActivePanel(panels.find(p => p.id !== panel.id) || null);
                      }
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}

              {panels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>No panels open</p>
                  <p className="mt-1">Tap + to add one</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {activePanel ? (
            <div className="h-full overflow-auto">
              {activePanel.component}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-lg mb-2">No panel selected</p>
                <Button
                  variant="outline"
                  onClick={() => setShowComponentPicker(true)}
                  className="border-terminal-green text-terminal-green"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Panel
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Component Picker Modal */}
      {showComponentPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-terminal-green">Add Component</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowComponentPicker(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <ScrollArea className="max-h-[60vh]">
              <div className="grid grid-cols-3 gap-3 p-4">
                {availableComponents.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => handleAddComponent(comp)}
                    className="p-4 bg-card border border-border rounded-lg text-left hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-terminal-green">
                      {comp.title}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
