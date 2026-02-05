import React, { useState, useMemo } from 'react';
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
  Check,
  X,
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

// Enhanced Color Picker with visual swatch
const ColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => {
  // Parse rgba to hex for color input
  const hexValue = useMemo(() => {
    if (value.startsWith('rgba')) {
      const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }
    return value;
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <Label className="w-24 text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2 flex-1">
        <div className="relative">
          <input
            type="color"
            value={hexValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-border absolute inset-0 opacity-0"
          />
          <div 
            className="w-8 h-8 rounded border border-border cursor-pointer"
            style={{ backgroundColor: value }}
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs font-mono flex-1 bg-muted/30"
        />
      </div>
    </div>
  );
};

// Preview bars component - matches TradingView style
const ThemePreview: React.FC<{ theme: ChartTheme; height?: number }> = ({ theme, height = 48 }) => {
  const bars = useMemo(() => {
    // Generate random bars pattern
    const pattern = [1, 0, 1, 0, 1, 0, 1, 1];
    return pattern.map((isBull, i) => ({
      isBull: Boolean(isBull),
      height: 30 + Math.random() * 50,
    }));
  }, []);

  return (
    <div 
      className="rounded flex items-end gap-0.5 p-2"
      style={{ backgroundColor: theme.colors.background, height }}
    >
      {bars.map((bar, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all"
          style={{
            height: `${bar.height}%`,
            backgroundColor: bar.isBull 
              ? theme.colors.bullCandle.fill 
              : theme.colors.bearCandle.fill,
          }}
        />
      ))}
    </div>
  );
};

const ThemePanel: React.FC<ThemePanelProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
}) => {
  const [customThemes, setCustomThemes] = useState<ChartTheme[]>(loadCustomThemes);
  const [editingTheme, setEditingTheme] = useState<ChartTheme>(currentTheme);
  const [newThemeName, setNewThemeName] = useState('');
  const [activeTab, setActiveTab] = useState('presets');

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
    toast({ title: '✅ Theme Applied' });
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
    toast({ title: '✅ Theme Saved' });
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
      <SheetContent className="w-[380px] sm:w-[420px] bg-card border-terminal-green/30 p-0">
        <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2 text-terminal-green text-sm">
            <Palette className="w-4 h-4" />
            Theme Settings
          </SheetTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100vh-60px)]">
          <TabsList className="grid w-full grid-cols-3 bg-muted/30 rounded-none border-b border-border">
            <TabsTrigger value="presets" className="text-xs data-[state=active]:bg-terminal-green/20">
              Presets
            </TabsTrigger>
            <TabsTrigger value="customize" className="text-xs data-[state=active]:bg-terminal-green/20">
              Customize
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs data-[state=active]:bg-terminal-green/20">
              My Themes
            </TabsTrigger>
          </TabsList>

          {/* Presets Tab */}
          <TabsContent value="presets" className="flex-1 m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {PRESET_THEMES.map(theme => (
                  <div
                    key={theme.id}
                    onClick={() => selectPreset(theme)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      currentTheme.id === theme.id
                        ? 'border-terminal-green bg-terminal-green/5 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                        : 'border-border hover:border-terminal-green/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{theme.name}</span>
                      {currentTheme.id === theme.id && (
                        <Check className="w-4 h-4 text-terminal-green" />
                      )}
                    </div>
                    <ThemePreview theme={theme} height={56} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Customize Tab */}
          <TabsContent value="customize" className="flex-1 m-0 p-0 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Live Preview */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Preview</Label>
                  <ThemePreview theme={editingTheme} height={64} />
                </div>

                {/* Background Colors */}
                <div className="space-y-2">
                  <Label className="text-xs text-terminal-green uppercase tracking-wider font-medium">Background</Label>
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

                {/* Bull Candle */}
                <div className="space-y-2">
                  <Label className="text-xs text-green-500 uppercase tracking-wider font-medium">Bull Candle (ขึ้น)</Label>
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

                {/* Bear Candle */}
                <div className="space-y-2">
                  <Label className="text-xs text-red-500 uppercase tracking-wider font-medium">Bear Candle (ลง)</Label>
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

                {/* Volume */}
                <div className="space-y-2">
                  <Label className="text-xs text-terminal-amber uppercase tracking-wider font-medium">Volume</Label>
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

            {/* Actions Footer */}
            <div className="p-4 border-t border-border space-y-2">
              <Button onClick={applyTheme} className="w-full bg-terminal-green hover:bg-terminal-green/90 text-black font-medium">
                Apply Theme
              </Button>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Theme name..."
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  className="flex-1 h-8 text-xs"
                />
                <Button variant="outline" size="sm" onClick={saveAsCustom} className="h-8">
                  <Plus className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={handleExport}>
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" asChild>
                  <label className="cursor-pointer">
                    <Upload className="w-3 h-3 mr-1" />
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

          {/* My Themes Tab */}
          <TabsContent value="custom" className="flex-1 m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                {customThemes.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <Palette className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No custom themes yet</p>
                    <p className="text-xs mt-1">Create one in the Customize tab</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customThemes.map(theme => (
                      <div
                        key={theme.id}
                        className={`p-3 rounded-lg border transition-all ${
                          currentTheme.id === theme.id 
                            ? 'border-terminal-green bg-terminal-green/5' 
                            : 'border-border hover:border-terminal-green/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{theme.name}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => selectPreset(theme)}
                              className="h-6 px-2 text-xs text-terminal-green hover:bg-terminal-green/20"
                            >
                              Apply
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCustom(theme.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <ThemePreview theme={theme} height={48} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default ThemePanel;
