import { useState, useRef, useEffect, useCallback } from 'react';
import { OllamaService, OllamaModel } from '@/services/FreeAIService';
import { GeminiService } from '@/services/GeminiService';
import { UniversalDataService } from '@/services/UniversalDataService';
import { useMCP } from '@/contexts/MCPContext';
import { usePanelCommander, AVAILABLE_PANELS } from '@/contexts/PanelCommanderContext';
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
  Send, Bot, User, Settings, Sparkles, Zap, X,
  RefreshCw, Wifi, WifiOff, Plug, Check, Loader2, Database, Layout
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  model?: string;
}

const ABLE3AI = () => {
  const { isReady: mcpReady, tools, executeTool } = useMCP();
  const { executeAICommand, getAvailablePanels } = usePanelCommander();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Ollama states
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3');
  const [bridgeUrl, setBridgeUrl] = useState(OllamaService.getBridgeUrl());
  
  // Gemini states
  const [geminiReady, setGeminiReady] = useState(false);
  
  // AI Provider selection
  const [aiProvider, setAiProvider] = useState<'ollama' | 'gemini'>('gemini');
  
  const [isConnecting, setIsConnecting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Loading time tracking
  const [loadingTime, setLoadingTime] = useState(0);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Universal data context
  const [dataContext, setDataContext] = useState<any>(null);

  const quickCommands = [
    { label: '📊 Market', cmd: 'What is the current market situation?' },
    { label: '📰 News', cmd: 'Get latest market news' },
    { label: '📋 COT', cmd: 'Analyze COT data for gold' },
    { label: '📔 Journal', cmd: 'เปิด trading journal' },
    { label: '🧠 40 Modules', cmd: 'เปิด 40 modules' }
  ];

  // Fetch universal data context
  const fetchDataContext = useCallback(async () => {
    try {
      const result = await UniversalDataService.getData(['all']);
      if (result.success) {
        setDataContext(result.data);
        console.log('✅ Data context loaded:', result.sources);
      }
    } catch (error) {
      console.error('Failed to fetch data context:', error);
    }
  }, []);

  // Auto-connect Gemini on mount and fetch data
  useEffect(() => {
    handleGeminiConnect();
    fetchDataContext();
  }, [fetchDataContext]);

  // Update greeting when state changes
  const updateGreeting = useCallback(() => {
    const providerStatus = geminiReady && aiProvider === 'gemini' 
      ? '🟢 Gemini (Cloud)' 
      : ollamaConnected && aiProvider === 'ollama' 
        ? '🟢 Ollama (Local)' 
        : '🔴 Disconnected';
    
    setMessages([{
      id: '1',
      text: `🤖 **ABLE AI - Powered by ${aiProvider === 'gemini' ? 'Gemini 2.5 Flash' : selectedModel}**\n\n` +
        `สวัสดีครับ! พร้อมช่วยวิเคราะห์ตลาดการเงิน\n\n` +
        `**AI Provider:** ${providerStatus}\n` +
        `**Model:** ${aiProvider === 'gemini' ? 'gemini-2.5-flash' : selectedModel}\n` +
        `**MCP Tools:** ${mcpReady ? `${tools.length} พร้อมใช้` : 'กำลังโหลด...'}\n` +
        `**🎛️ Panel Control:** ✅ พร้อมเปิด/ปิด functions\n` +
        `**Data Access:** ✅ เข้าถึงข้อมูลทุกอย่างในแอป\n\n` +
        `💡 **ลองพิมพ์:** "เปิด trading journal" หรือ "list functions"\n\n` +
        `พิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`,
      isUser: false,
      timestamp: new Date(),
      model: 'System'
    }]);
  }, [mcpReady, tools.length, ollamaConnected, selectedModel, geminiReady, aiProvider]);

  // Initial greeting
  useEffect(() => {
    updateGreeting();
  }, [updateGreeting]);

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

  // Gemini Connect
  const handleGeminiConnect = async () => {
    setIsConnecting(true);
    
    try {
      const available = await GeminiService.isAvailable();
      
      if (available) {
        setGeminiReady(true);
        setAiProvider('gemini');
        toast({
          title: "✅ เชื่อมต่อ Gemini สำเร็จ!",
          description: "พร้อมใช้งาน Gemini 2.5 Flash (Cloud)",
        });
      }
    } catch (error) {
      console.error('Gemini connect error:', error);
      toast({
        title: "❌ เชื่อมต่อ Gemini ไม่สำเร็จ",
        description: "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Ollama Connect
  const handleOllamaConnect = async () => {
    setIsConnecting(true);
    
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

      const status = await OllamaService.getOllamaStatus();
      if (status.connected) {
        setOllamaConnected(true);
        setOllamaModels(status.models);
        setAiProvider('ollama');
        if (status.models.length > 0 && !status.models.find(m => m.name === selectedModel)) {
          setSelectedModel(status.models[0].name);
        }
        toast({
          title: "✅ เชื่อมต่อสำเร็จ!",
          description: `Ollama พร้อมใช้งาน • ${status.models.length} models`,
        });
      } else {
        throw new Error('Ollama not connected on Mac');
      }
    } catch (error: any) {
      toast({
        title: "❌ เชื่อมต่อไม่สำเร็จ",
        description: error.message,
        variant: "destructive",
      });
      setOllamaConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveBridgeUrl = () => {
    OllamaService.setBridgeUrl(bridgeUrl);
    toast({
      title: "✅ Bridge URL saved",
      description: "Attempting to connect...",
    });
    handleOllamaConnect();
  };

  const getHelpText = () => {
    const panelsList = AVAILABLE_PANELS.slice(0, 15).map(p => `• "${p.keywords[0]}"`).join('\n');
    
    return `🤖 **ABLE AI Help**\n\n` +
      `**🎛️ Panel Commands (ควบคุมหน้าจอ):**\n` +
      `• "เปิด trading journal" - เปิดฟังชัน Trading Journal\n` +
      `• "open cot data" - เปิด COT Data\n` +
      `• "เปิด 40 modules" - เปิด ABLE-HF 40 Modules\n` +
      `• "ปิด notes" - ปิด Notes panel\n` +
      `• "list functions" - ดูรายการฟังชันทั้งหมด\n\n` +
      `**📊 Available Functions:**\n${panelsList}\n...และอื่นๆ\n\n` +
      `**MCP Tools (${tools.length} available):**\n` +
      tools.slice(0, 5).map(t => `• ${t.name}`).join('\n') + '\n\n' +
      `**ตัวอย่างคำถาม:**\n` +
      `• "Analyze COT data for gold"\n` +
      `• "What's the market sentiment?"\n` +
      `• "เปิด trading chart แล้ววิเคราะห์ตลาด"`;
  };

  // Check if message is a panel command - improved detection
  const tryPanelCommand = (message: string): { handled: boolean; response?: string; skipAI?: boolean } => {
    const lowerMessage = message.toLowerCase().trim();
    
    // Direct panel command patterns - must be explicit commands
    const openPatterns = [
      /^(?:เปิด|open|show|แสดง|launch|run|go to|ไปที่|เปิดฟังชัน|เปิดฟังก์ชัน|เปิด function)\s*(.+?)(?:\s*(?:ให้หน่อย|หน่อย|ด้วย|please|pls|now))?$/i,
    ];
    
    const closePatterns = [
      /^(?:ปิด|close|hide|ซ่อน)\s*(.+?)(?:\s*(?:ให้หน่อย|หน่อย|ด้วย|please))?$/i,
    ];
    
    const listPatterns = [
      /^(?:list|รายการ|show all|ดู)\s*(?:functions?|panels?|ฟังชัน|ฟังก์ชัน)?$/i,
    ];
    
    // Check for list command
    for (const pattern of listPatterns) {
      if (pattern.test(lowerMessage)) {
        const result = executeAICommand(message);
        return { handled: true, response: result.message, skipAI: true };
      }
    }
    
    // Check for open commands
    for (const pattern of openPatterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        const result = executeAICommand(message);
        if (result.success) {
          return { handled: true, response: result.message, skipAI: true };
        }
        // If not found, return the error message and skip AI
        if (result.message) {
          return { handled: true, response: result.message, skipAI: true };
        }
      }
    }
    
    // Check for close commands
    for (const pattern of closePatterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        const result = executeAICommand(message);
        return { handled: true, response: result.message, skipAI: true };
      }
    }
    
    return { handled: false };
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInput,
      isUser: true,
      timestamp: new Date(),
      model: 'User'
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      let aiResponse = '';
      let model = '';

      // First, try panel commands (these work without AI connection)
      const panelResult = tryPanelCommand(currentInput);
      if (panelResult.handled) {
        aiResponse = panelResult.response || '✅ เสร็จสิ้น';
        model = '🎛️ Panel Commander';
        
        if (panelResult.skipAI) {
          // Don't send to AI, just show the response
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            text: aiResponse,
            isUser: false,
            timestamp: new Date(),
            model
          }]);
          setIsLoading(false);
          return;
        }
      }
      // Check for help command
      else if (currentInput.trim().toLowerCase() === 'help') {
        aiResponse = getHelpText();
        model = 'System';
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          isUser: false,
          timestamp: new Date(),
          model
        }]);
        setIsLoading(false);
        return;
      }
      // Handle based on AI provider
      else {
        // Get fresh data context for AI
        const freshContext = await UniversalDataService.getData(['all']);
        const contextSummary = freshContext.success ? UniversalDataService.formatForAI(freshContext) : '';
        
        if (aiProvider === 'gemini' && geminiReady) {
          // Use Gemini with data context
          const toolCall = GeminiService.detectToolCall(currentInput);

          if (toolCall && mcpReady) {
            try {
              const result = await executeTool(toolCall.tool, toolCall.params);
              const toolResult = GeminiService.formatToolResult(toolCall.tool, result);

              const analysisPrompt = `User asked: "${currentInput}"\n\nHere is the data from ${toolCall.tool}:\n\n${toolResult}\n\n${contextSummary}\n\nPlease provide a brief analysis and any insights based on this data. Respond in Thai.`;
              
              const geminiResponse = await GeminiService.chat(
                analysisPrompt,
                [],
                undefined
              );

              aiResponse = `${toolResult}\n\n---\n\n**🤖 AI Analysis:**\n${geminiResponse.text}`;
              model = `MCP + Gemini`;
            } catch (error) {
              console.error('MCP tool error:', error);
              aiResponse = `❌ Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
              model = 'Error';
            }
          } else {
            // Regular Gemini chat with context - improved system prompt for concise answers
            const enhancedPrompt = `${currentInput}\n\n--- App Data Context ---\n${contextSummary}`;
            const conciseSystemPrompt = `คุณคือ ABLE AI ผู้เชี่ยวชาญด้านการเทรดและการเงิน

กฎสำคัญ:
1. ตอบสั้น กระชับ ตรงประเด็น (ไม่เกิน 3-4 ประโยค ยกเว้นเรื่องซับซ้อน)
2. ถ้าผู้ใช้ถามเรื่องเดียว ตอบเรื่องนั้นเท่านั้น
3. อย่าถามคำถามติดตามเพิ่ม ยกเว้นจำเป็นมาก
4. ใช้ข้อมูลจาก context ที่ให้มาตอบ
5. ตอบเป็นภาษาเดียวกับผู้ใช้`;
            
            const response = await GeminiService.chat(
              enhancedPrompt,
              messages.slice(-10).map(m => ({
                role: m.isUser ? 'user' as const : 'assistant' as const,
                content: m.text
              })),
              conciseSystemPrompt
            );
            aiResponse = response.text;
            model = response.model;
          }
        } else if (aiProvider === 'ollama' && ollamaConnected) {
          // Use Ollama with data context
          const toolCall = OllamaService.detectToolCall(currentInput);

          if (toolCall && mcpReady) {
            try {
              const result = await executeTool(toolCall.tool, toolCall.params);
              const toolResult = OllamaService.formatToolResult(toolCall.tool, result);

              const analysisPrompt = `User asked: "${currentInput}"\n\nHere is the data from ${toolCall.tool}:\n\n${toolResult}\n\n${contextSummary}\n\nPlease provide a brief analysis and any insights based on this data. Respond in Thai.`;
              
              const ollamaResponse = await OllamaService.chat(
                analysisPrompt,
                [],
                selectedModel,
                'คุณคือ ABLE AI ผู้เชี่ยวชาญด้านการเทรดและการเงิน คุณมีสิทธิ์เข้าถึงข้อมูลทุกอย่างในแอปพลิเคชัน'
              );

              aiResponse = `${toolResult}\n\n---\n\n**AI Analysis:**\n${ollamaResponse.text}`;
              model = `MCP + Ollama (${selectedModel})`;
            } catch (error) {
              console.error('MCP tool error:', error);
              aiResponse = `❌ Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
              model = 'Error';
            }
          } else {
            // Regular Ollama chat with context - improved system prompt
            const enhancedPrompt = `${currentInput}\n\n--- App Data Context ---\n${contextSummary}`;
            const conciseSystemPrompt = `คุณคือ ABLE AI ผู้เชี่ยวชาญการเทรด

กฎ: ตอบสั้นๆ ตรงประเด็น ไม่ถามคำถามติดตาม ใช้ข้อมูลจาก context ตอบ ตอบภาษาเดียวกับผู้ใช้`;
            
            const response = await OllamaService.chat(
              enhancedPrompt,
              messages.slice(-10).map(m => ({
                role: m.isUser ? 'user' as const : 'assistant' as const,
                content: m.text
              })),
              selectedModel,
              conciseSystemPrompt
            );
            aiResponse = response.text;
            model = response.model;
          }
        } else {
          aiResponse = '❌ กรุณาเลือก AI Provider\n\n' +
            '**Gemini (Cloud):** กดปุ่ม "Gemini (Cloud)" เพื่อใช้ Gemini\n' +
            '**Ollama (Local):** ตั้งค่า Bridge URL และกด "Connect"';
          model = 'Error';
        }
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
        model
      }]);

    } catch (error: any) {
      console.error('Send error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: `❌ เกิดข้อผิดพลาดจาก ${aiProvider === 'gemini' ? 'Gemini' : 'Ollama'}: ${error.message}`,
        isUser: false,
        timestamp: new Date(),
        model: 'Error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-bold text-green-400">{line.slice(2, -2)}</div>;
      }
      if (line.startsWith('• ')) {
        return <div key={i} className="ml-2">• {line.slice(2)}</div>;
      }
      if (line === '---') {
        return <hr key={i} className="my-2 border-green-500/30" />;
      }
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={i}>
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**') 
              ? <strong key={j} className="text-green-400">{part.slice(2, -2)}</strong> 
              : part
          )}
        </div>
      );
    });
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
              <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${(geminiReady && aiProvider === 'gemini') || (ollamaConnected && aiProvider === 'ollama') ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white">ABLE AI</span>
              <span className="text-xs font-normal flex items-center gap-1">
                {geminiReady && aiProvider === 'gemini' ? (
                  <span className="text-purple-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Gemini 2.5 Flash (Cloud)
                  </span>
                ) : ollamaConnected && aiProvider === 'ollama' ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    Ollama • {selectedModel}
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" />
                    Not Connected
                  </span>
                )}
                {mcpReady && <span className="text-cyan-400"> • {tools.length} MCP tools</span>}
              </span>
            </div>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className="h-8 w-8 p-0 text-white hover:bg-white/10"
          >
            {showSettings ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
          </Button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-3 p-3 bg-black/70 rounded-lg border border-green-500/30 space-y-3">
            {/* AI Provider Selection */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={geminiReady && aiProvider === 'gemini' ? 'default' : 'outline'}
                size="sm"
                onClick={handleGeminiConnect}
                disabled={isConnecting}
                className={`flex-1 gap-2 h-10 ${
                  geminiReady && aiProvider === 'gemini'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500'
                    : 'border-purple-500/50 text-purple-400 hover:bg-purple-500/20'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Gemini (Cloud)
                {geminiReady && aiProvider === 'gemini' && <Check className="w-4 h-4" />}
              </Button>
              <Button
                variant={aiProvider === 'ollama' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setAiProvider('ollama');
                  if (!ollamaConnected) {
                    toast({
                      title: "🔌 Ollama Mode Selected",
                      description: "Enter your Bridge URL below to connect",
                    });
                  }
                }}
                className={`flex-1 gap-2 h-10 ${
                  aiProvider === 'ollama'
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-500'
                    : 'border-green-500/50 text-green-400 hover:bg-green-500/20'
                }`}
              >
                <Wifi className="w-4 h-4" />
                Ollama (Local)
                {ollamaConnected && aiProvider === 'ollama' && <Check className="w-4 h-4" />}
              </Button>
            </div>

            {/* Ollama Bridge URL (show when Ollama is selected and not connected) */}
            {aiProvider === 'ollama' && !ollamaConnected && (
              <div className="space-y-2">
                <p className="text-xs text-green-400 font-medium">🔗 Ollama Bridge URL</p>
                <div className="flex gap-2">
                  <Input
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="https://xxxx.localhost.run"
                    className="h-9 text-xs bg-black/50 border-green-500/50 text-white flex-1"
                  />
                  <Button onClick={handleSaveBridgeUrl} size="sm" disabled={isConnecting} className="h-9 bg-green-600 hover:bg-green-700">
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  รัน API Server บน Mac แล้วใช้ localhost.run เพื่อได้ URL
                </p>
              </div>
            )}

            {/* Ollama Model Selection (if connected) */}
            {ollamaConnected && aiProvider === 'ollama' && (
              <div className="space-y-2">
                <p className="text-xs text-green-400 font-medium">🤖 Select Model</p>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-9 text-xs bg-black/50 border-green-500/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-green-500/50">
                    {ollamaModels.map(m => (
                      <SelectItem key={m.name} value={m.name} className="text-white hover:bg-green-500/20">
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
                    {loadingTime} วินาที
                  </span>
                </div>
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
            placeholder={
              (geminiReady && aiProvider === 'gemini') || (ollamaConnected && aiProvider === 'ollama')
                ? "ถามอะไรก็ได้..."
                : "Select AI Provider first..."
            }
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
