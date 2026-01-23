// useAgentLoop.ts - Gemini-Controlled Agent with Auto-Retry Loop
// Agent จะทำงานจนกว่าจะเสร็จหรือผู้ใช้หยุดเอง

import { useState, useCallback, useRef } from 'react';
import { GeminiService } from '@/services/GeminiService';
import { AgentService, AgentAction, PageContext } from '@/services/AgentService';
import { usePanelCommander } from '@/contexts/PanelCommanderContext';
import { toast } from '@/hooks/use-toast';

const MAX_LOOP_ITERATIONS = 10; // ป้องกัน infinite loop
const MAX_RETRIES_PER_ACTION = 3;

interface LoopState {
  iteration: number;
  goal: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  currentStep: string;
  logs: string[];
  startTime?: number;
}

interface ActionResult {
  success: boolean;
  action: string;
  error?: string;
  screenshot?: string;
}

// Panel aliases for natural language
const PANEL_MAP: Record<string, string[]> = {
  'trading-chart': ['trading chart', 'chart', 'กราฟ'],
  'topnews': ['top news', 'news', 'ข่าว'],
  'cot': ['cot', 'cot data', 'commitment of traders'],
  'journal': ['journal', 'trading journal', 'บันทึก'],
  'calendar': ['calendar', 'ปฏิทิน'],
  'monte-carlo': ['monte carlo', 'simulation'],
  'messenger': ['messenger', 'chat', 'แชท'],
  'notes': ['notes', 'โน้ต'],
  'able3ai': ['able ai', 'ai', 'gemini'],
  'code': ['python', 'code', 'โค้ด'],
  'heatmap': ['heatmap', 'heat map'],
  'gold': ['gold', 'spdr', 'ทองคำ'],
  'realmarket': ['market data', 'market', 'ตลาด'],
};

function findPanelId(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  for (const [id, aliases] of Object.entries(PANEL_MAP)) {
    if (aliases.some(a => normalized.includes(a))) return id;
  }
  return null;
}

