import { useState, useCallback, useRef } from 'react';
import { TacticalUnit, TacticalMessage, TacticalProposal } from './types';
import { supabase } from '@/integrations/supabase/client';

interface UseTacticalAIReturn {
  messages: TacticalMessage[];
  isLoading: boolean;
  sendMessage: (content: string, units: TacticalUnit[]) => Promise<void>;
  activeProposal: TacticalProposal | null;
  approveProposal: () => void;
  rejectProposal: () => void;
  clearMessages: () => void;
}

export const useTacticalAI = (initialMessages: TacticalMessage[]): UseTacticalAIReturn => {
  const [messages, setMessages] = useState<TacticalMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [activeProposal, setActiveProposal] = useState<TacticalProposal | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string, units: TacticalUnit[]) => {
    // Add user message
    const userMsg: TacticalMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build context for AI
      const friendlyUnits = units.filter(u => u.affiliation === 'friendly');
      const hostileUnits = units.filter(u => u.affiliation === 'hostile');
      
      const contextPrompt = `You are ABLE Tactical AI, a military command assistant similar to Palantir AIP for Defense.

Current Battlefield Status:
- Friendly Units: ${friendlyUnits.length} (${friendlyUnits.map(u => u.callsign).join(', ')})
- Hostile Units: ${hostileUnits.length} detected
- Time: ${new Date().toISOString()}

Available Friendly Assets:
${friendlyUnits.map(u => `- ${u.callsign} (${u.type}): Status=${u.status}, Strength=${Math.round(u.strength)}%, Position=[${u.position.join(',')}]`).join('\n')}

Detected Hostile Forces:
${hostileUnits.map(u => `- ${u.callsign} (${u.type}): Status=${u.status}, Position=[${u.position.join(',')}]`).join('\n')}

User Command: ${content}

Respond in Thai language. If the user requests an action (attack, defend, jam, move units, etc.), provide:
1. A tactical analysis
2. Recommended actions with specific units
3. Risk assessment (ต่ำ/กลาง/สูง)
4. Expected outcome

For jamming operations, specify which jammer units to use and target communications.
For movement orders, specify waypoints and formation.
For attack orders, specify assault and support elements.

Keep responses concise and military-style.`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-deep-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prompt: contextPrompt,
          analysisType: 'tactical',
        }),
      });

      if (!response.ok) {
        throw new Error('AI response failed');
      }

      const data = await response.json();
      const aiContent = data.analysis || data.result || 'ไม่สามารถวิเคราะห์คำสั่งได้';

      // Check if this is an action request that needs a proposal
      const actionKeywords = ['โจมตี', 'attack', 'jam', 'jamming', 'move', 'เคลื่อนที่', 'defend', 'ป้องกัน', 'fire', 'ยิง'];
      const isActionRequest = actionKeywords.some(kw => content.toLowerCase().includes(kw));

      let proposal: TacticalProposal | undefined;
      if (isActionRequest) {
        proposal = {
          id: `proposal-${Date.now()}`,
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          description: aiContent.slice(0, 200),
          orders: [],
          status: 'pending',
          createdAt: new Date(),
          createdBy: 'ABLE Tactical AI',
          aiConfidence: 75 + Math.random() * 20,
          riskAssessment: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
          successProbability: 60 + Math.random() * 35,
        };
        setActiveProposal(proposal);
      }

      const aiMsg: TacticalMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'ai',
        content: aiContent,
        timestamp: new Date(),
        proposal,
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error('Tactical AI error:', error);
      const errorMsg: TacticalMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'system',
        content: '⚠️ การสื่อสารกับ AI ขัดข้อง กรุณาลองใหม่อีกครั้ง',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveProposal = useCallback(() => {
    if (activeProposal) {
      setActiveProposal({ ...activeProposal, status: 'executing' });
      const sysMsg: TacticalMessage = {
        id: `msg-${Date.now()}-sys`,
        role: 'system',
        content: `✅ อนุมัติแผนปฏิบัติการ "${activeProposal.title}" - กำลังดำเนินการ...`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, sysMsg]);
      
      // Clear proposal after a delay
      setTimeout(() => setActiveProposal(null), 3000);
    }
  }, [activeProposal]);

  const rejectProposal = useCallback(() => {
    if (activeProposal) {
      const sysMsg: TacticalMessage = {
        id: `msg-${Date.now()}-sys`,
        role: 'system',
        content: `❌ ปฏิเสธแผนปฏิบัติการ "${activeProposal.title}"`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, sysMsg]);
      setActiveProposal(null);
    }
  }, [activeProposal]);

  const clearMessages = useCallback(() => {
    setMessages(initialMessages);
    setActiveProposal(null);
  }, [initialMessages]);

  return {
    messages,
    isLoading,
    sendMessage,
    activeProposal,
    approveProposal,
    rejectProposal,
    clearMessages,
  };
};
