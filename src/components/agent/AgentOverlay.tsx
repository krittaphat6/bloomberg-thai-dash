// AgentOverlay.tsx - Enhanced Vercept-style Visual Feedback Component
// Full-featured agent overlay with real-time loop status, thinking panel, and visual effects

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Bot, Square, Trash2, Sparkles, Eye, Zap, CheckCircle, XCircle, Loader2, Play, Pause, Volume2, ChevronDown, ChevronUp, Activity, Target, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AgentAction, AgentTask } from '@/services/AgentService';

interface AgentOverlayProps {
  isActive: boolean;
  isRunning: boolean;
  currentTask: AgentTask | null;
  logs: string[];
  loopState?: {
    iteration: number;
    status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
    currentStep: string;
  };
  onStop: () => void;
  onClearLogs: () => void;
}

export const AgentOverlay: React.FC<AgentOverlayProps> = ({
  isActive,
  isRunning,
  currentTask,
  logs,
  loopState,
  onStop,
  onClearLogs
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showLogs, setShowLogs] = useState(true);
  const [showCompactMode, setShowCompactMode] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Timer for elapsed time
  useEffect(() => {
    if (isRunning) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
      return () => clearInterval(interval);
    } else {
      // Keep showing last elapsed time
    }
  }, [isRunning]);

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  // Parse logs for statistics
  const logStats = useMemo(() => {
    const success = logs.filter(l => l.includes('✅')).length;
    const failed = logs.filter(l => l.includes('❌')).length;
    const thinking = logs.filter(l => l.includes('🧠') || l.includes('💭')).length;
    return { success, failed, thinking, total: logs.length };
  }, [logs]);

  if (!isActive) return null;

  const getStatusConfig = () => {
    if (loopState?.status === 'running') {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        text: `Loop ${loopState.iteration}/15`,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30'
      };
    }
    if (loopState?.status === 'completed') {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        text: 'สำเร็จ',
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30'
      };
    }
    if (loopState?.status === 'failed') {
      return {
        icon: <XCircle className="w-4 h-4" />,
        text: 'ล้มเหลว',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30'
      };
    }
    if (loopState?.status === 'stopped') {
      return {
        icon: <Square className="w-4 h-4" />,
        text: 'หยุด',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30'
      };
    }
    return {
      icon: <Bot className="w-4 h-4" />,
      text: 'พร้อม',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30'
    };
  };

  const statusConfig = getStatusConfig();

  const progress = loopState?.status === 'running' 
    ? (loopState.iteration / 15) * 100 
    : loopState?.status === 'completed' 
      ? 100 
      : 0;

  return (
    <div className="border-t border-purple-500/30 bg-gradient-to-b from-purple-950/50 to-black/90">
      {/* Compact Header Bar */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Agent Icon */}
          <div className="relative">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isRunning 
                ? 'bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/30' 
                : 'bg-purple-900/50 border border-purple-500/30'
            }`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            {isRunning && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse shadow-lg shadow-purple-400/50" />
            )}
          </div>

          {/* Status and Current Step */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">ABLE Agent</span>
              <Badge 
                variant="outline" 
                className={`text-[10px] px-2 py-0 h-5 flex items-center gap-1 ${statusConfig.color} ${statusConfig.bg} ${statusConfig.border}`}
              >
                {statusConfig.icon}
                {statusConfig.text}
              </Badge>
            </div>
            
            {/* Current Step with Truncation */}
            {loopState?.currentStep && (
              <div className="flex items-center gap-1 text-xs text-cyan-300/90 max-w-[300px] truncate mt-0.5">
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{loopState.currentStep}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Stats Badges */}
          {logs.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                ✅ {logStats.success}
              </span>
              {logStats.failed > 0 && (
                <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                  ❌ {logStats.failed}
                </span>
              )}
            </div>
          )}

          {/* Timer */}
          {(isRunning || elapsedTime > 0) && (
            <div className="flex items-center gap-1 text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
              <Clock className="w-3 h-3" />
              {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
            </div>
          )}

          {/* Toggle Logs */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLogs(!showLogs)}
            className={`h-7 px-2 text-xs gap-1 transition-colors ${
              showLogs 
                ? 'text-purple-300 bg-purple-500/20' 
                : 'text-purple-400 hover:bg-purple-500/10'
            }`}
          >
            <Eye className="w-3 h-3" />
            {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>

          {/* Stop Button */}
          {isRunning && (
            <Button
              size="sm"
              onClick={onStop}
              className="h-7 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 gap-1"
            >
              <Square className="w-3 h-3" />
              Stop
            </Button>
          )}

          {/* Clear Logs */}
          {!isRunning && logs.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearLogs}
              className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-500/20"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar (when running) */}
      {(isRunning || loopState?.status === 'completed') && (
        <div className="px-3 pb-2">
          <Progress 
            value={progress} 
            className="h-1 bg-purple-950" 
          />
        </div>
      )}

      {/* Expanded Logs Panel */}
      {showLogs && (
        <div className="border-t border-purple-500/20 bg-black/60">
          <ScrollArea className="h-40">
            <div className="p-3 space-y-0.5 font-mono text-[11px]">
              {logs.length === 0 ? (
                <div className="text-zinc-500 italic text-center py-6">
                  <Sparkles className="w-5 h-5 mx-auto mb-2 text-purple-400/50" />
                  <p>💡 พิมพ์คำสั่งเช่น</p>
                  <p className="text-purple-400 mt-1">"เปิด COT DATA แล้วขยายเต็มจอ"</p>
                </div>
              ) : (
                logs.map((log, i) => {
                  // Highlight different log types
                  const isSuccess = log.includes('✅');
                  const isError = log.includes('❌');
                  const isThinking = log.includes('🧠') || log.includes('💭');
                  const isLoop = log.includes('━━━') || log.includes('Loop');
                  const isStart = log.includes('🚀');
                  
                  return (
                    <div 
                      key={i} 
                      className={`py-0.5 px-1 rounded leading-relaxed ${
                        isSuccess ? 'text-green-400 bg-green-500/5' :
                        isError ? 'text-red-400 bg-red-500/5' :
                        isThinking ? 'text-pink-400 bg-pink-500/5' :
                        isLoop ? 'text-purple-300 bg-purple-500/10 font-bold mt-2' :
                        isStart ? 'text-cyan-400 bg-cyan-500/5' :
                        'text-zinc-400'
                      }`}
                    >
                      {log}
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Quick Help when idle */}
      {!isRunning && logs.length === 0 && !showLogs && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div className="text-[10px] text-purple-400/70">
              Agent Mode: พิมพ์คำสั่งภาษาไทยหรืออังกฤษเพื่อให้ AI ควบคุม UI อัตโนมัติ
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =================== QUICK COMMANDS ===================

export const AGENT_QUICK_COMMANDS = [
  { label: '📊 Open Chart', cmd: 'เปิด trading chart' },
  { label: '📰 Check News', cmd: 'เปิด top news แล้วอ่านข่าวล่าสุด' },
  { label: '🔍 Analyze Screen', cmd: 'วิเคราะห์หน้าจอปัจจุบัน บอกว่ามีอะไรเปิดอยู่' },
  { label: '📋 Open Trading Tools', cmd: 'เปิด panel สำหรับ trading ทั้งหมด ได้แก่ chart, journal, และ cot data' },
  { label: '🎯 Click Button', cmd: 'คลิกปุ่ม refresh ในหน้านี้' },
  { label: '✨ Full Setup', cmd: 'จัดหน้าจอสำหรับเทรดทองคำ เปิด chart, news, และ cot data' }
];

// =================== ENHANCED AGENT SYSTEM PROMPT ===================

export const AGENT_SYSTEM_PROMPT = `คุณคือ ABLE AI Agent ที่สามารถควบคุม ABLE Terminal ได้โดยตรงแบบ Vercept.com

