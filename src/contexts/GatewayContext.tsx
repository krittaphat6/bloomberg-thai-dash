// GatewayContext.tsx - React Context for SuperClaw Gateway
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { GatewayService, GatewayClient, GatewayMessage, GatewayStatus } from '@/services/gateway/GatewayService';

interface GatewayContextType {
  isConnected: boolean;
  clients: GatewayClient[];
  status: GatewayStatus | null;
  sendCommand: (command: string) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
}

const GatewayContext = createContext<GatewayContextType | null>(null);

export const useGateway = () => {
  const context = useContext(GatewayContext);
  if (!context) throw new Error('useGateway must be used within GatewayProvider');
  return context;
};

interface GatewayProviderProps {
  children: ReactNode;
}

export const GatewayProvider: React.FC<GatewayProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [clients, setClients] = useState<GatewayClient[]>([]);
  const [status, setStatus] = useState<GatewayStatus | null>(null);

  useEffect(() => {
    // Start Gateway on mount
    GatewayService.start().then(() => {
      setIsConnected(true);
      setStatus(GatewayService.getStatus());
    });

    // Listen to client changes
    const handleClientConnected = (client: GatewayClient) => {
      setClients(prev => [...prev.filter(c => c.id !== client.id), client]);
      setStatus(GatewayService.getStatus());
    };

    const handleClientDisconnected = (client: GatewayClient) => {
      setClients(prev => prev.filter(c => c.id !== client.id));
      setStatus(GatewayService.getStatus());
    };

    const handleGatewayStarted = () => {
      setIsConnected(true);
      setClients(GatewayService.getClients());
      setStatus(GatewayService.getStatus());
    };

    const handleGatewayStopped = () => {
      setIsConnected(false);
      setClients([]);
      setStatus(null);
    };

    GatewayService.on('client:connected', handleClientConnected);
    GatewayService.on('client:disconnected', handleClientDisconnected);
    GatewayService.on('gateway:started', handleGatewayStarted);
    GatewayService.on('gateway:stopped', handleGatewayStopped);

    return () => {
      GatewayService.off('client:connected', handleClientConnected);
      GatewayService.off('client:disconnected', handleClientDisconnected);
      GatewayService.off('gateway:started', handleGatewayStarted);
      GatewayService.off('gateway:stopped', handleGatewayStopped);
    };
  }, []);

  const sendCommand = useCallback(async (command: string) => {
    return await GatewayService.executeCommand(command, 'web-ui');
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    GatewayService.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    GatewayService.off(event, handler);
  }, []);

  return (
    <GatewayContext.Provider value={{ isConnected, clients, status, sendCommand, on, off }}>
      {children}
    </GatewayContext.Provider>
  );
};
