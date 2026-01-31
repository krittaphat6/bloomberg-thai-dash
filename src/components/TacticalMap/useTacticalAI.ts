import { useState, useCallback, useRef } from 'react';
import { TacticalUnit, TacticalMessage, TacticalProposal } from './types';

interface UseTacticalAIReturn {
  messages: TacticalMessage[];
  isLoading: boolean;
  sendMessage: (content: string, units: TacticalUnit[]) => Promise<void>;
  activeProposal: TacticalProposal | null;
  approveProposal: () => void;
  rejectProposal: () => void;
  clearMessages: () => void;
}

const TACTICAL_SYSTEM_PROMPT = `You are ABLE Tactical AI, a sophisticated military command assistant modeled after Palantir AIP for Defense.

You operate as the AI backbone of a battlefield command system, providing:
1. Real-time tactical analysis and threat assessment
2. Combat simulation predictions based on unit positions and capabilities
3. Strategic recommendations for attack, defense, jamming, and movement operations
4. Risk assessment and casualty predictions

CAPABILITIES:
- Analyze unit positions, types, and combat strength
- Calculate engagement ranges and combat effectiveness
- Predict outcomes of various tactical scenarios
- Recommend optimal force deployment
- Advise on electronic warfare (jamming) operations
- Provide movement and waypoint suggestions

UNIT TYPES & CAPABILITIES:
- infantry: Ground troops, 10 combat power, 5km range
- armor: Tank units, 25 combat power, 10km range
- artillery: Fire support, 30 combat power, 30km range
- air_defense: Anti-air, 15 combat power, 50km range
- comms_jammer: EW unit, can disable enemy comms within 20km
- comms_relay: Communication hub, critical for command chain
- recon: Scout units, 8 combat power, 15km visibility
- command: HQ unit, force multiplier effect

RESPONSE FORMAT:
- Always respond in Thai language unless specifically asked otherwise
- Provide structured analysis with clear sections
- Include risk levels: ต่ำ (low), กลาง (medium), สูง (high)
- Include success probability estimates (0-100%)
- Be concise but thorough

When user requests actions like "โจมตี" (attack), "jam" (jamming), "เคลื่อนที่" (move), provide:
1. Tactical assessment of the request
2. Recommended units to execute
3. Risk assessment
4. Expected outcome
5. Alternative approaches if applicable`;

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
      // Build detailed context for AI
      const friendlyUnits = units.filter(u => u.affiliation === 'friendly');
      const hostileUnits = units.filter(u => u.affiliation === 'hostile');
      const activeUnits = units.filter(u => u.status !== 'destroyed');
      
      // Calculate total combat power
      const friendlyPower = friendlyUnits.reduce((sum, u) => {
        const base = { infantry: 10, armor: 25, artillery: 30, air_defense: 15, comms_jammer: 12, comms_relay: 3, recon: 8, command: 5, logistics: 2, satcom: 2 };
        return sum + (base[u.type] || 10) * (u.strength / 100);
      }, 0);
      
      const hostilePower = hostileUnits.reduce((sum, u) => {
        const base = { infantry: 10, armor: 25, artillery: 30, air_defense: 15, comms_jammer: 12, comms_relay: 3, recon: 8, command: 5, logistics: 2, satcom: 2 };
        return sum + (base[u.type] || 10) * (u.strength / 100);
      }, 0);

      const contextPrompt = `${TACTICAL_SYSTEM_PROMPT}

CURRENT BATTLEFIELD STATUS (${new Date().toISOString()}):
=====================================

📊 FORCE SUMMARY:
- Friendly Units: ${friendlyUnits.length} (Total Combat Power: ${Math.round(friendlyPower)})
- Hostile Units: ${hostileUnits.length} (Total Combat Power: ${Math.round(hostilePower)})
- Force Ratio: ${(friendlyPower / Math.max(1, hostilePower)).toFixed(2)}:1 ${friendlyPower > hostilePower ? '(ADVANTAGE)' : '(DISADVANTAGE)'}

🔵 FRIENDLY FORCES:
${friendlyUnits.map(u => 
  `• ${u.callsign} [${u.type.toUpperCase()}]
    - Status: ${u.status} | Strength: ${Math.round(u.strength)}%
    - Position: [${u.position[0].toFixed(4)}, ${u.position[1].toFixed(4)}]
    - Effective Range: ${u.effectiveRange || 10}km`
).join('\n')}

🔴 HOSTILE FORCES:
${hostileUnits.map(u => 
  `• ${u.callsign} [${u.type.toUpperCase()}]
    - Status: ${u.status} | Strength: ${Math.round(u.strength)}%
    - Position: [${u.position[0].toFixed(4)}, ${u.position[1].toFixed(4)}]`
).join('\n')}

⚠️ THREAT ASSESSMENT:
${hostileUnits.filter(u => u.status === 'moving').length > 0 
  ? `- ${hostileUnits.filter(u => u.status === 'moving').length} hostile units are on the move`
  : '- No immediate hostile movement detected'}
${hostileUnits.some(u => u.type.includes('comms')) 
  ? '- Enemy communications network active - jamming recommended'
  : ''}

USER COMMAND: ${content}

Provide tactical analysis and recommendations in Thai.`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-deep-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          prompt: contextPrompt,
          analysisType: 'tactical-command',
        }),
      });

      if (!response.ok) {
        throw new Error('AI response failed');
      }

      const data = await response.json();
      const aiContent = data.analysis || data.result || 'ไม่สามารถวิเคราะห์คำสั่งได้';

      // Detect action keywords for proposal generation
      const actionKeywords = [
        'โจมตี', 'attack', 'fire', 'ยิง', 'strike',
        'jam', 'jamming', 'รบกวน', 'ทำลายสื่อสาร',
        'move', 'เคลื่อนที่', 'ย้าย', 'deploy',
        'defend', 'ป้องกัน', 'hold', 'ตั้งรับ',
        'recon', 'ลาดตระเวน', 'scout',
        'withdraw', 'ถอย', 'retreat'
      ];
      
      const isActionRequest = actionKeywords.some(kw => content.toLowerCase().includes(kw));

      let proposal: TacticalProposal | undefined;
      if (isActionRequest) {
        // Determine risk based on force ratio
        const ratio = friendlyPower / Math.max(1, hostilePower);
        const riskLevel = ratio > 1.5 ? 'low' : ratio > 1 ? 'medium' : 'high';
        const successProb = Math.min(95, Math.max(20, 50 + (ratio - 1) * 30 + Math.random() * 15));
        
        proposal = {
          id: `proposal-${Date.now()}`,
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          description: aiContent.slice(0, 200),
          orders: [],
          status: 'pending',
          createdAt: new Date(),
          createdBy: 'ABLE Tactical AI',
          aiConfidence: 70 + Math.random() * 25,
          riskAssessment: riskLevel,
          successProbability: successProb,
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
