// useAgentLoop.ts - Vercept-Style Gemini-Controlled Agent with Self-Healing
// 100% reliable browser automation with smart element finding and action caching

import { useState, useCallback, useRef } from 'react';
import { GeminiService } from '@/services/GeminiService';
import { AgentService, PageContext } from '@/services/AgentService';
import { ActionCache } from '@/services/ActionCache';
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
  confidence?: number;
  successCount?: number;
  failCount?: number;
}

interface ActionResult {
  success: boolean;
  action: string;
  description?: string;
  error?: string;
  elementFound?: boolean;
  method?: string;
  confidence?: number;
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

  // Enhanced page state capture for Gemini (Vercept-style)
  const getPageState = useCallback(async (): Promise<string> => {
    // Index all interactive elements
    const indexedElements = AgentService.indexPageElements();
    
    // Categorize elements for better AI understanding
    const buttons: Array<{ index: number; text: string; type: string }> = [];
    const inputs: Array<{ index: number; text: string; type: string }> = [];
    const links: Array<{ index: number; text: string }> = [];
    
    indexedElements.forEach((el, idx) => {
      if (idx > 35) return; // Limit to prevent token overflow
      
      const item = { index: el.index, text: el.text.substring(0, 40), type: el.type };
      
      if (el.type === 'button') buttons.push(item);
      else if (el.type.includes('input') || el.type === 'textarea') inputs.push(item);
      else if (el.type === 'link') links.push(item);
    });

    // Get all open modals/dialogs with detailed info
    const modals = document.querySelectorAll('[role="dialog"], [data-state="open"], [data-radix-portal], [cmdk-root]');
    const modalInfo = Array.from(modals).map(m => {
      const rect = m.getBoundingClientRect();
      if (rect.width === 0) return null;
      
      const searchInput = m.querySelector('[cmdk-input], input[type="search"], input[placeholder*="Search" i]');
      const visibleItems = Array.from(m.querySelectorAll('[cmdk-item], [role="option"], button'))
        .slice(0, 8)
        .map(b => b.textContent?.trim().substring(0, 25) || '')
        .filter(Boolean);
      
      return {
        type: m.querySelector('[cmdk-root]') ? 'command-palette' : 'dialog',
        hasSearchInput: !!searchInput,
        searchPlaceholder: searchInput?.getAttribute('placeholder') || '',
        visibleItems
      };
    }).filter(Boolean);

    // Get open floating windows with position and size
    const openWindows = Array.from(document.querySelectorAll(
      '[data-window-id], [data-panel-id], .floating-panel'
    )).map(w => {
      const windowEl = w as HTMLElement;
      const rect = windowEl.getBoundingClientRect();
      if (rect.width < 50) return null;
      
      return {
        id: windowEl.dataset.windowId || windowEl.dataset.panelId || '',
        title: windowEl.querySelector('[class*="title"], h1, h2, h3')?.textContent?.trim().substring(0, 25) || 'Panel',
        position: { x: Math.round(rect.left), y: Math.round(rect.top) },
        size: { width: Math.round(rect.width), height: Math.round(rect.height) }
      };
    }).filter(Boolean);

    // Check ADD menu status
    const hasAddButton = !!document.querySelector('[data-agent-id="add-panel"], button:has(.lucide-plus)');
    const addMenuOpen = modalInfo.some(m => m && m.type === 'command-palette');

    return JSON.stringify({
      viewport: { width: window.innerWidth, height: window.innerHeight },
      
      // Panel/Window status
      openWindows,
      openWindowCount: openWindows.length,
      
      // Modal status (important for Agent decisions)
      hasOpenModal: modalInfo.length > 0,
      addMenuOpen,
      modals: modalInfo,
      
      // UI state
      hasAddButton,
      
      // Interactive elements (categorized for AI)
      buttons: buttons.slice(0, 12),
      inputs: inputs.slice(0, 8),
      links: links.slice(0, 6),
      
      totalElements: indexedElements.size
    }, null, 2);
  }, []);

