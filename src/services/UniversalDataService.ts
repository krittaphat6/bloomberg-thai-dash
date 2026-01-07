/**
 * Universal Data Service - ABLE AI เข้าถึงข้อมูลทุกอย่างในแอป
 * ดึงข้อมูลจากทุกแหล่งได้หมดถ้าผู้ใช้ถาม
 */

import { supabase } from '@/integrations/supabase/client';

export interface UniversalDataResult {
  success: boolean;
  data: Record<string, any>;
  sources: string[];
  timestamp: string;
  summary?: string;
}

export type DataCategory = 
  | 'market_data'
  | 'broker_connections'
  | 'trades'
  | 'mt5_commands'
  | 'messages'
  | 'alerts'
  | 'calendar'
  | 'notes'
  | 'monte_carlo'
  | 'pinned_assets'
  | 'twitter_posts'
  | 'news'
  | 'user_settings'
  | 'all';

/**
 * Universal Data Service - ดึงข้อมูลทุกอย่างในแอป
 */
export const UniversalDataService = {
  /**
   * Get all available data based on user query
   */
  async getData(categories: DataCategory[] = ['all']): Promise<UniversalDataResult> {
    const data: Record<string, any> = {};
    const sources: string[] = [];
    
    const shouldGet = (cat: DataCategory) => 
      categories.includes('all') || categories.includes(cat);

    try {
      // Market Data from Supabase
      if (shouldGet('market_data')) {
        const { data: marketData } = await supabase
          .from('market_data')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50);
        if (marketData) {
          data.market_data = marketData;
          sources.push('market_data');
        }
      }

      // Broker Connections
      if (shouldGet('broker_connections')) {
        const { data: brokers } = await supabase
          .from('broker_connections')
          .select('*')
          .order('created_at', { ascending: false });
        if (brokers) {
          data.broker_connections = brokers;
          sources.push('broker_connections');
        }
      }

      // Trades (from api_forward_logs)
      if (shouldGet('trades')) {
        const { data: trades } = await supabase
          .from('api_forward_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (trades) {
          data.trades = trades;
          sources.push('trades');
        }
      }

      // MT5 Commands
      if (shouldGet('mt5_commands')) {
        const { data: commands } = await supabase
          .from('mt5_commands')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (commands) {
          data.mt5_commands = commands;
          sources.push('mt5_commands');
        }
      }

      // Messages
      if (shouldGet('messages')) {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (messages) {
          data.messages = messages;
          sources.push('messages');
        }
      }

      // Alerts
      if (shouldGet('alerts')) {
        const { data: alerts } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (alerts) {
          data.alerts = alerts;
          sources.push('alerts');
        }
      }

      // Economic Calendar (from localStorage or API)
      if (shouldGet('calendar')) {
        try {
          const { data: calendarData } = await supabase.functions.invoke('economic-calendar', {
            body: { filter: 'all' }
          });
          if (calendarData?.events) {
            data.calendar = calendarData.events.slice(0, 20);
            sources.push('economic_calendar');
          }
        } catch (e) {
          console.warn('Calendar fetch failed:', e);
        }
      }

      // Notes from localStorage
      if (shouldGet('notes')) {
        const savedNotes = localStorage.getItem('able-notes');
        if (savedNotes) {
          try {
            data.notes = JSON.parse(savedNotes);
            sources.push('notes');
          } catch (e) {
            console.warn('Notes parse failed:', e);
          }
        }
      }

      // Monte Carlo config from localStorage
      if (shouldGet('monte_carlo')) {
        const mcConfig = localStorage.getItem('mc-config');
        if (mcConfig) {
          try {
            data.monte_carlo = JSON.parse(mcConfig);
            sources.push('monte_carlo');
          } catch (e) {
            console.warn('Monte Carlo parse failed:', e);
          }
        }
      }

      // Pinned Assets from localStorage
      if (shouldGet('pinned_assets')) {
        const pinnedAssets = localStorage.getItem('able-pinned-assets');
        if (pinnedAssets) {
          try {
            data.pinned_assets = JSON.parse(pinnedAssets);
            sources.push('pinned_assets');
          } catch (e) {
            console.warn('Pinned assets parse failed:', e);
          }
        }
      }

      // Twitter Posts from session (if available)
      if (shouldGet('twitter_posts')) {
        const twitterCache = sessionStorage.getItem('twitter-posts-cache');
        if (twitterCache) {
          try {
            data.twitter_posts = JSON.parse(twitterCache);
            sources.push('twitter_posts');
          } catch (e) {
            console.warn('Twitter posts parse failed:', e);
          }
        }
      }

      // User Settings
      if (shouldGet('user_settings')) {
        const settings: Record<string, any> = {};
        
        // Theme
        const theme = localStorage.getItem('able-theme');
        if (theme) settings.theme = theme;
        
        // AI Provider preference
        const aiProvider = localStorage.getItem('able-ai-provider');
        if (aiProvider) settings.ai_provider = aiProvider;
        
        // Bridge URL
        const bridgeUrl = localStorage.getItem('ollama-bridge-url');
        if (bridgeUrl) settings.ollama_bridge_url = bridgeUrl;
        
        if (Object.keys(settings).length > 0) {
          data.user_settings = settings;
          sources.push('user_settings');
        }
      }

      return {
        success: true,
        data,
        sources,
        timestamp: new Date().toISOString(),
        summary: this.generateSummary(data, sources)
      };

    } catch (error) {
      console.error('UniversalDataService error:', error);
      return {
        success: false,
        data: {},
        sources: [],
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Smart query - detect what data is needed from user's question
   */
  async smartQuery(query: string): Promise<UniversalDataResult> {
    const lowerQuery = query.toLowerCase();
    const categories: DataCategory[] = [];
    
    // Detect categories from query
    if (lowerQuery.includes('trade') || lowerQuery.includes('เทรด') || lowerQuery.includes('order')) {
      categories.push('trades');
    }
    if (lowerQuery.includes('mt5') || lowerQuery.includes('command')) {
      categories.push('mt5_commands');
    }
    if (lowerQuery.includes('broker') || lowerQuery.includes('connection') || lowerQuery.includes('เชื่อมต่อ')) {
      categories.push('broker_connections');
    }
    if (lowerQuery.includes('market') || lowerQuery.includes('ตลาด') || lowerQuery.includes('price') || lowerQuery.includes('ราคา')) {
      categories.push('market_data');
    }
    if (lowerQuery.includes('alert') || lowerQuery.includes('แจ้งเตือน')) {
      categories.push('alerts');
    }
    if (lowerQuery.includes('message') || lowerQuery.includes('webhook') || lowerQuery.includes('chat')) {
      categories.push('messages');
    }
    if (lowerQuery.includes('calendar') || lowerQuery.includes('ปฏิทิน') || lowerQuery.includes('event') || 
        lowerQuery.includes('nfp') || lowerQuery.includes('fomc')) {
      categories.push('calendar');
    }
    if (lowerQuery.includes('note') || lowerQuery.includes('โน้ต') || lowerQuery.includes('บันทึก')) {
      categories.push('notes');
    }
    if (lowerQuery.includes('monte carlo') || lowerQuery.includes('simulation') || lowerQuery.includes('risk')) {
      categories.push('monte_carlo');
    }
    if (lowerQuery.includes('twitter') || lowerQuery.includes('ทวิตเตอร์') || lowerQuery.includes('tweet')) {
      categories.push('twitter_posts');
    }
    if (lowerQuery.includes('setting') || lowerQuery.includes('ตั้งค่า') || lowerQuery.includes('theme')) {
      categories.push('user_settings');
    }
    if (lowerQuery.includes('pinned') || lowerQuery.includes('asset') || lowerQuery.includes('สินทรัพย์')) {
      categories.push('pinned_assets');
    }
    
    // If no specific category detected, get everything
    if (categories.length === 0) {
      categories.push('all');
    }
    
    return this.getData(categories);
  },

  /**
   * Generate summary of collected data
   */
  generateSummary(data: Record<string, any>, sources: string[]): string {
    const parts: string[] = [];
    
    if (data.broker_connections?.length) {
      const connected = data.broker_connections.filter((b: any) => b.is_connected).length;
      parts.push(`Broker: ${connected}/${data.broker_connections.length} connected`);
    }
    
    if (data.trades?.length) {
      parts.push(`Trades: ${data.trades.length} records`);
    }
    
    if (data.mt5_commands?.length) {
      parts.push(`MT5: ${data.mt5_commands.length} commands`);
    }
    
    if (data.alerts?.length) {
      const unread = data.alerts.filter((a: any) => !a.is_read).length;
      parts.push(`Alerts: ${unread} unread`);
    }
    
    if (data.calendar?.length) {
      parts.push(`Calendar: ${data.calendar.length} events`);
    }
    
    if (data.notes?.length) {
      parts.push(`Notes: ${data.notes.length} notes`);
    }
    
    if (data.pinned_assets?.length) {
      parts.push(`Pinned: ${data.pinned_assets.map((a: any) => a.symbol).join(', ')}`);
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'No data found';
  },

  /**
   * Format data for AI consumption
   */
  formatForAI(result: UniversalDataResult): string {
    if (!result.success) return 'Failed to retrieve data';
    
    let formatted = `📊 **Data Overview** (${result.sources.length} sources)\n`;
    formatted += `⏰ Timestamp: ${result.timestamp}\n`;
    formatted += `📋 Summary: ${result.summary}\n\n`;
    
    for (const [key, value] of Object.entries(result.data)) {
      if (Array.isArray(value)) {
        formatted += `**${key.toUpperCase()}** (${value.length} items)\n`;
        formatted += value.slice(0, 5).map((item, i) => {
          if (typeof item === 'object') {
            return `  ${i + 1}. ${JSON.stringify(item).substring(0, 100)}...`;
          }
          return `  ${i + 1}. ${item}`;
        }).join('\n');
        if (value.length > 5) {
          formatted += `\n  ... and ${value.length - 5} more items`;
        }
        formatted += '\n\n';
      } else if (typeof value === 'object') {
        formatted += `**${key.toUpperCase()}**\n`;
        formatted += JSON.stringify(value, null, 2).substring(0, 300);
        formatted += '\n\n';
      }
    }
    
    return formatted;
  }
};

export default UniversalDataService;
