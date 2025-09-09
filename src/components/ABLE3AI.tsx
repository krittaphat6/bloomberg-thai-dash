import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

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
      let aiResponse;
      const systemMessage = 'You are ABLE 3.0 AI, a professional financial market analysis assistant. You specialize in trading, market analysis, economic indicators, and financial advice. Respond in Thai language when the user speaks Thai, and English when they speak English. Be concise, professional, and helpful.';
      
      if (selectedModel === 'free') {
        // Use a simple rule-based response for free model
        const responses = [
          'ขอบคุณสำหรับคำถาม! ในฐานะ ABLE 3.0 AI แบบฟรี ผมแนะนำให้วิเคราะห์ข้อมูลตลาดอย่างรอบครอบก่อนตัดสินใจลงทุน',
          'สวัสดี! สำหรับการวิเคราะห์ตลาดการเงิน แนะนำให้ดูที่ปัจจัยพื้นฐานและเทคนิคร่วมกัน',
          'ขอบคุณที่ใช้บริการ ABLE 3.0 AI! การลงทุนควรมีการกระจายความเสี่ยงเสมอ',
          'Hello! As ABLE 3.0 AI, I recommend always analyzing market trends before making investment decisions.',
          'Thank you for your question! For financial market analysis, consider both fundamental and technical factors.'
        ];
        aiResponse = responses[Math.floor(Math.random() * responses.length)];
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

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

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
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
            system: systemMessage,
            messages: [
              ...messages.slice(-10).map(msg => ({
                role: msg.isUser ? 'user' : 'assistant',
                content: msg.text
              })),
              { role: 'user', content: inputMessage }
            ]
          }),
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        aiResponse = data.content[0]?.text || 'Sorry, I could not generate a response.';
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI. Please check your API key.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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