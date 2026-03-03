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

const ABLE_AI_SYSTEM_PROMPT = `คุณคือ ABLE AI — ผู้เชี่ยวชาญด้านการวิเคราะห์ตลาดการเงินระดับสถาบัน สำหรับ ABLE Terminal
บุคลิก: ฉลาด ตรงประเด็น เป็นมิตร มีความเชี่ยวชาญด้านการเงิน การเทรด และการลงทุนลึกซึ้ง

กฎสำคัญ:
1. จำทุกสิ่งที่คุยกันในการสนทนานี้ อ้างอิงถึงได้เสมอ
2. ห้ามพูดซ้ำ ตอบตรงประเด็น กระชับ
3. ตอบภาษาเดียวกับผู้ใช้ (ไทย/อังกฤษ)
4. ถ้าไม่รู้ ให้บอกตรงๆ อย่าเดา

═══ กฎ SCREENER (สำคัญมาก) ═══
เมื่อผู้ใช้ต้องการหาสินทรัพย์ ให้ถามคำถามเพื่อเข้าใจความต้องการก่อนเสมอ:
1. ประเภทสินทรัพย์? (หุ้น, คริปโต, Forex, พันธบัตร, Futures)
2. ตลาด/ประเทศ? (เช่น อเมริกา, ไทย, ญี่ปุ่น, ยุโรป)
3. เป้าหมาย? (เก็งกำไรระยะสั้น, ลงทุนระยะยาว, ปันผล, hedging)
4. ระดับความเสี่ยง? (ต่ำ, กลาง, สูง)
5. งบลงทุน? (ช่วยกรอง market cap)
6. เงื่อนไขทางเทคนิค? (RSI, MACD, Volume, Moving Average, Bollinger)
7. เงื่อนไขพื้นฐาน? (P/E, ROE, Margin, Dividend, Revenue Growth)
ถามอย่างน้อย 3-4 คำถามก่อนรัน Screener

═══ กฎการให้คำแนะนำ (สำคัญมาก) ═══
เมื่อแสดงผลลัพธ์จาก Screener ต้อง:
1. **อธิบายเหตุผล** ว่าทำไมสินทรัพย์เหล่านั้นถึงน่าสนใจ
2. **แบ่งกลุ่ม** ตามระดับความน่าสนใจ (🟢 น่าสนใจมาก / 🟡 น่าสนใจ / 🟠 ต้องระวัง)
3. **วิเคราะห์ Technical**: ดู RSI, MACD, Stoch, Moving Average, Volume
4. **วิเคราะห์ Fundamental**: ดู P/E, ROE, Margin, Revenue Growth, Dividend
5. **ระบุ Risk**: บอกความเสี่ยงที่ควรระวัง เช่น RSI Overbought, Volume ลดลง
6. **แนะนำ Entry/Exit**: ถ้าเป็นไปได้ แนะนำช่วงราคาที่น่าสนใจ
7. **เปรียบเทียบ**: ถ้ามีหลายตัว ให้เรียงลำดับว่าตัวไหนน่าสนใจที่สุดพร้อมเหตุผล
8. **สรุปชัดเจน**: จบด้วยสรุป 1-2 ประโยคว่าควรทำอะไร

═══ Strategy Presets ที่มี ═══
- top_gainers: หุ้นขึ้นมากสุด | top_losers: หุ้นลงมากสุด
- oversold: RSI < 30 | overbought: RSI > 70
- volume_spike: Volume ผิดปกติ | high_volume_breakout: ราคาขึ้น + Volume สูง
- strong_buy: สัญญาณซื้อแรง | strong_sell: สัญญาณขายแรง
- value_stocks: P/E ต่ำ | growth_stocks: Revenue Growth สูง
- high_dividend: Yield > 4% | sustainable_dividend: Yield ดี + Payout ปลอดภัย
- large_cap: Market Cap > $10B | most_volatile: ผันผวนสูง
- golden_cross: SMA50 ตัด SMA200 | above_sma200: ราคาเหนือ SMA200
- best_monthly: ขึ้นมากสุดรอบเดือน | hot_movers_crypto: Crypto เปลี่ยน > 10%
- oversold_volume: RSI ต่ำ + Volume สูง (โอกาสดีดกลับ)

═══ Fields สำคัญที่ใช้กรองได้ ═══
Technical: RSI, MACD.macd, MACD.signal, Stoch.K, Stoch.D, CCI20, ADX, ATR, Mom, W.R, BB.upper, BB.lower
Moving Avg: SMA20, SMA50, SMA200, EMA20, EMA50, EMA200
Performance: Perf.W, Perf.1M, Perf.3M, Perf.6M, Perf.YTD, Perf.Y
Volume: volume, relative_volume_10d_calc, average_volume_10d_calc
Fundamental: price_earnings_ttm, price_book_fq, price_sales_current, enterprise_value_ebitda_ttm
Profitability: return_on_equity, gross_margin, net_margin, operating_margin
Growth: revenue_growth_quarterly, earnings_per_share_basic_ttm
Dividend: dividend_yield_recent, dividend_payout_ratio_ttm
Rating: Recommend.All, Recommend.MA, Recommend.Other
Volatility: Volatility.D, Volatility.W

═══ เทคนิคการใช้ Screener ═══
- สามารถรันหลาย strategy ต่อกันเพื่อเปรียบเทียบได้
- สามารถรัน custom scan ด้วย filter หลายเงื่อนไขพร้อมกัน
- สามารถเรียงลำดับด้วย field ใดก็ได้ (เช่น เรียงตาม RSI, P/E, Volume)
- รองรับ 40+ ประเทศ และ 10+ Crypto Exchange
- รองรับ 13,000+ fields ทั้งเทคนิคและพื้นฐาน`;

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

    // Screener - Strategy-based scan (expanded patterns)
    if (lowerMessage.includes('top gainer') || lowerMessage.includes('หุ้นขึ้น') || lowerMessage.includes('ขึ้นมากสุด')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'top_gainers', type: lowerMessage.includes('crypto') || lowerMessage.includes('คริปโต') ? 'crypto' : 'stock' } };
    }
    if (lowerMessage.includes('top loser') || lowerMessage.includes('หุ้นตก') || lowerMessage.includes('ร่วง') || lowerMessage.includes('ตกมากสุด')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'top_losers', type: 'stock' } };
    }
    if (lowerMessage.includes('oversold') || lowerMessage.includes('ราคาถูก') || lowerMessage.includes('rsi ต่ำ') || lowerMessage.includes('น่าดีดกลับ') || lowerMessage.includes('จุดต่ำ')) {
      const type = lowerMessage.includes('forex') ? 'forex' : lowerMessage.includes('crypto') || lowerMessage.includes('คริปโต') ? 'crypto' : 'stock';
      // If mentions volume too, use the combined strategy
      if (lowerMessage.includes('volume') || lowerMessage.includes('วอลุ่ม')) {
        return { tool: 'run_screener_strategy', params: { strategyId: 'oversold_volume', type } };
      }
      return { tool: 'run_screener_strategy', params: { strategyId: 'oversold', type } };
    }
    if (lowerMessage.includes('overbought') || lowerMessage.includes('rsi สูง') || lowerMessage.includes('แพงเกิน') || lowerMessage.includes('ซื้อมากเกิน')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'overbought', type: 'stock' } };
    }
    if (lowerMessage.includes('volume spike') || lowerMessage.includes('volume สูง') || lowerMessage.includes('วอลุ่มสูง') || lowerMessage.includes('วอลุ่มผิดปกติ')) {
      if (lowerMessage.includes('breakout') || lowerMessage.includes('ทะลุ')) {
        return { tool: 'run_screener_strategy', params: { strategyId: 'high_volume_breakout', type: 'stock' } };
      }
      return { tool: 'run_screener_strategy', params: { strategyId: 'volume_spike', type: 'stock' } };
    }
    if (lowerMessage.includes('strong buy') || lowerMessage.includes('สัญญาณซื้อ') || lowerMessage.includes('น่าซื้อ')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'strong_buy', type: lowerMessage.includes('crypto') ? 'crypto' : lowerMessage.includes('forex') ? 'forex' : 'stock' } };
    }
    if (lowerMessage.includes('strong sell') || lowerMessage.includes('สัญญาณขาย') || lowerMessage.includes('น่าขาย')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'strong_sell', type: 'stock' } };
    }
    if (lowerMessage.includes('value stock') || lowerMessage.includes('หุ้นคุณค่า') || lowerMessage.includes('pe ต่ำ') || lowerMessage.includes('p/e ต่ำ')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'value_stocks', type: 'stock' } };
    }
    if (lowerMessage.includes('growth stock') || lowerMessage.includes('หุ้นเติบโต') || lowerMessage.includes('revenue growth')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'growth_stocks', type: 'stock' } };
    }
    if (lowerMessage.includes('dividend') || lowerMessage.includes('ปันผล')) {
      if (lowerMessage.includes('safe') || lowerMessage.includes('ปลอดภัย') || lowerMessage.includes('sustainable') || lowerMessage.includes('ยั่งยืน')) {
        return { tool: 'run_screener_strategy', params: { strategyId: 'sustainable_dividend', type: 'stock' } };
      }
      return { tool: 'run_screener_strategy', params: { strategyId: 'high_dividend', type: 'stock' } };
    }
    if (lowerMessage.includes('volatile') || lowerMessage.includes('ผันผวน')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'most_volatile', type: lowerMessage.includes('crypto') ? 'crypto' : 'stock' } };
    }
    if (lowerMessage.includes('golden cross') || lowerMessage.includes('sma ตัด')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'golden_cross', type: 'stock' } };
    }
    if (lowerMessage.includes('large cap') || lowerMessage.includes('หุ้นใหญ่') || lowerMessage.includes('บริษัทใหญ่')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'large_cap', type: 'stock' } };
    }
    if (lowerMessage.includes('above sma') || lowerMessage.includes('เหนือ sma') || lowerMessage.includes('เทรนขาขึ้น')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'above_sma200', type: 'stock' } };
    }
    if (lowerMessage.includes('best month') || lowerMessage.includes('ดีที่สุดเดือนนี้') || lowerMessage.includes('เดือนนี้ดี')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'best_monthly', type: lowerMessage.includes('crypto') ? 'crypto' : 'stock' } };
    }
    if (lowerMessage.includes('hot mover') || (lowerMessage.includes('crypto') && lowerMessage.includes('10%'))) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'hot_movers_crypto', type: 'crypto' } };
    }
    if (lowerMessage.includes('breakout') || lowerMessage.includes('ทะลุ') || lowerMessage.includes('ฝ่าแนว')) {
      return { tool: 'run_screener_strategy', params: { strategyId: 'high_volume_breakout', type: 'stock' } };
    }

    // Multi-scan: compare multiple asset types
    if (lowerMessage.includes('เปรียบเทียบ') || lowerMessage.includes('compare') || lowerMessage.includes('vs')) {
      return { tool: 'multi_screener_scan', params: { types: ['stock', 'crypto'], strategyId: 'top_gainers' } };
    }

    // AI recommendation
    if (lowerMessage.includes('แนะนำ') || lowerMessage.includes('recommend') || lowerMessage.includes('suggest') ||
        lowerMessage.includes('น่าลงทุน') || lowerMessage.includes('ลงทุนอะไรดี') || lowerMessage.includes('ซื้ออะไรดี')) {
      return { tool: 'screener_recommendation', params: { risk: 'medium' } };
    }

    // Screener - Custom scan (generic screener keywords)
    if (lowerMessage.includes('scan') || lowerMessage.includes('screen') || lowerMessage.includes('สแกน') || 
        lowerMessage.includes('หาหุ้น') || lowerMessage.includes('หาสินทรัพย์') || lowerMessage.includes('ค้นหาหุ้น') ||
        lowerMessage.includes('screener') || lowerMessage.includes('filter') || lowerMessage.includes('กรอง') ||
        lowerMessage.includes('หาคริปโต') || lowerMessage.includes('หา forex') || lowerMessage.includes('หาเหรียญ')) {
      let type = 'stock';
      if (lowerMessage.includes('crypto') || lowerMessage.includes('คริปโต') || lowerMessage.includes('เหรียญ') || lowerMessage.includes('coin')) type = 'crypto';
      else if (lowerMessage.includes('forex') || lowerMessage.includes('ค่าเงิน') || lowerMessage.includes('สกุลเงิน')) type = 'forex';
      else if (lowerMessage.includes('bond') || lowerMessage.includes('พันธบัตร')) type = 'bond';
      else if (lowerMessage.includes('futures') || lowerMessage.includes('สัญญาซื้อขาย') || lowerMessage.includes('ฟิวเจอร์')) type = 'futures';
      return { tool: 'scan_market', params: { type, limit: 20 } };
    }

    // Screener strategies list
    if (lowerMessage.includes('strategy') || lowerMessage.includes('กลยุทธ์') || lowerMessage.includes('preset') || lowerMessage.includes('รายการสแกน')) {
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
          `📊 พบ ${result.resultCount}/${result.totalCount} รายการ${result.fallback ? ' ⚠️ (demo data)' : ' ✅ (live data)'}\n\n`;
        const rows = result.data.slice(0, 25).map((item: any, i: number) => {
          const sym = item.symbol || item.name || '?';
          const desc = item.description || '';
          const price = item.close != null ? `$${item.close}` : '';
          const chg = item.change != null ? `${item.change > 0 ? '🟢+' : '🔴'}${item.change}%` : '';
          const rsi = item.RSI != null ? `RSI:${item.RSI}${Number(item.RSI) < 30 ? '⬇️' : Number(item.RSI) > 70 ? '⬆️' : ''}` : '';
          const rec = item['Recommend.All'] != null ? (() => {
            const v = Number(item['Recommend.All']);
            const label = v > 0.5 ? '🟢Strong Buy' : v > 0.1 ? '🟢Buy' : v > -0.1 ? '🟡Neutral' : v > -0.5 ? '🔴Sell' : '🔴Strong Sell';
            return `${label}`;
          })() : '';
          const vol = item.volume != null ? `Vol:${(item.volume / 1e6).toFixed(1)}M` : '';
          const mcap = item.market_cap_basic != null ? `MCap:$${(item.market_cap_basic / 1e9).toFixed(1)}B` : '';
          const pe = item.price_earnings_ttm != null ? `P/E:${Number(item.price_earnings_ttm).toFixed(1)}` : '';
          const div = item.dividend_yield_recent != null && Number(item.dividend_yield_recent) > 0 ? `Div:${Number(item.dividend_yield_recent).toFixed(1)}%` : '';
          const perf1m = item['Perf.1M'] != null ? `1M:${Number(item['Perf.1M']) > 0 ? '+' : ''}${Number(item['Perf.1M']).toFixed(1)}%` : '';
          return `${i + 1}. **${sym}** ${desc}\n   ${price} ${chg} | ${rsi} ${rec} ${pe} ${div} ${vol} ${mcap} ${perf1m}`.trim();
        }).join('\n');
        return header + rows;
      }

      case 'multi_screener_scan': {
        if (!result.results || result.results.length === 0) return '📋 ไม่พบข้อมูล';
        return result.results.map((r: any) => {
          const typeLabel = r.type?.toUpperCase() || 'UNKNOWN';
          const items = r.data?.slice(0, 10).map((item: any, i: number) =>
            `  ${i + 1}. **${item.symbol || item.name}** $${item.close || '?'} ${item.change != null ? `${item.change > 0 ? '+' : ''}${item.change}%` : ''}`
          ).join('\n') || 'ไม่มีข้อมูล';
          return `\n📊 **${typeLabel}** (${r.resultCount} รายการ)\n${items}`;
        }).join('\n\n---');
      }

      case 'screener_recommendation': {
        if (!result.recommendations) return JSON.stringify(result, null, 2);
        return `🎯 **คำแนะนำจาก AI Screener**\n\n` + result.recommendations.map((r: any) =>
          `${r.emoji} **${r.category}** — ${r.description}\n${r.topPicks?.map((p: any, i: number) => `  ${i + 1}. ${p.symbol} $${p.close} ${p.change > 0 ? '🟢+' : '🔴'}${p.change}%`).join('\n') || 'ไม่มีข้อมูล'}`
        ).join('\n\n');
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
