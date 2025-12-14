import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Settings, Loader2, Sparkles, Zap, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { AIFunctionRegistry } from '@/utils/AIFunctionRegistry';
import { registerAllFunctions } from '@/utils/RegisterAIFunctions';
import mcp from '@/services/MCPFunctions';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ABLE3AI = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'สวัสดีครับ! ผม ABLE 3.0 AI พร้อมช่วยเหลือคุณในการวิเคราะห์ตลาดการเงิน และตอบคำถามต่างๆ',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'openai' | 'claude' | 'free'>('free');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check if API key exists in localStorage
    const savedOpenAIKey = localStorage.getItem('openai_api_key');
    const savedClaudeKey = localStorage.getItem('claude_api_key');
    if (savedOpenAIKey || savedClaudeKey) {
      setApiKey(savedOpenAIKey || savedClaudeKey || '');
      setHasApiKey(true);
    }
    
    // Register AI functions
    registerAllFunctions({});
  }, []);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      const keyName = selectedModel === 'openai' ? 'openai_api_key' : 'claude_api_key';
      localStorage.setItem(keyName, apiKey.trim());
      setHasApiKey(true);
      setShowApiKeyInput(false);
      toast({
        title: "API Key Saved",
        description: `${selectedModel === 'openai' ? 'OpenAI' : 'Claude'} API key has been saved successfully.`,
      });
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    if (selectedModel !== 'free' && !hasApiKey) {
      setShowApiKeyInput(true);
      toast({
        title: "API Key Required",
        description: "Please enter your API key to use external AI models.",
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
    setInputMessage('');
    setIsLoading(true);

    try {
      let aiResponse: string;
      const systemMessage = 'You are ABLE 3.0 AI, a professional financial market analysis assistant. You specialize in trading, market analysis, economic indicators, and financial advice. Respond in Thai language when the user speaks Thai, and English when they speak English. Be concise, professional, and helpful.';
      const lowerMsg = inputMessage.toLowerCase();
      
      // Check for MCP commands first
      if (lowerMsg.includes('cot') && (lowerMsg.includes('gold') || lowerMsg.includes('ทอง'))) {
        const result = await mcp.execute('analyze_cot', { asset: 'GOLD - COMMODITY EXCHANGE INC.' });
        if (result.success) {
          aiResponse = `📊 **COT Analysis สำหรับ GOLD**\n\n` +
            `📅 Date: ${result.date}\n` +
            `📈 Commercial Net: ${result.analysis.commercialNet.toLocaleString()} (${result.analysis.commercialDirection})\n` +
            `📊 Large Trader Net: ${result.analysis.largeTraderNet.toLocaleString()} (${result.analysis.largeTraderDirection})\n` +
            `📦 Open Interest: ${result.analysis.openInterest.toLocaleString()}\n\n` +
            `💡 **Interpretation**: ${result.analysis.interpretation}`;
        } else {
          aiResponse = `❌ ไม่สามารถดึงข้อมูล COT ได้: ${result.error}`;
        }
      } else if (lowerMsg.includes('cot') && (lowerMsg.includes('silver') || lowerMsg.includes('เงิน'))) {
        const result = await mcp.execute('analyze_cot', { asset: 'SILVER - COMMODITY EXCHANGE INC.' });
        if (result.success) {
          aiResponse = `📊 **COT Analysis สำหรับ SILVER**\n\n` +
            `📅 Date: ${result.date}\n` +
            `📈 Commercial Net: ${result.analysis.commercialNet.toLocaleString()} (${result.analysis.commercialDirection})\n` +
            `📊 Large Trader Net: ${result.analysis.largeTraderNet.toLocaleString()} (${result.analysis.largeTraderDirection})\n` +
            `📦 Open Interest: ${result.analysis.openInterest.toLocaleString()}\n\n` +
            `💡 **Interpretation**: ${result.analysis.interpretation}`;
        } else {
          aiResponse = `❌ ไม่สามารถดึงข้อมูล COT ได้: ${result.error}`;
        }
      } else if (lowerMsg.includes('trade') && (lowerMsg.includes('performance') || lowerMsg.includes('ผล'))) {
        const result = await mcp.execute('analyze_performance', {});
        if (!result.success) {
          aiResponse = `❌ ${result.message || 'ไม่พบข้อมูลการเทรด'}`;
        } else {
          const m = result.metrics;
          aiResponse = `📈 **ผลการเทรดของคุณ**\n\n` +
            `📊 Total Trades: ${m.totalTrades}\n` +
            `✅ Winning Trades: ${m.winningTrades}\n` +
            `❌ Losing Trades: ${m.losingTrades}\n` +
            `🎯 Win Rate: ${m.winRate}\n` +
            `💰 Total P&L: $${m.totalPnL}\n` +
            `📈 Avg Win: $${m.avgWin}\n` +
            `📉 Avg Loss: $${m.avgLoss}`;
        }
      } else if (lowerMsg.includes('price') || lowerMsg.includes('ราคา')) {
        // Extract symbol from message
        const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'AAPL', 'TSLA', 'GOOGL', 'MSFT'];
        let symbol = symbols.find(s => lowerMsg.includes(s.toLowerCase()));
        
        if (!symbol) {
          if (lowerMsg.includes('bitcoin') || lowerMsg.includes('btc')) symbol = 'BTCUSDT';
          else if (lowerMsg.includes('ethereum') || lowerMsg.includes('eth')) symbol = 'ETHUSDT';
          else symbol = 'BTCUSDT';
        }
        
        const result = await mcp.execute('get_market_price', { symbol });
        if (result.success) {
          aiResponse = `💹 **${result.symbol}**\n\n` +
            `💵 Price: $${typeof result.price === 'number' ? result.price.toLocaleString() : result.price}\n` +
            `📊 24h Change: ${result.change24h}%\n` +
            `📦 Volume: ${typeof result.volume === 'number' ? result.volume.toLocaleString() : result.volume}\n` +
            `🔗 Source: ${result.source}`;
        } else {
          aiResponse = `❌ ไม่สามารถดึงราคา ${symbol} ได้`;
        }
      } else if (lowerMsg.includes('note') || lowerMsg.includes('โน้ต')) {
        const result = await mcp.execute('search_notes', { query: '' });
        aiResponse = `📝 **Notes ของคุณ**\n\n` +
          `พบ ${result.total} โน้ต\n\n` +
          (result.notes.length > 0 
            ? result.notes.slice(0, 5).map((n: any) => `• ${n.title}`).join('\n')
            : 'ยังไม่มีโน้ต');
      } else if (lowerMsg.includes('mcp') || lowerMsg.includes('function') || lowerMsg.includes('tools')) {
        const functions = mcp.list();
        aiResponse = `🔧 **MCP Functions พร้อมใช้งาน (${functions.length})**\n\n` +
          functions.map(f => `• **${f.name}**: ${f.description}`).join('\n');
      } else if (selectedModel === 'free') {
        // Try Gemini API if key exists
        const geminiKey = localStorage.getItem('gemini_api_key');
        
        if (geminiKey) {
          try {
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{
                    role: 'user',
                    parts: [{ text: `${systemMessage}\n\nUser: ${inputMessage}` }]
                  }],
                  generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000
                  }
                })
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
            } else {
              throw new Error('Gemini API error');
            }
          } catch (error) {
            console.error('Gemini error:', error);
            // Fallback to local AI
            aiResponse = getLocalAIResponse(inputMessage);
          }
        } else {
          // Local AI response
          aiResponse = getLocalAIResponse(inputMessage);
        }
      } else if (selectedModel === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('openai_api_key')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: systemMessage },
              ...messages.slice(-10).map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text
              })),
              { role: 'user', content: inputMessage }
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        aiResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
      } else {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': localStorage.getItem('claude_api_key') || '',
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            system: systemMessage,
            tools: AIFunctionRegistry.getFunctionDefinitionsForClaude(),
            messages: [
              ...messages.slice(-10).map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text
              })),
              { role: 'user', content: inputMessage }
            ]
          }),
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        
        if (data.stop_reason === 'tool_use') {
          const toolUse = data.content.find((c: any) => c.type === 'tool_use');
          if (toolUse) {
            try {
              const result = await AIFunctionRegistry.execute(toolUse.name, toolUse.input);
              aiResponse = `✅ Executed: **${toolUse.name}**\n\n${result.message || JSON.stringify(result, null, 2)}`;
            } catch (error) {
              aiResponse = `❌ Error executing ${toolUse.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          } else {
            aiResponse = data.content[0]?.text || 'Sorry, I could not generate a response.';
          }
        } else {
          aiResponse = data.content[0]?.text || 'Sorry, I could not generate a response.';
        }
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling AI API:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI. Please check your API key.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Local AI responses
  const getLocalAIResponse = (message: string): string => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('cot') || lowerMsg.includes('commitment')) {
      return `📊 **COT Data Analysis**\n\nสำหรับข้อมูล COT คุณสามารถ:\n• พิมพ์ "COT gold" เพื่อดู Gold positioning\n• พิมพ์ "COT silver" เพื่อดู Silver positioning\n\nหรือเปิด COT Data panel เพื่อดูข้อมูลแบบ interactive`;
    }
    
    if (lowerMsg.includes('trade') || lowerMsg.includes('position') || lowerMsg.includes('เทรด')) {
      return `📈 **Trading Tips**\n\n1. วิเคราะห์ปัจจัยพื้นฐานและเทคนิค\n2. ดู COT data เพื่อดู positioning\n3. บริหารความเสี่ง (Risk 1-2% per trade)\n4. Set stop loss ทุกครั้ง\n\nพิมพ์ "trade performance" เพื่อดูผลการเทรด`;
    }
    
    if (lowerMsg.includes('market') || lowerMsg.includes('ตลาด')) {
      return `🌍 **Market Analysis**\n\nแนะนำให้ดู:\n• Economic Indicators\n• COT positioning\n• Real Market Data\n• Currency correlations\n\nพิมพ์ "price BTCUSDT" เพื่อดูราคา`;
    }
    
    if (lowerMsg.includes('help') || lowerMsg.includes('ช่วย') || lowerMsg.includes('คำสั่ง')) {
      return `🤖 **ABLE 3.0 AI Commands**\n\n📊 **COT Analysis:**\n• "COT gold" - ดู Gold positioning\n• "COT silver" - ดู Silver positioning\n\n📈 **Trading:**\n• "trade performance" - ดูผลการเทรด\n\n💰 **Market:**\n• "price BTCUSDT" - ราคา Bitcoin\n• "price ETHUSDT" - ราคา Ethereum\n\n📝 **Notes:**\n• "notes" - ดูโน้ตทั้งหมด\n\n🔧 **System:**\n• "mcp functions" - ดู tools ทั้งหมด`;
    }
    
    return `สวัสดีครับ! ผมคือ ABLE 3.0 AI 🤖\n\nพิมพ์ "help" เพื่อดูคำสั่งทั้งหมด\n\nหรือตั้งค่า Gemini API key (ฟรี) ที่ ai.google.dev เพื่อใช้ AI ที่ฉลาดขึ้น`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick command buttons
  const quickCommands = [
    { label: '📊 Analyze Trades', action: 'analyze my recent trades' },
    { label: '📝 Create Note', action: 'create a new note for today' },
    { label: '📈 Open Dashboard', action: 'open the relationship dashboard' },
    { label: '🔍 Search Notes', action: 'search my notes' },
  ];

  return (
    <div className="terminal-panel h-full flex flex-col text-[0.4rem] xs:text-[0.5rem] sm:text-[0.6rem] md:text-xs lg:text-sm xl:text-base">
      {/* Header with Logo */}
      <div className="panel-header flex items-center justify-between border-b border-border pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-terminal-green to-terminal-cyan rounded-lg flex items-center justify-center">
              <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-background" />
            </div>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-terminal-amber rounded-full animate-pulse"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.6rem] xs:text-[0.7rem] sm:text-sm md:text-base lg:text-lg font-bold text-terminal-green">
              ABLE 3.0 AI
            </span>
            {selectedModel === 'claude' && AIFunctionRegistry.count() > 0 && (
              <Badge variant="outline" className="text-[0.4rem] h-3 px-1 gap-0.5">
                <Sparkles className="w-2 h-2" />
                {AIFunctionRegistry.count()} functions
              </Badge>
            )}
            <span className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-gray">
              Powered by {selectedModel === 'openai' ? 'ChatGPT' : selectedModel === 'claude' ? 'Claude' : 'Free AI'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
          className="w-6 h-6 flex items-center justify-center hover:bg-terminal-panel rounded transition-colors"
          title="API Settings"
        >
          <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-terminal-gray hover:text-terminal-green" />
        </button>
      </div>

      {/* API Key Input */}
      {showApiKeyInput && (
        <div className="bg-terminal-panel/50 p-2 rounded border border-border mb-2">
          <div className="text-[0.5rem] xs:text-[0.6rem] sm:text-xs text-terminal-amber mb-2">
            Select AI Model:
          </div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setSelectedModel('openai')}
              className={`px-2 py-1 rounded text-[0.4rem] xs:text-[0.5rem] sm:text-xs ${
                selectedModel === 'openai' 
                  ? 'bg-terminal-green text-background' 
                  : 'bg-terminal-panel text-terminal-gray'
              }`}
            >
              OpenAI
            </button>
            <button
              onClick={() => setSelectedModel('claude')}
              className={`px-2 py-1 rounded text-[0.4rem] xs:text-[0.5rem] sm:text-xs ${
                selectedModel === 'claude' 
                  ? 'bg-terminal-green text-background' 
                  : 'bg-terminal-panel text-terminal-gray'
              }`}
            >
              Claude
            </button>
            <button
              onClick={() => setSelectedModel('free')}
              className={`px-2 py-1 rounded text-[0.4rem] xs:text-[0.5rem] sm:text-xs ${
                selectedModel === 'free' 
                  ? 'bg-terminal-green text-background' 
                  : 'bg-terminal-panel text-terminal-gray'
              }`}
            >
              Free AI
            </button>
          </div>
          {selectedModel !== 'free' && (
            <>
              <div className="text-[0.5rem] xs:text-[0.6rem] sm:text-xs text-terminal-amber mb-1">
                Enter {selectedModel === 'openai' ? 'OpenAI' : 'Claude'} API Key:
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={selectedModel === 'openai' ? 'sk-...' : 'sk-ant-...'}
                  className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs bg-background border-border"
                />
                <Button
                  onClick={saveApiKey}
                  size="sm"
                  className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs"
                >
                  Save
                </Button>
              </div>
              <div className="text-[0.4rem] xs:text-[0.5rem] text-terminal-gray mt-1">
                Your API key is stored locally in your browser
              </div>
            </>
          )}
          {selectedModel === 'free' && (
            <div className="text-[0.4rem] xs:text-[0.5rem] text-terminal-green mt-1">
              Free AI model ready to use! No API key required.
            </div>
          )}
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto mb-2 space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-2 max-w-[80%] ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.isUser 
                  ? 'bg-terminal-cyan' 
                  : 'bg-gradient-to-br from-terminal-green to-terminal-cyan'
              }`}>
                {message.isUser ? (
                  <User className="w-2 h-2 sm:w-3 sm:h-3 text-background" />
                ) : (
                  <Bot className="w-2 h-2 sm:w-3 sm:h-3 text-background" />
                )}
              </div>
              <div className={`rounded-lg p-2 ${
                message.isUser 
                  ? 'bg-terminal-cyan/20 text-terminal-white' 
                  : 'bg-terminal-panel text-terminal-green'
              }`}>
                <div className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs whitespace-pre-wrap">
                  {message.text}
                </div>
                <div className="text-[0.3rem] xs:text-[0.4rem] sm:text-[0.5rem] text-terminal-gray mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="flex gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-terminal-green to-terminal-cyan flex items-center justify-center">
                <Bot className="w-2 h-2 sm:w-3 sm:h-3 text-background" />
              </div>
              <div className="bg-terminal-panel rounded-lg p-2 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-terminal-green" />
                <span className="text-[0.4rem] xs:text-[0.5rem] sm:text-xs text-terminal-green">
                  ABLE 3.0 กำลังคิด...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2 border-t border-border pt-2">
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="พิมพ์ข้อความของคุณ..."
          className="flex-1 text-[0.4rem] xs:text-[0.5rem] sm:text-xs bg-background border-border"
          disabled={isLoading}
        />
        <Button
          onClick={sendMessage}
          disabled={isLoading || !inputMessage.trim()}
          size="sm"
          className="px-3"
        >
          <Send className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
      </div>
    </div>
  );
};

export default ABLE3AI;