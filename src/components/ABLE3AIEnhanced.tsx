import { useState, useRef, useEffect } from 'react';
import { FreeAIService } from '@/services/FreeAIService';
import { useMCP } from '@/contexts/MCPContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Send, Bot, User, Settings, Sparkles, Zap, Cpu,
  MessageSquare, TrendingUp, BarChart3, FileText, X
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  model?: string;
}

const ABLE3AIEnhanced = () => {
  const { isReady: mcpReady, tools, executeTool } = useMCP();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial greeting
    setMessages([{
      id: '1',
      text: `🤖 **ABLE 3.0 AI**\n\nสวัสดีครับ! พร้อมช่วยวิเคราะห์ตลาดการเงิน\n\n` +
        `✅ ใช้งานฟรี 100% (ไม่ต้อง API key)\n` +
        `✅ MCP System: ${mcpReady ? `${tools.length} tools พร้อมใช้` : 'กำลังโหลด...'}\n` +
        `✅ เข้าถึง COT, Trades, Notes ได้ทันที\n\n` +
        `พิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`,
      isUser: false,
      timestamp: new Date(),
      model: 'ABLE Local AI'
    }]);
  }, [mcpReady, tools.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      let model = 'ABLE Local AI';

      // Check for MCP tool calls
      const toolCall = FreeAIService.detectToolCall(currentInput);
      
      if (toolCall && mcpReady) {
        try {
          const result = await executeTool(toolCall.tool, toolCall.params);
          aiResponse = FreeAIService.formatToolResult(toolCall.tool, result);
          model = `MCP: ${toolCall.tool}`;
        } catch (error) {
          console.error('MCP tool error:', error);
          const response = FreeAIService.localAI(currentInput, []);
          aiResponse = response.text;
          model = response.model;
        }
      } else {
        // Use Local AI
        const response = FreeAIService.localAI(currentInput, []);
        aiResponse = response.text;
        model = response.model;
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

  const quickCommands = [
    { label: '📊 COT Gold', cmd: 'Analyze COT for GOLD' },
    { label: '📈 Performance', cmd: 'Show my trading performance' },
    { label: '💰 Position', cmd: 'Calculate position size 10000 2 50 48' },
    { label: '❓ Help', cmd: 'help' }
  ];

  const renderMessage = (text: string) => {
    // Simple markdown-like rendering
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-bold">{line.slice(2, -2)}</div>;
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
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
          </div>
        );
      }
      return <div key={i}>{line || <br />}</div>;
    });
  };

  return (
    <Card className="w-full h-full bg-card border-primary/30 flex flex-col">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary text-sm">
            <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-background" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold">ABLE 3.0 AI</span>
              <span className="text-[9px] text-muted-foreground font-normal">
                Free AI • {mcpReady ? `${tools.length} MCP tools` : 'Loading...'}
              </span>
            </div>
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSettings(!showSettings)}
            className="h-6 w-6 p-0"
          >
            {showSettings ? <X className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
          </Button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-2 p-2 bg-background/50 rounded border border-border text-[10px]">
            <div className="font-bold text-primary mb-2">🛠️ MCP Tools Available:</div>
            <div className="grid grid-cols-2 gap-1">
              {tools.slice(0, 8).map(tool => (
                <div key={tool.name} className="flex items-center gap-1 text-muted-foreground">
                  <Cpu className="w-2 h-2" />
                  {tool.name}
                </div>
              ))}
            </div>
            <div className="mt-2 text-muted-foreground">
              ✅ ใช้งานได้ฟรี 100% ไม่ต้อง API key
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
            placeholder="ถามอะไรก็ได้..."
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

export default ABLE3AIEnhanced;
