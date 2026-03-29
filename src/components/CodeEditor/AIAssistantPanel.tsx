import { useState, useRef, useCallback, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistantPanel({ 
  editorContent, 
  onInsertCode 
}: { 
  editorContent: string;
  onInsertCode?: (code: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;
    
    const userMsg: Message = { role: 'user', content: input };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setStreaming(true);

    let assistantText = '';

    try {
      const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-code-assist`;
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          code: editorContent?.slice(0, 3000) || '',
          message: input,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok || !resp.body) throw new Error(`Error: ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
                }
                return [...prev, { role: 'assistant', content: assistantText }];
              });
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e}` }]);
    } finally {
      setStreaming(false);
    }
  }, [input, messages, editorContent, streaming]);

  const extractCode = (text: string) => {
    const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  };

  return (
    <div className="flex flex-col h-full border-l" style={{ width: 340, background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#12121f' }}>
        <span className="text-sm">🤖</span>
        <span className="font-mono text-xs font-bold tracking-widest" style={{ color: '#a855f7' }}>AI ASSISTANT</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00e87a' }} />
          <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: '#00e87a' }}>CONNECTED</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">🤖</div>
            <div className="font-mono text-xs font-bold tracking-widest mb-2" style={{ color: '#a855f7' }}>AI CODE ASSISTANT</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Ask about your code, request changes, or get help with Python/Pine Script
            </div>
            <div className="mt-4 space-y-1.5">
              {['Explain this code', 'Fix bugs', 'Optimize performance', 'Add error handling'].map(q => (
                <button key={q} onClick={() => { setInput(q); }}
                  className="block w-full text-left font-mono text-xs px-3 py-1.5 rounded transition-all"
                  style={{ 
                    color: 'rgba(255,255,255,0.5)',
                    background: 'rgba(168,85,247,0.08)',
                    border: '1px solid rgba(168,85,247,0.15)',
                  }}>
                  → {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[90%] rounded-lg px-3 py-2" style={{
              background: msg.role === 'user' ? 'rgba(249,115,22,0.15)' : 'rgba(168,85,247,0.1)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(249,115,22,0.25)' : 'rgba(168,85,247,0.2)'}`,
            }}>
              <div className="font-mono text-xs whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && extractCode(msg.content) && onInsertCode && (
                <button onClick={() => onInsertCode(extractCode(msg.content)!)}
                  className="mt-2 font-mono text-[10px] font-bold px-2 py-1 rounded transition-all"
                  style={{
                    background: 'rgba(0,232,122,0.15)',
                    color: '#00e87a',
                    border: '1px solid rgba(0,232,122,0.3)',
                  }}>
                  📋 INSERT CODE
                </button>
              )}
            </div>
          </div>
        ))}
        
        {streaming && (
          <div className="flex items-center gap-2 font-mono text-xs" style={{ color: '#a855f7' }}>
            <span className="animate-pulse">●</span>
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask AI about your code..."
            className="flex-1 font-mono text-xs px-3 py-2 rounded"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.85)',
              outline: 'none',
            }}
            disabled={streaming}
          />
          <button onClick={sendMessage} disabled={streaming || !input.trim()}
            className="font-mono text-xs font-bold px-3 py-2 rounded transition-all"
            style={{
              background: streaming ? 'rgba(255,255,255,0.05)' : '#a855f7',
              color: streaming ? 'rgba(255,255,255,0.3)' : '#fff',
            }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
