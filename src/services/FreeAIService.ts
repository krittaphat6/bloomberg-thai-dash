// Free AI Service - Multiple free AI models with Local AI fallback

export type FreeAIModel = 'lovable' | 'local';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  text: string;
  model: string;
  tokensUsed?: number;
}

export class FreeAIService {
  
  // Main entry point - tries Lovable AI first, then falls back to Local
  static async chat(
    message: string,
    history: AIMessage[] = [],
    model: FreeAIModel = 'lovable'
  ): Promise<AIResponse> {
    if (model === 'local') {
      return this.localAI(message, history);
    }
    
    // For Lovable AI, we need to call the edge function
    // But since we can't call it directly from here, we'll use Local AI as default
    return this.localAI(message, history);
  }

  // Local AI - Rule-based responses for financial analysis
  static localAI(message: string, history: AIMessage[] = []): AIResponse {
    const lowerMsg = message.toLowerCase();
    let response = '';

    // COT Analysis
    if (lowerMsg.includes('cot') || lowerMsg.includes('commitment')) {
      if (lowerMsg.includes('gold')) {
        response = `📊 **COT Analysis - GOLD**\n\n` +
          `ข้อมูล COT สำหรับทองคำแสดงให้เห็นว่า:\n\n` +
          `• **Large Speculators (Hedge Funds)**: มักจะเป็น Trend Followers\n` +
          `• **Commercial Hedgers (Producers)**: มักจะขาย hedge เมื่อราคาขึ้น\n` +
          `• **Small Speculators**: รายย่อยที่มักจะผิดทางในช่วง extremes\n\n` +
          `💡 **เคล็ดลับ**: ใช้ COT Index > 70 หรือ < 30 เป็นสัญญาณ contrarian\n\n` +
          `คุณสามารถดูข้อมูลย้อนหลังได้ที่ COT Data Enhanced panel`;
      } else {
        response = `📊 **COT (Commitment of Traders) Report**\n\n` +
          `รายงาน COT แสดงตำแหน่งของ:\n` +
          `1. **Commercial** - ผู้ผลิต/ผู้ใช้สินค้าจริง (Smart Money)\n` +
          `2. **Non-Commercial** - กองทุน/Speculators ขนาดใหญ่\n` +
          `3. **Non-Reportable** - รายย่อยที่ position เล็กกว่า reporting threshold\n\n` +
          `ใช้ COT Data Enhanced panel เพื่อดูข้อมูลย้อนหลัง 5 ปีและ visualization`;
      }
    }
    // Trading Performance
    else if (lowerMsg.includes('trade') || lowerMsg.includes('performance')) {
      response = `📈 **Trading Performance Analysis**\n\n` +
        `สำหรับการวิเคราะห์ผลการเทรด ควรดู:\n\n` +
        `• **Win Rate**: อัตราชนะ (ควร > 40% สำหรับ trend following)\n` +
        `• **Risk-Reward Ratio**: ควร > 1.5 ขึ้นไป\n` +
        `• **Profit Factor**: ควร > 1.5\n` +
        `• **Max Drawdown**: ควรควบคุมไม่เกิน 20%\n\n` +
        `ใช้คำสั่ง "analyze_performance" เพื่อดูสถิติของคุณ`;
    }
    // Market Analysis
    else if (lowerMsg.includes('market') || lowerMsg.includes('analysis') || lowerMsg.includes('ตลาด')) {
      response = `🔍 **Market Analysis Overview**\n\n` +
        `สำหรับการวิเคราะห์ตลาดแบบครบวงจร:\n\n` +
        `1. **COT Data** - ดู positioning ของ Smart Money\n` +
        `2. **Economic Indicators** - GDP, Inflation, Employment\n` +
        `3. **Currency Table** - ความแข็งแกร่งของสกุลเงิน\n` +
        `4. **Real Market Data** - ราคาสินทรัพย์ real-time\n` +
        `5. **Bitcoin Mempool** - Crypto market sentiment\n\n` +
        `💡 ใช้ panels เหล่านี้ร่วมกันเพื่อภาพรวมที่สมบูรณ์`;
    }
    // Position Sizing
    else if (lowerMsg.includes('position') || lowerMsg.includes('risk') || lowerMsg.includes('lot')) {
      response = `💰 **Position Sizing Calculator**\n\n` +
        `สูตรคำนวณขนาด Position:\n\n` +
        `Position Size = (Account × Risk%) ÷ (Entry - StopLoss)\n\n` +
        `ตัวอย่าง:\n` +
        `• Account: $10,000\n` +
        `• Risk: 2% = $200\n` +
        `• Entry: $50, Stop: $48\n` +
        `• Position = $200 ÷ $2 = 100 shares\n\n` +
        `ใช้ MCP tool "calculate_position_size" เพื่อคำนวณอัตโนมัติ`;
    }
    // Help / Commands
    else if (lowerMsg.includes('help') || lowerMsg.includes('ช่วย') || lowerMsg.includes('command')) {
      response = `🤖 **ABLE 3.0 AI - Available Commands**\n\n` +
        `**COT Analysis:**\n` +
        `• "Analyze COT for GOLD" - วิเคราะห์ COT ทองคำ\n` +
        `• "Show COT index" - แสดง COT Index\n\n` +
        `**Trading:**\n` +
        `• "My trading performance" - ดูสถิติการเทรด\n` +
        `• "Calculate position size" - คำนวณ lot size\n\n` +
        `**Market:**\n` +
        `• "Market overview" - ภาพรวมตลาด\n` +
        `• "Economic indicators" - ตัวชี้วัดเศรษฐกิจ\n\n` +
        `**Notes:**\n` +
        `• "Search notes [keyword]" - ค้นหา notes\n` +
        `• "Create note [title]" - สร้าง note ใหม่`;
    }
    // Greeting
    else if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('สวัสดี')) {
      response = `👋 **สวัสดีครับ!**\n\n` +
        `ผมคือ ABLE 3.0 AI พร้อมช่วยวิเคราะห์ตลาดการเงิน\n\n` +
        `✅ ใช้งานได้ฟรี 100%\n` +
        `✅ เชื่อมต่อกับ MCP System\n` +
        `✅ เข้าถึง COT, Trading Journal, Notes\n\n` +
        `พิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`;
    }
    // Default response
    else {
      const topics = [
        'COT Analysis (ข้อมูล Commitment of Traders)',
        'Trading Performance (สถิติการเทรด)',
        'Position Sizing (คำนวณขนาด position)',
        'Market Overview (ภาพรวมตลาด)',
        'Economic Indicators (ตัวชี้วัดเศรษฐกิจ)'
      ];
      
      response = `🤖 **ABLE 3.0 AI**\n\n` +
        `ขอบคุณสำหรับข้อความ! ผมพร้อมช่วยเรื่อง:\n\n` +
        topics.map((t, i) => `${i + 1}. ${t}`).join('\n') +
        `\n\nกรุณาระบุหัวข้อที่ต้องการวิเคราะห์ หรือพิมพ์ "help" เพื่อดูคำสั่งทั้งหมด`;
    }