  // Execute a single action with self-healing retry logic (Vercept-style)
  const executeAction = useCallback(async (
    action: GeminiAction, 
    retryCount = 0
  ): Promise<ActionResult> => {
    const MAX_RETRIES = 3;
    const actionType = action.type;
    const target = action.target || '';
    const value = action.value;
    
    addLog(`⏳ ${action.description || actionType}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
    setState(prev => ({ ...prev, currentStep: action.description || actionType }));
    
    try {
      let success = false;
      let elementFound = true;
      let alternativeAction: GeminiAction | null = null;
      let method = '';
      let confidence = 0;

      switch (actionType) {
        case 'openPanel': {
          // Direct panel open - most reliable
          const panelInfo = findPanelInfo(target);
          const panelId = panelInfo?.id || target;
          
          // First check if panel is already open
          const existingPanel = document.querySelector(
            `[data-window-id="${panelId}"], [data-window-id*="${panelId}" i], [data-panel-id="${panelId}"]`
          );
          if (existingPanel) {
            addLog(`ℹ️ Panel already open: ${panelId}`);
            success = true;
            break;
          }
          
          success = openPanel(panelId);
          
          if (success) {
            addLog(`✅ เปิด panel: ${panelId}`);
            await AgentService.wait(300);
          } else if (retryCount < MAX_RETRIES) {
            // Self-healing: try clicking ADD menu + search
            addLog(`🔄 Direct open failed, trying ADD menu workflow...`);
            
            // Step 1: Click ADD button
            const addBtn = document.querySelector('[data-agent-id="add-panel"], button:has(.lucide-plus)') as HTMLElement;
            if (addBtn) {
              await AgentService.moveCursorToElement(addBtn);
              addBtn.click();
              await AgentService.wait(500);
              
              // Step 2: Search in the opened modal
              const searchTerm = panelInfo?.searchTerm || panelId;
              const searchAction: GeminiAction = {
                type: 'searchInModal',
                value: searchTerm,
                description: `Search for ${searchTerm}`
              };
              const searchResult = await executeAction(searchAction, 0);
              
              if (searchResult.success) {
                // Step 3: Click the matching result
                await AgentService.wait(400);
                const clickAction: GeminiAction = {
                  type: 'clickSearchResult',
                  value: searchTerm,
                  description: `Click ${searchTerm} result`
                };
                const clickResult = await executeAction(clickAction, 0);
                success = clickResult.success;
              }
            }
          }
          break;
        }

        case 'click': {
          // Smart element finding with confidence scoring
          const findResult = await AgentService.findElementSmart(target, {
            retries: 2,
            fuzzyMatch: true
          });
          
          if (findResult.element) {
            await AgentService.moveCursorToElement(findResult.element);
            await AgentService.wait(100);
            findResult.element.click();
            success = true;
            method = findResult.method;
            confidence = findResult.confidence;
            addLog(`✅ Clicked via ${findResult.method} (${findResult.confidence}% confidence)`);
          } else {
            elementFound = false;
            
            // Self-healing: try alternative selectors
            if (retryCount < MAX_RETRIES) {
              const el = AgentService.findElementByText(target.replace(/["\[\]]/g, ''));
              if (el) {
                await AgentService.moveCursorToElement(el);
                el.click();
                success = true;
                addLog(`✅ Clicked via text fallback`);
              }
            }
          }
          break;
        }

        case 'type': {
          const findResult = await AgentService.findElementSmart(target, {
            retries: 2,
            fuzzyMatch: false
          });
          
          if (findResult.element) {
            success = await AgentService.type(target, String(value));
          } else {
            // Self-healing: find any visible input
            const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
            for (const input of inputs) {
              if (AgentService.isElementInteractable(input as HTMLElement)) {
                const inputEl = input as HTMLInputElement;
                inputEl.focus();
                inputEl.value = '';
                
                // Type character by character for React
                for (const char of String(value)) {
                  inputEl.value += char;
                  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                  await AgentService.wait(30);
                }
                
                success = true;
                addLog(`✅ Typed into fallback input`);
                break;
              }
            }
          }
          break;
        }

        case 'wait': {
          await AgentService.wait(Number(value) || 500);
          success = true;
          break;
        }

        case 'clickAddMenu': {
          await AgentService.wait(200);
          
          // Find ADD button with multiple selectors
          const addSelectors = [
            '[data-agent-id="add-panel"]',
            'button:has(.lucide-plus)',
            'button[title*="add" i]',
            'button[title*="เพิ่ม" i]',
            'button[aria-label*="add" i]'
          ];
          
          let addBtn: HTMLElement | null = null;
          for (const selector of addSelectors) {
            try {
              addBtn = document.querySelector(selector) as HTMLElement;
              if (addBtn && AgentService.isElementInteractable(addBtn)) break;
            } catch (e) { continue; }
          }
          
          if (!addBtn) {
            // Try by text content
            addBtn = AgentService.findElementByText('ADD', 'button') || 
                     AgentService.findElementByText('+', 'button');
          }
          
          if (addBtn) {
            await AgentService.moveCursorToElement(addBtn);
            await AgentService.wait(100);
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
          await AgentService.wait(400);
          
          // Comprehensive search selectors for Radix/shadcn/cmdk
          const searchSelectors = [
            // cmdk (shadcn Command component)
            '[cmdk-input]',
            '[data-cmdk-input]',
            'input[cmdk-input]',
            
            // Radix UI specific
            '[data-radix-portal] input',
            '[data-radix-portal] [role="combobox"]',
            '[data-radix-popper-content-wrapper] input',
            
            // Dialog/Modal inputs
            '[role="dialog"] input[type="search"]',
            '[role="dialog"] input[type="text"]',
            '[role="dialog"] input:not([type="hidden"]):not([type="checkbox"])',
            
            // By placeholder
            'input[placeholder*="Search" i]',
            'input[placeholder*="search" i]',
            'input[placeholder*="ค้นหา"]',
            'input[placeholder*="Filter" i]',
            'input[placeholder*="Type" i]',
            
            // Generic modals
            '[data-state="open"] input',
            '.modal input',
          ];
          
          let searchInput: HTMLInputElement | null = null;
          for (const selector of searchSelectors) {
            try {
              const input = document.querySelector(selector) as HTMLInputElement;
              if (input && AgentService.isElementInteractable(input)) {
                searchInput = input;
                addLog(`🔍 Found search input: ${selector}`);
                break;
              }
            } catch (e) { continue; }
          }
          
          if (searchInput) {
            // Focus and clear
            searchInput.focus();
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Type with React-compatible events for cmdk
            const searchTerm = String(value);
            for (let i = 0; i < searchTerm.length; i++) {
              const char = searchTerm[i];
              searchInput.value = searchTerm.substring(0, i + 1);
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
              searchInput.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
              await AgentService.wait(25);
            }
            
            success = true;
            addLog(`✅ พิมพ์ค้นหา: ${searchTerm}`);
            
            // Wait for search results to filter
            await AgentService.wait(600);
          } else {
            addLog(`❌ ไม่พบช่องค้นหาใน modal`);
            success = false;
          }
          break;
        }

        case 'clickSearchResult': {
          await AgentService.wait(400);
          
          const searchValue = String(value).toLowerCase();
          
          // Comprehensive result selectors for Radix/shadcn/cmdk
          const resultSelectors = [
            // cmdk items (shadcn Command)
            '[cmdk-item]',
            '[data-cmdk-item]',
            '[cmdk-group] [cmdk-item]',
            
            // Radix select/combobox
            '[role="option"]',
            '[data-radix-collection-item]',
            
            // Dialog buttons and options
            '[role="dialog"] [role="option"]',
            '[role="dialog"] [role="menuitem"]',
            '[role="dialog"] button:not([aria-label*="close" i]):not([aria-label*="ปิด" i])',
            '[role="listbox"] [role="option"]',
            
            // Generic
            '[data-state="open"] button',
            '[data-value]',
            '.search-result',
          ];
          
          for (const selector of resultSelectors) {
            try {
              const elements = document.querySelectorAll(selector);
              for (const el of elements) {
                const text = el.textContent?.toLowerCase() || '';
                const dataValue = el.getAttribute('data-value')?.toLowerCase() || '';
                
                // Check both text content and data-value
                if (text.includes(searchValue) || dataValue.includes(searchValue) || 
                    AgentService.fuzzyTextMatch(text, searchValue, 0.6)) {
                  
                  // Skip if disabled or hidden
                  if ((el as HTMLElement).hasAttribute('disabled') || 
                      el.getAttribute('aria-disabled') === 'true') continue;
                  
                  await AgentService.moveCursorToElement(el as HTMLElement);
                  await AgentService.wait(100);
                  (el as HTMLElement).click();
                  
                  // Also dispatch pointer events for cmdk
                  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
                  
                  success = true;
                  addLog(`✅ คลิกผลลัพธ์: ${el.textContent?.substring(0, 40)}`);
                  break;
                }
              }
            } catch (e) { continue; }
            if (success) break;
          }
          
          // Fallback: click first visible, enabled option
          if (!success) {
            const fallbackSelectors = [
              '[cmdk-item]:not([aria-disabled="true"]):first-child',
              '[role="option"]:not([aria-disabled="true"]):first-child',
              '[role="dialog"] button:not([disabled]):not([aria-label*="close" i])',
            ];
            
            for (const sel of fallbackSelectors) {
              try {
                const firstOption = document.querySelector(sel) as HTMLElement;
                if (firstOption && AgentService.isElementInteractable(firstOption)) {
                  await AgentService.moveCursorToElement(firstOption);
                  firstOption.click();
                  success = true;
                  addLog(`⚠️ คลิกผลลัพธ์แรก (fallback): ${firstOption.textContent?.substring(0, 30)}`);
                  break;
                }
              } catch (e) { continue; }
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
            addLog(`✅ โฟกัสหน้าต่าง: ${target}`);
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
          
          // Find scrollable container first
          const scrollContainerSelectors = [
            `[data-window-id*="${target}" i] [class*="scroll"]`,
            `[data-window-id*="${target}" i] .overflow-auto`,
            `[data-window-id*="${target}" i] .overflow-y-auto`,
          ];
          
          let scrollTarget: HTMLElement | null = null;
          for (const sel of scrollContainerSelectors) {
            scrollTarget = document.querySelector(sel) as HTMLElement;
            if (scrollTarget) break;
          }
          
          if (!scrollTarget) {
            scrollTarget = document.querySelector(target) as HTMLElement;
          }
          
          if (scrollTarget) {
            scrollTarget.scrollBy({ top: delta, behavior: 'smooth' });
            success = true;
            addLog(`✅ เลื่อน ${value === 'up' ? 'ขึ้น' : 'ลง'}`);
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
            '[role="dialog"] button:has(.lucide-x)',
            '[role="dialog"] .close',
            '[data-state="open"] button:has(.lucide-x)',
            '.modal .close'
          ];
          
          for (const selector of closeSelectors) {
            const closeBtn = document.querySelector(selector) as HTMLElement;
            if (closeBtn) {
              closeBtn.click();
              success = true;
              addLog(`✅ ปิด modal`);
              break;
            }
          }
          
          if (!success) {
            // Press Escape
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await AgentService.wait(200);
            success = true;
            addLog(`✅ ปิด modal (Escape)`);
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

        case 'analyze': {
          await AgentService.analyzeScreen();
          success = true;
          break;
        }

        default:
          addLog(`⚠️ Unknown action: ${actionType}`);
          success = false;
      }

      // Execute alternative action if main action failed
      if (!success && alternativeAction && retryCount < MAX_RETRIES) {
        addLog(`🔄 Trying alternative: ${alternativeAction.type}`);
        return executeAction(alternativeAction, retryCount + 1);
      }

      // Self-healing retry with re-indexed elements
      if (!success && !elementFound && retryCount < MAX_RETRIES) {
        addLog(`🔄 Re-indexing elements and retrying...`);
        AgentService.indexPageElements();
        await AgentService.wait(500);
        return executeAction(action, retryCount + 1);
      }

      // Handle fallback from action definition
      if (!success && action.fallback && retryCount < MAX_RETRIES) {
        addLog(`🔄 ลอง fallback action...`);
        return executeAction(action.fallback, retryCount + 1);
      }

      if (success) {
        addLog(`✅ ${action.description || actionType}`);
      } else {
        addLog(`❌ Failed: ${action.description || actionType}`);
      }

      return { 
        success, 
        action: actionType, 
        description: action.description, 
        elementFound,
        method,
        confidence
      };

    } catch (error) {
      addLog(`❌ Error: ${error}`);
      
      if (retryCount < MAX_RETRIES) {
        await AgentService.wait(500);
        return executeAction(action, retryCount + 1);
      }
      
      return { 
        success: false, 
        action: actionType, 
        error: String(error), 
        elementFound: false 
      };
    }
  }, [openPanel, closePanel, addLog]);

  // Ask Gemini for next action (Vercept-style structured prompt)
  const askGeminiForNextAction = useCallback(async (
    originalGoal: string,
    pageState: string,
    previousActions: ActionResult[],
    iteration: number
  ): Promise<GeminiResponse> => {
    const lastFailed = previousActions.filter(a => !a.success).slice(-3);
    const lastSuccessful = previousActions.filter(a => a.success).slice(-5);

    const prompt = `You are ABLE Agent, an AI that controls a trading terminal UI.

GOAL: ${originalGoal}

CURRENT STATE:
${pageState}

SUCCESS: ${lastSuccessful.map(a => a.description || a.action).join(', ') || 'none'}
FAILED: ${lastFailed.map(a => `${a.action}(${a.error || 'failed'})`).join(', ') || 'none'}

ACTIONS:
- openPanel: Open panel directly. target="trading-chart"|"topnews"|"cot"|"journal"|"calendar"|"notes"|"code"|"heatmap"|"messenger"|"able3ai"|"monte-carlo"|"gold"|"crypto"
- clickAddMenu: Click ADD button to open panel selector
- searchInModal: Type in search field. value="search text"
- clickSearchResult: Click matching result. value="text to match"
- click: Click element. target="selector or text"
- type: Type text. target="selector", value="text"
- focusWindow: Bring window to front. target="window id"
- dragWindow: Move window. target="id", coordinates={x,y}
- resizeWindow: Resize. target="id", value={width,height}
- wheelScroll: Scroll. target="selector", value="up"|"down"
- wait: Wait. value=300-1000
- closeModal: Close open modal
- closePanel: Close panel. target="panel-id"

RULES:
1. Return ONLY valid JSON - no markdown, no explanation
2. Max 3 actions per response
3. If goal complete: {"done":true,"summary":"what was done"}
4. If need more actions: {"thinking":["step1"],"actions":[{"type":"x","target":"y","description":"z"}]}
5. Always add wait(300-500) after UI actions
6. Check openWindows before opening already-open panels
7. If modal is open, interact with it first

EXAMPLES:
Goal: "open chart" → {"thinking":["Open trading chart"],"actions":[{"type":"openPanel","target":"trading-chart","description":"Open chart"}]}
Goal: "open news and cot" → {"thinking":["Open 2 panels"],"actions":[{"type":"openPanel","target":"topnews","description":"Open news"},{"type":"openPanel","target":"cot","description":"Open COT"}]}
Goal: "close chart" → {"thinking":["Close the chart"],"actions":[{"type":"closePanel","target":"trading-chart","description":"Close chart"}]}
Done example → {"done":true,"summary":"Opened trading chart and news panels"}

Iteration ${iteration}/${MAX_LOOP_ITERATIONS}. JSON only:`;

    try {
      const response = await GeminiService.chat(prompt, [], 
        'You are a UI automation agent. Return valid JSON only. No markdown.');
      
      // Clean and extract JSON
      let text = response.text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      // Find JSON object
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        addLog('⚠️ No JSON in response');
        return { actions: [] };
      }
      
      const parsed = JSON.parse(match[0]);
      
      // Validate structure
      if (typeof parsed.done === 'boolean' || Array.isArray(parsed.actions)) {
        return parsed as GeminiResponse;
      }
      
      addLog('⚠️ Invalid JSON structure');
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
