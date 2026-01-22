// useAgentExecutor.ts - Vercept-style Agent Executor with Visual Feedback
// Full task execution with thinking panel, cursor animation, and step tracking
// Implements: Smart action parsing, fallback strategies, improved error handling

import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentService, AgentAction, AgentTask, PageContext } from '@/services/AgentService';
import { usePanelCommander } from '@/contexts/PanelCommanderContext';
import { toast } from '@/hooks/use-toast';

const MAX_ACTIONS_PER_TASK = 20;
const ACTION_TIMEOUT_MS = 30000;

// Panel name mapping for natural language
const PANEL_ALIASES: Record<string, string[]> = {
  'tradingchart': ['trading chart', 'chart', 'กราฟ', 'tradingview', 'trading'],
  'news': ['news', 'ข่าว', 'topnews', 'top news'],
  'cotdata': ['cot', 'cot data', 'commitment of traders'],
  'tradingjournal': ['journal', 'trading journal', 'บันทึก', 'diary'],
  'calendar': ['calendar', 'ปฏิทิน', 'economic calendar'],
  'messenger': ['messenger', 'chat', 'แชท', 'message'],
  'canvas': ['canvas', 'whiteboard', 'กระดาน'],
  'notes': ['notes', 'note', 'โน้ต'],
  'marketdata': ['market data', 'market', 'ตลาด'],
  'heatmap': ['heatmap', 'heat map', 'crypto map', 'market map'],
  'options': ['options', 'calculator', 'เครื่องคิดเลข'],
  'montecarlo': ['monte carlo', 'simulation', 'จำลอง'],
  'pythoneditor': ['python', 'code', 'โค้ด', 'editor'],
  'bloomberg': ['bloomberg', 'tv', 'live'],
};

function findPanelId(text: string): string | null {
  const normalized = text.toLowerCase().trim();
  
  for (const [panelId, aliases] of Object.entries(PANEL_ALIASES)) {
    if (aliases.some(alias => normalized.includes(alias))) {
      return panelId;
    }
  }
  
  return null;
}

