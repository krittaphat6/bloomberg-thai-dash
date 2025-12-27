import { useState, useRef, useEffect } from 'react';
import { OllamaService, OllamaModel } from '@/services/FreeAIService';
import { useMCP } from '@/contexts/MCPContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send, Bot, User, Settings, Sparkles, Zap, Cpu, X,
  RefreshCw, Plug, Check, Loader2, Wifi, WifiOff
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  model?: string;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check Ollama connection on mount
  useEffect(() => {
    checkOllamaConnection();
  }, []);

  // Initial greeting
  useEffect(() => {
    setMessages([{
      id: '1',
      text: `🤖 **ABLE AI - Powered by Ollama**\n\n` +
        `สวัสดีครับ! พร้อมช่วยวิเคราะห์ตลาดการเงิน\n\n` +
        `**Ollama Status:** ${ollamaConnected ? '🟢 Connected' : '🔴 Disconnected'}\n` +
        `**Model:** ${selectedModel}\n` +
        `**MCP Tools:** ${mcpReady ? `${tools.length} พร้อมใช้` : 'กำลังโหลด...'}\n\n` +
        `พิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`,
      isUser: false,
      timestamp: new Date(),
      model: 'System'
    }]);
  }, [mcpReady, tools.length, ollamaConnected, selectedModel]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkOllamaConnection = async () => {
    setIsConnecting(true);
    try {
      const isAvailable = await OllamaService.isAvailable();
      setOllamaConnected(isAvailable);

      if (isAvailable) {
        const models = await OllamaService.getModels();
        setOllamaModels(models);
        if (models.length > 0 && !models.find(m => m.name === selectedModel)) {
          setSelectedModel(models[0].name);
        }
        toast({
          title: "🟢 Ollama Connected",
          description: `Found ${models.length} models available`,
        });
      } else {
        toast({
          title: "🔴 Ollama Disconnected",
          description: "Please run 'ollama serve' in your terminal",
          variant: "destructive"
        });
      }
    } catch (error) {
      setOllamaConnected(false);
      toast({
        title: "❌ Connection Failed",
        description: "Could not connect to Ollama",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

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
      let model = selectedModel;

      // Check for help command
      if (currentInput.toLowerCase() === 'help' || currentInput.includes('ช่วย')) {
        aiResponse = getHelpText();
        model = 'System';
      }
      // Check for MCP tool calls
      else {
        const toolCall = OllamaService.detectToolCall(currentInput);

        if (toolCall && mcpReady) {
          try {
            // Execute MCP tool
            const result = await executeTool(toolCall.tool, toolCall.params);
            const toolResult = OllamaService.formatToolResult(toolCall.tool, result);

            // If Ollama is connected, ask it to analyze the data
            if (ollamaConnected) {
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
        } else if (ollamaConnected) {
          // No tool needed, just chat with Ollama
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
          // Ollama not connected
          aiResponse = '❌ Ollama ไม่ได้เชื่อมต่อ\n\n' +
            'กรุณาเริ่ม Ollama ก่อน:\n' +
            '1. เปิด Terminal\n' +
            '2. รัน: `ollama serve`\n' +
            '3. กดปุ่ม "Connect Ollama"\n\n' +
            'หากยังไม่ได้ติดตั้ง:\n' +
            '- Mac/Linux: `curl https://ollama.com/install.sh | sh`\n' +
            '- Windows: ดาวน์โหลดจาก ollama.com';
          model = 'System';
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
      `**📊 COT Analysis:**\n` +
      `• "Analyze COT gold" - วิเคราะห์ COT ทองคำ\n` +
      `• "COT silver" - ดูข้อมูล COT เงิน\n` +
      `• "COT bitcoin" - ดูข้อมูล COT Bitcoin\n` +
      `• "COT assets" - ดูรายการ assets ทั้งหมด\n\n` +
      `**📈 Trading:**\n` +
      `• "My trades" - ดูรายการเทรดล่าสุด\n` +
      `• "Performance" - ดูสถิติการเทรด\n` +
      `• "Calculate 10000 2 50 48" - คำนวณ position size\n` +
      `  (account, risk%, entry, stop)\n\n` +
      `**📝 Notes:**\n` +
      `• "Search notes trading" - ค้นหาโน้ต\n` +
      `• "Create note: [title]" - สร้างโน้ตใหม่\n\n` +
      `**🌐 Market:**\n` +
      `• "Market overview" - ภาพรวมตลาด\n\n` +
      `**💬 Chat:**\n` +
      `• พิมพ์อะไรก็ได้ถาม AI ได้เลย!\n\n` +
      `**⚙️ Settings:**\n` +
      `• กดปุ่ม ⚙️ เพื่อเปลี่ยน model และดู tools`;
  };

  const quickCommands = [
    { label: '📊 COT Gold', cmd: 'Analyze COT for GOLD' },
    { label: '📈 Performance', cmd: 'Show my trading performance' },
    { label: '💰 Position', cmd: 'Calculate position size 10000 2 50 48' },
    { label: '📝 Notes', cmd: 'Search notes' },
    { label: '❓ Help', cmd: 'help' }
  ];

  const renderMessage = (text: string, isUser: boolean) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className={`font-bold ${isUser ? 'text-white' : 'text-green-400'}`}>{line.slice(2, -2)}</div>;
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
              j % 2 === 1 ? <strong key={j} className={isUser ? 'text-white' : 'text-green-400'}>{part}</strong> : part
            )}
          </div>
        );
      }
      if (line.startsWith('```')) {
        return <code key={i} className="block bg-black/30 p-2 rounded text-xs font-mono text-green-300">{line.slice(3)}</code>;
      }
      if (line === '---') {
        return <hr key={i} className="my-2 border-white/20" />;
      }
      return <div key={i}>{line || <br />}</div>;
    });
  };

  const formatModelSize = (bytes: number): string => {
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <Card className="w-full h-full bg-card border-primary/30 flex flex-col">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-black" />
              </div>
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-card ${ollamaConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white">ABLE AI</span>
              <span className="text-xs text-white/70 font-normal flex items-center gap-1">
                {ollamaConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Ollama • {selectedModel}</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">Ollama Offline</span>
                  </>
                )}
                {mcpReady && <span className="text-white/60">• {tools.length} MCP tools</span>}
              </span>
            </div>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Connect Button */}
            <Button
              size="sm"
              onClick={checkOllamaConnection}
              disabled={isConnecting}
              variant={ollamaConnected ? "outline" : "default"}
              className={`h-8 gap-2 text-xs font-semibold ${
                ollamaConnected 
                  ? 'border-green-500 text-green-400 hover:bg-green-500/20' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : ollamaConnected ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Plug className="w-4 h-4" />
              )}
              {isConnecting ? 'Connecting...' : ollamaConnected ? 'Connected' : 'Connect Ollama'}
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
          <div className="mt-3 p-4 bg-black/40 rounded-lg border border-white/20 space-y-4">
            {/* Ollama Status */}
            <div>
              <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Connection Status
              </h3>
              <Badge className={`text-sm px-3 py-1.5 font-bold ${
                ollamaConnected 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}>
                {ollamaConnected ? '🟢 Connected to Ollama' : '🔴 Disconnected'}
              </Badge>
              {!ollamaConnected && (
                <p className="text-yellow-400 text-sm mt-2">
                  Run: <code className="bg-black/50 px-2 py-1 rounded font-mono">ollama serve</code>
                </p>
              )}
            </div>

            {/* Model Selection */}
            {ollamaConnected && ollamaModels.length > 0 && (
              <div>
                <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Select Model
                </h3>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-10 text-sm bg-black/30 border-white/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {ollamaModels.map(model => (
                      <SelectItem 
                        key={model.name} 
                        value={model.name} 
                        className="text-sm text-white hover:bg-white/10"
                      >
                        {model.name} ({formatModelSize(model.size)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* MCP Tools */}
            <div>
              <h3 className="font-bold text-green-400 text-sm mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                MCP Tools Available ({tools.length})
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {tools.map(tool => (
                  <div key={tool.name} className="flex items-center gap-2 text-white/80 text-sm bg-black/30 px-2 py-1 rounded">
                    <Cpu className="w-3 h-3 text-green-400 flex-shrink-0" />
                    <span className="truncate">{tool.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 px-3" ref={scrollRef}>
          <div className="space-y-4 py-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!msg.isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-black" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl p-4 text-sm ${
                    msg.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-white border border-white/10'
                  }`}
                >
                  <div className={msg.isUser ? 'text-white' : 'text-white/90'}>
                    {renderMessage(msg.text, msg.isUser)}
                  </div>
                  {!msg.isUser && msg.model && (
                    <div className="text-xs text-green-400 mt-2 flex items-center gap-1 border-t border-white/10 pt-2">
                      <Zap className="w-3 h-3" />
                      {msg.model}
                    </div>
                  )}
                </div>
                {msg.isUser && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-black animate-pulse" />
                </div>
                <span className="text-sm text-green-400">กำลังคิด...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Commands */}
        <div className="px-3 py-2 flex gap-2 overflow-x-auto">
          {quickCommands.map((cmd, i) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              onClick={() => setInputMessage(cmd.cmd)}
              className="h-8 text-xs px-3 whitespace-nowrap flex-shrink-0 border-white/30 text-white hover:bg-white/10"
            >
              {cmd.label}
            </Button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 pt-2 flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder={ollamaConnected ? "ถามอะไรก็ได้..." : "Click 'Connect Ollama' to start..."}
            disabled={isLoading}
            className="h-10 text-sm bg-black/30 border-white/30 text-white placeholder:text-white/50"
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
