// ABLE AI Bridge Service - Connect to Mac API Server via localhost.run

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
  private static bridgeUrl = localStorage.getItem('able_bridge_url') || '';
  private static connectionCache: { isAvailable: boolean; timestamp: number } | null = null;
  private static CACHE_DURATION = 30000;

  static setBridgeUrl(url: string) {
    const cleanUrl = url.trim().replace(/\/$/, '');
    localStorage.setItem('able_bridge_url', cleanUrl);
    this.bridgeUrl = cleanUrl;
    this.connectionCache = null;
    console.log('✅ Bridge URL set:', cleanUrl);
  }

  static getBridgeUrl(): string {
    if (!this.bridgeUrl) {
      this.bridgeUrl = localStorage.getItem('able_bridge_url') || '';
    }
    return this.bridgeUrl;
  }

  static async isAvailable(retries = 2): Promise<boolean> {
    const url = this.getBridgeUrl();
    if (!url) {
      console.warn('⚠️ Bridge URL not set');
      return false;
    }

    if (this.connectionCache) {
      const age = Date.now() - this.connectionCache.timestamp;
      if (age < this.CACHE_DURATION) {
        return this.connectionCache.isAvailable;
      }
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔍 Checking Bridge API (attempt ${attempt + 1})...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${url}/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Bridge API available:', data);
          this.connectionCache = { isAvailable: true, timestamp: Date.now() };
          return true;
        }
      } catch (error: any) {
        console.warn(`❌ Bridge check failed (attempt ${attempt + 1}):`, error.message);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    this.connectionCache = { isAvailable: false, timestamp: Date.now() };
    return false;
  }

  static async getOllamaStatus(): Promise<{ connected: boolean; models: OllamaModel[] }> {
    const url = this.getBridgeUrl();
    if (!url) return { connected: false, models: [] };

    try {
      console.log('🦙 Checking Ollama status...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${url}/ollama/status`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('❌ Ollama status check failed:', response.status);
        return { connected: false, models: [] };
      }

      const data = await response.json();
      console.log('📊 Ollama status:', data);

      return {
        connected: data.connected || false,
        models: data.models || [],
      };
    } catch (error: any) {
      console.error('❌ Ollama status error:', error.message);
      return { connected: false, models: [] };
    }
  }

  static async getModels(): Promise<OllamaModel[]> {
    const url = this.getBridgeUrl();
    if (!url) return [];

    try {
      const response = await fetch(`${url}/ollama/models`, {
        headers: { 'Accept': 'application/json' },
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return Array.isArray(data) ? data : (data.models || []);
    } catch {
      return [];
    }
  }

  static async chat(
    message: string,
    history: AIMessage[] = [],
    model: string = 'llama3',
    systemPrompt?: string
  ): Promise<AIResponse> {
    const url = this.getBridgeUrl();
    
    if (!url) {
      return {
        text: '❌ **ยังไม่ได้ตั้งค่า Bridge URL**\n\n' +
              'กรุณาทำตามขั้นตอน:\n' +
              '1. เปิด ABLE AI Server บน Mac\n' +
              '2. กด "Start Tunnel" เพื่อได้ URL จาก localhost.run\n' +
              '3. Copy URL (เช่น https://abc123.localhost.run)\n' +
              '4. กลับมาที่ Settings และ Paste URL\n' +
              '5. กด "Save" และ "Connect"',
        model: 'Error'
      };
    }

    try {
      console.log(`💬 Sending message to Ollama (${model})...`);
      
      const controller = new AbortController();
      // Increased timeout to 180 seconds (3 minutes)
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      const response = await fetch(`${url}/ollama/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [...history, { role: 'user', content: message }],
          system: systemPrompt || 'คุณคือ ABLE AI ผู้เชี่ยวชาญด้านการเทรดและการเงิน ตอบเป็นภาษาไทยแบบเป็นมิตร'
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Ollama response received');
        return {
          text: data.message,
          model: `Ollama (${data.model})`,
        };
      } else {
        throw new Error(data.error || 'Unknown error from Bridge API');
      }
    } catch (error: any) {
      console.error('❌ Chat error:', error);
      
      if (error.name === 'AbortError') {
        return {
          text: '⏱️ **Request timeout (3 นาที)**\n\n' +
                'Ollama กำลังประมวลผลอยู่ คำถามอาจซับซ้อน\n\n' +
                '**ลองทำสิ่งนี้:**\n' +
                '• ถามคำถามสั้นลง\n' +
                '• ใช้ model เล็กกว่า เช่น gemma3:1b\n' +
                '• รอสักครู่แล้วลองใหม่',
          model: 'Error'
        };
      }

      return {
        text: `❌ **เชื่อมต่อไม่ได้: ${error.message}**\n\n` +
              '**ตรวจสอบ:**\n' +
              '1. API Server รันอยู่บน Mac หรือไม่?\n' +
              '2. Ollama serve ทำงานอยู่หรือไม่?\n' +
              '3. localhost.run tunnel ยังทำงานอยู่หรือไม่?\n' +
              '4. Bridge URL ถูกต้องหรือไม่?',
        model: 'Error'
      };
    }
  }

  // Check connection status with latency
  static async checkConnection(): Promise<{ ok: boolean; error?: string; latency?: number }> {
    const url = this.getBridgeUrl();
    if (!url) return { ok: false, error: 'Bridge URL not set' };
    
    const start = Date.now();
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${url}/health`, { 
        method: 'GET',
        signal: controller.signal
      });
      
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      
      const data = await response.json();
      return { 
        ok: data.stats?.ollamaConnected || false,
        latency: Date.now() - start,
        error: data.stats?.ollamaConnected ? undefined : 'Ollama not connected'
      };
    } catch (error: any) {
      return { ok: false, error: error.message };
    }
  }

  static detectToolCall(message: string): { tool: string; params: any } | null {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('cot') || lowerMsg.includes('analyze cot')) {
      let asset = 'GOLD - COMMODITY EXCHANGE INC.';
      if (lowerMsg.includes('silver')) asset = 'SILVER - COMMODITY EXCHANGE INC.';
      if (lowerMsg.includes('oil')) asset = 'CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE';
      if (lowerMsg.includes('euro') || lowerMsg.includes('eur')) asset = 'EURO FX - CHICAGO MERCANTILE EXCHANGE';
      if (lowerMsg.includes('yen') || lowerMsg.includes('jpy')) asset = 'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE';
      if (lowerMsg.includes('bitcoin') || lowerMsg.includes('btc')) asset = 'BITCOIN - CHICAGO MERCANTILE EXCHANGE';
      return { tool: 'analyze_cot', params: { asset } };
    }

    if (lowerMsg.includes('performance') || lowerMsg.includes('สถิติ')) {
      return { tool: 'analyze_performance', params: {} };
    }

    if (lowerMsg.includes('trades')) {
      return { tool: 'get_trades', params: { limit: 10 } };
    }

    if (lowerMsg.includes('position size') || lowerMsg.includes('calculate')) {
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

    if (lowerMsg.includes('search note') || lowerMsg.includes('find note')) {
      const match = message.match(/(?:search|find)\s+note[s]?\s+(.+)/i);
      if (match) {
        return { tool: 'search_notes', params: { query: match[1] } };
      }
    }

    return null;
  }

  static formatToolResult(tool: string, result: any): string {
    switch (tool) {
      case 'analyze_cot':
        if (!result || result.error) {
          return `❌ ไม่สามารถดึงข้อมูล COT ได้: ${result?.error || 'Unknown error'}`;
        }
        const latest = result.analysis?.latest;
        return `📊 **COT Analysis - ${result.asset}**\n\n` +
          `**วันที่:** ${latest?.date || 'N/A'}\n` +
          `**Commercial:** ${latest?.commercial?.toLocaleString() || 'N/A'}\n` +
          `**Non-Commercial:** ${latest?.non_commercial?.toLocaleString() || 'N/A'}\n` +
          `**Net Position:** ${latest?.net_position?.toLocaleString() || 'N/A'}\n\n` +
          `**COT Index:** ${result.analysis?.cot_index?.toFixed(2) || 'N/A'}`;

      case 'analyze_performance':
        if (!result || result.error) {
          return `❌ Error: ${result?.error || 'Unknown error'}`;
        }
        return `📈 **Trading Performance**\n\n` +
          `**Total Trades:** ${result.total_trades || 0}\n` +
          `**Win Rate:** ${(result.win_rate || 0).toFixed(2)}%\n` +
          `**Profit Factor:** ${(result.profit_factor || 0).toFixed(2)}\n` +
          `**Total P&L:** $${(result.total_pnl || 0).toLocaleString()}`;

      case 'get_trades':
        if (!result?.trades || result.trades.length === 0) {
          return `📝 ยังไม่มี trades\n\nเริ่มบันทึกการเทรดของคุณใน Trading Journal!`;
        }
        const trades = result.trades.slice(0, 5).map((t: any) =>
          `• ${t.symbol} ${t.direction} @ ${t.entryPrice} → P&L: $${(t.pnl || 0).toFixed(2)}`
        ).join('\n');
        return `📝 **Recent Trades (${result.total} total)**\n\n${trades}`;

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

      default:
        return `✅ Tool executed successfully.\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
    }
  }
}

// Backward compatibility
export const FreeAIService = OllamaService;
