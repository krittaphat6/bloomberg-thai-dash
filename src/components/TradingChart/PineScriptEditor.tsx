import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Code, Play, Save, FileCode, Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { pineScriptTemplates, PineScriptTemplate } from '@/utils/PineScriptTemplates';
import { PineScriptRunner, PineScriptResult, OHLCData } from '@/utils/PineScriptRunner';

interface PineScriptEditorProps {
  isOpen: boolean;
  onClose: () => void;
  chartData: OHLCData[];
  onApplyIndicator: (results: PineScriptResult[], name: string) => void;
}

interface SavedScript {
  id: string;
  name: string;
  code: string;
  createdAt: number;
}

const PineScriptEditor: React.FC<PineScriptEditorProps> = ({
  isOpen,
  onClose,
  chartData,
  onApplyIndicator,
}) => {
  const [code, setCode] = useState(pineScriptTemplates[0]?.code || '');
  const [scriptName, setScriptName] = useState('My Script');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PineScriptResult[] | null>(null);
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>(() => {
    const saved = localStorage.getItem('pine-scripts');
    return saved ? JSON.parse(saved) : [];
  });

  const runScript = useCallback(async () => {
    if (!chartData.length) {
      toast({
        title: 'No Data',
        description: 'Please load chart data first',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const result = await PineScriptRunner.runPineScript(code, chartData);
      setResults(result);
      toast({
        title: 'Script Executed',
        description: `Generated ${result.length} indicator(s)`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Script Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, chartData]);

  const applyToChart = useCallback(() => {
    if (results && results.length > 0) {
      onApplyIndicator(results, scriptName);
      toast({
        title: 'Applied to Chart',
        description: `Added ${results.length} indicator(s)`,
      });
    }
  }, [results, scriptName, onApplyIndicator]);

  const saveScript = useCallback(() => {
    const newScript: SavedScript = {
      id: `script-${Date.now()}`,
      name: scriptName,
      code,
      createdAt: Date.now(),
    };
    const updated = [...savedScripts, newScript];
    setSavedScripts(updated);
    localStorage.setItem('pine-scripts', JSON.stringify(updated));
    toast({
      title: 'Script Saved',
      description: scriptName,
    });
  }, [code, scriptName, savedScripts]);

  const loadScript = useCallback((script: SavedScript) => {
    setCode(script.code);
    setScriptName(script.name);
    setError(null);
    setResults(null);
  }, []);

  const deleteScript = useCallback((id: string) => {
    const updated = savedScripts.filter(s => s.id !== id);
    setSavedScripts(updated);
    localStorage.setItem('pine-scripts', JSON.stringify(updated));
  }, [savedScripts]);

  const loadTemplate = useCallback((template: PineScriptTemplate) => {
    setCode(template.code);
    setScriptName(template.name);
    setError(null);
    setResults(null);
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] bg-card border-l border-terminal-cyan/30">
        <SheetHeader>
          <SheetTitle className="text-terminal-cyan font-mono flex items-center gap-2">
            <Code className="w-5 h-5" />
            Pine Script Editor
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="editor" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            {/* Script name */}
            <input
              type="text"
              value={scriptName}
              onChange={e => setScriptName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-terminal-cyan/30 rounded text-sm font-mono"
              placeholder="Script Name"
            />

            {/* Code editor */}
            <div className="relative">
              <Textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                className="h-[300px] font-mono text-xs bg-[#0d1117] border-terminal-cyan/30 resize-none"
                placeholder="//@version=5
indicator('My Indicator', overlay=true)
..."
              />
              <Badge className="absolute top-2 right-2 bg-terminal-cyan/20 text-terminal-cyan">
                Pine Script v5
              </Badge>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Results */}
            {results && results.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
                <div className="flex-1">
                  <p className="text-sm text-green-400 mb-2">
                    Generated {results.length} indicator(s):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {results.map((r, i) => (
                      <Badge key={i} style={{ backgroundColor: r.color + '30', color: r.color }}>
                        {r.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={runScript}
                disabled={isRunning || !code.trim()}
                className="flex-1 bg-terminal-cyan text-black hover:bg-terminal-cyan/80"
              >
                <Play className="w-4 h-4 mr-2" />
                {isRunning ? 'Running...' : 'Run Script'}
              </Button>
              <Button
                variant="outline"
                onClick={applyToChart}
                disabled={!results || results.length === 0}
              >
                Add to Chart
              </Button>
              <Button variant="outline" onClick={saveScript}>
                <Save className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <ScrollArea className="h-[450px]">
              <div className="space-y-2 pr-4">
                {pineScriptTemplates.map(template => (
                  <div
                    key={template.id}
                    className="p-3 rounded border border-muted hover:border-terminal-cyan/50 cursor-pointer transition-colors"
                    onClick={() => loadTemplate(template)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileCode className="w-4 h-4 text-terminal-cyan" />
                      <span className="font-medium">{template.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="saved">
            <ScrollArea className="h-[450px]">
              {savedScripts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileCode className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No saved scripts</p>
                  <p className="text-sm">Save your scripts to access them later</p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {savedScripts.map(script => (
                    <div
                      key={script.id}
                      className="p-3 rounded border border-muted hover:border-terminal-cyan/50 cursor-pointer transition-colors group"
                      onClick={() => loadScript(script)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-terminal-cyan" />
                          <span className="font-medium">{script.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500"
                          onClick={e => {
                            e.stopPropagation();
                            deleteScript(script.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(script.createdAt).toLocaleString()}
                      </p>
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

export default PineScriptEditor;
