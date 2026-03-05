import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches comprehensive data from TOP NEWS system for ABLE AI context
 */
export async function fetchTopNewsContext(query: string): Promise<string> {
  const lowerQuery = query.toLowerCase();
  const parts: string[] = [];

  try {
    // 1. Fetch latest news from aggregator
    if (lowerQuery.includes('ข่าว') || lowerQuery.includes('news') || lowerQuery.includes('macro') || 
        lowerQuery.includes('สรุป') || lowerQuery.includes('overview') || lowerQuery.includes('ตลาด') ||
        lowerQuery.includes('market') || lowerQuery.includes('วิเคราะห์') || !hasSpecificTopic(lowerQuery)) {
      try {
        const { data: newsData } = await supabase.functions.invoke('news-aggregator', {
          body: { action: 'fetch_all' }
        });
        if (newsData?.news?.length) {
          const topNews = newsData.news.slice(0, 15).map((n: any, i: number) => 
            `${i + 1}. [${n.source}] ${n.title} ${n.sentiment ? `(${n.sentiment})` : ''}`
          ).join('\n');
          parts.push(`📰 ข่าวล่าสุด (${newsData.news.length} items):\n${topNews}`);
        }
        if (newsData?.analysis) {
          parts.push(`🧠 AI Macro Analysis:\n${JSON.stringify(newsData.analysis).slice(0, 800)}`);
        }
      } catch (e) {
        console.warn('News fetch failed:', e);
      }
    }

    // 2. Fetch pinned asset prices
    if (lowerQuery.includes('ราคา') || lowerQuery.includes('price') || lowerQuery.includes('gold') ||
        lowerQuery.includes('ทอง') || lowerQuery.includes('btc') || lowerQuery.includes('bitcoin') ||
        lowerQuery.includes('forex') || lowerQuery.includes('usd')) {
      try {
        const { data: marketData } = await supabase
          .from('market_data')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(20);
        
        if (marketData?.length) {
          const prices = marketData.map((m: any) => 
            `${m.symbol}: ${m.price} (${m.change_percent ? (m.change_percent > 0 ? '+' : '') + m.change_percent.toFixed(2) + '%' : 'N/A'})`
          ).join('\n');
          parts.push(`💰 Market Prices:\n${prices}`);
        }
      } catch (e) {
        console.warn('Market data fetch failed:', e);
      }
    }

    // 3. Fetch sentiment data
    if (lowerQuery.includes('sentiment') || lowerQuery.includes('อารมณ์') || lowerQuery.includes('ความรู้สึก')) {
      try {
        const { data: sentimentData } = await supabase
          .from('sentiment_data')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(10);
        
        if (sentimentData?.length) {
          const sentiments = sentimentData.map((s: any) => 
            `${s.keyword}: score=${s.sentiment_score?.toFixed(2)} mentions=${s.mentions} (${s.source})`
          ).join('\n');
          parts.push(`📊 Sentiment Data:\n${sentiments}`);
        }
      } catch (e) {
        console.warn('Sentiment fetch failed:', e);
      }
    }

    // 4. Fetch news history from DB
    if (lowerQuery.includes('ประวัติ') || lowerQuery.includes('history') || lowerQuery.includes('trend')) {
      try {
        const { data: newsHistory } = await supabase
          .from('news_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (newsHistory?.length) {
          const history = newsHistory.map((n: any) => 
            `[${n.source}] ${n.title} - ${n.sentiment || 'neutral'} ${n.importance ? `(${n.importance})` : ''}`
          ).join('\n');
          parts.push(`📜 News History:\n${history}`);
        }
      } catch (e) {
        console.warn('News history fetch failed:', e);
      }
    }

    // 5. Fetch alerts
    if (lowerQuery.includes('alert') || lowerQuery.includes('แจ้งเตือน') || lowerQuery.includes('warning')) {
      try {
        const { data: alerts } = await supabase
          .from('alerts')
          .select('*')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (alerts?.length) {
          const alertList = alerts.map((a: any) => 
            `⚠️ [${a.severity}] ${a.title}: ${a.message}`
          ).join('\n');
          parts.push(`🚨 Active Alerts:\n${alertList}`);
        }
      } catch (e) {
        console.warn('Alerts fetch failed:', e);
      }
    }

    // 6. Gemini deep analysis (on-demand for heavy queries)
    if (lowerQuery.includes('deep') || lowerQuery.includes('ลึก') || lowerQuery.includes('report') || 
        lowerQuery.includes('รายงาน') || lowerQuery.includes('daily report')) {
      try {
        const { data: reportData } = await supabase.functions.invoke('gemini-daily-report', {
          body: { type: 'quick_summary' }
        });
        if (reportData?.report) {
          parts.push(`📋 Daily Report Summary:\n${typeof reportData.report === 'string' ? reportData.report.slice(0, 1000) : JSON.stringify(reportData.report).slice(0, 1000)}`);
        }
      } catch (e) {
        console.warn('Daily report fetch failed:', e);
      }
    }

  } catch (error) {
    console.error('TopNews context fetch error:', error);
  }

  return parts.length > 0 
    ? `\n--- TOP NEWS Intelligence ---\n${parts.join('\n\n')}\n--- End TOP NEWS ---\n`
    : '';
}

function hasSpecificTopic(query: string): boolean {
  return /งบการเงิน|financial|screener|หาหุ้น|เทรด|trade|chart|กราฟ|code|pine/i.test(query);
}
