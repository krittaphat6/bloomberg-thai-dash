// AgentOverlay.tsx - Vercept-style Visual Feedback Component
// Full-featured agent overlay with thinking panel, step tracking, and visual effects

import React, { useEffect, useState, useRef } from 'react';
import { Bot, Square, Trash2, Sparkles, Eye, Zap, CheckCircle, XCircle, Loader2, Play, Pause, Volume2 } from 'lucide-react';
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
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Timer for elapsed time
  useEffect(() => {
    if (isRunning && currentTask?.startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - currentTask.startTime!) / 1000));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [isRunning, currentTask?.startTime]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isActive) return null;

  const getStatusIcon = (status: AgentTask['status']) => {
    switch (status) {
      case 'planning': return <Sparkles className="w-4 h-4 animate-pulse text-purple-400" />;
      case 'running': return <Loader2 className="w-4 h-4 animate-spin text-purple-400" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Bot className="w-4 h-4 text-purple-400" />;
    }
  };

  const getActionIcon = (type: AgentAction['type']) => {
    switch (type) {
      case 'click': return '👆';
      case 'type': return '⌨️';
      case 'scroll': return '📜';
      case 'scrollTo': return '🎯';
      case 'wait': return '⏳';
      case 'hover': return '👁️';
      case 'openPanel': return '📂';
      case 'closePanel': return '❌';
      case 'analyze': return '🔍';
      case 'screenshot': return '📸';
      default: return '▶️';
    }
  };

  const progress = currentTask 
    ? Math.round((currentTask.currentActionIndex / currentTask.actions.length) * 100)
    : 0;

  return (
    <div className="border-t border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-black/80">
      {/* Main Status Bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Agent Icon with Status */}
          <div className="relative">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isRunning 
                ? 'bg-gradient-to-br from-purple-600 to-purple-800 shadow-lg shadow-purple-500/30' 
                : 'bg-purple-900/50 border border-purple-500/30'
            }`}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            {isRunning && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
            )}
          </div>

          {/* Status Text */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">ABLE Agent</span>
              <Badge 
                variant="outline" 
                className={`text-[10px] px-2 py-0 h-5 ${
                  isRunning 
                    ? 'border-purple-400/50 text-purple-300 bg-purple-500/10' 
                    : loopState?.status === 'completed' 
                      ? 'border-green-400/50 text-green-300 bg-green-500/10'
                      : loopState?.status === 'failed'
                        ? 'border-red-400/50 text-red-300 bg-red-500/10'
                        : 'border-purple-500/30 text-purple-400'
                }`}
              >
                {loopState?.status === 'running' ? `🔄 Loop ${loopState.iteration}` :
                 loopState?.status === 'completed' ? '✅ Done' :
                 loopState?.status === 'failed' ? '❌ Failed' :
                 loopState?.status === 'stopped' ? '⏹️ Stopped' :
                 currentTask?.status === 'planning' ? '🧠 Planning' :
                 isRunning ? '▶️ Running' : '⏸️ Ready'}
              </Badge>
            </div>
            
            {/* Show loop step or task goal */}
            {loopState?.status === 'running' && loopState.currentStep ? (
              <div className="text-xs text-cyan-300/90 max-w-[250px] truncate font-medium">
                {loopState.currentStep}
              </div>
            ) : currentTask ? (
              <div className="text-xs text-purple-300/80 max-w-[200px] truncate">
                {currentTask.goal}
              </div>
            ) : null}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Loop iteration indicator */}
          {loopState?.status === 'running' && (
            <div className="flex items-center gap-1 text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/30">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loop {loopState.iteration}/10</span>
            </div>
          )}
          
          {/* Timer */}
          {isRunning && (
            <div className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-1 rounded">
              {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
            </div>
          )}

          {/* Toggle Logs */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLogs(!showLogs)}
            className="h-8 px-2 text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
          >
            <Eye className="w-4 h-4 mr-1" />
            Logs
          </Button>

          {/* Stop Button */}
          {isRunning && (
            <Button
              size="sm"
              onClick={onStop}
              className="h-8 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          )}

          {/* Clear Logs */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearLogs}
            className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-500/20"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar (when running) */}
      {currentTask && currentTask.actions.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-3">
            <Progress value={progress} className="flex-1 h-1.5 bg-purple-950" />
            <span className="text-[10px] text-purple-400 w-10 text-right">
              {currentTask.currentActionIndex}/{currentTask.actions.length}
            </span>
          </div>
        </div>
      )}

      {/* Current Action Steps */}
      {currentTask && currentTask.actions.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex gap-1.5 flex-wrap">
            {currentTask.actions.map((action, i) => {
              const isCompleted = i < currentTask.currentActionIndex;
              const isActive = i === currentTask.currentActionIndex && isRunning;
              const isPending = i > currentTask.currentActionIndex;
              
              return (
                <div
                  key={i}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all ${
                    isCompleted 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : isActive 
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50 animate-pulse shadow-lg shadow-purple-500/20' 
                        : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'
                  }`}
                  title={action.description}
                >
                  <span>{getActionIcon(action.type)}</span>
                  <span className="max-w-[100px] truncate">{action.description}</span>
                  {isCompleted && <CheckCircle className="w-3 h-3 ml-1" />}
                  {isActive && <Loader2 className="w-3 h-3 ml-1 animate-spin" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded Logs Panel */}
      {showLogs && (
        <div className="border-t border-purple-500/20 bg-black/50">
          <ScrollArea className="h-32">
            <div className="p-3 space-y-1 font-mono text-[10px]">
              {logs.length === 0 ? (
                <div className="text-zinc-500 italic text-center py-4">
                  💡 พิมพ์คำสั่งเช่น "เปิด trading chart" หรือ "วิเคราะห์หน้าจอ"
                </div>
              ) : (
                logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`py-0.5 ${
                      log.includes('✅') ? 'text-green-400' :
                      log.includes('❌') ? 'text-red-400' :
                      log.includes('⏳') ? 'text-yellow-400' :
                      log.includes('🚀') ? 'text-purple-400' :
                      log.includes('🔍') ? 'text-cyan-400' :
                      log.includes('🧠') ? 'text-pink-400' :
                      'text-zinc-400'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Placeholder when no task */}
      {!currentTask && !isRunning && logs.length === 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div className="flex-1">
              <div className="text-xs text-purple-200 font-medium">Agent Mode Active</div>
              <div className="text-[10px] text-purple-400/70">
                พิมพ์คำสั่งเพื่อให้ AI ควบคุม UI เช่น "เปิด trading chart แล้วดู XAUUSD"
              </div>
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
