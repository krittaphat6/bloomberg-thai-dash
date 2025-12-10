import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Code, 
  Play, 
  Trash2, 
  Eye, 
  EyeOff,
  Settings,
  FolderOpen
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { 
  SavedScript, 
  loadAllScripts, 
  PINE_TEMPLATES 
} from '@/utils/PineScriptStorage';
import { PineScriptRunner, OHLCData, PineScriptResult } from '@/utils/PineScriptRunner';

interface ActiveIndicator {
  id: string;
  name: string;
  scriptId: string;
  visible: boolean;
  color: string;
  results: PineScriptResult[];
}

interface CustomIndicatorsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chartData: OHLCData[];
  activeIndicators: ActiveIndicator[];
  onAddIndicator: (indicator: ActiveIndicator) => void;
  onRemoveIndicator: (id: string) => void;
  onToggleIndicator: (id: string) => void;
  onOpenPineEditor: () => void;
}

const CustomIndicatorsPanel: React.FC<CustomIndicatorsPanelProps> = ({
  isOpen,
  onClose,
  chartData,
  activeIndicators,
  onAddIndicator,
  onRemoveIndicator,
  onToggleIndicator,
  onOpenPineEditor,
}) => {
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSavedScripts(loadAllScripts());
    }
  }, [isOpen]);

  const filteredScripts = savedScripts.filter(script => {
    const matchesSearch = script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || script.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleApplyScript = async (script: SavedScript) => {
    if (chartData.length === 0) {
      toast({ title: 'No chart data', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const results = await PineScriptRunner.runPineScript(script.code, chartData);
      
      const indicator: ActiveIndicator = {
        id: `custom-${Date.now()}`,
        name: script.name,
        scriptId: script.id,
        visible: true,
        color: results[0]?.color || '#f97316',
        results,
      };

      onAddIndicator(indicator);
      toast({ title: `${script.name} applied` });
    } catch (error: any) {
      toast({ 
        title: 'Script Error', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = async (template: typeof PINE_TEMPLATES[0]) => {
    if (chartData.length === 0) {
      toast({ title: 'No chart data', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const results = await PineScriptRunner.runPineScript(template.code, chartData);
      
      const indicator: ActiveIndicator = {
        id: `template-${Date.now()}`,
        name: template.name,
        scriptId: template.id,
        visible: true,
        color: results[0]?.color || '#3b82f6',
        results,
      };

      onAddIndicator(indicator);
      toast({ title: `${template.name} applied` });
    } catch (error: any) {
      toast({ 
        title: 'Script Error', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categories = ['all', 'indicator', 'oscillator', 'strategy'];

  return (
    <Sheet open={isOpen} onOpenChange={() => onClose()}>
      <SheetContent className="w-[400px] sm:w-[500px] bg-card border-terminal-green/30">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-terminal-green">
            <Code className="w-5 h-5" />
            Custom Indicators
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="active" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted/30">
            <TabsTrigger value="active">Active ({activeIndicators.length})</TabsTrigger>
            <TabsTrigger value="saved">My Scripts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Active Indicators */}
          <TabsContent value="active" className="mt-4">
            <ScrollArea className="h-[500px]">
              {activeIndicators.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No active custom indicators.
                  <br />
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      const templateTab = document.querySelector('[value="templates"]');
                      (templateTab as HTMLElement)?.click();
                    }}
                  >
                    Browse Templates
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeIndicators.map(indicator => (
                    <div
                      key={indicator.id}
                      className="p-3 rounded-lg border border-border bg-muted/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: indicator.color }}
                          />
                          <span className="font-medium">{indicator.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onToggleIndicator(indicator.id)}
                          >
                            {indicator.visible ? (
                              <Eye className="w-4 h-4 text-terminal-green" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500"
                            onClick={() => onRemoveIndicator(indicator.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {indicator.results.length} series
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Saved Scripts */}
          <TabsContent value="saved" className="mt-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search scripts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button variant="outline" onClick={onOpenPineEditor}>
                  <Code className="w-4 h-4 mr-1" />
                  Editor
                </Button>
              </div>

              <div className="flex gap-1 flex-wrap">
                {categories.map(cat => (
                  <Badge
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>

              <ScrollArea className="h-[400px]">
                {filteredScripts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No saved scripts found.
                    <br />
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={onOpenPineEditor}
                    >
                      <FolderOpen className="w-4 h-4 mr-1" />
                      Open Pine Editor
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredScripts.map(script => (
                      <div
                        key={script.id}
                        className="p-3 rounded-lg border border-border hover:border-terminal-green/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{script.name}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {script.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {script.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(script.updatedAt).toLocaleDateString()}
                          </span>
                          <Button
                            size="sm"
                            className="h-7 bg-terminal-green text-black hover:bg-terminal-green/80"
                            onClick={() => handleApplyScript(script)}
                            disabled={isLoading}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {PINE_TEMPLATES.map(template => (
                  <div
                    key={template.id}
                    className="p-3 rounded-lg border border-border hover:border-terminal-cyan/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-terminal-cyan">{template.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7"
                        onClick={onOpenPineEditor}
                      >
                        <Code className="w-3 h-3 mr-1" />
                        View Code
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 bg-terminal-cyan text-black hover:bg-terminal-cyan/80"
                        onClick={() => handleApplyTemplate(template)}
                        disabled={isLoading}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default CustomIndicatorsPanel;
