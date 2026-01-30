import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle, XCircle, AlertTriangle, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { TacticalMessage, TacticalProposal, TacticalUnit } from './types';
import { cn } from '@/lib/utils';

interface TacticalAIChatProps {
  messages: TacticalMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  activeProposal: TacticalProposal | null;
  onApproveProposal: () => void;
  onRejectProposal: () => void;
  selectedUnit?: TacticalUnit;
}

export const TacticalAIChat = ({
  messages,
  isLoading,
  onSendMessage,
  activeProposal,
  onApproveProposal,
  onRejectProposal,
  selectedUnit,
}: TacticalAIChatProps) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1421] border-l border-[#1e3a5f]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e3a5f] bg-[#0a1628]">
        <Terminal className="w-4 h-4 text-[#00a0ff]" />
        <span className="font-mono text-sm text-[#00a0ff] font-bold">AIP Terminal</span>
        <Badge variant="outline" className="ml-auto text-[10px] border-[#22c55e] text-[#22c55e]">
          ONLINE
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg p-3 text-sm font-mono",
                msg.role === 'user' 
                  ? "bg-[#1e3a5f] ml-8" 
                  : msg.role === 'ai'
                    ? "bg-[#0f1d2f] border border-[#1e3a5f] mr-4"
                    : "bg-[#1a1a2e] text-[#f59e0b] text-center text-xs"
              )}
            >
              {msg.role !== 'system' && (
                <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground">
                  <span>{msg.role === 'user' ? '👤 YOU' : '🤖 AIP Assistant'}</span>
                  <span className="ml-auto">
                    {msg.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div 
                className="text-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }}
              />
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-mono">AI กำลังวิเคราะห์...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Active Proposal */}
      {activeProposal && activeProposal.status === 'pending' && (
        <div className="mx-4 mb-4 p-3 rounded-lg bg-[#1e3a5f]/50 border border-[#3b82f6]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
            <span className="text-sm font-mono font-bold text-foreground">
              Prepared to Execute
            </span>
            <Badge 
              className={cn(
                "ml-auto text-[10px]",
                activeProposal.riskAssessment === 'high' 
                  ? "bg-red-500/20 text-red-400"
                  : activeProposal.riskAssessment === 'medium'
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-green-500/20 text-green-400"
              )}
            >
              Risk: {activeProposal.riskAssessment.toUpperCase()}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {activeProposal.title}
          </p>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
            <span>Confidence: {Math.round(activeProposal.aiConfidence)}%</span>
            <span>•</span>
            <span>P(Success): {Math.round(activeProposal.successProbability || 0)}%</span>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onApproveProposal}
              className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-black font-mono text-xs"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onRejectProposal}
              className="flex-1 font-mono text-xs"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </div>
        </div>
      )}

      {/* Selected Unit Context */}
      {selectedUnit && (
        <div className="mx-4 mb-2 px-3 py-2 rounded bg-[#1e3a5f]/30 text-xs font-mono text-muted-foreground">
          Selected: <span className="text-[#00a0ff]">{selectedUnit.callsign}</span> ({selectedUnit.type})
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-[#1e3a5f]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Start typing something to explore with AIP..."
            className="flex-1 bg-[#0a1628] border-[#1e3a5f] font-mono text-sm placeholder:text-muted-foreground/50"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-[#3b82f6] hover:bg-[#2563eb]"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
