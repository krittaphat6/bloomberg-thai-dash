// GatewayService.ts - SuperClaw Gateway (OpenClaw-style Control Plane)
// Unified command routing for web UI, AI, and future multi-channel support

import { EventEmitter } from 'events';

export interface GatewayMessage {
  id: string;
  type: 'connect' | 'disconnect' | 'command' | 'response' | 'event';
  channel?: 'web' | 'telegram' | 'whatsapp' | 'discord' | 'internal';
  payload: any;
  timestamp: number;
}

export interface GatewayClient {
  id: string;
  channel: 'web' | 'telegram' | 'whatsapp' | 'discord' | 'internal';
  connected: boolean;
  lastSeen: number;
  metadata?: Record<string, any>;
}

export interface GatewayStatus {
  running: boolean;
  clients: GatewayClient[];
  queueSize: number;
  uptime: number;
}

class GatewayServiceClass extends EventEmitter {
  private clients: Map<string, GatewayClient> = new Map();
  private messageQueue: GatewayMessage[] = [];
  private isRunning = false;
  private startTime = 0;
  private processorInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Start the Gateway (OpenClaw-style control plane)
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log('🦞 Starting SuperClaw Gateway...');
    this.isRunning = true;
    this.startTime = Date.now();

    // Initialize internal client for web UI
    this.registerClient({
      id: 'web-ui',
      channel: 'web',
      connected: true,
      lastSeen: Date.now()
    });

    // Start message processor
    this.startMessageProcessor();

    console.log('✅ SuperClaw Gateway started');
    this.emit('gateway:started');
  }

  /**
   * Stop the Gateway
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.processorInterval = null;
    }

    // Disconnect all clients
    this.clients.forEach((client, id) => {
      this.emit('client:disconnected', client);
    });
    this.clients.clear();

    console.log('🛑 SuperClaw Gateway stopped');
    this.emit('gateway:stopped');
  }

  /**
   * Register a new client (channel)
   */
  registerClient(client: GatewayClient): void {
    this.clients.set(client.id, client);
    this.emit('client:connected', client);
    console.log(`📱 Client connected: ${client.channel} (${client.id})`);
  }

  /**
   * Unregister a client
   */
  unregisterClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      this.emit('client:disconnected', client);
      console.log(`📴 Client disconnected: ${client.channel} (${clientId})`);
    }
  }

  /**
   * Send message to specific client or broadcast
   */
  async sendMessage(message: Omit<GatewayMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: GatewayMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    this.messageQueue.push(fullMessage);
    this.emit('message:sent', fullMessage);

    // If channel specified, route to that client
    if (message.channel) {
      const client = Array.from(this.clients.values()).find(c => c.channel === message.channel);
      if (client) {
        await this.routeToClient(client.id, fullMessage);
      }
    }
  }

  /**
   * Execute command from any channel (main entry point)
   */
  async executeCommand(command: string, clientId: string = 'web-ui'): Promise<any> {
    console.log(`⚡ Executing command from ${clientId}: ${command.substring(0, 50)}...`);

    const message: GatewayMessage = {
      id: crypto.randomUUID(),
      type: 'command',
      payload: { command },
      timestamp: Date.now()
    };

    this.emit('command:received', message);

    try {
      // Route to command processor
      const result = await this.processCommand(command, clientId);

      // Send response back
      await this.sendMessage({
        type: 'response',
        channel: this.clients.get(clientId)?.channel || 'web',
        payload: result
      });

      return result;
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      await this.sendMessage({
        type: 'response',
        channel: this.clients.get(clientId)?.channel || 'web',
        payload: errorResult
      });

      return errorResult;
    }
  }

  /**
   * Process command - routes to appropriate handler
   */
  private async processCommand(command: string, clientId: string): Promise<any> {
    // Check if it's a skill command
    if (command.startsWith('skill:')) {
      const skillId = command.replace('skill:', '');
      const { SkillsManager } = await import('../skills/SkillsManager');
      return await SkillsManager.executeSkill(skillId);
    }

    // Check if it's an agent command
    if (command.startsWith('agent:')) {
      const agentCommand = command.replace('agent:', '');
      const { AgentService } = await import('../AgentService');
      // Use snapshot for analysis
      const context = await AgentService.getPageContext();
      return { command: agentCommand, context };
    }

    // Check if it's a vision command
    if (command.startsWith('vision:')) {
      const visionCommand = command.replace('vision:', '');
      const { VisionService } = await import('../vision/VisionService');
      const screenshot = await VisionService.captureScreen();
      return await VisionService.analyzeWithVision(screenshot.base64, visionCommand);
    }

    // Default: route to AI for natural language processing
    const { GeminiService } = await import('../GeminiService');
    return await GeminiService.chat(command);
  }

  /**
   * Route message to specific client
   */
  private async routeToClient(clientId: string, message: GatewayMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Route based on channel type
    switch (client.channel) {
      case 'web':
        this.emit('web:message', message);
        break;
      case 'internal':
        this.emit('internal:message', message);
        break;
      // Future channels (prepared but not active)
      case 'telegram':
      case 'whatsapp':
      case 'discord':
        console.log(`📱 Message queued for ${client.channel} (not implemented)`);
        break;
    }
  }

  /**
   * Start message processor loop
   */
  private startMessageProcessor(): void {
    this.processorInterval = setInterval(() => {
      if (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          this.emit('message:processed', message);
        }
      }
    }, 100);
  }

  /**
   * Get Gateway status
   */
  getStatus(): GatewayStatus {
    return {
      running: this.isRunning,
      clients: Array.from(this.clients.values()),
      queueSize: this.messageQueue.length,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Get all connected clients
   */
  getClients(): GatewayClient[] {
    return Array.from(this.clients.values());
  }
}

export const GatewayService = new GatewayServiceClass();
