// SuperClawPanel.tsx - OpenClaw-powered AI Agent UI
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Play, 
  Camera,
  Terminal,
  Brain,
  Zap,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Trash2,
  Hash,
  MousePointer
} from 'lucide-react';
import { OpenClawAgent, OpenClawService, AISnapshot, CommandResult } from '@/services/openclaw';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'command';
}

export const SuperClawPanel = () => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<AISnapshot | null>(null);
  const [command, setCommand] = useState('');
  const [goal, setGoal] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showBadges, setShowBadges] = useState(false);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to OpenClaw events
  useEffect(() => {
    const unsubAgent = OpenClawAgent.onLog((msg) => {
      addLog(msg, 'info');
    });

    const unsubService = OpenClawService.on((event) => {
      switch (event.type) {
        case 'thought':
          setThoughts(prev => [...prev, `Step ${event.data.step}: ${event.data.thought}`]);
          if (event.data.action) {
            addLog(`🎯 Action: ${event.data.action}`, 'command');
          }
          break;
        case 'status':
          addLog(`Status: ${event.data}`, 'info');
          break;
        case 'session:end':
          setIsRunning(false);
          addLog(
            event.data.status === 'completed' ? '✅ Goal completed!' : '❌ Goal failed',
            event.data.status === 'completed' ? 'success' : 'error'
          );
          break;
        case 'session:error':
          setIsRunning(false);
          addLog(`Error: ${event.data.error}`, 'error');
          break;
      }
    });

    return () => {
      unsubAgent();
      unsubService();
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString('th-TH'),
      message,
      type
    };
    setLogs(prev => [...prev.slice(-100), entry]);
  };

  // Take snapshot
  const handleSnapshot = useCallback(() => {
    const snap = OpenClawAgent.snapshot();
    setSnapshot(snap);
    addLog(`📸 Snapshot: ${snap.elements.length} elements`, 'success');
    toast({ title: `Found ${snap.elements.length} elements` });
  }, []);

  // Run single command
  const handleRunCommand = useCallback(async () => {
    if (!command.trim()) return;
    
    addLog(`> ${command}`, 'command');
    const result = await OpenClawAgent.run(command);
    
    addLog(
      result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
      result.success ? 'success' : 'error'
    );
    
    if (result.nextSnapshot) {
      setSnapshot(result.nextSnapshot);
    }
    
    setCommand('');
  }, [command]);

  // Run goal with AI
  const handleRunGoal = useCallback(async () => {
    if (!goal.trim()) return;
    
    setIsRunning(true);
    setThoughts([]);
    addLog(`🎯 Starting goal: ${goal}`, 'info');
    
    await OpenClawService.executeGoal(goal);
  }, [goal]);

  // Toggle badges
  const handleToggleBadges = useCallback(() => {
    if (showBadges) {
      OpenClawAgent.clearBadges();
      setShowBadges(false);
    } else {
      if (!snapshot) {
        OpenClawAgent.snapshot();
      }
      OpenClawAgent.showBadges();
      setShowBadges(true);
    }
  }, [showBadges, snapshot]);

  // Clear logs
  const handleClearLogs = () => {
    setLogs([]);
    setThoughts([]);
  };

  return (
    <Card className="h-full border-terminal-amber/30 bg-background/95 overflow-hidden flex flex-col">
      <CardHeader className="border-b border-terminal-amber/20 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-amber font-mono text-sm">
            🦞 OpenClaw Agent
            {isRunning && (
              <Badge variant="outline" className="ml-2 border-terminal-green text-terminal-green animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Running
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSnapshot}
              className="h-7 px-2 text-terminal-cyan hover:bg-terminal-cyan/10"
              title="Take Snapshot"
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleBadges}
              className={`h-7 px-2 ${showBadges ? 'text-terminal-green bg-terminal-green/10' : 'text-muted-foreground'}`}
              title="Toggle Element Badges"
            >
              <Hash className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearLogs}
              className="h-7 px-2 text-muted-foreground hover:text-terminal-red"
              title="Clear Logs"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        <Tabs defaultValue="command" className="h-full flex flex-col">
          <TabsList className="w-full grid grid-cols-3 bg-muted/30 border-b border-border rounded-none flex-shrink-0">
            <TabsTrigger value="command" className="font-mono text-xs">
              <Terminal className="h-3 w-3 mr-1" />
              Command
            </TabsTrigger>
            <TabsTrigger value="goal" className="font-mono text-xs">
              <Brain className="h-3 w-3 mr-1" />
              AI Goal
            </TabsTrigger>
            <TabsTrigger value="snapshot" className="font-mono text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Snapshot
            </TabsTrigger>
          </TabsList>

          {/* Command Tab */}
          <TabsContent value="command" className="flex-1 m-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-1 font-mono text-xs">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Ready for commands</p>
                      <p className="text-[10px] mt-1">Try: click 5, type 3 "hello", scroll down</p>
                    </div>
                  ) : (
                    logs.map(log => (
                      <div 
                        key={log.id} 
                        className={`py-0.5 ${
                          log.type === 'success' ? 'text-terminal-green' :
                          log.type === 'error' ? 'text-terminal-red' :
                          log.type === 'command' ? 'text-terminal-amber' :
                          'text-muted-foreground'
                        }`}
                      >
                        <span className="text-muted-foreground/50">[{log.time}]</span> {log.message}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </div>
            
            <div className="p-3 border-t border-border flex gap-2 flex-shrink-0">
              <Input
                placeholder="click 5, type 3 hello, scroll down..."
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunCommand()}
                className="flex-1 font-mono text-sm h-8 bg-muted/30"
              />
              <Button
                size="sm"
                onClick={handleRunCommand}
                disabled={!command.trim()}
                className="h-8 px-3 bg-terminal-amber hover:bg-terminal-amber/80 text-black"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          {/* AI Goal Tab */}
          <TabsContent value="goal" className="flex-1 m-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {thoughts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="font-mono text-sm">AI Agent Mode</p>
                      <p className="text-xs mt-1">ใส่เป้าหมายแล้ว AI จะคิดและทำให้เอง</p>
                    </div>
                  ) : (
                    thoughts.map((thought, i) => (
                      <div key={i} className="p-2 rounded bg-muted/30 border border-border">
                        <p className="text-xs font-mono text-muted-foreground">{thought}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            
            <div className="p-3 border-t border-border space-y-2 flex-shrink-0">
              <Textarea
                placeholder="เช่น: เปิด panel Trading Chart แล้วเปลี่ยนเป็น BTCUSDT"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="min-h-[60px] font-mono text-sm bg-muted/30 resize-none"
                disabled={isRunning}
              />
              <Button
                onClick={handleRunGoal}
                disabled={!goal.trim() || isRunning}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    AI กำลังทำงาน...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run with AI
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Snapshot Tab */}
          <TabsContent value="snapshot" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3">
                {!snapshot ? (
                  <div className="text-center py-8">
                    <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">No snapshot yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSnapshot}
                      className="mt-3"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Snapshot
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{snapshot.url}</p>
                        <p className="font-mono text-sm font-medium">{snapshot.title}</p>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {snapshot.elements.length} elements
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 max-h-[400px] overflow-auto">
                      {snapshot.elements.slice(0, 50).map(el => (
                        <div 
                          key={el.index}
                          className="flex items-center gap-2 p-2 rounded bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setCommand(`click ${el.index}`);
                            toast({ title: `Command set: click ${el.index}` });
                          }}
                        >
                          <Badge className="w-6 h-6 flex items-center justify-center p-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px]">
                            {el.index}
                          </Badge>
                          <span className="font-mono text-xs text-terminal-cyan">{el.role || el.tag}</span>
                          <span className="font-mono text-xs text-foreground truncate flex-1">
                            {el.text || el.placeholder || el.value || '-'}
                          </span>
                          {el.disabled && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">disabled</Badge>
                          )}
                        </div>
                      ))}
                      {snapshot.elements.length > 50 && (
                        <p className="text-center text-xs text-muted-foreground py-2">
                          ... and {snapshot.elements.length - 50} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
