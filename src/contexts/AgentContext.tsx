// AgentContext.tsx - Global context for Vercept-style Agent Mode with Gemini Loop Control

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AgentService, AgentAction, AgentTask, PageContext } from '@/services/AgentService';
import { useAgentExecutor } from '@/hooks/useAgentExecutor';
import { useAgentLoop } from '@/hooks/useAgentLoop';

interface AgentContextType {
  isAgentMode: boolean;
  setAgentMode: (mode: boolean) => void;
  isRunning: boolean;
  currentTask: AgentTask | null;
  logs: string[];
  executeAction: (action: AgentAction) => Promise<boolean>;
  executeTask: (task: AgentTask) => Promise<void>;
  runFromAIResponse: (response: string) => Promise<string>;
  // ✅ NEW: Gemini-controlled loop that continues until done
  runAgentLoop: (goal: string) => Promise<string>;
  loopState: {
    iteration: number;
    status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
    currentStep: string;
  };
  stopAgent: () => void;
  clearLogs: () => void;
  addLog: (log: string) => void;
  getPageContext: () => PageContext;
  highlightElement: (selector: string, label?: string) => Promise<void>;
  showThinking: (goal: string, steps: string[]) => void;
  hideThinking: () => void;
  analyzeScreen: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | null>(null);

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within AgentProvider');
  }
  return context;
};

interface AgentProviderProps {
  children: ReactNode;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ children }) => {
  const [isAgentMode, setIsAgentMode] = useState(false);
  const executor = useAgentExecutor();
  const agentLoop = useAgentLoop();

  const highlightElement = useCallback(async (selector: string, label?: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      await AgentService.highlightElement(element, label);
    }
  }, []);

  const showThinking = useCallback((goal: string, steps: string[]) => {
    AgentService.showThinkingPanel(
      goal,
      steps.map(s => ({ description: s, status: 'pending' as const }))
    );
  }, []);

  const hideThinking = useCallback(() => {
    AgentService.hideThinkingPanel();
  }, []);

  const analyzeScreen = useCallback(async () => {
    executor.addLog('🔍 Analyzing screen...');
    await AgentService.analyzeScreen();
  }, [executor]);

  const handleSetAgentMode = useCallback((mode: boolean) => {
    setIsAgentMode(mode);
    if (mode) {
      // Create cursor when entering agent mode
      AgentService.createVirtualCursor();
      executor.addLog('🤖 Agent Mode activated - AI can now control the UI');
    } else {
      // Cleanup when exiting agent mode
      AgentService.cleanup();
      executor.addLog('⏹️ Agent Mode deactivated');
    }
  }, [executor]);

  // Combined stop function
  const stopAgent = useCallback(() => {
    executor.stopAgent();
    agentLoop.stopAgent();
  }, [executor, agentLoop]);

  // Combined logs
  const combinedLogs = [...executor.logs, ...agentLoop.state.logs];

  // Combined isRunning
  const isRunning = executor.isRunning || agentLoop.isRunning;

  return (
    <AgentContext.Provider
      value={{
        isAgentMode,
        setAgentMode: handleSetAgentMode,
        isRunning,
        currentTask: executor.currentTask,
        logs: combinedLogs,
        executeAction: executor.executeAction,
        executeTask: executor.executeTask,
        runFromAIResponse: executor.runFromAIResponse,
        runAgentLoop: agentLoop.runAgentLoop,
        loopState: {
          iteration: agentLoop.state.iteration,
          status: agentLoop.state.status,
          currentStep: agentLoop.state.currentStep
        },
        stopAgent,
        clearLogs: () => {
          executor.clearLogs();
          agentLoop.clearLogs();
        },
        addLog: executor.addLog,
        getPageContext: executor.getPageContext,
        highlightElement,
        showThinking,
        hideThinking,
        analyzeScreen
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};
