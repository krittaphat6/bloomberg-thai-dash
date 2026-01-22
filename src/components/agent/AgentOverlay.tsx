// AgentOverlay.tsx - Visual feedback component for Agent Mode

import React from 'react';
import { Bot, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AgentAction, AgentTask } from '@/services/AgentService';

interface AgentOverlayProps {
  isActive: boolean;
  isRunning: boolean;
  currentTask: AgentTask | null;
  logs: string[];
  onStop: () => void;
  onClearLogs: () => void;
}

export const AgentOverlay: React.FC<AgentOverlayProps> = ({
  isActive,
  isRunning,
  currentTask,
  logs,
  onStop,
  onClearLogs
}) => {
  if (!isActive) return null;

  return (
    <div className="border-t border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-black/50">
      {/* Status Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-purple-500 animate-pulse' : 'bg-purple-500/50'}`} />
          <span className="text-xs font-medium text-purple-300">
            {isRunning ? '🤖 Agent กำลังทำงาน...' : '🟣 Agent Mode พร้อมใช้งาน'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isRunning && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onStop}
              className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              <Square className="w-3 h-3 mr-1" />
              Stop
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearLogs}
            className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-300 hover:bg-zinc-500/20"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Current Task Progress */}
      {currentTask && (
        <div className="px-3 py-2 border-b border-purple-500/20 bg-purple-900/10">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="border-purple-500/50 text-purple-400 text-[10px]">
              {currentTask.status === 'running' ? '⏳ Running' : currentTask.status === 'completed' ? '✅ Done' : currentTask.status === 'failed' ? '❌ Failed' : '⏸️ Pending'}
            </Badge>
            <span className="text-xs text-purple-200 truncate flex-1">{currentTask.goal}</span>
          </div>
          
          {/* Action Progress */}
          <div className="flex gap-1 mt-2 flex-wrap">
            {currentTask.actions.map((action, i) => (
              <div
                key={i}
                className={`w-6 h-1.5 rounded-full transition-all ${
                  i < currentTask.currentActionIndex
                    ? 'bg-green-500'
                    : i === currentTask.currentActionIndex
                    ? 'bg-purple-500 animate-pulse'
                    : 'bg-zinc-700'
                }`}
                title={action.description}
              />
            ))}
          </div>
          
          {/* Current Action */}
          {isRunning && currentTask.actions[currentTask.currentActionIndex] && (
            <div className="mt-2 text-[10px] text-purple-300 flex items-center gap-1">
              <span className="text-purple-500">▶</span>
              {currentTask.actions[currentTask.currentActionIndex].description}
            </div>
          )}
        </div>
      )}

      {/* Agent Log */}
      <ScrollArea className="h-24">
        <div className="px-3 py-2 space-y-0.5 font-mono text-[10px]">
          {logs.length === 0 ? (
            <div className="text-zinc-500 italic">
              พิมพ์คำสั่งเช่น "เปิด trading chart แล้ววิเคราะห์ตลาด" เพื่อให้ Agent ทำงาน
            </div>
          ) : (
            logs.map((log, i) => (
              <div 
                key={i} 
                className={`${
                  log.includes('✅') ? 'text-green-400' :
                  log.includes('❌') ? 'text-red-400' :
                  log.includes('⏳') ? 'text-yellow-400' :
                  log.includes('🚀') ? 'text-purple-400' :
                  'text-zinc-400'
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

// Quick Commands for Agent Mode
export const AGENT_QUICK_COMMANDS = [
  { label: '📊 Open Charts', cmd: 'เปิด trading chart แล้ว scroll ไปดู XAUUSD' },
  { label: '📰 Check News', cmd: 'เปิด top news panel แล้วอ่านข่าวล่าสุด' },
  { label: '📋 Open All Trading', cmd: 'เปิด panel ทั้งหมดที่ใช้สำหรับ trading' },
  { label: '🔍 Analyze Page', cmd: 'วิเคราะห์หน้าจอปัจจุบันและบอกว่ามี panel อะไรเปิดอยู่บ้าง' }
];

// Agent System Prompt
export const AGENT_SYSTEM_PROMPT = `คุณคือ ABLE AI Agent ที่สามารถควบคุม ABLE Terminal ได้โดยตรง

เมื่อผู้ใช้ขอให้ทำอะไร คุณต้อง:
1. วิเคราะห์ว่าต้องทำอะไรบ้าง
2. วางแผน actions ที่ต้องทำ
3. Return เป็น JSON format:

{
  "goal": "เป้าหมายที่ต้องทำ",
  "actions": [
    { "type": "openPanel", "target": "trading-chart", "description": "เปิด Trading Chart" },
    { "type": "wait", "value": 1000, "description": "รอให้ panel โหลด" },
    { "type": "click", "target": ".symbol-selector", "description": "คลิกเลือก symbol" },
    { "type": "type", "target": ".symbol-input", "value": "XAUUSD", "description": "พิมพ์ชื่อ symbol" }
  ]
}

**Available Panel IDs:**
trading-chart, options-3d, stockdio, forex, fedwatch, crypto, crypto-map, scatter, scatter-point, 
correlation-matrix, cvd, topnews, pie, heatmap, depth, volume, currency, indicators, cot, gold, 
realmarket, bitcoin, able-focus, intelligence, able3ai, able-hf-40, code, notes, journal, 
monte-carlo, calendar, investing, messenger, news, tv, wol, uamap, debtclock, bloomberg-map, pacman, chess

**Available Action Types:**
- openPanel: เปิด panel (target = panel ID)
- closePanel: ปิด panel (target = panel ID)
- click: คลิก element (target = CSS selector)
- type: พิมพ์ข้อความ (target = selector, value = text)
- scroll: เลื่อนหน้า (value = "up" หรือ "down")
- scrollTo: เลื่อนไปยัง element (target = selector)
- wait: รอ (value = milliseconds)
- hover: วางเมาส์บน element (target = selector)
- analyze: วิเคราะห์หน้าปัจจุบัน
- screenshot: จับภาพหน้าจอ

**ตัวอย่างคำสั่ง:**
- "เปิด trading chart" → openPanel trading-chart
- "เปิด news และ cot data" → openPanel topnews, openPanel cot
- "ปิด messenger" → closePanel messenger
- "วิเคราะห์หน้าจอ" → analyze

**กฏสำคัญ:**
1. ทุก action ต้องมี description ที่อธิบายว่าทำอะไร (ภาษาไทย)
2. ใส่ wait 500-1000ms หลังจาก openPanel เพื่อรอให้ panel โหลด
3. ถ้าไม่แน่ใจว่า selector ถูกต้อง ให้ใช้ analyze ก่อน
4. Max 10 actions ต่อ task`;
