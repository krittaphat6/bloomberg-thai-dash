import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Folder, Settings2, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TradingFolder {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: Date;
}

interface TradingRoomsSidebarProps {
  folders: TradingFolder[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
  onAddFolder: (folder: Omit<TradingFolder, 'id' | 'createdAt'>) => void;
  onDeleteFolder: (folderId: string) => void;
  getFolderTradeCount: (folderId: string) => number;
  totalTrades: number;
}

export default function TradingRoomsSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onAddFolder,
  onDeleteFolder,
  getFolderTradeCount,
  totalTrades
}: TradingRoomsSidebarProps) {
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newFolder, setNewFolder] = useState({ 
    name: '', 
    description: '', 
    color: 'bg-blue-500', 
    icon: '📁' 
  });
  
  const handleAddFolder = () => {
    if (!newFolder.name.trim()) return;
    onAddFolder(newFolder);
    setNewFolder({ name: '', description: '', color: 'bg-blue-500', icon: '📁' });
  };
  
  return (
    <>
      <div className="w-56 border-r border-terminal-green/30 flex flex-col bg-card/50 hidden lg:flex">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-terminal-green/30 flex items-center justify-between">
          <span className="flex items-center gap-2 text-terminal-green font-bold text-sm">
            <Folder className="h-4 w-4" />
            Trading Rooms
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFolderManager(true)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-terminal-amber"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Folder List */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all text-sm",
                  selectedFolderId === folder.id
                    ? "bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/30"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-base">{folder.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-xs">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getFolderTradeCount(folder.id)} trades
                  </p>
                </div>
                {selectedFolderId === folder.id && (
                  <ChevronRight className="h-4 w-4 text-terminal-amber" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
        
        {/* Sidebar Footer Stats */}
        <div className="p-3 border-t border-terminal-green/30 bg-muted/30">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-terminal-green">{folders.length}</p>
              <p className="text-xs text-muted-foreground">Rooms</p>
            </div>
            <div>
              <p className="text-lg font-bold text-terminal-amber">{totalTrades}</p>
              <p className="text-xs text-muted-foreground">Trades</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Folder Manager Dialog */}
      <Dialog open={showFolderManager} onOpenChange={setShowFolderManager}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Manage Trading Rooms
            </DialogTitle>
            <DialogDescription>
              Create and organize folders for different trading strategies
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add New Folder */}
            <div className="space-y-3 p-3 border rounded-lg border-terminal-green/20 bg-muted/30">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                <Plus className="h-4 w-4" />
                Create New Room
              </h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input 
                    value={newFolder.name}
                    onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                    placeholder="Room name"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground">Icon</label>
                  <Select 
                    value={newFolder.icon} 
                    onValueChange={(v) => setNewFolder({ ...newFolder, icon: v })}
                  >
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="📁">📁 Folder</SelectItem>
                      <SelectItem value="📈">📈 Chart Up</SelectItem>
                      <SelectItem value="📉">📉 Chart Down</SelectItem>
                      <SelectItem value="💹">💹 Stock</SelectItem>
                      <SelectItem value="₿">₿ Bitcoin</SelectItem>
                      <SelectItem value="💱">💱 Forex</SelectItem>
                      <SelectItem value="🥇">🥇 Gold</SelectItem>
                      <SelectItem value="⚡">⚡ Scalping</SelectItem>
                      <SelectItem value="🎯">🎯 Strategy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Input 
                value={newFolder.description}
                onChange={(e) => setNewFolder({ ...newFolder, description: e.target.value })}
                placeholder="Description (optional)"
                className="h-8 text-sm"
              />
              
              <Button 
                onClick={handleAddFolder}
                className="w-full bg-terminal-green hover:bg-terminal-green/90 text-black h-8"
                disabled={!newFolder.name.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Room
              </Button>
            </div>
            
            {/* Existing Folders */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Existing Rooms</h4>
              {folders.filter(f => f.id !== 'default').map(folder => (
                <div 
                  key={folder.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{folder.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getFolderTradeCount(folder.id)} trades
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    onClick={() => onDeleteFolder(folder.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