export function useAgentLoop() {
  const [state, setState] = useState<LoopState>({
    iteration: 0,
    goal: '',
    status: 'idle',
    currentStep: '',
    logs: []
  });
  
  const abortRef = useRef(false);
  const { openPanel, closePanel } = usePanelCommander();

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    setState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-49), `[${timestamp}] ${message}`]
    }));
  }, []);

  // Get current page state for Gemini to analyze
  const getPageState = useCallback(async (): Promise<string> => {
    const ctx = AgentService.getPageContext();
    const elements = AgentService.getInteractiveElements();
    
    // Get visible modals/dialogs
    const modals = document.querySelectorAll('[role="dialog"], .modal, [data-state="open"]');
    const modalInfo = Array.from(modals).map(m => ({
      hasInput: m.querySelector('input') ? true : false,
      buttons: Array.from(m.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean).slice(0, 10),
      title: m.querySelector('h2, h3, .title')?.textContent?.trim() || ''
    }));

    return JSON.stringify({
      url: ctx.url,
      title: ctx.title,
      visibleModals: modalInfo,
      interactiveElements: elements.slice(0, 30).map(e => ({
        index: e.index,
        type: e.type,
        text: e.text.slice(0, 50)
      })),
      openPanels: Array.from(document.querySelectorAll('[data-window-id]')).map(w => 
        (w as HTMLElement).dataset.windowId
      )
    }, null, 2);
  }, []);

  // Execute a single action with retry
  const executeAction = useCallback(async (action: any): Promise<ActionResult> => {
    const actionType = action.type;
    const target = action.target;
    const value = action.value;
    
    addLog(`⏳ ${action.description || actionType}`);
    
    try {
      let success = false;

      switch (actionType) {
        case 'click':
          // Try multiple strategies
          success = await AgentService.click(target);
          if (!success && target) {
            // Try by text
            const byText = AgentService.findElementByText(target.replace(/["\[\]]/g, ''), 'button');
            if (byText) {
              byText.click();
              success = true;
            }
          }
          break;

        case 'type':
          success = await AgentService.type(target, String(value));
          break;

        case 'wait':
          await AgentService.wait(Number(value) || 500);
          success = true;
          break;

        case 'openPanel':
          const panelId = findPanelId(target) || target;
          success = openPanel(panelId);
          addLog(success ? `✅ เปิด panel: ${panelId}` : `⚠️ panel อาจเปิดอยู่แล้ว: ${panelId}`);
          success = true; // Don't fail if already open
          break;

        case 'closePanel':
          const closePanelId = findPanelId(target) || target;
          closePanel(closePanelId);
          success = true;
          break;

        case 'clickAddMenu':
          // Find and click ADD button
          const addBtn = document.querySelector('button:has(.lucide-plus), [data-agent-id="add-panel"]') as HTMLElement;
          if (addBtn) {
            addBtn.click();
            success = true;
          } else {
            // Try by text
            const byText = AgentService.findElementByText('ADD', 'button');
            if (byText) {
              byText.click();
              success = true;
            }
          }
          break;

        case 'searchInModal':
          // Type in modal search
          await AgentService.wait(300);
          const searchInput = document.querySelector('[role="dialog"] input, .modal input, input[placeholder*="Search" i]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.value = '';
            await AgentService.type('input', String(value));
            await AgentService.wait(400);
            success = true;
          }
          break;

        case 'clickSearchResult':
          // Click the search result in modal
          await AgentService.wait(300);
          const searchValue = String(value).toLowerCase();
          
          // Try multiple selectors
          const resultSelectors = [
            `button:has-text("${value}")`,
            `[role="dialog"] button`,
            `.modal button`,
            `button[title*="${value}" i]`,
            `div[role="option"]`,
          ];
          
          for (const selector of resultSelectors) {
            try {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                const text = el.textContent?.toLowerCase() || '';
                if (text.includes(searchValue)) {
                  (el as HTMLElement).click();
                  success = true;
                  addLog(`✅ คลิกผลลัพธ์: ${el.textContent?.slice(0, 30)}`);
                  break;
                }
              }
              if (success) break;
            } catch (e) {
              continue;
            }
          }
          
          // Last resort: click by index in modal
          if (!success) {
            const modalButtons = document.querySelectorAll('[role="dialog"] button, .modal button');
            for (const btn of modalButtons) {
              if (btn.textContent?.toLowerCase().includes(searchValue)) {
                (btn as HTMLElement).click();
                success = true;
                break;
              }
            }
          }
          break;

        case 'focusWindow':
          success = await AgentService.focusWindow(target);
          break;

        case 'dragWindow':
          const coords = action.coordinates || { x: window.innerWidth / 2, y: 150 };
          success = await AgentService.dragWindowTo(target, coords.x, coords.y);
          break;

        case 'resizeWindow':
          const size = typeof value === 'object' ? value : { width: 1000, height: 700 };
          success = await AgentService.resizeWindow(target, size.width || 1000, size.height || 700);
          break;

        case 'wheelScroll':
          const delta = value === 'up' ? -200 : 200;
          success = await AgentService.wheelScroll(target || 'body', delta);
          break;

        case 'pressKey':
          success = await AgentService.pressKey(String(value));
          break;

        case 'closeModal':
          // Close any open modal
          const closeBtn = document.querySelector('[role="dialog"] button[aria-label*="close" i], [role="dialog"] .close, .modal .close') as HTMLElement;
          if (closeBtn) {
            closeBtn.click();
            success = true;
          } else {
            // Press Escape
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            success = true;
          }
          break;

        default:
          addLog(`⚠️ Unknown action: ${actionType}`);
          success = false;
      }

      if (success) {
        addLog(`✅ ${action.description || actionType}`);
      } else {
        addLog(`❌ Failed: ${action.description || actionType}`);
      }

      return { success, action: actionType };
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      return { success: false, action: actionType, error: String(error) };
    }
  }, [openPanel, closePanel, addLog]);

  // Ask Gemini what to do next based on current state
  const askGeminiForNextAction = useCallback(async (
    originalGoal: string,
    pageState: string,
    previousActions: ActionResult[],
    iteration: number
  ): Promise<any[]> => {
    const prompt = `คุณเป็น ABLE Agent ที่กำลังทำงานอยู่ ต้องทำให้สำเร็จ

## เป้าหมาย
${originalGoal}

## สถานะหน้าจอปัจจุบัน
${pageState}

## Actions ที่ทำไปแล้ว (iteration ${iteration})
${previousActions.map(a => `- ${a.action}: ${a.success ? '✅' : '❌'} ${a.error || ''}`).join('\n')}

## คำสั่ง
วิเคราะห์สถานะปัจจุบันแล้วบอกว่าต้องทำอะไรต่อ ถ้าเป้าหมายสำเร็จแล้วให้ตอบ {"done": true}

ตอบเป็น JSON array ของ actions ที่ต้องทำต่อ (หรือ {"done": true} ถ้าเสร็จแล้ว):

Action types ที่ใช้ได้:
- click: คลิก element (target: CSS selector หรือ text)
- type: พิมพ์ข้อความ (target: selector, value: text)
- wait: รอ (value: milliseconds)
- openPanel: เปิด panel (target: panel-id)
- clickAddMenu: คลิกปุ่ม ADD เพื่อเปิดหน้าต่างเลือก panel
- searchInModal: พิมพ์ค้นหาใน modal (value: search term)
- clickSearchResult: คลิกผลลัพธ์ที่ตรงกับ value (value: search term)
- focusWindow: โฟกัสหน้าต่าง (target: window id หรือ title)
- dragWindow: ลากหน้าต่าง (target: id, coordinates: {x, y})
- resizeWindow: ปรับขนาด (target: id, value: {width, height})
- wheelScroll: เลื่อน (target: selector, value: "up" หรือ "down")
- closeModal: ปิด modal ที่เปิดอยู่

## ตัวอย่างการตอบ
ถ้าต้องทำต่อ:
[
  {"type": "clickSearchResult", "value": "COT", "description": "คลิกผลลัพธ์ COT DATA"},
  {"type": "wait", "value": 500, "description": "รอให้ panel เปิด"},
  {"type": "focusWindow", "target": "cot", "description": "โฟกัสหน้าต่าง COT"}
]

ถ้าเสร็จแล้ว:
{"done": true, "summary": "เปิด COT DATA สำเร็จ"}

ตอบเป็น JSON เท่านั้น:`;

    try {
      const response = await GeminiService.chat(prompt, [], 
        'คุณเป็น Agent ที่ควบคุม UI ตอบเป็น JSON เท่านั้น');
      
      // Parse response
      let jsonStr = response.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Check if done
      if (jsonStr.includes('"done"') && jsonStr.includes('true')) {
        return [{ type: 'done' }];
      }
      
      // Parse actions array
      const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }
      
      return [];
    } catch (error) {
      addLog(`❌ Gemini error: ${error}`);
      return [];
    }
  }, [addLog]);

  // Main loop: run until done or user stops
  const runAgentLoop = useCallback(async (goal: string): Promise<string> => {
    abortRef.current = false;
    const startTime = Date.now();
    
    setState({
      iteration: 0,
      goal,
      status: 'running',
      currentStep: 'เริ่มต้น...',
      logs: [],
      startTime
    });

    addLog(`🚀 เริ่มทำงาน: ${goal}`);
    
    // Create visual feedback
    AgentService.createVirtualCursor();
    AgentService.showThinkingPanel(goal, []);

    toast({
      title: '🤖 Agent เริ่มทำงาน',
      description: goal
    });

    let iteration = 0;
    let allActions: ActionResult[] = [];
    let completed = false;

    while (iteration < MAX_LOOP_ITERATIONS && !abortRef.current && !completed) {
      iteration++;
      setState(prev => ({ ...prev, iteration, currentStep: `Loop ${iteration}/${MAX_LOOP_ITERATIONS}` }));
      addLog(`\n🔄 === Loop ${iteration} ===`);

      // Get current page state
      const pageState = await getPageState();
      
      // Ask Gemini what to do
      setState(prev => ({ ...prev, currentStep: '🧠 Gemini กำลังวิเคราะห์...' }));
      const nextActions = await askGeminiForNextAction(goal, pageState, allActions, iteration);

      if (nextActions.length === 0) {
        addLog('⚠️ Gemini ไม่รู้จะทำอะไรต่อ ลองใหม่...');
        await AgentService.wait(1000);
        continue;
      }

      // Check if done
      if (nextActions[0]?.type === 'done') {
        completed = true;
        addLog(`✅ เป้าหมายสำเร็จ!`);
        break;
      }

      // Execute each action
      for (const action of nextActions) {
        if (abortRef.current) break;

        setState(prev => ({ ...prev, currentStep: action.description || action.type }));
        
        const result = await executeAction(action);
        allActions.push(result);

        await AgentService.wait(300);
      }

      // Small delay between loops
      await AgentService.wait(500);
    }

    // Cleanup
    setTimeout(() => {
      AgentService.hideThinkingPanel();
      AgentService.removeCursor();
      AgentService.cleanup();
    }, 1500);

    const duration = Math.round((Date.now() - startTime) / 1000);
    
    if (abortRef.current) {
      setState(prev => ({ ...prev, status: 'stopped', currentStep: 'หยุดโดยผู้ใช้' }));
      return `⏹️ หยุดทำงานโดยผู้ใช้หลังจาก ${iteration} loops (${duration}s)`;
    }

    if (completed) {
      setState(prev => ({ ...prev, status: 'completed', currentStep: 'เสร็จสิ้น!' }));
      toast({
        title: '✅ Agent ทำงานสำเร็จ',
        description: `${goal} (${iteration} loops, ${duration}s)`
      });
      return `✅ **สำเร็จ:** ${goal}\n\n⏱️ ${iteration} loops, ${duration} วินาที\n\n**สรุป:**\n${allActions.filter(a => a.success).map(a => `• ✅ ${a.action}`).join('\n')}`;
    }

    setState(prev => ({ ...prev, status: 'failed', currentStep: 'ล้มเหลว' }));
    return `⚠️ ทำงานครบ ${MAX_LOOP_ITERATIONS} loops แต่อาจยังไม่เสร็จสมบูรณ์\n\nลองสั่งใหม่ด้วยคำสั่งที่เฉพาะเจาะจงกว่านี้`;
    
  }, [getPageState, askGeminiForNextAction, executeAction, addLog]);

  const stopAgent = useCallback(() => {
    abortRef.current = true;
    AgentService.cleanup();
    AgentService.hideThinkingPanel();
    AgentService.removeCursor();
    setState(prev => ({ ...prev, status: 'stopped', currentStep: 'หยุดโดยผู้ใช้' }));
    addLog('⏹️ หยุดโดยผู้ใช้');
    toast({
      title: '⏹️ หยุด Agent',
      description: 'Agent หยุดทำงานแล้ว'
    });
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
  }, []);

  return {
    state,
    runAgentLoop,
    stopAgent,
    clearLogs,
    isRunning: state.status === 'running'
  };
}
