// useAgentExecutor.ts - Hook for executing AI Agent actions

import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentService, AgentAction, AgentTask } from '@/services/AgentService';
import { usePanelCommander } from '@/contexts/PanelCommanderContext';
import { toast } from '@/hooks/use-toast';

const MAX_ACTIONS_PER_TASK = 50;
const ACTION_TIMEOUT_MS = 30000;

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
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*"goal"[\s\S]*"actions"[\s\S]*\}/);
      if (!jsonMatch) {
        addLog('❌ No valid JSON found in AI response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.goal || !Array.isArray(parsed.actions)) {
        addLog('❌ Invalid task format');
        return null;
      }

      // Validate and limit actions
      const actions = parsed.actions.slice(0, MAX_ACTIONS_PER_TASK);

      return {
        id: Date.now().toString(),
        goal: parsed.goal,
        actions,
        status: 'pending',
        currentActionIndex: 0,
        logs: []
      };
    } catch (error) {
      addLog(`❌ Failed to parse AI response: ${error}`);
      return null;
    }
  }, [addLog]);

  const executeAction = useCallback(async (action: AgentAction): Promise<boolean> => {
    addLog(`⏳ Executing: ${action.description}`);

    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Action timeout')), ACTION_TIMEOUT_MS);
    });

    try {
      let result: boolean;

      const actionPromise = (async () => {
        switch (action.type) {
          case 'click':
            if (!action.target) return false;
            return await AgentService.click(action.target);

          case 'type':
            if (!action.target || !action.value) return false;
            return await AgentService.type(action.target, String(action.value));

          case 'scroll':
            const direction = action.value === 'up' ? 'up' : 'down';
            return await AgentService.scroll(direction, 300);

          case 'scrollTo':
            if (!action.target) return false;
            return await AgentService.scrollTo(action.target);

          case 'wait':
            await AgentService.wait(Number(action.value) || 1000);
            return true;

          case 'hover':
            if (!action.target) return false;
            return await AgentService.hover(action.target);

          case 'openPanel':
            if (!action.target) return false;
            return openPanel(action.target);

          case 'closePanel':
            if (!action.target) return false;
            return closePanel(action.target);

          case 'screenshot':
            const screenshot = await AgentService.screenshot();
            addLog(`📸 Page state captured`);
            return !!screenshot;

          case 'analyze':
            const context = AgentService.getPageContext();
            addLog(`🔍 Found ${context.buttons.length} buttons, ${context.panels.length} panels`);
            return true;

          default:
            addLog(`❓ Unknown action type: ${action.type}`);
            return false;
        }
      })();

      result = await Promise.race([actionPromise, timeoutPromise]);
      
      if (result) {
        addLog(`✅ Completed: ${action.description}`);
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
    setCurrentTask({ ...task, status: 'running' });
    abortRef.current = false;

    addLog(`🚀 Starting task: ${task.goal}`);
    toast({
      title: '🤖 Agent เริ่มทำงาน',
      description: task.goal
    });

    let success = true;
    
    for (let i = 0; i < task.actions.length; i++) {
      if (abortRef.current) {
        addLog('⏹️ Task aborted by user');
        setCurrentTask(prev => prev ? { ...prev, status: 'failed', error: 'Aborted by user' } : null);
        break;
      }

      setCurrentTask(prev => prev ? { ...prev, currentActionIndex: i } : null);
      
      const action = task.actions[i];
      const result = await executeAction(action);
      
      if (!result) {
        success = false;
        addLog(`❌ Task failed at step ${i + 1}`);
        setCurrentTask(prev => prev ? { ...prev, status: 'failed', error: `Failed at: ${action.description}` } : null);
        break;
      }

      // Small delay between actions for visual feedback
      await AgentService.wait(500);
    }

    if (success && !abortRef.current) {
      addLog(`✅ Task completed: ${task.goal}`);
      setCurrentTask(prev => prev ? { ...prev, status: 'completed' } : null);
      toast({
        title: '✅ Agent ทำงานสำเร็จ',
        description: task.goal
      });
    }

    AgentService.cleanup();
    setIsRunning(false);
  }, [executeAction, addLog]);

  const runFromAIResponse = useCallback(async (response: string): Promise<string> => {
    const task = parseAIResponse(response);
    
    if (!task) {
      return '❌ ไม่สามารถแปลงคำสั่งได้ กรุณาลองใหม่';
    }

    setTasks(prev => [...prev, task]);
    await executeTask(task);

    const status = currentTask?.status || task.status;
    if (status === 'completed') {
      return `✅ เสร็จสิ้น: ${task.goal}\n\nดำเนินการทั้งหมด ${task.actions.length} ขั้นตอน`;
    } else {
      return `❌ ไม่สำเร็จ: ${currentTask?.error || 'Unknown error'}`;
    }
  }, [parseAIResponse, executeTask, currentTask]);

  const stopAgent = useCallback(() => {
    abortRef.current = true;
    AgentService.cleanup();
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

  const getPageContext = useCallback(() => {
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
