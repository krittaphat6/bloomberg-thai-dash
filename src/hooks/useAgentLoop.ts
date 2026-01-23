// useAgentLoop.ts - Advanced Gemini-Controlled Agent with Vercept-style Automation
// Agent runs continuously until goal is achieved or user stops it

import { useState, useCallback, useRef } from 'react';
import { GeminiService } from '@/services/GeminiService';
import { AgentService, PageContext } from '@/services/AgentService';
import { usePanelCommander } from '@/contexts/PanelCommanderContext';
import { toast } from '@/hooks/use-toast';

const MAX_LOOP_ITERATIONS = 15;
const MAX_RETRIES_PER_ACTION = 5;
const ACTION_TIMEOUT = 10000;

interface LoopState {
  iteration: number;
  goal: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  currentStep: string;
  logs: string[];
  startTime?: number;
  lastError?: string;
}

interface ActionResult {
  success: boolean;
  action: string;
  description?: string;
  error?: string;
  elementFound?: boolean;
}

interface GeminiAction {
  type: string;
  target?: string;
  value?: any;
  description: string;
  coordinates?: { x: number; y: number };
  fallback?: GeminiAction; // Alternative action if primary fails
}

interface GeminiResponse {
  done?: boolean;
  summary?: string;
  thinking?: string[];
  actions?: GeminiAction[];
  analysis?: string;
}

// Comprehensive Panel mapping
const PANEL_MAP: Record<string, { id: string; aliases: string[]; searchTerm: string }> = {
  'trading-chart': { id: 'trading-chart', aliases: ['trading chart', 'chart', 'กราฟ', 'tradingview'], searchTerm: 'Trading Chart' },
  'topnews': { id: 'topnews', aliases: ['top news', 'news', 'ข่าว'], searchTerm: 'Top News' },
  'cot': { id: 'cot', aliases: ['cot', 'cot data', 'commitment of traders', 'ข้อมูล cot'], searchTerm: 'COT' },
  'journal': { id: 'journal', aliases: ['journal', 'trading journal', 'บันทึก', 'สมุดบันทึก'], searchTerm: 'Trading Journal' },
  'calendar': { id: 'calendar', aliases: ['calendar', 'ปฏิทิน', 'economic calendar'], searchTerm: 'Calendar' },
  'monte-carlo': { id: 'monte-carlo', aliases: ['monte carlo', 'simulation', 'จำลอง'], searchTerm: 'Monte Carlo' },
  'messenger': { id: 'messenger', aliases: ['messenger', 'chat', 'แชท'], searchTerm: 'Messenger' },
  'notes': { id: 'notes', aliases: ['notes', 'โน้ต', 'note taking'], searchTerm: 'Notes' },
  'able3ai': { id: 'able3ai', aliases: ['able ai', 'ai', 'gemini', 'chat ai'], searchTerm: 'ABLE AI' },
  'code': { id: 'code', aliases: ['python', 'code', 'โค้ด', 'editor'], searchTerm: 'Python' },
  'heatmap': { id: 'heatmap', aliases: ['heatmap', 'heat map', 'ความร้อน'], searchTerm: 'Heatmap' },
  'gold': { id: 'gold', aliases: ['gold', 'spdr', 'ทองคำ', 'ทอง'], searchTerm: 'SPDR Gold' },
  'realmarket': { id: 'realmarket', aliases: ['market data', 'market', 'ตลาด', 'real market'], searchTerm: 'Market Data' },
  'options-3d': { id: 'options-3d', aliases: ['options', '3d', 'surface'], searchTerm: 'Options' },
  'crypto': { id: 'crypto', aliases: ['crypto', 'bitcoin', 'คริปโต'], searchTerm: 'Crypto' },
  'correlation-matrix': { id: 'correlation-matrix', aliases: ['correlation', 'matrix'], searchTerm: 'Correlation' },
  'indicators': { id: 'indicators', aliases: ['indicators', 'economic'], searchTerm: 'Economic' },
  'intelligence': { id: 'intelligence', aliases: ['intelligence', 'palantir'], searchTerm: 'Intelligence' },
  'spreadsheet': { id: 'spreadsheet', aliases: ['spreadsheet', 'excel', 'ตาราง'], searchTerm: 'Spreadsheet' },
  'fedwatch': { id: 'fedwatch', aliases: ['fedwatch', 'fed'], searchTerm: 'Fed Watch' },
};

