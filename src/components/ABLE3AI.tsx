import { useState, useRef, useEffect } from 'react';
import { OllamaService, OllamaModel } from '@/services/FreeAIService';
import { useMCP } from '@/contexts/MCPContext';
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
  RefreshCw, Circle, Wifi, WifiOff
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
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
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
    setIsCheckingConnection(true);
    try {
      const isAvailable = await OllamaService.isAvailable();
      setOllamaConnected(isAvailable);

      if (isAvailable) {
        const models = await OllamaService.getModels();
        setOllamaModels(models);
        if (models.length > 0 && !models.find(m => m.name === selectedModel)) {
          setSelectedModel(models[0].name);
        }
      }
    } catch (error) {
      setOllamaConnected(false);
    } finally {
      setIsCheckingConnection(false);
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
            '3. กดปุ่ม Refresh Connection\n\n' +
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

  const renderMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-bold text-primary">{line.slice(2, -2)}</div>;
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
              j % 2 === 1 ? <strong key={j} className="text-primary">{part}</strong> : part
            )}
          </div>
        );
      }
      if (line.startsWith('```')) {
        return <code key={i} className="block bg-muted p-1 rounded text-xs">{line.slice(3)}</code>;
      }
      if (line === '---') {
        return <hr key={i} className="my-2 border-border" />;
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
          <CardTitle className="flex items-center gap-2 text-primary text-sm">
            <div className="relative">
              <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-background" />
              </div>
              <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${ollamaConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold">ABLE AI</span>
              <span className="text-[9px] text-muted-foreground font-normal flex items-center gap-1">
                {ollamaConnected ? (
                  <>
                    <Wifi className="w-2 h-2 text-green-500" />
                    Ollama • {selectedModel}
                  </>
                ) : (
                  <>
                    <WifiOff className="w-2 h-2 text-red-500" />
                    Ollama Offline
                  </>
                )}
                {mcpReady && ` • ${tools.length} MCP tools`}
              </span>
            </div>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={checkOllamaConnection}
              disabled={isCheckingConnection}
              className="h-6 w-6 p-0"
              title="Refresh Connection"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingConnection ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className="h-6 w-6 p-0"
            >
              {showSettings ? <X className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-2 p-2 bg-background/50 rounded border border-border text-[10px] space-y-3">
            {/* Ollama Status */}
            <div>
              <div className="font-bold text-primary mb-1 flex items-center gap-1">
                {ollamaConnected ? (
                  <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                ) : (
                  <Circle className="w-2 h-2 fill-red-500 text-red-500" />
                )}
                Ollama Status: {ollamaConnected ? 'Connected' : 'Disconnected'}
              </div>
              {!ollamaConnected && (
                <div className="text-muted-foreground text-[9px] ml-3">
                  Run: <code className="bg-muted px-1 rounded">ollama serve</code>
                </div>
              )}
            </div>

            {/* Model Selection */}
            {ollamaConnected && ollamaModels.length > 0 && (
              <div>
                <div className="font-bold text-primary mb-1">Select Model:</div>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ollamaModels.map(model => (
                      <SelectItem key={model.name} value={model.name} className="text-xs">
                        {model.name} ({formatModelSize(model.size)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* MCP Tools */}
            <div>
              <div className="font-bold text-primary mb-1">🛠️ MCP Tools ({tools.length}):</div>
              <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto">
                {tools.map(tool => (
                  <div key={tool.name} className="flex items-center gap-1 text-muted-foreground">
                    <Cpu className="w-2 h-2 flex-shrink-0" />
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
          <div className="space-y-3 py-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!msg.isUser && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 text-background" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg p-2 text-[11px] ${
                    msg.isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-accent'
                  }`}
                >
                  {renderMessage(msg.text)}
                  {!msg.isUser && msg.model && (
                    <div className="text-[8px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Zap className="w-2 h-2" />
                      {msg.model}
                    </div>
                  )}
                </div>
                {msg.isUser && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-background animate-pulse" />
                </div>
                <span className="text-[10px] text-muted-foreground">กำลังคิด...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Commands */}
        <div className="px-3 py-1 flex gap-1 overflow-x-auto">
          {quickCommands.map((cmd, i) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              onClick={() => setInputMessage(cmd.cmd)}
              className="h-6 text-[9px] px-2 whitespace-nowrap flex-shrink-0"
            >
              {cmd.label}
            </Button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 pt-1 flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder={ollamaConnected ? "ถามอะไรก็ได้..." : "Ollama offline - กด Refresh"}
            disabled={isLoading}
            className="h-8 text-xs"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim()}
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ABLE3AI;