export function useAgentExecutor() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const abortRef = useRef(false);
  const { openPanel, closePanel } = usePanelCommander();

  // Subscribe to AgentService logs
  useEffect(() => {
    const unsubscribe = AgentService.onAction((log) => {
      setLogs(prev => [...prev.slice(-99), log]);
    });
    return () => { unsubscribe(); };
  }, []);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    setLogs(prev => [...prev.slice(-99), `[${timestamp}] ${message}`]);
  }, []);

  const parseAIResponse = useCallback((response: string): AgentTask | null => {
    try {
      let jsonStr = response;
      
      // Remove markdown code blocks
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*"goal"[\s\S]*"actions"[\s\S]*\}/);
      if (!jsonMatch) {
        const altMatch = jsonStr.match(/\{[\s\S]*"actions"\s*:\s*\[[\s\S]*\]\s*\}/);
        if (!altMatch) {
          addLog('❌ No valid JSON found in AI response');
          console.log('AI Response:', response);
          return null;
        }
        jsonStr = altMatch[0];
      } else {
        jsonStr = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonStr);
      
      if (!Array.isArray(parsed.actions)) {
        addLog('❌ Invalid task format - actions not an array');
        return null;
      }

      // Validate and enhance actions
      const actions = parsed.actions.slice(0, MAX_ACTIONS_PER_TASK).map((a: any) => {
        const action: AgentAction = {
          type: a.type || 'wait',
          target: a.target,
          value: a.value,
          description: a.description || `${a.type} ${a.target || ''}`
        };

        // Smart panel ID resolution for openPanel actions
        if (action.type === 'openPanel' && action.target) {
          const resolvedPanel = findPanelId(action.target);
          if (resolvedPanel) {
            action.target = resolvedPanel;
          }
        }

        return action;
      });

      const task: AgentTask = {
        id: Date.now().toString(),
        goal: parsed.goal || 'Execute task',
        actions,
        status: 'pending',
        currentActionIndex: 0,
        logs: [],
        thinkingSteps: parsed.thinking || [],
        startTime: Date.now()
      };

      addLog(`🧠 Parsed ${actions.length} actions for: ${task.goal}`);
      return task;
    } catch (error) {
      addLog(`❌ Failed to parse AI response: ${error}`);
      console.error('Parse error:', error, 'Response:', response);
      return null;
    }
  }, [addLog]);

  const executeAction = useCallback(async (action: AgentAction): Promise<boolean> => {
    addLog(`⏳ ${action.description}`);

    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Action timeout')), ACTION_TIMEOUT_MS);
    });

    try {
      let result: boolean;

      const actionPromise = (async () => {
        switch (action.type) {
          case 'click':
            if (!action.target) {
              addLog('❌ No target specified for click');
              return false;
            }
            return await AgentService.click(action.target);

          case 'type':
            if (!action.target || !action.value) {
              addLog('❌ Missing target or value for type');
              return false;
            }
            return await AgentService.type(action.target, String(action.value));

          case 'scroll':
            const direction = action.value === 'up' ? 'up' : 'down';
            const targetForScroll = action.target;
            return await AgentService.scroll(direction, 400, targetForScroll);

          case 'scrollTo':
            if (!action.target) return false;
            return await AgentService.scrollTo(action.target);

          case 'wait':
            await AgentService.wait(Number(action.value) || 800);
            addLog(`✅ Waited ${action.value || 800}ms`);
            return true;

          case 'hover':
            if (!action.target) return false;
            return await AgentService.hover(action.target);

          case 'openPanel':
            if (!action.target) return false;
            // Try to resolve panel name
            const panelToOpen = findPanelId(action.target) || action.target;
            const opened = openPanel(panelToOpen);
            if (opened) {
              addLog(`✅ Opened panel: ${panelToOpen}`);
            } else {
              addLog(`⚠️ Panel may already be open or not found: ${panelToOpen}`);
            }
            return true; // Don't fail task if panel already open

          case 'closePanel':
            if (!action.target) return false;
            const panelToClose = findPanelId(action.target) || action.target;
            const closed = closePanel(panelToClose);
            if (closed) {
              addLog(`✅ Closed panel: ${panelToClose}`);
            }
            return true;

          case 'screenshot':
            const screenshot = await AgentService.screenshot();
            addLog(`📸 Page state captured`);
            return !!screenshot;

          case 'analyze':
            const analysis = await AgentService.analyzeScreen();
            addLog(`🔍 Found ${analysis.elements.length} interactive elements`);
            return true;

          case 'doubleClick':
            if (!action.target) return false;
            return await AgentService.doubleClick(action.target);

          case 'pressKey':
            if (!action.value) return false;
            const key = String(action.value);
            // Parse modifiers from key string like "Ctrl+C"
            const parts = key.split('+');
            const mainKey = parts.pop() || key;
            const modifiers = {
              ctrl: parts.some(p => p.toLowerCase() === 'ctrl'),
              shift: parts.some(p => p.toLowerCase() === 'shift'),
              alt: parts.some(p => p.toLowerCase() === 'alt'),
              meta: parts.some(p => p.toLowerCase() === 'meta' || p.toLowerCase() === 'cmd')
            };
            return await AgentService.pressKey(mainKey, modifiers);

          case 'navigate':
            if (!action.target) return false;
            window.location.href = action.target;
            addLog(`✅ Navigating to: ${action.target}`);
            return true;

          case 'select':
            if (!action.target || !action.value) return false;
            // For select dropdowns
            const selectEl = await AgentService.findElement(action.target) as HTMLSelectElement;
            if (selectEl && selectEl.tagName === 'SELECT') {
              selectEl.value = String(action.value);
              selectEl.dispatchEvent(new Event('change', { bubbles: true }));
              addLog(`✅ Selected: ${action.value}`);
              return true;
            }
            return false;

          default:
            addLog(`❓ Unknown action type: ${action.type}`);
            return false;
        }
      })();

      result = await Promise.race([actionPromise, timeoutPromise]);
      
      if (result) {
        addLog(`✅ ${action.description}`);
      } else {
        addLog(`❌ Failed: ${action.description}`);
      }
      
      return result;
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      return false;
    }
  }, [openPanel, closePanel, addLog]);

  const executeTask = useCallback(async (task: AgentTask): Promise<void> => {
    setIsRunning(true);
    setCurrentTask({ ...task, status: 'running', startTime: Date.now() });
    abortRef.current = false;

    // Index page elements at start
    AgentService.indexPageElements();

    // Show visual thinking panel
    AgentService.showThinkingPanel(
      task.goal,
      task.actions.map(a => ({ description: a.description, status: 'pending' as const }))
    );

    // Create virtual cursor
    AgentService.createVirtualCursor();

    addLog(`🚀 Starting: ${task.goal}`);
    toast({
      title: '🤖 Agent เริ่มทำงาน',
      description: task.goal
    });

    let success = true;
    let lastSuccessIndex = -1;
    
    for (let i = 0; i < task.actions.length; i++) {
      if (abortRef.current) {
        addLog('⏹️ Task aborted by user');
        setCurrentTask(prev => prev ? { ...prev, status: 'failed', error: 'Aborted by user' } : null);
        break;
      }

      // Re-index elements periodically (every 3 actions)
      if (i > 0 && i % 3 === 0) {
        AgentService.indexPageElements();
      }

      AgentService.updateThinkingStep(i, 'active');
      setCurrentTask(prev => prev ? { ...prev, currentActionIndex: i } : null);
      
      const action = task.actions[i];
      let result = await executeAction(action);
      
      // Retry logic for clicks and types (with fallback strategies)
      if (!result && (action.type === 'click' || action.type === 'type')) {
        addLog(`🔄 Retrying with updated element index...`);
        AgentService.indexPageElements();
        await AgentService.wait(500);
        result = await executeAction(action);
      }
      
      AgentService.updateThinkingStep(i, result ? 'completed' : 'failed');
      
      if (result) {
        lastSuccessIndex = i;
      }
      
      // Only fail for critical actions that failed
      const criticalActions = ['click', 'type', 'select'];
      if (!result && criticalActions.includes(action.type)) {
        success = false;
        addLog(`❌ Task failed at step ${i + 1}`);
        setCurrentTask(prev => prev ? { ...prev, status: 'failed', error: `Failed at: ${action.description}` } : null);
        break;
      }

      // Small delay between actions for visual feedback
      await AgentService.wait(300);
    }

    if (success && !abortRef.current) {
      addLog(`✅ Completed: ${task.goal}`);
      setCurrentTask(prev => prev ? { ...prev, status: 'completed', endTime: Date.now() } : null);
      toast({
        title: '✅ Agent ทำงานสำเร็จ',
        description: `${task.goal} (${task.actions.length} steps)`
      });
    }

    // Cleanup after a delay
    setTimeout(() => {
      AgentService.hideThinkingPanel();
      AgentService.removeCursor();
      AgentService.cleanup();
    }, 2000);

    setIsRunning(false);
  }, [executeAction, addLog]);

  const runFromAIResponse = useCallback(async (response: string): Promise<string> => {
    const task = parseAIResponse(response);
    
    if (!task) {
      return '❌ ไม่สามารถแปลงคำสั่งได้\n\nกรุณาลองใหม่ด้วยคำสั่งที่ชัดเจนกว่านี้ เช่น:\n• "เปิด trading chart"\n• "วิเคราะห์หน้าจอ"\n• "เปิด news และ cot data"';
    }

    setTasks(prev => [...prev, task]);
    await executeTask(task);

    // Get final status
    const finalTask = currentTask || task;
    const duration = finalTask.endTime && finalTask.startTime 
      ? Math.round((finalTask.endTime - finalTask.startTime) / 1000) 
      : 0;

    if (finalTask.status === 'completed') {
      return `✅ **สำเร็จ:** ${task.goal}\n\n` +
        `📊 ดำเนินการ ${task.actions.length} ขั้นตอน\n` +
        `⏱️ ใช้เวลา ${duration} วินาที\n\n` +
        `**ขั้นตอนที่ทำ:**\n${task.actions.map((a, i) => `${i + 1}. ✅ ${a.description}`).join('\n')}`;
    } else {
      return `❌ **ไม่สำเร็จ:** ${finalTask.error || 'Unknown error'}\n\n` +
        `ลองใหม่ด้วยคำสั่งที่เฉพาะเจาะจงกว่านี้`;
    }
  }, [parseAIResponse, executeTask, currentTask]);

  const stopAgent = useCallback(() => {
    abortRef.current = true;
    AgentService.cleanup();
    AgentService.hideThinkingPanel();
    AgentService.removeCursor();
    setIsRunning(false);
    addLog('⏹️ Agent stopped');
    toast({
      title: '⏹️ หยุด Agent',
      description: 'Agent หยุดทำงานแล้ว'
    });
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const getPageContext = useCallback((): PageContext => {
    return AgentService.getPageContext();
  }, []);

  return {
    tasks,
    currentTask,
    isRunning,
    logs,
    executeAction,
    executeTask,
    runFromAIResponse,
    parseAIResponse,
    stopAgent,
    clearLogs,
    addLog,
    getPageContext
  };
}