function findPanelInfo(text: string): { id: string; searchTerm: string } | null {
  const normalized = text.toLowerCase().trim();
  for (const [id, info] of Object.entries(PANEL_MAP)) {
    if (info.aliases.some(a => normalized.includes(a))) {
      return { id, searchTerm: info.searchTerm };
    }
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
    const timestamp = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-99), `[${timestamp}] ${message}`]
    }));
    console.log('🤖 Agent:', message);
  }, []);

  // Enhanced page state capture for Gemini
  const getPageState = useCallback(async (): Promise<string> => {
    const ctx = AgentService.getPageContext();
    
    // Index all interactive elements
    const indexedElements = AgentService.indexPageElements();
    const elementsArray: Array<{
      index: number;
      type: string;
      text: string;
      selector: string;
      visible: boolean;
    }> = [];
    
    indexedElements.forEach((el, index) => {
      if (index < 50) { // Limit to prevent token overflow
        elementsArray.push({
          index: el.index,
          type: el.type,
          text: el.text.substring(0, 60),
          selector: el.selector.substring(0, 100),
          visible: true
        });
      }
    });

    // Get all open modals/dialogs
    const modals = document.querySelectorAll('[role="dialog"], [data-state="open"], .modal');
    const modalInfo = Array.from(modals).map(m => {
      const inputs = Array.from(m.querySelectorAll('input')).map(i => ({
        placeholder: i.placeholder,
        type: i.type,
        hasValue: !!i.value
      }));
      const buttons = Array.from(m.querySelectorAll('button')).map(b => ({
        text: b.textContent?.trim().substring(0, 40) || '',
        disabled: b.disabled
      })).filter(b => b.text);
      
      return {
        title: m.querySelector('h2, h3, [class*="title"]')?.textContent?.trim() || 'Modal',
        hasSearchInput: inputs.some(i => i.placeholder?.toLowerCase().includes('search')),
        inputs,
        buttons: buttons.slice(0, 15)
      };
    });

    // Get open floating windows
    const openWindows = Array.from(document.querySelectorAll('[data-window-id]')).map(w => {
      const windowEl = w as HTMLElement;
      const rect = windowEl.getBoundingClientRect();
      return {
        id: windowEl.dataset.windowId,
        title: windowEl.dataset.windowTitle || windowEl.querySelector('h3, h4, .title')?.textContent?.trim(),
        position: { x: Math.round(rect.left), y: Math.round(rect.top) },
        size: { width: Math.round(rect.width), height: Math.round(rect.height) }
      };
    });

    // Check if ADD menu is visible
    const addMenuVisible = !!document.querySelector('[data-agent-id="add-menu"], [role="dialog"] input[placeholder*="Search" i]');
    const hasAddButton = !!document.querySelector('button:has(.lucide-plus), [data-agent-id="add-panel"]');

    return JSON.stringify({
      url: ctx.url,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      hasAddMenuOpen: addMenuVisible,
      hasAddButton,
      openModals: modalInfo,
      openWindows,
      interactiveElements: elementsArray,
      scrollPosition: { x: window.scrollX, y: window.scrollY }
    }, null, 2);
  }, []);

  // Execute a single action with retry logic
  const executeAction = useCallback(async (action: GeminiAction, retryCount = 0): Promise<ActionResult> => {
    const actionType = action.type;
    const target = action.target || '';
    const value = action.value;
    
    addLog(`⏳ ${action.description || actionType}`);
    setState(prev => ({ ...prev, currentStep: action.description || actionType }));
    
    try {
      let success = false;
      let elementFound = true;

      switch (actionType) {
        case 'click': {
          // Try multiple strategies
          success = await AgentService.click(target);
          if (!success) {
            // Try by visible text
            const byText = AgentService.findElementByText(target.replace(/["\[\]]/g, ''));
            if (byText) {
              await AgentService.moveCursorToElement(byText);
              byText.click();
              success = true;
            } else {
              elementFound = false;
            }
          }
          break;
        }

        case 'type': {
          success = await AgentService.type(target, String(value));
          break;
        }

        case 'wait': {
          await AgentService.wait(Number(value) || 500);
          success = true;
          break;
        }

        case 'openPanel': {
          const panelInfo = findPanelInfo(target);
          const panelId = panelInfo?.id || target;
          
          // First try direct openPanel
          const opened = openPanel(panelId);
          if (opened) {
            success = true;
            addLog(`✅ Panel เปิดตรง: ${panelId}`);
          } else {
            // Panel might be already open - verify
            const existingWindow = document.querySelector(`[data-window-id*="${panelId}" i]`);
            if (existingWindow) {
              success = true;
              addLog(`ℹ️ Panel เปิดอยู่แล้ว: ${panelId}`);
            } else {
              // Need to use ADD menu
              success = false;
              addLog(`⚠️ ต้องใช้ ADD menu สำหรับ: ${panelId}`);
            }
          }
          break;
        }

        case 'closePanel': {
          const closePanelInfo = findPanelInfo(target);
          const closePanelId = closePanelInfo?.id || target;
          closePanel(closePanelId);
          success = true;
          break;
        }

        case 'clickAddMenu': {
          // Find ADD button with multiple selectors
          const addSelectors = [
            '[data-agent-id="add-panel"]',
            'button:has(.lucide-plus)',
            'button[title*="add" i]',
            'button[title*="เพิ่ม" i]'
          ];
          
          let addBtn: HTMLElement | null = null;
          for (const selector of addSelectors) {
            try {
              addBtn = document.querySelector(selector) as HTMLElement;
              if (addBtn) break;
            } catch (e) { continue; }
          }
          
          if (!addBtn) {
            // Try by text content
            addBtn = AgentService.findElementByText('ADD', 'button') || 
                     AgentService.findElementByText('+', 'button');
          }
          
          if (addBtn) {
            await AgentService.moveCursorToElement(addBtn);
            addBtn.click();
            await AgentService.wait(400);
            success = true;
            addLog(`✅ คลิก ADD menu`);
          } else {
            addLog(`❌ ไม่พบปุ่ม ADD`);
            success = false;
          }
          break;
        }

        case 'searchInModal': {
          await AgentService.wait(300);
          
          // Find search input in modal
          const searchSelectors = [
            '[role="dialog"] input[type="text"]',
            '[role="dialog"] input[placeholder*="Search" i]',
            '[data-state="open"] input',
            '.modal input',
            'input[placeholder*="search" i]',
            'input[placeholder*="ค้นหา" i]'
          ];
          
          let searchInput: HTMLInputElement | null = null;
          for (const selector of searchSelectors) {
            searchInput = document.querySelector(selector) as HTMLInputElement;
            if (searchInput) break;
          }
          
          if (searchInput) {
            searchInput.focus();
            searchInput.value = '';
            
            // Type the search term
            const searchTerm = String(value);
            for (let i = 0; i < searchTerm.length; i++) {
              searchInput.value += searchTerm[i];
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              await AgentService.wait(50);
            }
            
            await AgentService.wait(500);
            success = true;
            addLog(`✅ พิมพ์ค้นหา: ${searchTerm}`);
          } else {
            addLog(`❌ ไม่พบช่องค้นหาใน modal`);
            success = false;
          }
          break;
        }

        case 'clickSearchResult': {
          await AgentService.wait(400);
          const searchValue = String(value).toLowerCase();
          
          // Try to find matching button/option in modal
          const resultSelectors = [
            '[role="dialog"] button',
            '[data-state="open"] button',
            '[role="option"]',
            '[role="menuitem"]',
            '.modal button',
            '[role="dialog"] [role="option"]'
          ];
          
          for (const selector of resultSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
              const text = el.textContent?.toLowerCase() || '';
              if (text.includes(searchValue)) {
                await AgentService.moveCursorToElement(el as HTMLElement);
                (el as HTMLElement).click();
                success = true;
                addLog(`✅ คลิกผลลัพธ์: ${el.textContent?.substring(0, 40)}`);
                break;
              }
            }
            if (success) break;
          }
          
          // Fallback: click first visible option
          if (!success) {
            const firstOption = document.querySelector('[role="dialog"] button:not([disabled]), [role="option"]') as HTMLElement;
            if (firstOption) {
              await AgentService.moveCursorToElement(firstOption);
              firstOption.click();
              success = true;
              addLog(`⚠️ คลิกผลลัพธ์แรก (fallback)`);
            }
          }
          break;
        }

        case 'focusWindow': {
          const windowEl = document.querySelector(
            `[data-window-id*="${target}" i], [data-window-title*="${target}" i]`
          ) as HTMLElement;
          
          if (windowEl) {
            windowEl.style.zIndex = '9999';
            await AgentService.highlightElement(windowEl, 'Focused', 1500);
            success = true;
          } else {
            success = false;
            elementFound = false;
          }
          break;
        }

        case 'dragWindow': {
          const coords = action.coordinates || { 
            x: window.innerWidth / 2 - 400, 
            y: 80 
          };
          success = await AgentService.dragWindowTo(target, coords.x, coords.y);
          break;
        }

        case 'resizeWindow': {
          const size = typeof value === 'object' 
            ? value 
            : { width: window.innerWidth - 100, height: window.innerHeight - 150 };
          success = await AgentService.resizeWindow(target, size.width || 900, size.height || 600);
          break;
        }

        case 'wheelScroll': {
          const delta = value === 'up' ? -250 : 250;
          
          // Find scrollable container
          const scrollTarget = document.querySelector(
            `[data-window-id*="${target}" i] [class*="scroll"], [data-window-id*="${target}" i] .overflow-auto`
          ) as HTMLElement || document.querySelector(target) as HTMLElement;
          
          if (scrollTarget) {
            scrollTarget.scrollBy({ top: delta, behavior: 'smooth' });
            success = true;
          } else {
            success = await AgentService.wheelScroll(target || 'body', delta);
          }
          break;
        }

        case 'pressKey': {
          success = await AgentService.pressKey(String(value));
          break;
        }

        case 'closeModal': {
          // Try multiple ways to close modal
          const closeSelectors = [
            '[role="dialog"] button[aria-label*="close" i]',
            '[role="dialog"] .close',
            '[data-state="open"] button:has(.lucide-x)',
            '.modal .close'
          ];
          
          for (const selector of closeSelectors) {
            const closeBtn = document.querySelector(selector) as HTMLElement;
            if (closeBtn) {
              closeBtn.click();
              success = true;
              break;
            }
          }
          
          if (!success) {
            // Press Escape
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await AgentService.wait(200);
            success = true;
          }
          break;
        }

        case 'analyze': {
          await AgentService.analyzeScreen();
          success = true;
          break;
        }

        default:
          addLog(`⚠️ Unknown action: ${actionType}`);
          success = false;
      }

      if (success) {
        addLog(`✅ ${action.description || actionType}`);
      } else if (!elementFound && retryCount < MAX_RETRIES_PER_ACTION && action.fallback) {
        addLog(`🔄 ลอง fallback action...`);
        return executeAction(action.fallback, retryCount + 1);
      } else if (!success) {
        addLog(`❌ Failed: ${action.description || actionType}`);
      }

      return { success, action: actionType, description: action.description, elementFound };
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      return { success: false, action: actionType, error: String(error), elementFound: false };
    }
  }, [openPanel, closePanel, addLog]);

  // Ask Gemini for next action based on current state
  const askGeminiForNextAction = useCallback(async (
    originalGoal: string,
    pageState: string,
    previousActions: ActionResult[],
    iteration: number
  ): Promise<GeminiResponse> => {
    const lastFailed = previousActions.filter(a => !a.success).slice(-3);
    const lastSuccessful = previousActions.filter(a => a.success).slice(-5);

    const prompt = `คุณเป็น ABLE Agent ที่กำลังควบคุม ABLE Terminal

## 🎯 เป้าหมาย
${originalGoal}

## 📊 สถานะหน้าจอปัจจุบัน
${pageState}

## ✅ Actions ที่สำเร็จ
${lastSuccessful.map(a => `• ${a.action}: ${a.description || 'done'}`).join('\n') || 'ยังไม่มี'}

## ❌ Actions ที่ล้มเหลว (ถ้ามี)
${lastFailed.map(a => `• ${a.action}: ${a.error || 'failed'}`).join('\n') || 'ไม่มี'}

## 📋 คำสั่ง
วิเคราะห์สถานะปัจจุบันและเลือก actions ที่จะทำต่อ

### Action Types ที่ใช้ได้:
| Type | Description | Parameters |
|------|-------------|------------|
| clickAddMenu | คลิกปุ่ม ADD เพื่อเปิด panel selector | - |
| searchInModal | พิมพ์ค้นหาใน modal | value: "search term" |
| clickSearchResult | คลิกผลลัพธ์ที่ตรงกัน | value: "text to match" |
| openPanel | เปิด panel โดยตรง (ถ้าทำได้) | target: "panel-id" |
| focusWindow | โฟกัสหน้าต่าง | target: "window id/name" |
| dragWindow | ลากหน้าต่างไปตำแหน่งใหม่ | target: "id", coordinates: {x, y} |
| resizeWindow | ปรับขนาดหน้าต่าง | target: "id", value: {width, height} |
| wheelScroll | เลื่อนในหน้าต่าง | target: "id", value: "up"/"down" |
| click | คลิก element | target: "selector or text" |
| type | พิมพ์ข้อความ | target: "selector", value: "text" |
| wait | รอ | value: milliseconds |
| closeModal | ปิด modal | - |

### กลยุทธ์การเปิด Panel:
1. ถ้า hasAddButton=true และ hasAddMenuOpen=false → clickAddMenu ก่อน
2. หลังจาก clickAddMenu → searchInModal พิมพ์ชื่อ panel
3. หลังจาก search → clickSearchResult คลิกผลลัพธ์
4. หลังจาก panel เปิด → focusWindow, dragWindow, resizeWindow ตามต้องการ

### การตอบ
ถ้าเป้าหมายสำเร็จแล้ว:
{"done": true, "summary": "สิ่งที่ทำสำเร็จ"}

ถ้าต้องทำต่อ:
{
  "thinking": ["สิ่งที่สังเกต", "สิ่งที่จะทำ"],
  "actions": [
    {"type": "actionType", "target": "...", "value": "...", "description": "คำอธิบาย"}
  ]
}

⚠️ ข้อควรระวัง:
- ใส่ wait 300-600ms หลังทุก action ที่เปลี่ยน UI
- ถ้า modal เปิดอยู่ (openModals) ต้อง interact กับ modal ก่อน
- ถ้า panel เปิดแล้ว (ดูใน openWindows) ไม่ต้องเปิดใหม่
- ตอบเป็น JSON เท่านั้น

Iteration: ${iteration}/${MAX_LOOP_ITERATIONS}`;

    try {
      const response = await GeminiService.chat(prompt, [], 
        'คุณเป็น AI Agent ที่ควบคุม UI ตอบเป็น valid JSON เท่านั้น ห้ามมีข้อความอื่น');
      
      // Parse response
      let jsonStr = response.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Try to extract JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed as GeminiResponse;
      }
      
      return { actions: [] };
    } catch (error) {
      addLog(`❌ Gemini error: ${error}`);
      return { actions: [] };
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
    AgentService.showThinkingPanel(goal, [{ description: 'กำลังวิเคราะห์...', status: 'active' }]);

    toast({
      title: '🤖 ABLE Agent เริ่มทำงาน',
      description: goal.substring(0, 50) + (goal.length > 50 ? '...' : '')
    });

    let iteration = 0;
    let allActions: ActionResult[] = [];
    let completed = false;
    let lastError = '';

    while (iteration < MAX_LOOP_ITERATIONS && !abortRef.current && !completed) {
      iteration++;
      setState(prev => ({ 
        ...prev, 
        iteration, 
        currentStep: `🔄 Loop ${iteration}/${MAX_LOOP_ITERATIONS}` 
      }));
      addLog(`\n━━━ Loop ${iteration}/${MAX_LOOP_ITERATIONS} ━━━`);

      // Get current page state
      const pageState = await getPageState();
      addLog(`📊 อ่านสถานะหน้าจอ...`);
      
      // Ask Gemini what to do
      setState(prev => ({ ...prev, currentStep: '🧠 Gemini กำลังคิด...' }));
      addLog(`🧠 ส่งข้อมูลให้ Gemini วิเคราะห์...`);
      
      const geminiResponse = await askGeminiForNextAction(goal, pageState, allActions, iteration);

      // Log thinking process
      if (geminiResponse.thinking) {
        geminiResponse.thinking.forEach(t => addLog(`💭 ${t}`));
      }

      // Check if done
      if (geminiResponse.done) {
        completed = true;
        addLog(`🎉 เป้าหมายสำเร็จ: ${geminiResponse.summary || goal}`);
        break;
      }

      const actions = geminiResponse.actions || [];
      
      if (actions.length === 0) {
        addLog('⚠️ Gemini ไม่มี actions ให้ทำ ลองวิเคราะห์ใหม่...');
        await AgentService.wait(1000);
        continue;
      }

      // Update thinking panel with actions
      AgentService.showThinkingPanel(goal, actions.map((a, i) => ({
        description: a.description,
        status: i === 0 ? 'active' : 'pending' as const
      })));

      // Execute each action
      for (let i = 0; i < actions.length; i++) {
        if (abortRef.current) break;

        const action = actions[i];
        AgentService.updateThinkingStep(i, 'active');
        
        const result = await executeAction(action);
        allActions.push(result);

        AgentService.updateThinkingStep(i, result.success ? 'completed' : 'failed');

        if (!result.success) {
          lastError = result.error || 'Unknown error';
        }

        // Wait between actions
        await AgentService.wait(300);
      }

      // Small delay between loops
      await AgentService.wait(400);
    }

    // Cleanup
    setTimeout(() => {
      AgentService.hideThinkingPanel();
      AgentService.removeCursor();
      AgentService.cleanup();
    }, 1500);

    const duration = Math.round((Date.now() - startTime) / 1000);
    const successCount = allActions.filter(a => a.success).length;
    const totalCount = allActions.length;
    
    if (abortRef.current) {
      setState(prev => ({ ...prev, status: 'stopped', currentStep: 'หยุดโดยผู้ใช้' }));
      toast({ title: '⏹️ Agent หยุดทำงาน', description: `หยุดโดยผู้ใช้ (${iteration} loops)` });
      return `⏹️ **หยุดโดยผู้ใช้**\n\n⏱️ ${iteration} loops, ${duration} วินาที\n📊 สำเร็จ: ${successCount}/${totalCount} actions`;
    }

    if (completed) {
      setState(prev => ({ ...prev, status: 'completed', currentStep: '✅ เสร็จสิ้น!' }));
      toast({
        title: '✅ Agent ทำงานสำเร็จ!',
        description: `${goal.substring(0, 40)}... (${duration}s)`
      });
      return `✅ **สำเร็จ:** ${goal}\n\n⏱️ ${iteration} loops, ${duration} วินาที\n📊 Actions: ${successCount}/${totalCount}\n\n**สรุป:**\n${allActions.filter(a => a.success).map(a => `• ✅ ${a.description || a.action}`).join('\n')}`;
    }

    setState(prev => ({ ...prev, status: 'failed', currentStep: 'ถึง limit', lastError }));
    toast({
      title: '⚠️ Agent ทำงานครบ loop',
      description: 'อาจยังไม่เสร็จสมบูรณ์ ลองสั่งใหม่',
      variant: 'destructive'
    });
    return `⚠️ **ทำงานครบ ${MAX_LOOP_ITERATIONS} loops**\n\nผลลัพธ์: ${successCount}/${totalCount} actions สำเร็จ\n\nลองสั่งใหม่ด้วยคำสั่งที่เฉพาะเจาะจงกว่านี้ หรือแยกเป็นขั้นตอนย่อย`;
    
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