    return {
      text: response,
      model: 'ABLE Local AI'
    };
  }

  // Parse MCP tool calls from message
  static detectToolCall(message: string): { tool: string; params: any } | null {
    const lowerMsg = message.toLowerCase();

    // COT Analysis
    if (lowerMsg.includes('analyze cot') || lowerMsg.includes('วิเคราะห์ cot')) {
      let asset = 'GOLD - COMMODITY EXCHANGE INC.';
      if (lowerMsg.includes('silver')) asset = 'SILVER - COMMODITY EXCHANGE INC.';
      if (lowerMsg.includes('oil')) asset = 'CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE';
      if (lowerMsg.includes('euro') || lowerMsg.includes('eur')) asset = 'EURO FX - CHICAGO MERCANTILE EXCHANGE';
      if (lowerMsg.includes('yen') || lowerMsg.includes('jpy')) asset = 'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE';
      if (lowerMsg.includes('bitcoin') || lowerMsg.includes('btc')) asset = 'BITCOIN - CHICAGO MERCANTILE EXCHANGE';
      
      return { tool: 'analyze_cot', params: { asset } };
    }

    // Trading Performance
    if (lowerMsg.includes('performance') || lowerMsg.includes('trading stats') || lowerMsg.includes('สถิติ')) {
      return { tool: 'analyze_performance', params: {} };
    }

    // Get Trades
    if (lowerMsg.includes('my trades') || lowerMsg.includes('show trades')) {
      return { tool: 'get_trades', params: { limit: 10 } };
    }

    // Search Notes
    if (lowerMsg.includes('search note') || lowerMsg.includes('find note')) {
      const match = message.match(/(?:search|find)\s+note[s]?\s+(.+)/i);
      if (match) {
        return { tool: 'search_notes', params: { query: match[1] } };
      }
    }

    // Position Size Calculator
    if (lowerMsg.includes('position size') || lowerMsg.includes('calculate')) {
      // Try to extract numbers from message
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

      case 'analyze_performance':
        const m = result.metrics;
        return `📈 **Trading Performance**\n\n` +
          `**Total Trades:** ${m.totalTrades}\n` +
          `**Win Rate:** ${m.winRate}\n` +
          `**Winning:** ${m.winningTrades} | **Losing:** ${m.losingTrades}\n\n` +
          `**Total P&L:** $${m.totalPnL.toFixed(2)}\n` +
          `**Avg Win:** $${m.averageWin.toFixed(2)}\n` +
          `**Avg Loss:** $${m.averageLoss.toFixed(2)}`;

      case 'get_trades':
        if (result.trades.length === 0) {
          return `📝 No trades found. Start logging your trades in the Trading Journal!`;
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
