// ABLE AI Bridge Service - Connect to Mac API Server

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  text: string;
  model: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export class OllamaService {
  // User sets this URL from settings (localhost.run URL)
  private static bridgeUrl = localStorage.getItem('able_bridge_url') || '';
  
  static setBridgeUrl(url: string) {
    // Remove trailing slash
    const cleanUrl = url.replace(/\/$/, '');
    localStorage.setItem('able_bridge_url', cleanUrl);
    this.bridgeUrl = cleanUrl;
  }
  
  static getBridgeUrl(): string {
    return this.bridgeUrl || localStorage.getItem('able_bridge_url') || '';
  }

  // Check connection to Bridge API
  static async isAvailable(): Promise<boolean> {
    const url = this.getBridgeUrl();
    if (!url) return false;
    
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get Ollama status via Bridge
  static async getOllamaStatus(): Promise<{ connected: boolean; models: OllamaModel[] }> {
    const url = this.getBridgeUrl();
    if (!url) return { connected: false, models: [] };
    
    try {
      const response = await fetch(`${url}/ollama/status`);
      const data = await response.json();
      return {
        connected: data.connected || false,
        models: data.models || []
      };
    } catch {
      return { connected: false, models: [] };
    }
  }

  // Get available models
  static async getModels(): Promise<OllamaModel[]> {
    const url = this.getBridgeUrl();
    if (!url) return [];
    
    try {
      const response = await fetch(`${url}/ollama/models`);
      const data = await response.json();
      return Array.isArray(data) ? data : (data.models || []);
    } catch {
      return [];
    }
  }

  // Chat with Ollama via Bridge
  static async chat(
    message: string,
    history: AIMessage[] = [],
    model: string = 'llama3',
    systemPrompt?: string
  ): Promise<AIResponse> {
    const url = this.getBridgeUrl();
    
    if (!url) {
      return {
        text: '❌ ยังไม่ได้ตั้งค่า Bridge URL\n\nไปที่ Settings → ใส่ URL จาก localhost.run',
        model: 'Error'
      };
    }

    try {
      const response = await fetch(`${url}/ollama/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [...history, { role: 'user', content: message }],
          system: systemPrompt || 'คุณคือ ABLE AI ผู้เชี่ยวชาญการเทรดและการเงิน ตอบเป็นภาษาไทย'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return {
          text: data.message,
          model: `Ollama (${data.model})`
        };
      } else {
        throw new Error(data.error || 'Unknown error from Bridge API');
      }
    } catch (error: any) {
      return {
        text: `❌ เชื่อมต่อไม่ได้: ${error.message}\n\nตรวจสอบ:\n1. API Server รันอยู่บน Mac\n2. localhost.run ยังทำงาน\n3. URL ถูกต้อง`,
        model: 'Error'
      };
    }
  }

  // Generate with context (for analyzing data)
  static async analyze(
    prompt: string,
    context: string,
    model: string = 'llama3'
  ): Promise<string> {
    const response = await this.chat(
      `${prompt}\n\nData:\n${context}`,
      [],
      model
    );
    return response.text;
  }

  // Detect MCP tool calls from message
  static detectToolCall(message: string): { tool: string; params: any } | null {
    const lowerMsg = message.toLowerCase();

    // COT Analysis
    if (lowerMsg.includes('cot') || lowerMsg.includes('commitment')) {
      let asset = 'GOLD - COMMODITY EXCHANGE INC.';
      if (lowerMsg.includes('silver') || lowerMsg.includes('เงิน')) asset = 'SILVER - COMMODITY EXCHANGE INC.';
      if (lowerMsg.includes('oil') || lowerMsg.includes('น้ำมัน')) asset = 'CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE';
      if (lowerMsg.includes('euro') || lowerMsg.includes('eur')) asset = 'EURO FX - CHICAGO MERCANTILE EXCHANGE';
      if (lowerMsg.includes('yen') || lowerMsg.includes('jpy') || lowerMsg.includes('เยน')) asset = 'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE';
      if (lowerMsg.includes('bitcoin') || lowerMsg.includes('btc')) asset = 'BITCOIN - CHICAGO MERCANTILE EXCHANGE';
      if (lowerMsg.includes('pound') || lowerMsg.includes('gbp')) asset = 'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE';

      if (lowerMsg.includes('analyze') || lowerMsg.includes('วิเคราะห์')) {
        return { tool: 'analyze_cot', params: { asset } };
      }
      return { tool: 'get_cot_data', params: { asset } };
    }

    // Get COT assets list
    if (lowerMsg.includes('cot asset') || lowerMsg.includes('available cot')) {
      return { tool: 'get_cot_assets', params: {} };
    }

    // Trading Performance
    if (lowerMsg.includes('performance') || lowerMsg.includes('trading stats') || lowerMsg.includes('สถิติ') || lowerMsg.includes('ผลเทรด')) {
      return { tool: 'analyze_performance', params: {} };
    }

    // Get Trades
    if (lowerMsg.includes('my trade') || lowerMsg.includes('show trade') || lowerMsg.includes('รายการเทรด')) {
      return { tool: 'get_trades', params: { limit: 10 } };
    }

    // Add Trade
    if (lowerMsg.includes('add trade') || lowerMsg.includes('เพิ่มเทรด')) {
      const symbolMatch = message.match(/symbol[:\s]+(\w+)/i) || message.match(/(\w{3,6}USD[T]?)/i);
      const directionMatch = message.match(/(long|short|buy|sell)/i);
      const entryMatch = message.match(/entry[:\s]+([\d.]+)/i) || message.match(/at\s+([\d.]+)/i);
      
      if (symbolMatch && directionMatch && entryMatch) {
        return {
          tool: 'add_trade',
          params: {
            symbol: symbolMatch[1].toUpperCase(),
            direction: directionMatch[1].toLowerCase().includes('long') || directionMatch[1].toLowerCase().includes('buy') ? 'Long' : 'Short',
            entryPrice: parseFloat(entryMatch[1])
          }
        };
      }
    }

    // Search Notes
    if (lowerMsg.includes('search note') || lowerMsg.includes('find note') || lowerMsg.includes('ค้นหาโน้ต')) {
      const match = message.match(/(?:search|find|ค้นหา)\s+note[s]?\s+(.+)/i);
      return { tool: 'search_notes', params: { query: match?.[1] || '' } };
    }

    // Create Note
    if (lowerMsg.includes('create note') || lowerMsg.includes('new note') || lowerMsg.includes('สร้างโน้ต')) {
      const titleMatch = message.match(/(?:create|new|สร้าง)\s+note[:\s]+(.+)/i);
      if (titleMatch) {
        return {
          tool: 'create_note',
          params: {
            title: titleMatch[1].trim(),
            content: `Created via ABLE AI on ${new Date().toLocaleString()}`
          }
        };
      }
    }

    // Position Size Calculator
    if (lowerMsg.includes('position size') || lowerMsg.includes('calculate') || lowerMsg.includes('lot size') || lowerMsg.includes('คำนวณ')) {
      const numbers = message.match(/\d+(?:\.\d+)?/g);
      if (numbers && numbers.length >= 4) {
        return {
          tool: 'calculate_position_size',
          params: {
            accountSize: parseFloat(numbers[0]),
            riskPercent: parseFloat(numbers[1]),
            entryPrice: parseFloat(numbers[2]),
            stopLoss: parseFloat(numbers[3])
          }
        };
      }
    }

    // Market Overview
    if (lowerMsg.includes('market overview') || lowerMsg.includes('ภาพรวมตลาด')) {
      return { tool: 'get_market_overview', params: {} };
    }

    return null;
  }

  // Format MCP tool result for display
  static formatToolResult(toolName: string, result: any): string {
    if (!result.success) {
      return `❌ Error: ${result.error || 'Unknown error'}`;
    }

    switch (toolName) {
      case 'analyze_cot':
        const a = result.analysis;
        return `📊 **COT Analysis**\n\n` +
          `**COT Index:** ${a.cotIndex.toFixed(0)}/100\n` +
          `**Sentiment:** ${a.sentiment}\n\n` +
          `**Large Traders:** ${a.largeTraders.direction} (${a.largeTraders.net.toLocaleString()} contracts)\n` +
          `**Commercial:** ${a.commercial.direction} (${a.commercial.net.toLocaleString()} contracts)\n` +
          `**Open Interest:** ${a.openInterest.toLocaleString()}\n\n` +
          `💡 ${a.interpretation}`;

      case 'get_cot_data':
        if (!result.latest) return '❌ No COT data available';
        const l = result.latest;
        return `📊 **COT Data (${result.count} records)**\n\n` +
          `**Date:** ${l.date}\n` +
          `**Asset:** ${l.asset}\n` +
          `**Commercial Net:** ${l.commercialNet.toLocaleString()}\n` +
          `**Non-Commercial Net:** ${l.nonCommercialNet.toLocaleString()}\n` +
          `**Open Interest:** ${l.openInterest.toLocaleString()}`;

      case 'get_cot_assets':
        return `📋 **Available COT Assets:**\n\n` +
          result.assets.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n');

      case 'analyze_performance':
        const m = result.metrics;
        return `📈 **Trading Performance**\n\n` +
          `**Total Trades:** ${m.totalTrades}\n` +
          `**Win Rate:** ${m.winRate}\n` +
          `**Winning:** ${m.winningTrades} | **Losing:** ${m.losingTrades}\n\n` +
          `**Total P&L:** $${typeof m.totalPnL === 'number' ? m.totalPnL.toFixed(2) : m.totalPnL}\n` +
          `**Avg Win:** $${typeof m.averageWin === 'number' ? m.averageWin.toFixed(2) : m.averageWin}\n` +
          `**Avg Loss:** $${typeof m.averageLoss === 'number' ? m.averageLoss.toFixed(2) : m.averageLoss}`;

      case 'get_trades':
        if (result.trades.length === 0) {
          return `📝 No trades found. Start logging your trades in the Trading Journal!`;
        }
        const trades = result.trades.slice(0, 5).map((t: any) =>
          `• ${t.symbol} ${t.direction} @ ${t.entryPrice} → P&L: $${(t.pnl || 0).toFixed(2)}`
        ).join('\n');
        return `📝 **Recent Trades (${result.total} total)**\n\n${trades}`;

      case 'add_trade':
        return `✅ **Trade Added**\n\n` +
          `**Symbol:** ${result.trade.symbol}\n` +
          `**Direction:** ${result.trade.direction}\n` +
          `**Entry:** $${result.trade.entryPrice}`;

      case 'calculate_position_size':
        const c = result.calculation;
        return `💰 **Position Size Calculation**\n\n` +
          `**Account:** $${c.accountSize.toLocaleString()}\n` +
          `**Risk:** ${c.riskPercent}% = $${c.riskAmount.toFixed(2)}\n` +
          `**Entry:** $${c.entryPrice} | **Stop:** $${c.stopLoss}\n` +
          `**Risk/Unit:** $${c.riskPerUnit.toFixed(2)}\n\n` +
          `**Recommended Position:** ${c.positionSize} units\n` +
          `**Total Value:** $${c.totalValue.toLocaleString()}`;

      case 'search_notes':
        if (result.count === 0) {
          return `🔍 No notes found matching your query.`;
        }
        const notes = result.notes.slice(0, 5).map((n: any) =>
          `• **${n.title}**: ${(n.content || '').substring(0, 50)}...`
        ).join('\n');
        return `🔍 **Found ${result.count} notes**\n\n${notes}`;

      case 'create_note':
        return `✅ **Note Created**\n\n**Title:** ${result.note.title}`;

      case 'get_market_overview':
        return `🌐 **Market Overview**\n\n` +
          `**Crypto:** BTC: ${result.markets.crypto.btc} | ETH: ${result.markets.crypto.eth}\n` +
          `**Forex:** EUR/USD: ${result.markets.forex.eurusd} | USD/JPY: ${result.markets.forex.usdjpy}\n` +
          `**Commodities:** Gold: ${result.markets.commodities.gold} | Oil: ${result.markets.commodities.oil}`;

      default:
        return `✅ Tool executed successfully.\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
    }
  }
}

// Export for backward compatibility
export const FreeAIService = OllamaService;
