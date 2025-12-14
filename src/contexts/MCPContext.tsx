import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { mcpServer, MCPTool } from '@/services/mcp/MCPServer';

interface MCPContextType {
  isReady: boolean;
  tools: MCPTool[];
  executeTool: (name: string, params: any) => Promise<any>;
  getToolsList: () => { name: string; description: string }[];
}

const MCPContext = createContext<MCPContextType | null>(null);

export const MCPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [tools, setTools] = useState<MCPTool[]>([]);

  useEffect(() => {
    initializeMCP();
  }, []);

  const initializeMCP = async () => {
    try {
      await mcpServer.initialize();
      setTools(mcpServer.getTools());
      setIsReady(true);
    } catch (error) {
      console.error('MCP initialization error:', error);
    }
  };

  const executeTool = useCallback(async (name: string, params: any) => {
    return await mcpServer.executeTool(name, params);
  }, []);

  const getToolsList = useCallback(() => {
    return mcpServer.getToolsList();
  }, []);

  return (
    <MCPContext.Provider value={{ isReady, tools, executeTool, getToolsList }}>
      {children}
    </MCPContext.Provider>
  );
};

export const useMCP = () => {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error('useMCP must be used within MCPProvider');
  }
  return context;
};
