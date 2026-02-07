// OpenClaw Agent Tab for ABLE AI
// Provides SuperClaw functionality within ABLE AI interface

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Terminal, 
  Send, 
  Target, 
  Eye, 
  Loader2, 
  Trash2,
  Search,
  Globe,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { OpenClawService } from '@/services/openclaw';

interface CommandLog {
  id: string;
  timestamp: Date;
  type: 'command' | 'result' | 'error' | 'search';
  content: string;
}

interface OpenClawTabProps {
  isActive: boolean;
}

export const OpenClawTab: React.FC<OpenClawTabProps> = ({ isActive }) => {
  const [activeTab, setActiveTab] = useState<'command' | 'goal' | 'snapshot'>('command');
  const [command, setCommand] = useState('');
  const [goal, setGoal] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<CommandLog[]>([]);
  const [snapshot, setSnapshot] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string>('');

  const addLog = useCallback((type: CommandLog['type'], content: string) => {
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      content
    }]);
  }, []);

  // Execute direct command
  const executeCommand = async () => {
    if (!command.trim()) return;
    
    const cmd = command.trim();
    setCommand('');
    setIsExecuting(true);
    addLog('command', `> ${cmd}`);

    try {
      const result = await OpenClawService.runCommand(cmd);
      addLog('result', result.message || 'Command executed');
      
      if (result.success) {
        toast({ title: '✅ Command executed' });
      }
    } catch (error: any) {
      addLog('error', `Error: ${error.message}`);
      toast({ title: '❌ Command failed', variant: 'destructive' });
    } finally {
      setIsExecuting(false);
    }
  };

  // Check if goal needs web search
  const isSearchIntent = (text: string): boolean => {
    const searchKeywords = [
      'ค้นหา', 'search', 'หาข้อมูล', 'find',
      'ราคา', 'price', 'ข่าว', 'news',
      'อะไรคือ', 'what is', 'เกิดอะไร', 'what happened',
      'ล่าสุด', 'latest', 'today', 'วันนี้'
    ];
    const lower = text.toLowerCase();
    return searchKeywords.some(kw => lower.includes(kw.toLowerCase()));
  };

  // Execute AI goal
  const executeGoal = async () => {
    if (!goal.trim()) return;
    
    const goalText = goal.trim();
    setGoal('');
    setIsExecuting(true);
    addLog('command', `🎯 Goal: ${goalText}`);

    try {
      // Check if this is a search/web query
      if (isSearchIntent(goalText)) {
        addLog('search', '🔍 Searching the web...');
        const searchResult = await OpenClawService.webSearch(goalText);
        setSearchResults(searchResult.result || 'No results found');
        addLog('result', `Found relevant information`);
        toast({ title: '✅ Search completed' });
      } else {
        const result = await OpenClawService.executeGoal(goalText);
        addLog('result', `Goal ${result.status}: ${result.commands.length} commands executed`);
        toast({ title: '✅ Goal completed' });
      }
    } catch (error: any) {
      addLog('error', `Error: ${error.message}`);
      toast({ title: '❌ Goal failed', variant: 'destructive' });
    } finally {
      setIsExecuting(false);
    }
  };

  // Take snapshot
  const takeSnapshot = async () => {
    setIsExecuting(true);
    try {
      const snap = OpenClawService.takeSnapshot();
      setSnapshot(snap.textContent || 'No elements found');
      addLog('result', `Snapshot: ${snap.elements?.length || 0} elements captured`);
      toast({ title: '📸 Snapshot taken' });
    } catch (error: any) {
      addLog('error', `Snapshot error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Web search
  const performWebSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsExecuting(true);
    addLog('search', `🔍 Searching: ${searchQuery}`);
    
    try {
      const result = await OpenClawService.webSearch(searchQuery);
      setSearchResults(result.result || 'No results');
      addLog('result', 'Search completed');
      toast({ title: '✅ Search results ready' });
    } catch (error: any) {
      addLog('error', `Search error: ${error.message}`);
    } finally {
      setIsExecuting(false);
      setSearchQuery('');
    }
  };

  if (!isActive) return null;

  return (
    <div className="flex flex-col h-full border-t border-terminal-green/30 bg-black/40">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-red/30">
        <div className="flex items-center gap-2">
          <div className="text-lg">🦞</div>
          <span className="font-mono font-bold text-terminal-red text-sm">OpenClaw Agent</span>
          <Badge variant="outline" className="text-[10px] border-terminal-red/50 text-terminal-red">
            {isExecuting ? 'Running...' : 'Ready'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={takeSnapshot}
            disabled={isExecuting}
            className="h-6 w-6 p-0 text-terminal-cyan hover:bg-terminal-cyan/10"
            title="Take Snapshot"
          >
            <Eye className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setLogs([]); setSearchResults(''); }}
            className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
            title="Clear Logs"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start h-8 bg-transparent border-b border-border px-2">
          <TabsTrigger value="command" className="text-xs h-7 data-[state=active]:bg-terminal-red/20 data-[state=active]:text-terminal-red">
            <Terminal className="w-3 h-3 mr-1" />
            Command
          </TabsTrigger>
          <TabsTrigger value="goal" className="text-xs h-7 data-[state=active]:bg-terminal-amber/20 data-[state=active]:text-terminal-amber">
            <Target className="w-3 h-3 mr-1" />
            AI Goal
          </TabsTrigger>
          <TabsTrigger value="snapshot" className="text-xs h-7 data-[state=active]:bg-terminal-cyan/20 data-[state=active]:text-terminal-cyan">
            <Eye className="w-3 h-3 mr-1" />
            Snapshot
          </TabsTrigger>
        </TabsList>

        {/* Command Tab */}
        <TabsContent value="command" className="flex-1 flex flex-col p-2 space-y-2">
          <ScrollArea className="flex-1">
            <div className="space-y-1 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-center text-zinc-500 py-4">
                  <Terminal className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p>Ready for commands</p>
                  <p className="text-[10px] mt-1">Try: click 5, type 3 "hello", scroll down</p>
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`flex items-start gap-2 ${
                    log.type === 'command' ? 'text-terminal-green' :
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'search' ? 'text-terminal-cyan' :
                    'text-zinc-400'
                  }`}>
                    <span className="text-[10px] text-zinc-600">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="flex-1">{log.content}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2">
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isExecuting && executeCommand()}
              placeholder="click 5, type 3 hello, scroll down..."
              disabled={isExecuting}
              className="h-8 text-xs font-mono bg-black/50 border-terminal-red/30"
            />
            <Button
              size="sm"
              onClick={executeCommand}
              disabled={isExecuting || !command.trim()}
              className="h-8 bg-terminal-red hover:bg-terminal-red/80 text-black"
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </TabsContent>

        {/* AI Goal Tab */}
        <TabsContent value="goal" className="flex-1 flex flex-col p-2 space-y-2">
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {searchResults ? (
                <div className="p-2 rounded bg-terminal-cyan/10 border border-terminal-cyan/30 text-xs">
                  <div className="flex items-center gap-1 text-terminal-cyan font-bold mb-2">
                    <Globe className="w-3 h-3" />
                    Web Search Results
                  </div>
                  <pre className="whitespace-pre-wrap text-zinc-300">{searchResults}</pre>
                </div>
              ) : (
                <div className="text-center text-zinc-500 py-4">
                  <Target className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p>Enter a natural language goal</p>
                  <p className="text-[10px] mt-1">
                    "search ราคาทอง" or "open trading chart"
                  </p>
                </div>
              )}
              
              {logs.filter(l => l.type === 'search' || l.type === 'command').slice(-5).map(log => (
                <div key={log.id} className="flex items-center gap-2 text-xs">
                  {log.type === 'search' ? (
                    <Globe className="w-3 h-3 text-terminal-cyan" />
                  ) : (
                    <Target className="w-3 h-3 text-terminal-amber" />
                  )}
                  <span className="text-zinc-400">{log.content}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2">
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isExecuting && executeGoal()}
              placeholder="Describe what you want to do..."
              disabled={isExecuting}
              className="h-8 text-xs bg-black/50 border-terminal-amber/30"
            />
            <Button
              size="sm"
              onClick={executeGoal}
              disabled={isExecuting || !goal.trim()}
              className="h-8 bg-terminal-amber hover:bg-terminal-amber/80 text-black"
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          
          {/* Web Search Input */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isExecuting && performWebSearch()}
              placeholder="🔍 Search the web..."
              disabled={isExecuting}
              className="h-8 text-xs bg-black/50 border-terminal-cyan/30"
            />
            <Button
              size="sm"
              onClick={performWebSearch}
              disabled={isExecuting || !searchQuery.trim()}
              className="h-8 bg-terminal-cyan hover:bg-terminal-cyan/80 text-black"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>

        {/* Snapshot Tab */}
        <TabsContent value="snapshot" className="flex-1 flex flex-col p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500">Current Page Elements</span>
            <Button
              size="sm"
              variant="outline"
              onClick={takeSnapshot}
              disabled={isExecuting}
              className="h-6 text-xs border-terminal-cyan/30 text-terminal-cyan"
            >
              {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3 mr-1" />}
              Refresh
            </Button>
          </div>
          
          <ScrollArea className="flex-1 border border-terminal-cyan/20 rounded bg-black/50">
            <pre className="p-2 font-mono text-[10px] text-terminal-cyan whitespace-pre-wrap">
              {snapshot || 'Click "Refresh" to capture page elements\n\nElements will be shown as:\n[1] button "Submit"\n[2] input "Email"\n[3] link "Home"\n...'}
            </pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OpenClawTab;
