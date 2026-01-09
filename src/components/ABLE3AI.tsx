import { useState, useRef, useEffect } from 'react';
import { OllamaService, OllamaModel } from '@/services/FreeAIService';
import { GeminiService } from '@/services/GeminiService';
import { useMCP } from '@/contexts/MCPContext';
import { supabase } from '@/integrations/supabase/client';
import { UniversalDataService } from '@/services/UniversalDataService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send, Bot, User, Settings, Sparkles, Zap, Cpu, X,
  RefreshCw, Wifi, WifiOff, Plug, Check, Loader2,
  Newspaper, Calendar, FileText, Dice6, Brain
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  model?: string;
}

type AIProvider = 'ollama' | 'gemini';

const ABLE3AI = () => {
  const { isReady: mcpReady, tools, executeTool, getToolsList } = useMCP();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3');
  const [isConnecting, setIsConnecting] = useState(false);
  const [bridgeUrl, setBridgeUrl] = useState(OllamaService.getBridgeUrl());
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // AI Provider selection
  const [aiProvider, setAIProvider] = useState<AIProvider>(() => {
    return (localStorage.getItem('able-ai-provider') as AIProvider) || 'gemini';
  });
  
  // Loading time tracking
  const [loadingTime, setLoadingTime] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Save AI provider preference
  useEffect(() => {
    localStorage.setItem('able-ai-provider', aiProvider);
  }, [aiProvider]);

  // Check Ollama connection on mount if bridge URL exists
  useEffect(() => {
    if (OllamaService.getBridgeUrl() && aiProvider === 'ollama') {
      handleConnect();
    }
  }, [aiProvider]);

  // Initial greeting
  useEffect(() => {
    setMessages([{
      id: '1',
      text: `🤖 **ABLE AI - Powered by ${aiProvider === 'gemini' ? 'Gemini 2.5 Flash' : 'Ollama'}**\n\n` +
        `สวัสดีครับ! พร้อมช่วยวิเคราะห์ตลาดการเงิน\n\n` +
        `**AI Provider:** ${aiProvider === 'gemini' ? '🟢 Gemini (Cloud)' : ollamaConnected ? '🟢 Ollama (Local)' : '🔴 Ollama Offline'}\n` +
        `**Model:** ${aiProvider === 'gemini' ? 'gemini-2.5-flash' : selectedModel}\n` +
        `**MCP Tools:** ${mcpReady ? `${tools.length} พร้อมใช้` : 'กำลังโหลด...'}\n` +
        `**Data Access:** ✅ เข้าถึงข้อมูลทุกอย่างในแอป\n\n` +
        `พิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`,
      isUser: false,
      timestamp: new Date(),
      model: 'System'
    }]);
  }, [mcpReady, tools.length, ollamaConnected, selectedModel, aiProvider]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Loading time counter
  useEffect(() => {
    if (isLoading) {
      setLoadingTime(0);
      loadingTimerRef.current = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
    }
    return () => {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    };
  }, [isLoading]);

  // Auto-check connection every 30 seconds when connected
  useEffect(() => {
    const checkStatus = async () => {
      if (!bridgeUrl) return;
      const result = await OllamaService.checkConnection();
      if (!result.ok && result.error) {
        setConnectionError(result.error);
        toast({
          title: '⚠️ ABLE AI Connection Error',
          description: result.error,
          variant: 'destructive'
        });
      } else {
        setConnectionError(null);
      }
    };
    
    if (ollamaConnected) {
      const interval = setInterval(checkStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [ollamaConnected, bridgeUrl]);

  const handleSaveBridgeUrl = () => {
    OllamaService.setBridgeUrl(bridgeUrl);
    toast({
      title: "✅ Bridge URL saved",
      description: "Attempting to connect...",
    });
    handleConnect();
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Check if bridge URL is set
    if (!OllamaService.getBridgeUrl()) {
      toast({
        title: "❌ Bridge URL not set",
        description: "Please enter your localhost.run URL in Settings",
        variant: "destructive",
      });
      setIsConnecting(false);
      return;
    }

    try {
      // Check Bridge API
      const bridgeOk = await OllamaService.isAvailable();
      if (!bridgeOk) {
        toast({
          title: "❌ Bridge API ไม่ตอบสนอง",
          description: "ตรวจสอบว่า API Server รันอยู่บน Mac และ localhost.run ทำงาน",
          variant: "destructive",
        });
        setOllamaConnected(false);
        setIsConnecting(false);
        return;
      }

      // Check Ollama via Bridge
      const status = await OllamaService.getOllamaStatus();
      if (status.connected) {
        setOllamaConnected(true);
        setOllamaModels(status.models);
        if (status.models.length > 0 && !status.models.find(m => m.name === selectedModel)) {
          setSelectedModel(status.models[0].name);
        }
        toast({
          title: "✅ เชื่อมต่อสำเร็จ!",
          description: `Found ${status.models.length} model(s)`,
        });
      } else {
        setOllamaConnected(false);
        toast({
          title: "❌ Ollama ไม่ทำงาน",
          description: "Bridge เชื่อมต่อได้ แต่ Ollama ไม่ตอบสนอง",
          variant: "destructive",
        });
      }
    } catch (error) {
      setOllamaConnected(false);
      toast({
        title: "❌ Connection failed",
        description: "Check your Bridge URL and API Server",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Fetch Economic Calendar
  const fetchEconomicCalendar = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('economic-calendar', {
        body: { filter: 'all' }
      });
      
      if (error) throw error;
      
      if (data?.events && data.events.length > 0) {
        const events = data.events.slice(0, 8);
        const formatted = events.map((e: any) => 
          `📅 ${e.time || 'TBD'} - ${e.event} (${e.importance || 'Medium'})`
        ).join('\n');
        return `**📆 Economic Calendar Today**\n\n${formatted}`;
      }
      return '📅 No upcoming economic events found';
    } catch (error) {
      console.error('Calendar fetch error:', error);
      return '❌ Unable to fetch economic calendar';
    }
  };

  // Fetch Notes from localStorage
  const fetchNotes = (): string => {
    try {
      const savedNotes = localStorage.getItem('able-notes');
      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        if (notes.length > 0) {
          const formatted = notes.slice(0, 5).map((n: any) => 
            `📝 **${n.title || 'Untitled'}**\n   ${(n.content || '').substring(0, 100)}...`
          ).join('\n\n');
          return `**📓 Your Notes**\n\n${formatted}`;
        }
      }
      return '📝 No notes found. Use the Notes panel to create some!';
    } catch (error) {
      return '❌ Unable to load notes';
    }
  };

  // Fetch Monte Carlo Results
  const fetchMonteCarloResults = (): string => {
    try {
      const savedConfig = localStorage.getItem('mc-config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        const winRate = config.winRate || 60;
        const avgWin = config.avgWin || 150;
        const avgLoss = config.avgLoss || 100;
        const rr = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '0';
        const expectancy = ((winRate/100 * avgWin) - ((100-winRate)/100 * avgLoss)).toFixed(2);
        
        return `**🎲 Monte Carlo Configuration**\n\n` +
          `📊 **Strategy Parameters**\n` +
          `• Win Rate: ${winRate}%\n` +
          `• Avg Win: $${avgWin}\n` +
          `• Avg Loss: $${avgLoss}\n` +
          `• Risk:Reward: 1:${rr}\n` +
          `• Expected Value: $${expectancy}/trade\n\n` +
          `📈 **Simulation Settings**\n` +
          `• Starting Capital: $${config.startingCapital || 10000}\n` +
          `• Risk per Trade: ${config.riskPerTrade || 2}%\n` +
          `• # of Trades: ${config.numTrades || 100}\n` +
          `• Position Sizing: ${config.positionSizing || 'fixedPercent'}\n\n` +
          `💡 Run simulation in Monte Carlo panel for full analysis!`;
      }
      return '🎲 No Monte Carlo data found. Configure in Monte Carlo Simulator!';
    } catch (error) {
      return '❌ Unable to load Monte Carlo data';
    }
  };

  // Detect special commands including universal data access
  const detectSpecialCommand = (message: string): { type: string } | null => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('news') || lowerMsg.includes('ข่าว') || lowerMsg.includes('headline')) {
      return { type: 'news' };
    }
    if (lowerMsg.includes('calendar') || lowerMsg.includes('ปฏิทิน') || lowerMsg.includes('event') || 
        lowerMsg.includes('nfp') || lowerMsg.includes('fomc') || lowerMsg.includes('cpi')) {
      return { type: 'calendar' };
    }
    if (lowerMsg.includes('note') || lowerMsg.includes('โน้ต') || lowerMsg.includes('บันทึก') || lowerMsg.includes('memo')) {
      return { type: 'notes' };
    }
    if (lowerMsg.includes('monte carlo') || lowerMsg.includes('simulation') || lowerMsg.includes('probability') ||
        lowerMsg.includes('risk analysis') || lowerMsg.includes('backtest')) {
      return { type: 'montecarlo' };
    }
    // Universal data access - ดึงข้อมูลทุกอย่าง
    if (lowerMsg.includes('all data') || lowerMsg.includes('ทุกข้อมูล') || lowerMsg.includes('ข้อมูลทั้งหมด') ||
        lowerMsg.includes('overview') || lowerMsg.includes('summary') || lowerMsg.includes('สรุป')) {
      return { type: 'universal' };
    }
    
    return null;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Check if AI is ready
    const geminiReady = aiProvider === 'gemini';
    const ollamaReady = aiProvider === 'ollama' && ollamaConnected;
    
    if (!geminiReady && !ollamaReady) {
      toast({
        title: "❌ ยังไม่ได้เชื่อมต่อ AI",
        description: aiProvider === 'ollama' 
          ? "กรุณาตั้งค่า Bridge URL และกด Connect" 
          : "กรุณาเลือก AI Provider ใน Settings",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      let aiResponse: string;
      let model = geminiReady ? 'Gemini 2.5 Flash' : selectedModel;

      // Check for help command
      if (currentInput.toLowerCase() === 'help' || currentInput.includes('ช่วย')) {
        aiResponse = getHelpText();
        model = 'System';
      }
      // Check for special commands (news, calendar, notes, monte carlo)
      else {
        const specialCmd = detectSpecialCommand(currentInput);
        
        if (specialCmd) {
          let specialResult = '';
          
          switch (specialCmd.type) {
            case 'calendar':
              specialResult = await fetchEconomicCalendar();
              model = 'Economic Calendar';
              break;
            case 'notes':
              specialResult = fetchNotes();
              model = 'Notes';
              break;
            case 'montecarlo':
              specialResult = fetchMonteCarloResults();
              model = 'Monte Carlo';
              break;
            case 'news':
              specialResult = '📰 **Market News**\n\nUse the Top News panel for real-time news updates!\n\nTip: Check economic calendar for scheduled events.';
              model = 'News';
              break;
            case 'universal':
              const universalData = await UniversalDataService.smartQuery(currentInput);
              specialResult = UniversalDataService.formatForAI(universalData);
              model = 'Universal Data';
              break;
          }
          
          // Use AI to analyze the result
          if (specialResult) {
            if (geminiReady) {
              try {
                const geminiResponse = await GeminiService.chat(
                  `User asked: "${currentInput}"\n\nData:\n${specialResult}\n\nProvide analysis in Thai.`,
                  [],
                  'คุณคือ ABLE AI ผู้เชี่ยวชาญด้านการเทรดและการเงิน'
                );
                aiResponse = `${specialResult}\n\n---\n\n**🧠 Gemini Analysis:**\n${geminiResponse.text}`;
                model = `${model} + Gemini`;
              } catch (e) {
                console.error('Gemini analysis error:', e);
                aiResponse = specialResult;
              }
            } else if (ollamaReady) {
              const analysisPrompt = `User asked: "${currentInput}"\n\nData:\n${specialResult}\n\nProvide analysis in the same language as the user.`;
              const ollamaResponse = await OllamaService.chat(analysisPrompt, [], selectedModel);
              aiResponse = `${specialResult}\n\n---\n\n**🤖 AI Analysis:**\n${ollamaResponse.text}`;
              model = `${model} + Ollama`;
            } else {
              aiResponse = specialResult;
            }
          } else {
            aiResponse = '❌ ไม่พบข้อมูล';
          }
        }
        // Check for MCP tool calls
        else {
          const toolCall = geminiReady 
            ? GeminiService.detectToolCall(currentInput) 
            : OllamaService.detectToolCall(currentInput);

          if (toolCall && mcpReady) {
            try {
              const result = await executeTool(toolCall.tool, toolCall.params);
              const toolResult = geminiReady
                ? GeminiService.formatToolResult(toolCall.tool, result)
                : OllamaService.formatToolResult(toolCall.tool, result);

              // Get AI analysis of the tool result
              if (geminiReady) {
                try {
                  const geminiResponse = await GeminiService.chat(
                    `User asked: "${currentInput}"\n\nHere is the data from ${toolCall.tool}:\n\n${toolResult}\n\nPlease provide a brief analysis and any insights based on this data. Respond in Thai.`,
                    [],
                    undefined
                  );
                  aiResponse = `${toolResult}\n\n---\n\n**🧠 Gemini Analysis:**\n${geminiResponse.text}`;
                  model = `MCP + Gemini`;
                } catch (e) {
                  aiResponse = toolResult;
                  model = `MCP: ${toolCall.tool}`;
                }
              } else if (ollamaReady) {
                const analysisPrompt = `User asked: "${currentInput}"\n\nHere is the data from ${toolCall.tool}:\n\n${toolResult}\n\nPlease provide a brief analysis and any insights based on this data. Respond in the same language as the user.`;
                
                const ollamaResponse = await OllamaService.chat(
                  analysisPrompt,
                  [],
                  selectedModel
                );

                aiResponse = `${toolResult}\n\n---\n\n**AI Analysis:**\n${ollamaResponse.text}`;
                model = `MCP + Ollama (${selectedModel})`;
              } else {
                aiResponse = toolResult;
                model = `MCP: ${toolCall.tool}`;
              }
            } catch (error) {
              console.error('MCP tool error:', error);
              aiResponse = `❌ Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
              model = 'Error';
            }
          } 
          // Regular AI chat
          else if (geminiReady) {
            try {
              const response = await GeminiService.chat(
                currentInput,
                messages.slice(-10).map(m => ({
                  role: m.isUser ? 'user' as const : 'assistant' as const,
                  content: m.text
                })),
                'คุณคือ ABLE AI ผู้เชี่ยวชาญด้านการเทรดและการเงิน ตอบเป็นภาษาเดียวกับผู้ใช้อย่างเป็นมิตร'
              );
              aiResponse = response.text;
              model = response.model;
            } catch (error: any) {
              console.error('Gemini error:', error);
              if (error.message?.includes('402')) {
                aiResponse = '⚠️ **Gemini Rate Limit**\n\nโควต้า AI หมดชั่วคราว กรุณาลองใหม่ภายหลัง หรือเปลี่ยนไปใช้ Ollama (Local)';
              } else {
                aiResponse = `❌ เกิดข้อผิดพลาดจาก Gemini: ${error.message || 'Unknown error'}`;
              }
              model = 'Error';
            }
          } 
          else if (ollamaReady) {
            const response = await OllamaService.chat(
              currentInput,
              messages.slice(-10).map(m => ({
                role: m.isUser ? 'user' as const : 'assistant' as const,
                content: m.text
              })),
              selectedModel
            );
            aiResponse = response.text;
            model = response.model;
          } else {
            aiResponse = '❌ ยังไม่ได้เชื่อมต่อ AI\n\n' +
              '**วิธีใช้งาน:**\n' +
              '• **Gemini (Cloud):** เลือกใน Settings พร้อมใช้ทันที\n' +
              '• **Ollama (Local):** ตั้งค่า Bridge URL และกด Connect';
            model = 'System';
          }
        }
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
        model
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        isUser: false,
        timestamp: new Date(),
        model: 'Error'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const getHelpText = () => {
    return `🤖 **ABLE AI Commands**\n\n` +
      `**📰 News & Updates:**\n` +
      `• "show news" / "ข่าวล่าสุด" - ดูข่าวตลาด\n` +
      `• "market update" - อัพเดทตลาด\n\n` +
      `**📅 Economic Calendar:**\n` +
      `• "economic calendar" / "ปฏิทินเศรษฐกิจ"\n` +
      `• "today events" / "event วันนี้"\n` +
      `• "when is NFP" / "FOMC เมื่อไหร่"\n\n` +
      `**📝 Notes:**\n` +
      `• "show notes" / "ดูโน้ต"\n` +
      `• "my notes" / "บันทึกของฉัน"\n\n` +
      `**🎲 Monte Carlo:**\n` +
      `• "monte carlo" / "simulation"\n` +
      `• "risk analysis" / "probability"\n\n` +
      `**📊 COT Analysis:**\n` +
      `• "Analyze COT gold" - วิเคราะห์ COT ทองคำ\n` +
      `• "COT silver" / "COT bitcoin"\n\n` +
      `**📈 Trading:**\n` +
      `• "My trades" - ดูรายการเทรดล่าสุด\n` +
      `• "Calculate 10000 2 50 48" - Position size\n\n` +
      `**💬 Chat:**\n` +
      `• พิมพ์อะไรก็ได้ถาม AI ได้เลย!\n\n` +
      `**⚙️ Settings:**\n` +
      `• กดปุ่ม ⚙️ เพื่อตั้งค่า Bridge`;
  };

  const quickCommands = [
    { label: '📅 Calendar', cmd: 'Show economic calendar today' },
    { label: '📝 Notes', cmd: 'Show my notes' },
    { label: '🎲 Monte Carlo', cmd: 'Show monte carlo analysis' },
    { label: '📊 COT Gold', cmd: 'Analyze COT for GOLD' },
    { label: '❓ Help', cmd: 'help' }
  ];

  const renderMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-bold text-green-400">{line.slice(2, -2)}</div>;
      }
      if (line.startsWith('• ')) {
        return <div key={i} className="ml-2">• {line.slice(2)}</div>;
      }
      if (line.match(/^\d+\./)) {
        return <div key={i} className="ml-2">{line}</div>;
      }
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <div key={i}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j} className="text-green-400">{part}</strong> : part
            )}
          </div>
        );
      }
      if (line.startsWith('```')) {
        return <code key={i} className="block bg-black/50 p-1 rounded text-xs text-green-300">{line.slice(3)}</code>;
      }
      if (line === '---') {
        return <hr key={i} className="my-2 border-green-500/30" />;
      }
      return <div key={i}>{line || <br />}</div>;
    });
  };

  const formatModelSize = (bytes: number): string => {
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <Card className="w-full h-full bg-black/90 border-green-500/50 flex flex-col">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-400 text-base">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-black" />
              </div>
              <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${aiProvider === 'gemini' || ollamaConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white">ABLE AI</span>
              <span className="text-xs font-normal flex items-center gap-1">
                {aiProvider === 'gemini' ? (
                  <span className="text-purple-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Gemini 2.5 Flash (Cloud)
                  </span>
                ) : ollamaConnected ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Ollama • {selectedModel}
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" />
                    Ollama Offline
                  </span>
                )}
                {mcpReady && <span className="text-cyan-400"> • {tools.length} MCP tools</span>}
              </span>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Connect Button */}
            <Button
              size="sm"
              variant={ollamaConnected ? "outline" : "default"}
              onClick={handleConnect}
              disabled={isConnecting}
              className={`gap-2 h-8 ${ollamaConnected 
                ? 'border-green-500 text-green-400 hover:bg-green-500/20' 
                : 'bg-green-600 hover:bg-green-700 text-white'}`}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : ollamaConnected ? (
                <Check className="w-4 h-4" />
              ) : (
                <Plug className="w-4 h-4" />
              )}
              {isConnecting ? 'Connecting...' : ollamaConnected ? 'Connected' : 'Connect'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0 text-white hover:bg-white/10"
            >
              {showSettings ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-3 p-4 bg-black/70 rounded-lg border border-green-500/30 space-y-4">
            {/* AI Provider Selection */}
            <div>
              <h3 className="font-bold text-green-400 text-base mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI Provider
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={aiProvider === 'gemini' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAIProvider('gemini')}
                  className={aiProvider === 'gemini' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'border-purple-500/50 text-purple-400 hover:bg-purple-500/20'}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gemini (Cloud)
                </Button>
                <Button
                  variant={aiProvider === 'ollama' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAIProvider('ollama')}
                  className={aiProvider === 'ollama' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'border-green-500/50 text-green-400 hover:bg-green-500/20'}
                >
                  <Cpu className="w-4 h-4 mr-2" />
                  Ollama (Local)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {aiProvider === 'gemini' 
                  ? '✅ Gemini พร้อมใช้งานทันที (Cloud)' 
                  : 'ต้องตั้งค่า Bridge URL สำหรับ Ollama'}
              </p>
            </div>

            {/* Bridge URL - Only show for Ollama */}
            {aiProvider === 'ollama' && (
              <div>
                <h3 className="font-bold text-green-400 text-base mb-2 flex items-center gap-2">
                  🔗 Bridge URL (จาก localhost.run)
                </h3>
                <div className="flex gap-2">
                  <Input
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="https://xxxx.localhost.run"
                    className="h-10 text-sm bg-black/50 border-green-500/50 text-white flex-1"
                  />
                  <Button 
                    onClick={handleSaveBridgeUrl} 
                    size="sm"
                    className="h-10 bg-green-600 hover:bg-green-700"
                  >
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  รัน API Server บน Mac แล้วใช้ localhost.run เพื่อได้ URL
                </p>
              </div>
            )}

            {/* Connection Status */}
            <div>
              <h3 className="font-bold text-green-400 text-base mb-2 flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Connection Status
              </h3>
              <Badge 
                className={`text-sm px-3 py-1 ${
                  aiProvider === 'gemini' 
                    ? 'bg-purple-500 text-white font-bold' 
                    : ollamaConnected 
                      ? 'bg-green-500 text-white font-bold' 
                      : 'bg-red-500 text-white font-bold'}`}
              >
                {aiProvider === 'gemini' 
                  ? '🟢 Gemini Ready' 
                  : ollamaConnected 
                    ? '🟢 Ollama Connected' 
                    : '🔴 Ollama Disconnected'}
              </Badge>
            </div>

            {/* Model Selection */}
            {ollamaConnected && ollamaModels.length > 0 && (
              <div>
                <h3 className="font-bold text-green-400 text-base mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Select Model
                </h3>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-10 text-sm bg-black/50 border-green-500/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-green-500/50">
                    {ollamaModels.map(model => (
                      <SelectItem key={model.name} value={model.name} className="text-white hover:bg-green-500/20">
                        {model.name} ({formatModelSize(model.size)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* MCP Tools */}
            <div>
              <h3 className="font-bold text-green-400 text-base mb-2 flex items-center gap-2">
                🛠️ MCP Tools ({tools.length})
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {tools.map(tool => (
                  <div key={tool.name} className="flex items-center gap-2 text-white text-sm bg-black/30 px-2 py-1 rounded">
                    <Cpu className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    <span className="truncate">{tool.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Refresh Button */}
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh Connection
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 px-3" ref={scrollRef}>
          <div className="space-y-3 py-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!msg.isUser && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-black" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg p-3 text-sm ${
                    msg.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-black/60 border border-green-500/30 text-green-100'
                  }`}
                >
                  {renderMessage(msg.text)}
                  {!msg.isUser && msg.model && (
                    <div className="text-xs text-cyan-400 mt-2 flex items-center gap-1 border-t border-green-500/20 pt-2">
                      <Zap className="w-3 h-3" />
                      {msg.model}
                    </div>
                  )}
                </div>
                {msg.isUser && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-black animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-green-400">กำลังคิด...</span>
                  <span className="text-xs text-muted-foreground">
                    {loadingTime} วินาที {loadingTime > 30 && '(model กำลังประมวลผล)'}
                  </span>
                  {loadingTime > 60 && (
                    <span className="text-xs text-yellow-400">รอได้ถึง 180 วินาที</span>
                  )}
                </div>
              </div>
            )}
            {connectionError && (
              <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-300">Connection Error: {connectionError}</span>
                <Button size="sm" variant="ghost" onClick={handleConnect} className="h-6 px-2 text-red-400">
                  Retry
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Commands */}
        <div className="px-3 py-2 flex gap-2 overflow-x-auto border-t border-green-500/20">
          {quickCommands.map((cmd, i) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              onClick={() => setInputMessage(cmd.cmd)}
              className="h-8 text-xs px-3 whitespace-nowrap flex-shrink-0 border-green-500/50 text-green-400 hover:bg-green-500/20"
            >
              {cmd.label}
            </Button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 flex gap-2 border-t border-green-500/20">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder={aiProvider === 'gemini' || ollamaConnected ? "ถามอะไรก็ได้..." : "เลือก AI Provider ใน Settings..."}
            disabled={isLoading}
            className="h-10 text-sm bg-black/50 border-green-500/50 text-white placeholder:text-gray-500"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            size="sm"
            className="h-10 w-10 p-0 bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ABLE3AI;
