import { supabase } from '@/integrations/supabase/client';

// Available data sources for ABLE AI
export type DataSource = 
  | 'broker_connections'
  | 'broker_status'
  | 'trades'
  | 'trade_stats'
  | 'market_data'
  | 'mt5_commands'
  | 'chat_rooms'
  | 'messages'
  | 'alerts'
  | 'api_logs'
  | 'all_summary';

export interface AIRequest {
  action: 'query' | 'analyze' | 'summary';
  sources: DataSource[];
  userId?: string;
  roomId?: string;
  filters?: Record<string, any>;
  prompt?: string;
}

export interface AIResponse {
  success: boolean;
  data?: Record<string, any>;
  analysis?: string;
  model?: string;
  error?: string;
}

export interface TradeStat {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  buy_count: number;
  sell_count: number;
  avg_latency: number;
  total_volume: number;
}

export interface DataSummary {
  broker_connections: number;
  trades: number;
  messages: number;
  alerts: number;
  mt5_commands: number;
  timestamp: string;
}

/**
 * ABLE AI Service - Backend service for AI-powered data access
 */
export const AbleAIService = {
  /**
   * Query data from multiple sources
   */
  async query(sources: DataSource[], filters?: Record<string, any>): Promise<AIResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('able-ai', {
        body: {
          action: 'query',
          sources,
          filters
        }
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('ABLE AI Query Error:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Query and analyze data with AI
   */
  async analyze(sources: DataSource[], prompt: string, filters?: Record<string, any>): Promise<AIResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('able-ai', {
        body: {
          action: 'analyze',
          sources,
          prompt,
          filters
        }
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('ABLE AI Analyze Error:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get summary of all data
   */
  async getSummary(): Promise<AIResponse> {
    return this.query(['all_summary']);
  },

  /**
   * Get broker connection status
   */
  async getBrokerStatus(userId?: string): Promise<AIResponse> {
    return this.query(['broker_connections', 'broker_status'], { userId });
  },

  /**
   * Get trade statistics
   */
  async getTradeStats(): Promise<AIResponse> {
    return this.query(['trade_stats', 'trades']);
  },

  /**
   * Get MT5 command history
   */
  async getMT5Commands(connectionId?: string): Promise<AIResponse> {
    return this.query(['mt5_commands'], { connectionId });
  },

  /**
   * Get webhook messages
   */
  async getWebhookMessages(roomId?: string, limit = 50): Promise<AIResponse> {
    return this.query(['messages'], { 
      roomId,
      message_type: 'webhook',
      limit
    });
  },

  /**
   * Get all alerts
   */
  async getAlerts(): Promise<AIResponse> {
    return this.query(['alerts']);
  },

  /**
   * Analyze trading performance
   */
  async analyzePerformance(): Promise<AIResponse> {
    return this.analyze(
      ['trade_stats', 'trades', 'mt5_commands'],
      'วิเคราะห์ผลการเทรดโดยรวม ดู win rate, average latency, และปัญหาที่พบ'
    );
  },

  /**
   * Analyze broker connections
   */
  async analyzeBrokerConnections(): Promise<AIResponse> {
    return this.analyze(
      ['broker_connections', 'broker_status'],
      'วิเคราะห์สถานะการเชื่อมต่อ broker ทั้งหมด และแนะนำแนวทางแก้ไขถ้ามีปัญหา'
    );
  },

  /**
   * Get market overview
   */
  async getMarketOverview(): Promise<AIResponse> {
    return this.analyze(
      ['market_data'],
      'สรุปภาพรวมตลาดจากข้อมูลที่มี'
    );
  },

  /**
   * Smart query - detect intent and query appropriate data
   */
  async smartQuery(userQuery: string): Promise<AIResponse> {
    const lowerQuery = userQuery.toLowerCase();
    
    // Detect which data sources are needed
    const sources: DataSource[] = [];
    
    if (lowerQuery.includes('trade') || lowerQuery.includes('เทรด') || lowerQuery.includes('order')) {
      sources.push('trades', 'trade_stats');
    }
    if (lowerQuery.includes('mt5') || lowerQuery.includes('command')) {
      sources.push('mt5_commands');
    }
    if (lowerQuery.includes('broker') || lowerQuery.includes('connection') || lowerQuery.includes('เชื่อมต่อ')) {
      sources.push('broker_connections', 'broker_status');
    }
    if (lowerQuery.includes('market') || lowerQuery.includes('ตลาด') || lowerQuery.includes('price')) {
      sources.push('market_data');
    }
    if (lowerQuery.includes('alert') || lowerQuery.includes('แจ้งเตือน')) {
      sources.push('alerts');
    }
    if (lowerQuery.includes('message') || lowerQuery.includes('webhook') || lowerQuery.includes('chat')) {
      sources.push('messages');
    }
    
    // Default to summary if no specific source detected
    if (sources.length === 0) {
      sources.push('all_summary');
    }

    return this.analyze(sources, userQuery);
  }
};

export default AbleAIService;
