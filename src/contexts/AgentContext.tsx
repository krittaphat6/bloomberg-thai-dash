// AgentContext.tsx - Global context for Agent Mode

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AgentService, AgentAction, AgentTask, PageContext } from '@/services/AgentService';
import { useAgentExecutor } from '@/hooks/useAgentExecutor';

interface AgentContextType {
  isAgentMode: boolean;
  setAgentMode: (mode: boolean) => void;
  isRunning: boolean;
  currentTask: AgentTask | null;
  logs: string[];
  executeAction: (action: AgentAction) => Promise<boolean>;
  executeTask: (task: AgentTask) => Promise<void>;
  runFromAIResponse: (response: string) => Promise<string>;
  stopAgent: () => void;
  clearLogs: () => void;
  addLog: (log: string) => void;
  getPageContext: () => PageContext;
  highlightElement: (selector: string) => Promise<void>;
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

  const highlightElement = useCallback(async (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      await AgentService.highlightElement(element);
    }
  }, []);

  const handleSetAgentMode = useCallback((mode: boolean) => {
    setIsAgentMode(mode);
    if (!mode) {
      AgentService.cleanup();
    }
  }, []);

  return (
    <AgentContext.Provider
      value={{
        isAgentMode,
        setAgentMode: handleSetAgentMode,
        isRunning: executor.isRunning,
        currentTask: executor.currentTask,
        logs: executor.logs,
        executeAction: executor.executeAction,
        executeTask: executor.executeTask,
        runFromAIResponse: executor.runFromAIResponse,
        stopAgent: executor.stopAgent,
        clearLogs: executor.clearLogs,
        addLog: executor.addLog,
        getPageContext: executor.getPageContext,
        highlightElement
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};
