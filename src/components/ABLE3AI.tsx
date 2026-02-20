import { useState, useRef, useEffect, useCallback } from 'react';
import { OllamaService, OllamaModel } from '@/services/FreeAIService';
import { GeminiService } from '@/services/GeminiService';
import { UniversalDataService } from '@/services/UniversalDataService';
import { useMCP } from '@/contexts/MCPContext';
import { usePanelCommander, AVAILABLE_PANELS } from '@/contexts/PanelCommanderContext';
import { useAgent } from '@/contexts/AgentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Send, Bot, User, Settings, Sparkles, Zap, X,
  RefreshCw, Wifi, WifiOff, Plug, Check, Loader2, Database, Layout,
  Paperclip, FileText, Image as ImageIcon, BotIcon, Trash2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AgentOverlay, AGENT_QUICK_COMMANDS, AGENT_SYSTEM_PROMPT } from '@/components/agent/AgentOverlay';

interface ThinkingStep {
  id: string;
  text: string;
  status: 'running' | 'done' | 'error';
  timestamp: Date;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  model?: string;
  thinking?: ThinkingStep[];
  thinkingCollapsed?: boolean;
  file?: {
    name: string;
    type: string;
    preview?: string;
  };
}

const ThinkingBlock = ({ steps, collapsed, onToggle }: {
  steps: ThinkingStep[];
  collapsed: boolean;
  onToggle: () => void;
}) => {
  const doneCount = steps.filter(s => s.status === 'done').length;
  const totalCount = steps.length;

  return (
    <div className="mb-2 rounded-lg border border-purple-500/30 bg-purple-900/10 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-purple-300 hover:bg-purple-500/10 transition-colors text-left"
      >
        <span className="text-purple-400">{collapsed ? '▶' : '▼'}</span>
        <span className="font-medium">
          {collapsed ? `คิดมาแล้ว ${totalCount} ขั้นตอน` : 'กระบวนการคิด'}
        </span>
        <span className="ml-auto text-purple-500 text-[10px]">
          {doneCount}/{totalCount} steps
        </span>
      </button>
      {!collapsed && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-purple-500/20">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-2 text-xs py-1">
              <span className="flex-shrink-0 mt-0.5">
                {step.status === 'running' ? (
                  <span className="w-3 h-3 rounded-full border-2 border-purple-400 border-t-transparent animate-spin inline-block" />
                ) : step.status === 'done' ? (
                  <span className="text-green-400">✓</span>
                ) : (
                  <span className="text-red-400">✗</span>
                )}
              </span>
              <span className={`
                ${step.status === 'running' ? 'text-purple-200 animate-pulse' : ''}
                ${step.status === 'done' ? 'text-gray-400' : ''}
                ${step.status === 'error' ? 'text-red-400' : ''}
              `}>
                {step.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ABLE3AI = () => {
  const { isReady: mcpReady, tools, executeTool } = useMCP();
  const panelCommander = usePanelCommander();
  const agent = useAgent();
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

  // File upload states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conversation history for multi-turn memory
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Thinking steps state
  const [currentThinking, setCurrentThinking] = useState<ThinkingStep[]>([]);
  const thinkingRef = useRef<ThinkingStep[]>([]);

  const addThinkingStep = useCallback((text: string, status: ThinkingStep['status'] = 'running') => {
    // Mark previous running step as done
    thinkingRef.current = thinkingRef.current.map((s, i) =>
      i === thinkingRef.current.length - 1 && s.status === 'running'
        ? { ...s, status: 'done' as const }
        : s
    );
    const step: ThinkingStep = {
      id: Date.now().toString() + Math.random(),
      text,
      status,
      timestamp: new Date()
    };
    thinkingRef.current = [...thinkingRef.current, step];
    setCurrentThinking([...thinkingRef.current]);
    return step.id;
  }, []);

  const finishThinking = useCallback(() => {
    thinkingRef.current = thinkingRef.current.map(s =>
      s.status === 'running' ? { ...s, status: 'done' as const } : s
    );
    setCurrentThinking([...thinkingRef.current]);
  }, []);

  const quickCommands = [
    { label: '📊 Market', cmd: 'What is the current market situation?' },
    { label: '📰 ข่าวล่าสุด', cmd: 'ดึงข่าวการเงินล่าสุดให้หน่อย' },
    { label: '📋 COT Gold', cmd: 'Analyze COT data for gold' },
    { label: '📸 วิเคราะห์กราฟ', cmd: 'วิเคราะห์กราฟที่เห็นบนหน้าจอตอนนี้' },
    { label: '🌍 แผ่นดินไหว', cmd: 'แผ่นดินไหวล่าสุดมีที่ไหนบ้าง' },
    { label: '🔍 Screener', cmd: 'เปิด screener แล้วบอกว่าใช้งานยังไง' },
  ];

  // Fetch universal data context
  const fetchDataContext = useCallback(async () => {
    try {
      const result = await UniversalDataService.getData(['all']);
      if (result.success) {
        setDataContext(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch data context:', error);
    }
  }, []);

  // Auto-connect Gemini on mount
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
        `**MCP Tools:** ${mcpReady ? `${tools.length} พร้อมใช้` : 'กำลังโหลด...'}\n` +
        `**🧠 Memory:** ✅ จำบทสนทนาได้\n` +
        `**📸 Vision:** ✅ วิเคราะห์กราฟจากหน้าจอ\n` +
        `**🌍 Intel:** ✅ ข่าวกรองโลก + ข่าว 50+ แหล่ง\n` +
        `**🤖 OpenClaw:** ✅ ควบคุม UI อัตโนมัติ\n\n` +
        `💡 พิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`,
      isUser: false,
      timestamp: new Date(),
      model: 'System'
    }]);
  }, [mcpReady, tools.length, ollamaConnected, selectedModel, geminiReady, aiProvider]);

  useEffect(() => { updateGreeting(); }, [updateGreeting]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, currentThinking]);

  // Loading time counter
  useEffect(() => {
    if (isLoading) {
      setLoadingTime(0);
      loadingTimerRef.current = setInterval(() => setLoadingTime(prev => prev + 1), 1000);
    } else {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    }
    return () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); };
  }, [isLoading]);

  const handleGeminiConnect = async () => {
    setIsConnecting(true);
    try {
      const available = await GeminiService.isAvailable();
      if (available) {
        setGeminiReady(true);
        setAiProvider('gemini');
        toast({ title: "✅ เชื่อมต่อ Gemini สำเร็จ!", description: "พร้อมใช้งาน Gemini 2.5 Flash (Cloud)" });
      }
    } catch (error) {
      toast({ title: "❌ เชื่อมต่อ Gemini ไม่สำเร็จ", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOllamaConnect = async () => {
    setIsConnecting(true);
    if (!OllamaService.getBridgeUrl()) {
      toast({ title: "❌ Bridge URL not set", description: "Please enter your localhost.run URL in Settings", variant: "destructive" });
      setIsConnecting(false);
      return;
    }
    try {
      const bridgeOk = await OllamaService.isAvailable();
      if (!bridgeOk) {
        toast({ title: "❌ Bridge API ไม่ตอบสนอง", variant: "destructive" });
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
        toast({ title: "✅ เชื่อมต่อสำเร็จ!", description: `Ollama • ${status.models.length} models` });
      } else { throw new Error('Ollama not connected'); }
    } catch (error: any) {
      toast({ title: "❌ เชื่อมต่อไม่สำเร็จ", description: error.message, variant: "destructive" });
      setOllamaConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveBridgeUrl = () => {
    OllamaService.setBridgeUrl(bridgeUrl);
    toast({ title: "✅ Bridge URL saved" });
    handleOllamaConnect();
  };

  const clearConversation = () => {
    conversationHistoryRef.current = [];
    setMessages([{
      id: '1',
      text: '🔄 เริ่มการสนทนาใหม่แล้ว — history ถูกล้าง',
      isUser: false,
      timestamp: new Date(),
      model: 'System'
    }]);
    toast({ title: '🔄 เริ่มใหม่', description: 'ล้าง conversation history แล้ว' });
  };

  const getHelpText = () => {
    const panelsList = AVAILABLE_PANELS.slice(0, 15).map(p => `• "${p.keywords[0]}"`).join('\n');
    return `🤖 **ABLE AI Help**\n\n` +
      `**🎛️ Panel Commands:**\n` +
      `• "เปิด trading journal"\n• "open cot data"\n• "list functions"\n\n` +
      `**📸 Vision Commands:**\n` +
      `• "วิเคราะห์กราฟ" — ถ่ายหน้าจอแล้ววิเคราะห์\n` +
      `• "ดูหน้าจอตอนนี้" — snapshot + AI analysis\n\n` +
      `**🌍 Intelligence:**\n` +
      `• "แผ่นดินไหวล่าสุด" — USGS data\n` +
      `• "ข่าวล่าสุด" — 50+ แหล่งข่าว\n` +
      `• "สถานการณ์โลก" — World Monitor\n\n` +
      `**📊 Trading:**\n` +
      `• "COT gold" — วิเคราะห์ COT data\n` +
      `• "market overview" — ภาพรวมตลาด\n\n` +
      `**MCP Tools (${tools.length}):**\n` +
      tools.slice(0, 8).map(t => `• ${t.name}`).join('\n');
  };

  const tryPanelCommand = (message: string): { handled: boolean; response?: string } => {
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes('เปิด') || lowerMessage.includes('open') || lowerMessage.includes('show') ||
      lowerMessage.includes('ปิด') || lowerMessage.includes('close') ||
      lowerMessage.includes('list') || lowerMessage.includes('functions') ||
      lowerMessage.includes('panels') || lowerMessage.includes('รายการ')
    ) {
      const result = panelCommander.executeAICommand(message);
      if (result.success || result.message) return { handled: true, response: result.message };
    }
    return { handled: false };
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setIsUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
        toast({ title: "✅ ไฟล์อัพโหลดสำเร็จ", description: `${file.name} (${(file.size / 1024).toFixed(1)} KB)` });
        setIsUploadingFile(false);
      };
      reader.onerror = () => { toast({ title: "❌ อ่านไฟล์ไม่สำเร็จ", variant: "destructive" }); setIsUploadingFile(false); };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({ title: "❌ อัพโหลดล้มเหลว", description: error.message, variant: "destructive" });
      setIsUploadingFile(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() && !uploadedFile) return;
    
    const currentInput = inputMessage.trim();
    const currentFile = uploadedFile;
    const currentPreview = filePreview;
    
    setInputMessage('');
    setUploadedFile(null);
    setFilePreview(null);
    setIsLoading(true);
    thinkingRef.current = [];
    setCurrentThinking([]);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInput || (currentFile ? `📎 ${currentFile.name}` : ''),
      isUser: true,
      timestamp: new Date(),
      model: 'User',
      file: currentFile ? {
        name: currentFile.name,
        type: currentFile.type,
        preview: currentFile.type.startsWith('image/') ? currentPreview || undefined : undefined
      } : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    // Add to conversation history
    conversationHistoryRef.current.push({ role: 'user', content: currentInput });
    if (conversationHistoryRef.current.length > 20) {
      conversationHistoryRef.current = conversationHistoryRef.current.slice(-20);
    }

    try {
      let aiResponse = '';
      let model = '';

      // Priority 1: Agent Mode
      if (agent.isAgentMode && aiProvider === 'gemini' && geminiReady && !currentFile) {
        addThinkingStep('🤖 เปิด Agent Mode — OpenClaw กำลังวิเคราะห์เป้าหมาย');
        addThinkingStep('📸 ถ่ายภาพหน้าจอเพื่อดู context');
        agent.addLog(`🚀 Agent Loop Started: ${currentInput}`);
        model = '🤖 Agent Loop (Gemini)';
        const result = await agent.runAgentLoop(currentInput);
        aiResponse = result;
        addThinkingStep('✅ Agent loop เสร็จสิ้น', 'done');
      }
      // Priority 2: File analysis
      else if (currentFile && currentPreview) {
        addThinkingStep(`📎 อ่านไฟล์ ${currentFile.name} (${currentFile.type})`);
        addThinkingStep('👁️ ส่งให้ Gemini Vision วิเคราะห์...');
        if (aiProvider !== 'gemini' || !geminiReady) {
          aiResponse = '❌ การวิเคราะห์ไฟล์ต้องใช้ Gemini';
          model = 'Error';
        } else {
          const { data, error } = await supabase.functions.invoke('gemini-file-analysis', {
            body: { file: currentPreview, fileName: currentFile.name, fileType: currentFile.type, prompt: currentInput || 'วิเคราะห์ไฟล์นี้อย่างละเอียด' }
          });
          if (error) throw error;
          aiResponse = data?.analysis || 'ไม่สามารถวิเคราะห์ไฟล์ได้';
          model = `Gemini (${currentFile.type.startsWith('image/') ? 'Vision' : 'File'})`;
          addThinkingStep('✅ วิเคราะห์เสร็จแล้ว', 'done');
        }
      }
      // Priority 3: Panel commands
      else if (tryPanelCommand(currentInput).handled) {
        addThinkingStep('🎛️ ตรวจพบคำสั่งควบคุม Panel');
        addThinkingStep('✅ กำลังเปิด/ปิด Panel...', 'done');
        const panelResult = tryPanelCommand(currentInput);
        aiResponse = panelResult.response || '';
        model = '🎛️ Panel Commander';
      }
      // Priority 4: Help
      else if (currentInput.toLowerCase() === 'help') {
        addThinkingStep('📖 โหลดรายการคำสั่งทั้งหมด', 'done');
        aiResponse = getHelpText();
        model = 'System';
      }
      // Priority 5: AI with tool detection + history
      else {
        addThinkingStep('💭 อ่านคำถามและ context การสนทนา...');
        
        const freshContext = await UniversalDataService.getData(['all']);
        const contextSummary = freshContext.success ? UniversalDataService.formatForAI(freshContext) : '';
        addThinkingStep('📊 ดึงข้อมูลแอป (broker, trades, alerts)...');
        
        if (aiProvider === 'gemini' && geminiReady) {
          const toolCall = GeminiService.detectToolCall(currentInput);

          if (toolCall && mcpReady) {
            addThinkingStep(`🔧 ตรวจพบ tool call: ${toolCall.tool}`);
            addThinkingStep(`⚡ กำลัง execute ${toolCall.tool}...`);
            try {
              const result = await executeTool(toolCall.tool, toolCall.params);
              const toolResult = GeminiService.formatToolResult(toolCall.tool, result);
              addThinkingStep('🧠 Gemini กำลังวิเคราะห์ผลลัพธ์...');
              const analysisPrompt = `User asked: "${currentInput}"\n\nData from ${toolCall.tool}:\n${toolResult}\n\n${contextSummary}\n\nวิเคราะห์และตอบเป็นภาษาไทย`;
              const geminiResponse = await GeminiService.chat(
                analysisPrompt,
                conversationHistoryRef.current.slice(0, -1),
              );
              aiResponse = `${toolResult}\n\n---\n\n**🤖 การวิเคราะห์:**\n${geminiResponse.text}`;
              model = `MCP + Gemini`;
            } catch (error) {
              addThinkingStep(`❌ Tool error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
              aiResponse = `❌ Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`;
              model = 'Error';
            }
          } else {
            addThinkingStep('🧠 Gemini 2.5 Flash กำลังประมวลผล...');
            const enhancedPrompt = `${currentInput}\n\n--- App Data Context ---\n${contextSummary}`;
            const response = await GeminiService.chat(
              enhancedPrompt,
              conversationHistoryRef.current.slice(0, -1),
            );
            aiResponse = response.text;
            model = response.model;
          }
        } else if (aiProvider === 'ollama' && ollamaConnected) {
          addThinkingStep(`🧠 Ollama (${selectedModel}) กำลังประมวลผล...`);
          const toolCall = OllamaService.detectToolCall(currentInput);
          if (toolCall && mcpReady) {
            addThinkingStep(`🔧 ตรวจพบ tool call: ${toolCall.tool}`);
            try {
              const result = await executeTool(toolCall.tool, toolCall.params);
              const toolResult = OllamaService.formatToolResult(toolCall.tool, result);
              const ollamaResponse = await OllamaService.chat(
                `User asked: "${currentInput}"\n\nData:\n${toolResult}\n\n${contextSummary}`,
                conversationHistoryRef.current.slice(0, -1),
                selectedModel
              );
              aiResponse = `${toolResult}\n\n---\n\n**AI Analysis:**\n${ollamaResponse.text}`;
              model = `MCP + Ollama`;
            } catch (error) {
              addThinkingStep(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
              aiResponse = `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`;
              model = 'Error';
            }
          } else {
            const response = await OllamaService.chat(
              `${currentInput}\n\n--- App Data ---\n${contextSummary}`,
              conversationHistoryRef.current.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
              selectedModel
            );
            aiResponse = response.text;
            model = response.model;
          }
        } else {
          aiResponse = '❌ กรุณาเลือก AI Provider ก่อน';
          model = 'Error';
        }
      }

      finishThinking();
      const thinkingSnapshot = [...thinkingRef.current];

      // Save AI response to history
      conversationHistoryRef.current.push({ role: 'assistant', content: aiResponse });

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
        model,
        thinking: thinkingSnapshot.length > 0 ? thinkingSnapshot : undefined,
        thinkingCollapsed: true
      }]);

    } catch (error: any) {
      console.error('Send error:', error);
      finishThinking();
      const thinkingSnapshot = [...thinkingRef.current];
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: `❌ เกิดข้อผิดพลาด: ${error.message}`,
        isUser: false,
        timestamp: new Date(),
        model: 'Error',
        thinking: thinkingSnapshot.length > 0 ? thinkingSnapshot : undefined,
        thinkingCollapsed: true
      }]);
    } finally {
      thinkingRef.current = [];
      setCurrentThinking([]);
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
                    Gemini 2.5 Flash
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
                {mcpReady && <span className="text-cyan-400"> • {tools.length} tools</span>}
              </span>
            </div>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={agent.isAgentMode ? 'default' : 'ghost'}
              onClick={() => {
                agent.setAgentMode(!agent.isAgentMode);
                toast({
                  title: agent.isAgentMode ? '⏹️ Agent Mode OFF' : '🤖 Agent Mode ON',
                  description: agent.isAgentMode ? 'กลับสู่โหมดปกติ' : 'AI จะควบคุม UI ได้อัตโนมัติ'
                });
              }}
              className={`h-8 px-2 gap-1 ${
                agent.isAgentMode 
                  ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                  : 'text-purple-400 hover:bg-purple-500/20'
              }`}
            >
              <BotIcon className="w-4 h-4" />
              <span className="text-xs">Agent</span>
              {agent.isAgentMode && <span className="w-2 h-2 rounded-full bg-purple-300 animate-pulse" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearConversation}
              className="h-8 px-2 text-xs text-gray-400 hover:text-white hover:bg-red-500/20"
              title="ล้างบทสนทนา"
            >
              <Trash2 className="w-4 h-4" />
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
          <div className="mt-3 p-3 bg-black/70 rounded-lg border border-green-500/30 space-y-3">
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
                  if (!ollamaConnected) toast({ title: "🔌 Ollama Mode Selected", description: "Enter your Bridge URL below" });
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

            {aiProvider === 'ollama' && !ollamaConnected && (
              <div className="space-y-2">
                <p className="text-xs text-green-400 font-medium">🔗 Ollama Bridge URL</p>
                <div className="flex gap-2">
                  <Input value={bridgeUrl} onChange={(e) => setBridgeUrl(e.target.value)} placeholder="https://xxxx.localhost.run" className="h-9 text-xs bg-black/50 border-green-500/50 text-white flex-1" />
                  <Button onClick={handleSaveBridgeUrl} size="sm" disabled={isConnecting} className="h-9 bg-green-600 hover:bg-green-700">
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                  </Button>
                </div>
              </div>
            )}

            {ollamaConnected && aiProvider === 'ollama' && (
              <div className="space-y-2">
                <p className="text-xs text-green-400 font-medium">🤖 Select Model</p>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-9 text-xs bg-black/50 border-green-500/50 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-black border-green-500/50">
                    {ollamaModels.map(m => (
                      <SelectItem key={m.name} value={m.name} className="text-white hover:bg-green-500/20">{m.name}</SelectItem>
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
              <div key={msg.id} className={`flex gap-2 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                {!msg.isUser && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-black" />
                  </div>
                )}
                <div className={`max-w-[85%] ${msg.isUser ? '' : 'flex flex-col'}`}>
                  {/* Thinking Block for completed AI messages */}
                  {!msg.isUser && msg.thinking && msg.thinking.length > 0 && (
                    <ThinkingBlock
                      steps={msg.thinking}
                      collapsed={msg.thinkingCollapsed ?? true}
                      onToggle={() => {
                        setMessages(prev => prev.map(m =>
                          m.id === msg.id
                            ? { ...m, thinkingCollapsed: !m.thinkingCollapsed }
                            : m
                        ));
                      }}
                    />
                  )}
                  {/* Message bubble */}
                  <div className={`rounded-lg p-3 text-sm ${msg.isUser ? 'bg-blue-600 text-white' : 'bg-black/60 border border-green-500/30 text-green-100'}`}>
                    {renderMessage(msg.text)}
                    {!msg.isUser && msg.model && (
                      <div className="text-xs text-cyan-400 mt-2 flex items-center gap-1 border-t border-green-500/20 pt-2">
                        <Zap className="w-3 h-3" />
                        {msg.model}
                      </div>
                    )}
                  </div>
                </div>
                {msg.isUser && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Real-time thinking while loading */}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-black animate-pulse" />
                </div>
                <div className="flex-1 max-w-[85%]">
                  {currentThinking.length > 0 && (
                    <div className="rounded-lg border border-purple-500/30 bg-purple-900/10 p-3 mb-2 space-y-1.5">
                      {currentThinking.map((step) => (
                        <div key={step.id} className="flex items-start gap-2 text-xs">
                          <span className="flex-shrink-0 mt-0.5">
                            {step.status === 'running' ? (
                              <span className="w-3 h-3 rounded-full border-2 border-purple-400 border-t-transparent animate-spin inline-block" />
                            ) : step.status === 'done' ? (
                              <span className="text-green-400">✓</span>
                            ) : (
                              <span className="text-red-400">✗</span>
                            )}
                          </span>
                          <span className={step.status === 'running' ? 'text-purple-200 animate-pulse' : step.status === 'error' ? 'text-red-400' : 'text-gray-400'}>
                            {step.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>กำลังคิด</span>
                    <span className="text-purple-400">{loadingTime}s</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Commands */}
        <div className="px-3 py-2 flex gap-2 overflow-x-auto border-t border-green-500/20">
          {(agent.isAgentMode ? AGENT_QUICK_COMMANDS : quickCommands).map((cmd, i) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              onClick={() => setInputMessage(cmd.cmd)}
              className={`h-8 text-xs px-3 whitespace-nowrap flex-shrink-0 ${
                agent.isAgentMode 
                  ? 'border-purple-500/50 text-purple-400 hover:bg-purple-500/20'
                  : 'border-green-500/50 text-green-400 hover:bg-green-500/20'
              }`}
            >
              {cmd.label}
            </Button>
          ))}
        </div>

        {/* Agent Overlay */}
        <AgentOverlay
          isActive={agent.isAgentMode}
          isRunning={agent.isRunning}
          currentTask={agent.currentTask}
          logs={agent.logs}
          loopState={agent.loopState}
          onStop={agent.stopAgent}
          onClearLogs={agent.clearLogs}
        />

        {/* File Preview */}
        {filePreview && uploadedFile && (
          <div className="px-3 py-2 border-t border-green-500/20 bg-zinc-900/50">
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {uploadedFile.type.startsWith('image/') ? (
                  <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded border border-green-500/30" />
                ) : (
                  <div className="w-12 h-12 bg-green-500/10 rounded border border-green-500/30 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-green-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-green-400 truncate">{uploadedFile.name}</div>
                  <div className="text-[10px] text-zinc-500">{(uploadedFile.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => { setUploadedFile(null); setFilePreview(null); }} className="h-8 w-8 text-zinc-500 hover:text-red-400">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 flex gap-2 border-t border-green-500/20">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.csv,.xlsx,.xls,.txt,.json"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); e.target.value = ''; }}
            className="hidden"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingFile || isLoading}
            className="h-10 w-10 text-green-400 hover:bg-green-500/20 border border-green-500/30"
          >
            {isUploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </Button>
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder={uploadedFile ? `พิมพ์คำถามเกี่ยวกับ ${uploadedFile.name}...` : "ถามอะไรก็ได้..."}
            disabled={isLoading}
            className="h-10 text-sm bg-black/50 border-green-500/50 text-white placeholder:text-gray-500 flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || (!inputMessage.trim() && !uploadedFile)}
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
