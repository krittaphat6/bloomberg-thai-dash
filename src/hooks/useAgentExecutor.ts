// useAgentExecutor.ts - Vercept-style Agent Executor with Visual Feedback
// Full task execution with thinking panel, cursor animation, and step tracking

import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentService, AgentAction, AgentTask, PageContext } from '@/services/AgentService';
import { usePanelCommander } from '@/contexts/PanelCommanderContext';
import { toast } from '@/hooks/use-toast';

const MAX_ACTIONS_PER_TASK = 20;
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
      // Try to extract JSON from the response - be flexible with format
      let jsonStr = response;
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*"goal"[\s\S]*"actions"[\s\S]*\}/);
      if (!jsonMatch) {
        // Try alternative: find any JSON object with actions
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

      // Validate and limit actions
      const actions = parsed.actions.slice(0, MAX_ACTIONS_PER_TASK).map((a: any) => ({
        type: a.type || 'wait',
        target: a.target,
        value: a.value,
        description: a.description || `${a.type} ${a.target || ''}`
      }));

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
            if (!action.target) return false;
            return await AgentService.click(action.target);

          case 'type':
            if (!action.target || !action.value) return false;
            return await AgentService.type(action.target, String(action.value));

          case 'scroll':
            const direction = action.value === 'up' ? 'up' : 'down';
            return await AgentService.scroll(direction, 400);

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
            const opened = openPanel(action.target);
            if (opened) {
              addLog(`✅ Opened panel: ${action.target}`);
            } else {
              addLog(`⚠️ Panel may already be open: ${action.target}`);
            }
            return true; // Don't fail if panel already open

          case 'closePanel':
            if (!action.target) return false;
            const closed = closePanel(action.target);
            if (closed) {
              addLog(`✅ Closed panel: ${action.target}`);
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
            return await AgentService.pressKey(String(action.value));

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
    
    for (let i = 0; i < task.actions.length; i++) {
      if (abortRef.current) {
        addLog('⏹️ Task aborted by user');
        setCurrentTask(prev => prev ? { ...prev, status: 'failed', error: 'Aborted by user' } : null);
        break;
      }

      // Update visual thinking panel
      AgentService.updateThinkingStep(i, 'active');
      
      setCurrentTask(prev => prev ? { ...prev, currentActionIndex: i } : null);
      
      const action = task.actions[i];
      const result = await executeAction(action);
      
      // Update step status
      AgentService.updateThinkingStep(i, result ? 'completed' : 'failed');
      
      if (!result && action.type !== 'wait' && action.type !== 'openPanel') {
        // Only fail for critical actions, not waits or panel opens
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
