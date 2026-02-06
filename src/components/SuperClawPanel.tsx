// SuperClawPanel.tsx - Skills Management UI
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Play, 
  Pause, 
  Trash2, 
  Plus, 
  Settings, 
  Activity,
  Brain,
  Zap,
  Eye,
  Code,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { SkillsManager, Skill } from '@/services/skills/SkillsManager';
import { AgentMemory, MemoryStats } from '@/services/memory/AgentMemory';
import { VisionService } from '@/services/vision/VisionService';
import { GatewayService } from '@/services/gateway/GatewayService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const SuperClawPanel = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [runningSkillId, setRunningSkillId] = useState<string | null>(null);
  const [newSkillDescription, setNewSkillDescription] = useState('');
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [showVisionTest, setShowVisionTest] = useState(false);
  const [visionResult, setVisionResult] = useState<string>('');

  // Initialize services
  useEffect(() => {
    const init = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      // Initialize services with user ID
      await SkillsManager.initialize(user.id);
      AgentMemory.initialize(user.id);
      await GatewayService.start();
      
      // Load data
      await loadSkills();
      await loadStats();
      
      setIsConnected(true);
      setClients(GatewayService.getClients());
      setIsLoading(false);
    };

    init();
  }, [user?.id]);

  const loadSkills = async () => {
    const allSkills = SkillsManager.listSkills();
    setSkills(allSkills);
  };

  const loadStats = async () => {
    const memoryStats = await AgentMemory.getStats();
    setStats(memoryStats);
  };

  const handleRunSkill = async (skillId: string) => {
    setRunningSkillId(skillId);
    try {
      const result = await SkillsManager.executeSkill(skillId);
      toast({
        title: result.success ? '✅ Skill Executed' : '❌ Skill Failed',
        description: result.success 
          ? `Completed in ${result.executionTime}ms`
          : result.error
      });
      await loadSkills();
      await loadStats();
    } catch (error) {
      toast({
        title: '❌ Execution Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setRunningSkillId(null);
    }
  };

  const handleToggleSkill = async (skillId: string, enabled: boolean) => {
    await SkillsManager.toggleSkill(skillId, enabled);
    await loadSkills();
    toast({
      title: enabled ? '✅ Skill Enabled' : '⏸️ Skill Disabled'
    });
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!confirm('ลบ Skill นี้หรือไม่?')) return;
    await SkillsManager.deleteSkill(skillId);
    await loadSkills();
    toast({ title: '🗑️ Skill Deleted' });
  };

  const handleCreateSkillFromAI = async () => {
    if (!newSkillDescription.trim()) {
      toast({ title: 'กรุณาใส่คำอธิบาย Skill', variant: 'destructive' });
      return;
    }

    setIsCreatingSkill(true);
    try {
      const skill = await SkillsManager.createSkillFromAI(newSkillDescription);
      toast({
        title: '✅ AI Created Skill',
        description: `Created: ${skill.name}`
      });
      setNewSkillDescription('');
      await loadSkills();
    } catch (error) {
      toast({
        title: '❌ Failed to Create Skill',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingSkill(false);
    }
  };

  const handleVisionTest = async () => {
    setShowVisionTest(true);
    setVisionResult('กำลังจับภาพหน้าจอ...');
    
    try {
      const screenshot = await VisionService.captureScreen();
      setVisionResult('กำลังวิเคราะห์ด้วย AI...');
      
      const analysis = await VisionService.analyzeWithVision(
        screenshot.base64,
        'วิเคราะห์หน้าจอนี้ มี element อะไรบ้าง และผู้ใช้สามารถทำอะไรได้บ้าง'
      );
      
      setVisionResult(analysis);
    } catch (error) {
      setVisionResult(`Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trading': return 'bg-terminal-amber/20 text-terminal-amber';
      case 'analysis': return 'bg-terminal-cyan/20 text-terminal-cyan';
      case 'automation': return 'bg-terminal-green/20 text-terminal-green';
      case 'data': return 'bg-blue-500/20 text-blue-400';
      case 'communication': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-terminal-amber mx-auto" />
          <p className="text-muted-foreground font-mono">Loading SuperClaw...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full border-terminal-amber/30 bg-background/95 overflow-hidden">
      <CardHeader className="border-b border-terminal-amber/20 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-terminal-amber font-mono">
            🦞 SuperClaw Agent
            {isConnected && (
              <Badge variant="outline" className="ml-2 border-terminal-green text-terminal-green">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                Connected
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleVisionTest}
              className="border-terminal-cyan/50 text-terminal-cyan hover:bg-terminal-cyan/10"
            >
              <Eye className="h-4 w-4 mr-1" />
              Vision Test
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { loadSkills(); loadStats(); }}
              className="border-terminal-amber/50"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 h-[calc(100%-60px)]">
        <Tabs defaultValue="skills" className="h-full">
          <TabsList className="w-full grid grid-cols-3 bg-muted/30 border-b border-border rounded-none">
            <TabsTrigger value="skills" className="font-mono text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Skills ({skills.length})
            </TabsTrigger>
            <TabsTrigger value="stats" className="font-mono text-xs">
              <Brain className="h-3 w-3 mr-1" />
              Memory
            </TabsTrigger>
            <TabsTrigger value="create" className="font-mono text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Create
            </TabsTrigger>
          </TabsList>

          {/* Skills Tab */}
          <TabsContent value="skills" className="h-[calc(100%-40px)] m-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-2">
                {skills.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Code className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="font-mono text-sm">No skills yet</p>
                    <p className="text-xs">Create your first skill with AI</p>
                  </div>
                ) : (
                  skills.map(skill => (
                    <div
                      key={skill.id}
                      className="p-3 rounded-lg border border-border bg-card/50 hover:bg-card/80 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-mono text-sm font-medium truncate">
                              {skill.name}
                            </h4>
                            <Badge className={`text-[10px] ${getCategoryColor(skill.category)}`}>
                              {skill.category}
                            </Badge>
                            {skill.createdBy === 'ai' && (
                              <Badge variant="outline" className="text-[10px] border-terminal-cyan/50 text-terminal-cyan">
                                🤖 AI
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {skill.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            {skill.runCount !== undefined && skill.runCount > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {skill.runCount} runs
                              </span>
                            )}
                            {skill.successRate !== undefined && (
                              <span className={`flex items-center gap-1 ${skill.successRate > 70 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                                {skill.successRate > 70 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {skill.successRate.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleToggleSkill(skill.id, !skill.enabled)}
                          >
                            {skill.enabled ? (
                              <Pause className="h-3 w-3 text-terminal-amber" />
                            ) : (
                              <Play className="h-3 w-3 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleRunSkill(skill.id)}
                            disabled={!skill.enabled || runningSkillId === skill.id}
                          >
                            {runningSkillId === skill.id ? (
                              <Loader2 className="h-3 w-3 animate-spin text-terminal-green" />
                            ) : (
                              <Zap className="h-3 w-3 text-terminal-green" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleDeleteSkill(skill.id)}
                          >
                            <Trash2 className="h-3 w-3 text-terminal-red" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="h-[calc(100%-40px)] m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Memory Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground font-mono">Total Memories</p>
                    <p className="text-2xl font-bold text-terminal-amber">
                      {stats?.totalMemories || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground font-mono">Success Rate</p>
                    <p className={`text-2xl font-bold ${(stats?.successRate || 0) > 70 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {(stats?.successRate || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Top Methods */}
                {stats?.topMethods && stats.topMethods.length > 0 && (
                  <div>
                    <h4 className="text-sm font-mono text-muted-foreground mb-2">Top Methods</h4>
                    <div className="space-y-1">
                      {stats.topMethods.map((m, i) => (
                        <div key={i} className="flex items-center justify-between px-2 py-1 rounded bg-muted/20">
                          <span className="text-xs font-mono">{m.method}</span>
                          <Badge variant="outline" className="text-[10px]">{m.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Failures */}
                {stats?.recentFailures && stats.recentFailures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-mono text-muted-foreground mb-2">Recent Failures</h4>
                    <div className="space-y-1">
                      {stats.recentFailures.slice(0, 3).map((f, i) => (
                        <div key={i} className="p-2 rounded bg-terminal-red/10 border border-terminal-red/20">
                          <p className="text-xs font-mono text-terminal-red truncate">{f.action}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{f.errorMessage}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vision Test Result */}
                {showVisionTest && (
                  <div>
                    <h4 className="text-sm font-mono text-muted-foreground mb-2">Vision Analysis</h4>
                    <div className="p-3 rounded-lg bg-terminal-cyan/10 border border-terminal-cyan/20">
                      <p className="text-xs font-mono whitespace-pre-wrap">{visionResult}</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create" className="h-[calc(100%-40px)] m-0">
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-mono text-terminal-amber mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Create Skill with AI
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  อธิบายสิ่งที่ต้องการให้ AI สร้าง Skill ให้
                </p>
                <Textarea
                  placeholder="เช่น: Monitor gold price and alert when it reaches $2800"
                  value={newSkillDescription}
                  onChange={(e) => setNewSkillDescription(e.target.value)}
                  className="min-h-[100px] font-mono text-sm bg-muted/30 border-terminal-amber/20"
                />
                <Button
                  className="w-full mt-3 bg-terminal-amber hover:bg-terminal-amber/80 text-black font-mono"
                  onClick={handleCreateSkillFromAI}
                  disabled={isCreatingSkill || !newSkillDescription.trim()}
                >
                  {isCreatingSkill ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      AI กำลังสร้าง...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Skill with AI
                    </>
                  )}
                </Button>
              </div>

              {/* Quick Templates */}
              <div>
                <h4 className="text-xs font-mono text-muted-foreground mb-2">Quick Templates</h4>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: '📈 Monitor BTC Price', desc: 'Monitor Bitcoin price and alert at specific levels' },
                    { label: '📰 Scrape News', desc: 'Automatically scrape financial news every hour' },
                    { label: '📊 Analyze Chart', desc: 'Use vision AI to analyze current trading chart' },
                  ].map((template, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="justify-start text-left h-auto py-2 border-border/50"
                      onClick={() => setNewSkillDescription(template.desc)}
                    >
                      <span className="font-mono text-xs">{template.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
