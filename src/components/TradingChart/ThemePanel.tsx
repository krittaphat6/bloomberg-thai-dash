import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Palette, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Check 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  ChartTheme,
  PRESET_THEMES,
  saveTheme,
  saveCustomTheme,
  loadCustomThemes,
  deleteCustomTheme,
  exportTheme,
  importTheme,
} from './ChartThemes';

interface ThemePanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ChartTheme;
  onThemeChange: (theme: ChartTheme) => void;
}

const ColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <Label className="w-28 text-xs text-muted-foreground">{label}</Label>
    <div className="flex items-center gap-2 flex-1">
      <input
        type="color"
        value={value.startsWith('rgba') ? '#888888' : value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-border"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs font-mono"
      />
    </div>
  </div>
);

const ThemePanel: React.FC<ThemePanelProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
}) => {
  const [customThemes, setCustomThemes] = useState<ChartTheme[]>(loadCustomThemes);
  const [editingTheme, setEditingTheme] = useState<ChartTheme>(currentTheme);
  const [newThemeName, setNewThemeName] = useState('');

  const handleColorChange = (
    path: string[],
    value: string
  ) => {
    setEditingTheme(prev => {
      const updated = { ...prev, colors: { ...prev.colors } };
      let target: any = updated.colors;
      for (let i = 0; i < path.length - 1; i++) {
        target[path[i]] = { ...target[path[i]] };
        target = target[path[i]];
      }
      target[path[path.length - 1]] = value;
      return updated;
    });
  };

  const applyTheme = () => {
    onThemeChange(editingTheme);
    saveTheme(editingTheme);
    toast({ title: 'Theme Applied' });
  };

  const selectPreset = (theme: ChartTheme) => {
    setEditingTheme(theme);
    onThemeChange(theme);
    saveTheme(theme);
  };

  const saveAsCustom = () => {
    if (!newThemeName.trim()) {
      toast({ title: 'Enter theme name', variant: 'destructive' });
      return;
    }
    const customTheme: ChartTheme = {
      ...editingTheme,
      id: `custom-${Date.now()}`,
      name: newThemeName,
    };
    saveCustomTheme(customTheme);
    setCustomThemes(loadCustomThemes());
    setNewThemeName('');
    toast({ title: 'Theme Saved' });
  };

  const handleDeleteCustom = (themeId: string) => {
    deleteCustomTheme(themeId);
    setCustomThemes(loadCustomThemes());
    toast({ title: 'Theme Deleted' });
  };

  const handleExport = () => {
    const json = exportTheme(editingTheme);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${editingTheme.name.replace(/\s+/g, '-').toLowerCase()}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Theme Exported' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const theme = importTheme(event.target?.result as string);
      if (theme) {
        setEditingTheme(theme);
        toast({ title: 'Theme Imported' });
      } else {
        toast({ title: 'Invalid theme file', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent className="w-[400px] sm:w-[450px] bg-card border-terminal-green/30">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-terminal-green">
            <Palette className="w-5 h-5" />
            Theme Settings
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="presets" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted/30">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="customize">Customize</TabsTrigger>
            <TabsTrigger value="custom">My Themes</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {PRESET_THEMES.map(theme => (
                  <div
                    key={theme.id}
                    onClick={() => selectPreset(theme)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      currentTheme.id === theme.id
                        ? 'border-terminal-green bg-terminal-green/10'
                        : 'border-border hover:border-terminal-green/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{theme.name}</span>
                      {currentTheme.id === theme.id && (
                        <Check className="w-4 h-4 text-terminal-green" />
                      )}
                    </div>
                    {/* Preview */}
                    <div 
                      className="h-16 rounded flex items-end gap-1 p-2"
                      style={{ backgroundColor: theme.colors.background }}
                    >
                      {[0, 1, 0, 1, 0, 1, 1, 0].map((isBull, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${30 + Math.random() * 40}%`,
                            backgroundColor: isBull 
                              ? theme.colors.bullCandle.fill 
                              : theme.colors.bearCandle.fill,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="customize" className="mt-4">
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-terminal-green">Background</h4>
                  <ColorPicker
                    label="Background"
                    value={editingTheme.colors.background}
                    onChange={(v) => handleColorChange(['background'], v)}
                  />
                  <ColorPicker
                    label="Grid"
                    value={editingTheme.colors.grid}
                    onChange={(v) => handleColorChange(['grid'], v)}
                  />
                  <ColorPicker
                    label="Text"
                    value={editingTheme.colors.text}
                    onChange={(v) => handleColorChange(['text'], v)}
                  />
                  <ColorPicker
                    label="Crosshair"
                    value={editingTheme.colors.crosshair}
                    onChange={(v) => handleColorChange(['crosshair'], v)}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-terminal-green">Bull Candle</h4>
                  <ColorPicker
                    label="Fill"
                    value={editingTheme.colors.bullCandle.fill}
                    onChange={(v) => handleColorChange(['bullCandle', 'fill'], v)}
                  />
                  <ColorPicker
                    label="Border"
                    value={editingTheme.colors.bullCandle.border}
                    onChange={(v) => handleColorChange(['bullCandle', 'border'], v)}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-terminal-green">Bear Candle</h4>
                  <ColorPicker
                    label="Fill"
                    value={editingTheme.colors.bearCandle.fill}
                    onChange={(v) => handleColorChange(['bearCandle', 'fill'], v)}
                  />
                  <ColorPicker
                    label="Border"
                    value={editingTheme.colors.bearCandle.border}
                    onChange={(v) => handleColorChange(['bearCandle', 'border'], v)}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-terminal-green">Volume</h4>
                  <ColorPicker
                    label="Up"
                    value={editingTheme.colors.volumeUp}
                    onChange={(v) => handleColorChange(['volumeUp'], v)}
                  />
                  <ColorPicker
                    label="Down"
                    value={editingTheme.colors.volumeDown}
                    onChange={(v) => handleColorChange(['volumeDown'], v)}
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="mt-4 space-y-2">
              <Button onClick={applyTheme} className="w-full bg-terminal-green text-black">
                Apply Theme
              </Button>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Theme name..."
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={saveAsCustom}>
                  <Plus className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <label>
                    <Upload className="w-4 h-4 mr-1" />
                    Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <ScrollArea className="h-[500px]">
              {customThemes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No custom themes yet.
                  <br />
                  Create one in the Customize tab.
                </div>
              ) : (
                <div className="space-y-2">
                  {customThemes.map(theme => (
                    <div
                      key={theme.id}
                      className="p-3 rounded-lg border border-border hover:border-terminal-green/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{theme.name}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => selectPreset(theme)}
                            className="h-7 text-terminal-green"
                          >
                            Apply
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCustom(theme.id)}
                            className="h-7 text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div 
                        className="h-12 rounded flex items-end gap-1 p-2"
                        style={{ backgroundColor: theme.colors.background }}
                      >
                        {[0, 1, 0, 1, 0, 1].map((isBull, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm"
                            style={{
                              height: `${40 + Math.random() * 40}%`,
                              backgroundColor: isBull 
                                ? theme.colors.bullCandle.fill 
                                : theme.colors.bearCandle.fill,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default ThemePanel;
