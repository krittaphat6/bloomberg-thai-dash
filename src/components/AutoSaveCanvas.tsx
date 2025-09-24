import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Clock, 
  History, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  Download, 
  Upload,
  GitBranch,
  RotateCcw,
  Trash2,
  Copy
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CanvasData } from '@/types/canvas';

interface CanvasVersion {
  id: string;
  timestamp: Date;
  description: string;
  data: CanvasData;
  checksum: string;
  changes: string[];
  size: number;
}

interface AutoSaveSettings {
  interval: number; // seconds
  enabled: boolean;
  maxVersions: number;
  showIndicator: boolean;
  compression: boolean;
}

interface AutoSaveCanvasProps {
  canvasData: CanvasData;
  onDataChange: (data: CanvasData) => void;
  onSave?: (data: CanvasData) => void;
  onLoad?: (data: CanvasData) => void;
}

export default function AutoSaveCanvas({ canvasData, onDataChange, onSave, onLoad }: AutoSaveCanvasProps) {
  const { toast } = useToast();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [versions, setVersions] = useState<CanvasVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<CanvasVersion | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{v1: CanvasVersion | null; v2: CanvasVersion | null}>({
    v1: null,
    v2: null
  });

  const [settings, setSettings] = useState<AutoSaveSettings>({
    interval: 3,
    enabled: true,
    maxVersions: 10,
    showIndicator: true,
    compression: true
  });

  // Load settings and versions from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('canvas-autosave-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    const savedVersions = localStorage.getItem('canvas-versions');
    if (savedVersions) {
      const parsedVersions = JSON.parse(savedVersions);
      setVersions(parsedVersions.map((v: any) => ({
        ...v,
        timestamp: new Date(v.timestamp)
      })));
    }

    // Check for unsaved changes on page load
    const unsavedData = localStorage.getItem('canvas-unsaved');
    if (unsavedData) {
      setShowRecoveryDialog(true);
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('canvas-autosave-settings', JSON.stringify(settings));
  }, [settings]);

  // Calculate checksum for integrity validation
  const calculateChecksum = useCallback((data: CanvasData): string => {
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }, []);

  // Detect changes in canvas data
  useEffect(() => {
    if (!canvasData || versions.length === 0) return;

    const currentChecksum = calculateChecksum(canvasData);
    const lastVersion = versions[0];
    
    if (lastVersion && currentChecksum !== lastVersion.checksum) {
      setHasUnsavedChanges(true);
      // Store unsaved changes
      localStorage.setItem('canvas-unsaved', JSON.stringify(canvasData));
    }
  }, [canvasData, versions, calculateChecksum]);

  // Auto-save functionality
  useEffect(() => {
    if (!settings.enabled || !hasUnsavedChanges) return;

    const interval = setInterval(() => {
      performAutoSave();
    }, settings.interval * 1000);

    return () => clearInterval(interval);
  }, [settings.enabled, settings.interval, hasUnsavedChanges]);

  const performAutoSave = useCallback(async () => {
    if (!canvasData || !hasUnsavedChanges) return;

    setSaveStatus('saving');
    setSaveProgress(0);

    try {
      // Simulate save progress
      for (let i = 0; i <= 100; i += 20) {
        setSaveProgress(i);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const changes = detectChanges(versions[0]?.data, canvasData);
      const checksum = calculateChecksum(canvasData);
      
      const newVersion: CanvasVersion = {
        id: `version-${Date.now()}`,
        timestamp: new Date(),
        description: generateAutoDescription(changes),
        data: { ...canvasData },
        checksum,
        changes,
        size: JSON.stringify(canvasData).length
      };

      const updatedVersions = [newVersion, ...versions].slice(0, settings.maxVersions);
      setVersions(updatedVersions);
      
      // Save to localStorage with compression if enabled
      const dataToSave = settings.compression 
        ? compressData(updatedVersions) 
        : updatedVersions;
      
      localStorage.setItem('canvas-versions', JSON.stringify(dataToSave));
      localStorage.removeItem('canvas-unsaved');
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      
      if (onSave) {
        onSave(canvasData);
      }

      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);

    } catch (error) {
      setSaveStatus('error');
      toast({
        title: "Save Error",
        description: "Failed to auto-save canvas",
        variant: "destructive"
      });
    }
  }, [canvasData, hasUnsavedChanges, versions, settings, calculateChecksum, onSave, toast]);

  const detectChanges = (oldData: CanvasData | undefined, newData: CanvasData): string[] => {
    if (!oldData) return ['Canvas created'];

    const changes: string[] = [];
    
    if (oldData.nodes.length !== newData.nodes.length) {
      const diff = newData.nodes.length - oldData.nodes.length;
      changes.push(diff > 0 ? `Added ${diff} nodes` : `Removed ${Math.abs(diff)} nodes`);
    }
    
    if (oldData.edges.length !== newData.edges.length) {
      const diff = newData.edges.length - oldData.edges.length;
      changes.push(diff > 0 ? `Added ${diff} connections` : `Removed ${Math.abs(diff)} connections`);
    }

    // Check for node movements
    const movedNodes = newData.nodes.filter(newNode => {
      const oldNode = oldData.nodes.find(n => n.id === newNode.id);
      return oldNode && (oldNode.x !== newNode.x || oldNode.y !== newNode.y);
    });
    
    if (movedNodes.length > 0) {
      changes.push(`Moved ${movedNodes.length} nodes`);
    }

    return changes.length > 0 ? changes : ['Minor changes'];
  };

  const generateAutoDescription = (changes: string[]): string => {
    if (changes.length === 0) return 'Auto-save';
    return `Auto-save: ${changes.join(', ')}`;
  };

  const compressData = (data: any): any => {
    // Simple compression simulation
    return data;
  };

  const manualSave = async () => {
    const description = prompt('Version description (optional):');
    
    setSaveStatus('saving');
    const changes = detectChanges(versions[0]?.data, canvasData);
    const checksum = calculateChecksum(canvasData);
    
    const newVersion: CanvasVersion = {
      id: `manual-${Date.now()}`,
      timestamp: new Date(),
      description: description || generateAutoDescription(changes),
      data: { ...canvasData },
      checksum,
      changes,
      size: JSON.stringify(canvasData).length
    };

    const updatedVersions = [newVersion, ...versions].slice(0, settings.maxVersions);
    setVersions(updatedVersions);
    localStorage.setItem('canvas-versions', JSON.stringify(updatedVersions));
    localStorage.removeItem('canvas-unsaved');
    
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
    setSaveStatus('saved');
    
    toast({
      title: "Manual Save Complete",
      description: "Canvas saved successfully"
    });
  };

  const restoreVersion = (version: CanvasVersion) => {
    onDataChange(version.data);
    if (onLoad) {
      onLoad(version.data);
    }
    
    toast({
      title: "Version Restored",
      description: `Restored to version from ${version.timestamp.toLocaleString()}`
    });
  };

  const deleteVersion = (versionId: string) => {
    const updatedVersions = versions.filter(v => v.id !== versionId);
    setVersions(updatedVersions);
    localStorage.setItem('canvas-versions', JSON.stringify(updatedVersions));
    
    toast({
      title: "Version Deleted",
      description: "Version removed from history"
    });
  };

  const exportVersions = () => {
    const dataStr = JSON.stringify(versions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canvas-versions-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importVersions = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedVersions = JSON.parse(e.target?.result as string);
        setVersions(importedVersions.map((v: any) => ({
          ...v,
          timestamp: new Date(v.timestamp)
        })));
        
        toast({
          title: "Import Successful",
          description: `Imported ${importedVersions.length} versions`
        });
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Failed to import versions",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Clock className="h-4 w-4 animate-spin text-terminal-amber" />;
      case 'saved':
        return <CheckCircle className="h-4 w-4 text-terminal-green" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return hasUnsavedChanges ? <AlertCircle className="h-4 w-4 text-terminal-amber" /> : null;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return `Saved ${lastSaved?.toLocaleTimeString()}`;
      case 'error':
        return 'Save failed';
      default:
        return hasUnsavedChanges ? 'Unsaved changes' : lastSaved ? `Last saved ${lastSaved.toLocaleTimeString()}` : 'No saves yet';
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-save Status Bar */}
      {settings.showIndicator && (
        <Card className="border-terminal-green/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getSaveStatusIcon()}
                <span className="text-sm">{getSaveStatusText()}</span>
                {saveStatus === 'saving' && (
                  <Progress value={saveProgress} className="w-24 h-2" />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={settings.enabled ? "default" : "outline"}>
                  Auto-save {settings.enabled ? 'ON' : 'OFF'}
                </Badge>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={manualSave}
                  disabled={!hasUnsavedChanges}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <History className="h-3 w-3 mr-1" />
                      History ({versions.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Canvas Version History</DialogTitle>
                    </DialogHeader>
                    
                    <Tabs defaultValue="history" className="h-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="history">Version History</TabsTrigger>
                        <TabsTrigger value="compare">Compare Versions</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="history" className="h-full overflow-auto">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              {versions.length} versions • Total size: {formatFileSize(versions.reduce((sum, v) => sum + v.size, 0))}
                            </span>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={exportVersions}>
                                <Download className="h-3 w-3 mr-1" />
                                Export
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => document.getElementById('version-import')?.click()}>
                                <Upload className="h-3 w-3 mr-1" />
                                Import
                              </Button>
                              <input
                                id="version-import"
                                type="file"
                                accept=".json"
                                onChange={importVersions}
                                className="hidden"
                              />
                            </div>
                          </div>
                          
                          {versions.map((version, index) => (
                            <Card key={version.id} className={index === 0 ? 'border-terminal-green' : ''}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={index === 0 ? "default" : "outline"}>
                                        {index === 0 ? 'Current' : `v${versions.length - index}`}
                                      </Badge>
                                      <span className="font-medium">{version.description}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {version.timestamp.toLocaleString()} • {formatFileSize(version.size)}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {version.changes.map((change, i) => (
                                        <Badge key={i} variant="outline" className="text-xs">
                                          {change}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    {index > 0 && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => restoreVersion(version)}
                                        >
                                          <RotateCcw className="h-3 w-3 mr-1" />
                                          Restore
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => deleteVersion(version.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="compare" className="h-full">
                        <Card>
                          <CardHeader>
                            <CardTitle>Compare Versions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Version 1</label>
                                <Select onValueChange={(value) => setCompareVersions(prev => ({...prev, v1: versions.find(v => v.id === value) || null}))}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select version..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {versions.map((version, index) => (
                                      <SelectItem key={version.id} value={version.id}>
                                        v{versions.length - index} - {version.description}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Version 2</label>
                                <Select onValueChange={(value) => setCompareVersions(prev => ({...prev, v2: versions.find(v => v.id === value) || null}))}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select version..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {versions.map((version, index) => (
                                      <SelectItem key={version.id} value={version.id}>
                                        v{versions.length - index} - {version.description}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            {compareVersions.v1 && compareVersions.v2 && (
                              <div className="mt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-sm">{compareVersions.v1.description}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-2 text-sm">
                                        <div>Nodes: {compareVersions.v1.data.nodes.length}</div>
                                        <div>Edges: {compareVersions.v1.data.edges.length}</div>
                                        <div>Size: {formatFileSize(compareVersions.v1.size)}</div>
                                        <div>Date: {compareVersions.v1.timestamp.toLocaleString()}</div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                  
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-sm">{compareVersions.v2.description}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-2 text-sm">
                                        <div>Nodes: {compareVersions.v2.data.nodes.length}</div>
                                        <div>Edges: {compareVersions.v2.data.edges.length}</div>
                                        <div>Size: {formatFileSize(compareVersions.v2.size)}</div>
                                        <div>Date: {compareVersions.v2.timestamp.toLocaleString()}</div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                                
                                <Alert>
                                  <GitBranch className="h-4 w-4" />
                                  <AlertDescription>
                                    Node difference: {compareVersions.v2.data.nodes.length - compareVersions.v1.data.nodes.length} | 
                                    Edge difference: {compareVersions.v2.data.edges.length - compareVersions.v1.data.edges.length}
                                  </AlertDescription>
                                </Alert>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </TabsContent>
                      
                      <TabsContent value="settings" className="h-full">
                        <Card>
                          <CardHeader>
                            <CardTitle>Auto-save Settings</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Enable Auto-save</label>
                              <Button
                                size="sm"
                                variant={settings.enabled ? "default" : "outline"}
                                onClick={() => setSettings(prev => ({...prev, enabled: !prev.enabled}))}
                              >
                                {settings.enabled ? 'Enabled' : 'Disabled'}
                              </Button>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Save Interval (seconds)</label>
                              <Select 
                                value={settings.interval.toString()} 
                                onValueChange={(value) => setSettings(prev => ({...prev, interval: parseInt(value)}))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 second</SelectItem>
                                  <SelectItem value="3">3 seconds</SelectItem>
                                  <SelectItem value="5">5 seconds</SelectItem>
                                  <SelectItem value="10">10 seconds</SelectItem>
                                  <SelectItem value="30">30 seconds</SelectItem>
                                  <SelectItem value="60">1 minute</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Maximum Versions</label>
                              <Select 
                                value={settings.maxVersions.toString()} 
                                onValueChange={(value) => setSettings(prev => ({...prev, maxVersions: parseInt(value)}))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5">5 versions</SelectItem>
                                  <SelectItem value="10">10 versions</SelectItem>
                                  <SelectItem value="20">20 versions</SelectItem>
                                  <SelectItem value="50">50 versions</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Show Status Indicator</label>
                              <Button
                                size="sm"
                                variant={settings.showIndicator ? "default" : "outline"}
                                onClick={() => setSettings(prev => ({...prev, showIndicator: !prev.showIndicator}))}
                              >
                                {settings.showIndicator ? 'Shown' : 'Hidden'}
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Enable Compression</label>
                              <Button
                                size="sm"
                                variant={settings.compression ? "default" : "outline"}
                                onClick={() => setSettings(prev => ({...prev, compression: !prev.compression}))}
                              >
                                {settings.compression ? 'Enabled' : 'Disabled'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recovery Dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes Detected</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                We found unsaved changes from your previous session. Would you like to recover them?
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem('canvas-unsaved');
                  setShowRecoveryDialog(false);
                }}
              >
                Discard
              </Button>
              <Button
                onClick={() => {
                  const unsavedData = localStorage.getItem('canvas-unsaved');
                  if (unsavedData) {
                    const data = JSON.parse(unsavedData);
                    onDataChange(data);
                    if (onLoad) {
                      onLoad(data);
                    }
                  }
                  localStorage.removeItem('canvas-unsaved');
                  setShowRecoveryDialog(false);
                  toast({
                    title: "Changes Recovered",
                    description: "Your unsaved changes have been restored"
                  });
                }}
              >
                Recover
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}