## ความสามารถ
คุณสามารถ:
1. เปิด/ปิด panels ต่างๆ
2. คลิกปุ่มและ elements
3. พิมพ์ข้อความในช่อง input
4. Scroll หน้าจอ
5. วิเคราะห์หน้าจอ
6. รอให้ elements โหลด

## วิธีตอบ
เมื่อผู้ใช้สั่งให้ทำอะไร คุณต้อง Return เป็น JSON เท่านั้น:

{
  "goal": "เป้าหมายที่จะทำ (ภาษาไทย)",
  "thinking": ["คิดว่า...", "จะทำ...", "เพราะ..."],
  "actions": [
    { "type": "openPanel", "target": "trading-chart", "description": "เปิด Trading Chart" },
    { "type": "wait", "value": 800, "description": "รอให้ panel โหลด" },
    { "type": "click", "target": "[data-symbol-search]", "description": "คลิกช่อง search" },
    { "type": "type", "target": "input", "value": "XAUUSD", "description": "พิมพ์ XAUUSD" }
  ]
}

## Panel IDs ที่ใช้ได้
trading-chart, options-3d, stockdio, forex, fedwatch, crypto, crypto-map, scatter, scatter-point, 
correlation-matrix, cvd, topnews, pie, heatmap, depth, volume, currency, indicators, cot, gold, 
realmarket, bitcoin, able-focus, intelligence, able3ai, able-hf-40, code, notes, journal, 
monte-carlo, calendar, investing, messenger, news, tv, wol, uamap, debtclock, bloomberg-map, pacman, chess, face-search, spreadsheet

