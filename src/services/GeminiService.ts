/**
 * GeminiService - Direct Gemini API access via Lovable AI Gateway
 */

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  text: string;
  model: string;
}

export interface ToolCallResult {
  tool: string;
  params: Record<string, any>;
}

class GeminiServiceClass {
  private readonly GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
  private readonly MODEL = 'google/gemini-2.5-flash';
  
  /**
   * Check if Gemini is available (always returns true for Cloud)
   */
  async isAvailable(): Promise<boolean> {
    // Gemini via Lovable Gateway is always available
    return true;
  }

  /**
   * Chat with Gemini
   */
  async chat(
    message: string, 
    history: AIMessage[] = [], 
    systemPrompt?: string
  ): Promise<AIResponse> {
    try {
      // Import supabase client dynamically to avoid circular deps
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Call the macro-ai-analysis edge function
      const { data, error } = await supabase.functions.invoke('macro-ai-analysis', {
        body: {
          prompt: message,
          symbol: 'GENERAL',
          systemPrompt: systemPrompt || 'คุณคือ ABLE AI ผู้เชี่ยวชาญด้านการเทรดและการเงิน ตอบเป็นภาษาเดียวกับผู้ใช้อย่างเป็นมิตร'
        }
      });

      if (error) {
        console.error('Gemini API error:', error);
        throw new Error(error.message);
      }

      return {
        text: data?.analysis || 'ไม่สามารถประมวลผลได้',
        model: 'Gemini 2.5 Flash'
      };
    } catch (error) {
      console.error('GeminiService.chat error:', error);
      throw error;
    }
  }

  /**
   * Detect tool calls from user message
   */
  detectToolCall(message: string): ToolCallResult | null {
    const lowerMessage = message.toLowerCase();
    
    // COT Analysis
    if (lowerMessage.includes('cot') || lowerMessage.includes('commitment of traders')) {
      const symbols = ['gold', 'silver', 'oil', 'euro', 'yen', 'gbp', 'aud', 'cad', 'bitcoin'];
      let symbol = 'gold';
      for (const s of symbols) {
        if (lowerMessage.includes(s)) {
          symbol = s;
          break;
        }
      }
      return { tool: 'analyze_cot', params: { symbol } };
    }
    
    // Performance Analysis
    if (lowerMessage.includes('performance') || lowerMessage.includes('ประสิทธิภาพ') || 
        lowerMessage.includes('my trades') || lowerMessage.includes('รายการเทรด')) {
      return { tool: 'analyze_performance', params: {} };
    }
    
    // Position Size Calculator
    const positionMatch = lowerMessage.match(/calculate\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i);
    if (positionMatch) {
      return {
        tool: 'calculate_position_size',
        params: {
          accountSize: parseInt(positionMatch[1]),
          riskPercent: parseInt(positionMatch[2]),
          stopLoss: parseInt(positionMatch[3]),
          takeProfit: parseInt(positionMatch[4])
        }
      };
    }
    
    // Market Data
    if (lowerMessage.includes('market') || lowerMessage.includes('ราคา') || lowerMessage.includes('price')) {
      return { tool: 'get_market_data', params: {} };
    }
    
    // News
    if (lowerMessage.includes('news') || lowerMessage.includes('ข่าว')) {
      return { tool: 'get_news', params: {} };
    }
    
    return null;
  }

  /**
   * Format tool result for display
   */
  formatToolResult(tool: string, result: any): string {
    if (!result) return '❌ ไม่พบข้อมูล';
    
    switch (tool) {
      case 'analyze_cot':
        return `📊 **COT Analysis**\n\n${JSON.stringify(result, null, 2)}`;
      
      case 'analyze_performance':
        if (result.trades && Array.isArray(result.trades)) {
          const summary = result.summary || {};
          return `📈 **Trading Performance**\n\n` +
            `• Total Trades: ${summary.totalTrades || result.trades.length}\n` +
            `• Win Rate: ${summary.winRate || 'N/A'}%\n` +
            `• Total P&L: $${summary.totalPL || 'N/A'}\n` +
            `• Avg Win: $${summary.avgWin || 'N/A'}\n` +
            `• Avg Loss: $${summary.avgLoss || 'N/A'}`;
        }
        return `📈 **Performance Data**\n${JSON.stringify(result, null, 2)}`;
      
      case 'calculate_position_size':
        return `🎯 **Position Size**\n\n` +
          `• Position Size: ${result.positionSize || 'N/A'} units\n` +
          `• Risk Amount: $${result.riskAmount || 'N/A'}\n` +
          `• Potential Loss: $${result.potentialLoss || 'N/A'}\n` +
          `• Potential Profit: $${result.potentialProfit || 'N/A'}`;
      
      case 'get_market_data':
        if (Array.isArray(result)) {
          return `📊 **Market Data**\n\n${result.slice(0, 10).map(
            (item: any) => `• ${item.symbol}: ${item.price} (${item.change}%)`
          ).join('\n')}`;
        }
        return `📊 **Market Data**\n${JSON.stringify(result, null, 2)}`;
      
      case 'get_news':
        if (Array.isArray(result)) {
          return `📰 **Latest News**\n\n${result.slice(0, 5).map(
            (item: any) => `📌 ${item.title || item.headline}`
          ).join('\n\n')}`;
        }
        return `📰 **News**\n${JSON.stringify(result, null, 2)}`;
      
      default:
        return JSON.stringify(result, null, 2);
    }
  }
}

export const GeminiService = new GeminiServiceClass();
