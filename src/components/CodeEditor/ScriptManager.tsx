import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Plus, 
  Code, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Copy, 
  Download,
  Upload,
  Filter,
  TrendingUp,
  BarChart2,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  SavedScript,
  loadAllScripts,
  saveScript,
  deleteScript,
  duplicateScript,
  searchScripts,
  getScriptsByCategory,
  exportScripts,
  importScripts,
  getAllTags,
  generateScriptId,
  PINE_TEMPLATES,
} from '@/utils/PineScriptStorage';

interface ScriptManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScript: (script: SavedScript) => void;
  onNewScript?: () => void;
}

const categoryIcons = {
  indicator: TrendingUp,
  oscillator: BarChart2,
  strategy: Target,
};

const categoryColors = {
  indicator: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  oscillator: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  strategy: 'text-green-400 bg-green-400/10 border-green-400/30',
};

export default function ScriptManager({ 
  isOpen, 
  onClose, 
  onSelectScript,
  onNewScript 
}: ScriptManagerProps) {
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingScript, setEditingScript] = useState<SavedScript | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadScripts();
      setAllTags(getAllTags());
    }
  }, [isOpen]);

  const loadScripts = () => {
    let loaded = loadAllScripts();
    
    if (searchQuery) {
      loaded = searchScripts(searchQuery);
    }
    
    if (categoryFilter !== 'all') {
      loaded = loaded.filter(s => s.category === categoryFilter);
    }
    
    // Sort by most recently updated
    loaded.sort((a, b) => b.updatedAt - a.updatedAt);
    setScripts(loaded);
  };

  useEffect(() => {
    if (isOpen) {
      loadScripts();
    }
  }, [searchQuery, categoryFilter, isOpen]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this script?')) {
      deleteScript(id);
      loadScripts();
      toast.success('Script deleted');
    }
  };

  const handleDuplicate = (id: string) => {
    const duplicate = duplicateScript(id);
    if (duplicate) {
      loadScripts();
      toast.success('Script duplicated');
    }
  };

  const handleExport = (id?: string) => {
    const json = exportScripts(id ? [id] : undefined);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = id ? `pine-script-${id}.json` : 'pine-scripts-export.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Scripts exported');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const imported = importScripts(text);
          loadScripts();
          toast.success(`Imported ${imported.length} scripts`);
        } catch (err) {
          toast.error('Failed to import scripts');
        }
      }
    };
    input.click();
  };

  const handleEdit = (script: SavedScript) => {
    setEditingScript({ ...script });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (editingScript) {
      saveScript(editingScript);
      loadScripts();
      setShowEditDialog(false);
      setEditingScript(null);
      toast.success('Script updated');
    }
  };

  const handleLoadTemplate = (template: typeof PINE_TEMPLATES[0]) => {
    const newScript: SavedScript = {
      ...template,
      id: generateScriptId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveScript(newScript);
    loadScripts();
    onSelectScript(newScript);
    toast.success(`Template "${template.name}" loaded`);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col bg-[#1e1e1e] border-[#3c3c3c]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#00ff00]">
              <Code className="w-5 h-5" />
              Pine Script Manager
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex items-center gap-2 pb-3 border-b border-[#3c3c3c]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search scripts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#2d2d2d] border-[#3c3c3c] text-white"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36 bg-[#2d2d2d] border-[#3c3c3c]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="indicator">Indicators</SelectItem>
                <SelectItem value="oscillator">Oscillators</SelectItem>
                <SelectItem value="strategy">Strategies</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm"
              onClick={handleImport}
              className="border-[#3c3c3c]"
            >
              <Upload className="w-4 h-4 mr-1" />
              Import
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleExport()}
              className="border-[#3c3c3c]"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>

            {onNewScript && (
              <Button 
                size="sm"
                onClick={() => { onNewScript(); onClose(); }}
                className="bg-[#00ff00] text-black hover:bg-[#00cc00]"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            )}
          </div>

          {/* Scripts List */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {scripts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Code className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No scripts found</p>
                <p className="text-sm mt-2">Create a new script or import from file</p>
                
                {/* Templates */}
                <div className="mt-6 text-left">
                  <p className="text-sm font-medium mb-3">Quick Start Templates:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PINE_TEMPLATES.slice(0, 6).map(template => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        className="justify-start text-left h-auto py-2 border-[#3c3c3c]"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        <div>
                          <div className="font-medium text-white">{template.name}</div>
                          <div className="text-xs text-gray-500">{template.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {scripts.map(script => {
                  const CategoryIcon = categoryIcons[script.category];
                  return (
                    <div
                      key={script.id}
                      className="p-3 rounded-lg border border-[#3c3c3c] hover:border-[#00ff00]/50 transition-colors bg-[#252526] cursor-pointer"
                      onClick={() => onSelectScript(script)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{script.name}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] ${categoryColors[script.category]}`}
                            >
                              <CategoryIcon className="w-3 h-3 mr-1" />
                              {script.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                            {script.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {script.tags.slice(0, 3).map(tag => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-[10px] bg-[#3c3c3c] text-gray-300"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {script.tags.length > 3 && (
                              <span className="text-[10px] text-gray-500">
                                +{script.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#2d2d2d] border-[#3c3c3c]">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(script); }}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(script.id); }}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExport(script.id); }}>
                              <Download className="w-4 h-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); handleDelete(script.id); }}
                              className="text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
                        <span>Updated: {new Date(script.updatedAt).toLocaleDateString()}</span>
                        {script.version && <span>v{script.version}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Templates Section */}
          {scripts.length > 0 && (
            <div className="pt-3 border-t border-[#3c3c3c]">
              <p className="text-xs text-gray-500 mb-2">Templates</p>
              <div className="flex gap-2 flex-wrap">
                {PINE_TEMPLATES.slice(0, 4).map(template => (
                  <Button
                    key={template.id}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleLoadTemplate(template)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#1e1e1e] border-[#3c3c3c]">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Script Details</DialogTitle>
          </DialogHeader>

          {editingScript && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Name</label>
                <Input
                  value={editingScript.name}
                  onChange={(e) => setEditingScript({ ...editingScript, name: e.target.value })}
                  className="bg-[#2d2d2d] border-[#3c3c3c] text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Description</label>
                <Textarea
                  value={editingScript.description}
                  onChange={(e) => setEditingScript({ ...editingScript, description: e.target.value })}
                  className="bg-[#2d2d2d] border-[#3c3c3c] text-white resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Category</label>
                <Select 
                  value={editingScript.category} 
                  onValueChange={(v: any) => setEditingScript({ ...editingScript, category: v })}
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
                  value={editingScript.tags.join(', ')}
                  onChange={(e) => setEditingScript({ 
                    ...editingScript, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                  })}
                  className="bg-[#2d2d2d] border-[#3c3c3c] text-white"
                  placeholder="trend, momentum, volatility"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-[#00ff00] text-black hover:bg-[#00cc00]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