## Action Types
| Type | ใช้ทำอะไร | ตัวอย่าง target/value |
|------|---------|---------------------|
| openPanel | เปิด panel | target: "trading-chart" |
| closePanel | ปิด panel | target: "messenger" |
| click | คลิก element | target: "[data-agent-id='btn']" หรือ "button.refresh" |
| type | พิมพ์ข้อความ | target: "input", value: "XAUUSD" |
| scroll | เลื่อนหน้า | value: "down" หรือ "up" |
| scrollTo | เลื่อนไปหา element | target: ".news-section" |
| wait | รอ (ms) | value: 1000 |
| hover | วางเมาส์ | target: ".chart-area" |
| analyze | วิเคราะห์หน้าจอ | - |
| doubleClick | ดับเบิลคลิก | target: ".item" |
| pressKey | กดปุ่มคีย์บอร์ด | value: "Enter" |

### Vercept-style (Human-like) Actions
| Type | ใช้ทำอะไร | ตัวอย่าง |
|------|---------|---------|
| clickAddMenu | คลิกปุ่ม ADD เพื่อเปิดหน้าต่างเลือก panel | - |
| searchInModal | พิมพ์ค้นหาใน modal แล้วคลิกผลลัพธ์แรกที่ตรง | value: "COT" |
| focusWindow | โฟกัสหน้าต่างที่เปิดอยู่ (ใช้ id หรือ title) | target: "cot" |
| dragWindow | ลากหน้าต่างไปตำแหน่งใหม่แบบธรรมชาติ | target: "cot", coordinates: {"x": 180, "y": 120} |
| resizeWindow | ย่อ/ขยายหน้าต่างแบบธรรมชาติ | target: "cot", value: {"width": 1100, "height": 800} |
| wheelScroll | เลื่อนด้วยล้อเมาส์แบบธรรมชาติ | target: "[data-window-id*='cot' i]", value: "down" |

## กฎสำคัญ
1. ทุก action ต้องมี "description" เป็นภาษาไทย
2. ใส่ wait 500-1000ms หลัง openPanel เสมอ
3. ถ้าไม่แน่ใจว่ามี element อะไร ให้ใช้ "analyze" ก่อน
4. Max 15 actions ต่อ task
5. ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น

## รูปแบบที่ต้องการ (เหมือน Vercept)
ถ้าผู้ใช้สั่ง “เปิด COT DATA แล้วขยายเต็มจอ” ให้ทำตามลำดับนี้เป็นหลัก:
1) clickAddMenu
2) searchInModal value: "COT" (หรือ "COT DATA")
3) focusWindow target: "cot"
4) dragWindow target: "cot" ไปกึ่งกลางหน้าจอ
5) resizeWindow target: "cot" ให้ใหญ่เกือบเต็มจอ (เว้นขอบเล็กน้อย)
6) wheelScroll ภายในหน้าต่าง COT 1-2 ครั้งเพื่อให้เห็นว่าระบบเลื่อนแบบธรรมชาติ
ใส่ wait สั้นๆ ระหว่างขั้นตอนเพื่อให้ดูเป็นมนุษย์

## ตัวอย่างคำสั่ง
- "เปิด chart" → openPanel trading-chart
- "ดู news" → openPanel topnews
- "เปิด trading tools" → openPanel trading-chart, wait, openPanel journal, wait, openPanel cot
- "วิเคราะห์หน้า" → analyze
- "คลิกปุ่ม refresh" → click [data-agent-id="refresh"] หรือ click button:contains("Refresh")`;

// =================== FULLSCREEN OVERLAY COMPONENT ===================

interface FullscreenAgentOverlayProps {
  isActive: boolean;
  currentAction?: string;
  thinkingSteps?: string[];
}

export const FullscreenAgentOverlay: React.FC<FullscreenAgentOverlayProps> = ({
  isActive,
  currentAction,
  thinkingSteps
}) => {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[99990]">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-purple-950/10" />
      
      {/* Scan line effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"
          style={{
            animation: 'scan-line 3s ease-in-out infinite',
            boxShadow: '0 0 20px 5px rgba(168, 85, 247, 0.4)'
          }}
        />
      </div>

      {/* Corner indicators */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-purple-500/50" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-purple-500/50" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-purple-500/50" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-purple-500/50" />

      {/* Agent active indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-purple-950/90 border border-purple-500/30 rounded-full px-4 py-2 backdrop-blur-sm">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-purple-200">ABLE Agent Active</span>
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
};
