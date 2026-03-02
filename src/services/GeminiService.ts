/**
 * GeminiService - Direct Gemini API access via Edge Function with multi-turn memory
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

const ABLE_AI_SYSTEM_PROMPT = `คุณคือ ABLE AI ผู้ช่วย AI สำหรับ Trading Platform ชื่อ ABLE Terminal
บุคลิก: ฉลาด ตรงประเด็น เป็นมิตร มีความเชี่ยวชาญด้านการเงินและการเทรด

กฎสำคัญ:
1. จำทุกสิ่งที่คุยกันในการสนทนานี้ และอ้างอิงถึงได้เสมอ
2. ห้ามพูดซ้ำสิ่งที่บอกไปแล้วในการสนทนาเดียวกัน
3. ถ้าผู้ใช้ถามต่อจากคำถามก่อน ให้เข้าใจ context และตอบต่อได้ทันที
4. ตอบตรงประเด็น กระชับ ไม่วกวน
5. ตอบภาษาเดียวกับผู้ใช้ (ไทย/อังกฤษ)
6. ถ้าไม่รู้ ให้บอกตรงๆ อย่าเดา

กฎ Screener สำคัญ:
- เมื่อผู้ใช้ต้องการหาหุ้น/สินทรัพย์ ให้ถามคำถามเพื่อจำกัดขอบเขตก่อนเสมอ:
  1. ประเภทสินทรัพย์? (หุ้น, คริปโต, Forex, พันธบัตร, Futures)
  2. ตลาด/ประเทศ? (เช่น อเมริกา, ไทย, ญี่ปุ่น)
  3. เป้าหมายการลงทุน? (เก็งกำไรระยะสั้น, ลงทุนระยะยาว, ปันผล)
  4. ระดับความเสี่ยง? (ต่ำ, กลาง, สูง)
  5. งบลงทุน? (ช่วยกรอง market cap)
  6. เงื่อนไขทางเทคนิค? (RSI, MACD, Volume, Moving Average)
  7. เงื่อนไขพื้นฐาน? (P/E, ROE, Margin, Dividend)
- ถามอย่างน้อย 3-4 คำถามก่อนรัน Screener
- พอได้ข้อมูลเพียงพอ ให้เลือก strategy preset หรือสร้าง custom filter ที่เหมาะสม
- แสดงผลลัพธ์พร้อมคำแนะนำว่าทำไมถึงเลือกสินทรัพย์เหล่านั้น`;

class GeminiServiceClass {
  /**
   * Check if Gemini is available
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Chat with Gemini — sends conversation history for multi-turn memory
   */
  async chat(
    message: string, 
    history: AIMessage[] = [], 
    systemPrompt?: string
  ): Promise<AIResponse> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('macro-ai-analysis', {
        body: {
          prompt: message,
          symbol: 'GENERAL',
          systemPrompt: systemPrompt || ABLE_AI_SYSTEM_PROMPT,
          history: history
            .filter(m => m.role !== 'system')
            .map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content
            }))
        }
      });

      if (error) {
        console.error('Gemini API error:', error);
        if (error.message?.includes('402') || error.message?.includes('credits exhausted')) {
          throw new Error('⚠️ AI Credits หมด - กรุณาเติมเครดิตที่ Settings → Workspace → Usage');
        }
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          throw new Error('⚠️ คำขอมากเกินไป - กรุณารอสักครู่แล้วลองใหม่');
        }
        throw new Error(error.message);
      }

      if (data?.error) {
        if (data.error.includes('credits exhausted') || data.error.includes('402')) {
          throw new Error('⚠️ AI Credits หมด - กรุณาเติมเครดิตที่ Settings → Workspace → Usage');
        }
        if (data.error.includes('rate limit') || data.error.includes('429')) {
          throw new Error('⚠️ คำขอมากเกินไป - กรุณารอสักครู่แล้วลองใหม่');
        }
        throw new Error(data.error);
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
        if (lowerMessage.includes(s)) { symbol = s; break; }
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
    
    // World Intelligence
    if (lowerMessage.includes('world') || lowerMessage.includes('โลก') || lowerMessage.includes('geopolitical') ||
        lowerMessage.includes('ภัยพิบัติ') || lowerMessage.includes('disaster')) {
      return { tool: 'get_world_intelligence', params: {} };
    }

    // Earthquakes
    if (lowerMessage.includes('earthquake') || lowerMessage.includes('แผ่นดินไหว')) {
      return { tool: 'get_global_map_data', params: { type: 'earthquakes' } };
    }

    // Theater posture
    if (lowerMessage.includes('theater') || lowerMessage.includes('ยุทธศาสตร์') || lowerMessage.includes('posture')) {
      return { tool: 'get_theater_posture', params: {} };
    }

    // Country instability
    if (lowerMessage.includes('instability') || lowerMessage.includes('cii') || lowerMessage.includes('ไม่เสถียร')) {
      return { tool: 'get_country_instability', params: {} };
    }

    // Screen/chart analysis
    if (lowerMessage.includes('วิเคราะห์กราฟ') || lowerMessage.includes('analyze chart') || 
        lowerMessage.includes('ดูหน้าจอ') || lowerMessage.includes('screenshot')) {
      return { tool: 'analyze_screen', params: { question: message } };
    }

    // Screener - Strategy-based scan
    if (lowerMessage.includes('top gainer') || lowerMessage.includes('หุ้นขึ้น')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'top_gainers', type: lowerMessage.includes('crypto') || lowerMessage.includes('คริปโต') ? 'crypto' : 'stock' } };
    }
    if (lowerMessage.includes('top loser') || lowerMessage.includes('หุ้นตก') || lowerMessage.includes('ร่วง')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'top_losers', type: 'stock' } };
    }
    if (lowerMessage.includes('oversold') || lowerMessage.includes('ราคาถูก') || lowerMessage.includes('rsi ต่ำ')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'oversold', type: lowerMessage.includes('forex') ? 'forex' : lowerMessage.includes('crypto') || lowerMessage.includes('คริปโต') ? 'crypto' : 'stock' } };
    }
    if (lowerMessage.includes('overbought') || lowerMessage.includes('rsi สูง')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'overbought', type: 'stock' } };
    }
    if (lowerMessage.includes('volume spike') || lowerMessage.includes('volume สูง') || lowerMessage.includes('วอลุ่มสูง')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'volume_spike', type: 'stock' } };
    }
    if (lowerMessage.includes('strong buy') || lowerMessage.includes('สัญญาณซื้อ')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'strong_buy', type: lowerMessage.includes('crypto') ? 'crypto' : lowerMessage.includes('forex') ? 'forex' : 'stock' } };
    }
    if (lowerMessage.includes('strong sell') || lowerMessage.includes('สัญญาณขาย')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'strong_sell', type: 'stock' } };
    }
    if (lowerMessage.includes('value stock') || lowerMessage.includes('หุ้นคุณค่า')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'value_stocks', type: 'stock' } };
    }
    if (lowerMessage.includes('growth stock') || lowerMessage.includes('หุ้นเติบโต')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'growth_stocks', type: 'stock' } };
    }
    if (lowerMessage.includes('dividend') || lowerMessage.includes('ปันผล')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'high_dividend', type: 'stock' } };
    }
    if (lowerMessage.includes('volatile') || lowerMessage.includes('ผันผวน')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'most_volatile', type: lowerMessage.includes('crypto') ? 'crypto' : 'stock' } };
    }
    if (lowerMessage.includes('golden cross')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'golden_cross', type: 'stock' } };
    }

    // Screener - Custom scan (generic screener keywords)
    if (lowerMessage.includes('scan') || lowerMessage.includes('screen') || lowerMessage.includes('สแกน') || 
        lowerMessage.includes('หาหุ้น') || lowerMessage.includes('หาสินทรัพย์') || lowerMessage.includes('ค้นหาหุ้น') ||
        lowerMessage.includes('screener') || lowerMessage.includes('filter') || lowerMessage.includes('กรอง')) {
      // Detect type
      let type = 'stock';
      if (lowerMessage.includes('crypto') || lowerMessage.includes('คริปโต') || lowerMessage.includes('เหรียญ')) type = 'crypto';
      else if (lowerMessage.includes('forex') || lowerMessage.includes('ค่าเงิน')) type = 'forex';
      else if (lowerMessage.includes('bond') || lowerMessage.includes('พันธบัตร')) type = 'bond';
      else if (lowerMessage.includes('futures') || lowerMessage.includes('สัญญาซื้อขาย')) type = 'futures';
      return { tool: 'scan_market', params: { type, limit: 20 } };
    }

    // Screener strategies list
    if (lowerMessage.includes('strategy') || lowerMessage.includes('กลยุทธ์') || lowerMessage.includes('preset')) {
      return { tool: 'get_screener_strategies', params: {} };
    }

    // Market Data
    if (lowerMessage.includes('market') || lowerMessage.includes('ราคา') || lowerMessage.includes('price')) {
      return { tool: 'get_market_overview', params: {} };
    }
    
    // News
    if (lowerMessage.includes('news') || lowerMessage.includes('ข่าว') || lowerMessage.includes('ล่าสุด')) {
      return { tool: 'get_latest_news', params: { limit: 15 } };
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
        if (result.metrics) {
          const m = result.metrics;
          return `📈 **Trading Performance**\n\n` +
            `• Total Trades: ${m.totalTrades}\n` +
            `• Win Rate: ${m.winRate}\n` +
            `• Total P&L: $${m.totalPnL}\n` +
            `• Avg Win: $${m.averageWin?.toFixed(2)}\n` +
            `• Avg Loss: $${m.averageLoss?.toFixed(2)}`;
        }
        return `📈 **Performance Data**\n${JSON.stringify(result, null, 2)}`;
      
      case 'calculate_position_size':
        return `🎯 **Position Size**\n\n${JSON.stringify(result.calculation, null, 2)}`;

      case 'get_world_intelligence':
        if (result.summary) {
          return `🌍 **World Intelligence**\n\n` +
            `• Disasters: ${result.summary.disasters}\n` +
            `• Earthquakes: ${result.summary.earthquakes}\n` +
            `• Protests: ${result.summary.protests}\n` +
            `• Fires: ${result.summary.fires}\n\n` +
            `${result.worldBrief || ''}`;
        }
        return `🌍 **World Data**\n${JSON.stringify(result, null, 2)}`;

      case 'get_global_map_data':
        if (result.earthquakes) {
          return `🌋 **แผ่นดินไหวล่าสุด**\n\n` +
            result.earthquakes.map((e: any) => `• M${e.magnitude} - ${e.place} (${e.time})`).join('\n');
        }
        return JSON.stringify(result, null, 2);

      case 'get_latest_news':
        if (result.news) {
          return `📰 **ข่าวล่าสุด (${result.totalFetched} ข่าว)**\n\n` +
            result.news.slice(0, 10).map((n: any) => 
              `• [${(n.sentiment || 'neutral').toUpperCase()}] ${n.title} (${n.source})`
            ).join('\n');
        }
        return `📰 **News**\n${JSON.stringify(result, null, 2)}`;

      case 'analyze_screen':
        return `📸 **Screen Analysis**\n\n${result.analysis || JSON.stringify(result, null, 2)}`;
      
      case 'get_market_overview':
        return `📊 **Market Overview**\n\n${JSON.stringify(result.markets || result, null, 2)}`;

      case 'scan_market':
      case 'run_screener_strategy': {
        if (!result.data || result.data.length === 0) {
          return `📋 **Screener** — ไม่พบสินทรัพย์ตามเงื่อนไข`;
        }
        const stratLabel = result.strategy ? `${result.strategy.label} — ${result.strategy.description}` : `${result.type} scan`;
        const header = `📋 **Screener: ${stratLabel}**\n` +
          `📊 พบ ${result.resultCount}/${result.totalCount} รายการ${result.fallback ? ' (fallback data)' : ''}\n\n`;
        const rows = result.data.slice(0, 25).map((item: any, i: number) => {
          const sym = item.symbol || item.name || '?';
          const desc = item.description || '';
          const price = item.close != null ? `$${item.close}` : '';
          const chg = item.change != null ? `${item.change > 0 ? '+' : ''}${item.change}%` : '';
          const rsi = item.RSI != null ? `RSI:${item.RSI}` : '';
          const rec = item['Recommend.All'] != null ? `Rating:${Number(item['Recommend.All']).toFixed(2)}` : '';
          const vol = item.volume != null ? `Vol:${(item.volume / 1e6).toFixed(1)}M` : '';
          const mcap = item.market_cap_basic != null ? `MCap:${(item.market_cap_basic / 1e9).toFixed(1)}B` : '';
          return `${i + 1}. **${sym}** ${desc} | ${price} ${chg} ${rsi} ${rec} ${vol} ${mcap}`.trim();
        }).join('\n');
        return header + rows;
      }

      case 'get_screener_strategies': {
        if (!result.strategies) return JSON.stringify(result, null, 2);
        return `📋 **Strategy Presets (${result.total})**\n\n` +
          result.strategies.map((s: any) => `${s.emoji} **${s.label}** (${s.id}) — ${s.description} [${s.screeners.join(',')}]`).join('\n');
      }

      case 'get_screener_fields': {
        if (!result.fields) return JSON.stringify(result, null, 2);
        return `📋 **Screener Fields (${result.totalFields})**\n\n` +
          `**Categories:** ${result.categories?.map((c: any) => `${c.icon} ${c.label}`).join(' | ')}\n\n` +
          result.fields.slice(0, 30).map((f: any) => `• \`${f.name}\` — ${f.label} (${f.format})`).join('\n');
      }

      case 'get_available_markets': {
        return `🌍 **ตลาดที่รองรับ (${result.totalCountries} ประเทศ, ${result.totalCryptoExchanges} Crypto Exchanges)**\n\n` +
          `**หุ้น:** ${result.stockMarkets?.slice(0, 20).map((m: any) => `${m.flag} ${m.label}`).join(', ')}...\n\n` +
          `**Crypto:** ${result.cryptoExchanges?.map((e: any) => e.label).join(', ')}`;
      }

      default:
        return JSON.stringify(result, null, 2);
    }
  }
}

export const GeminiService = new GeminiServiceClass();
