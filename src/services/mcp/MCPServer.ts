// MCP (Model Context Protocol) Server - Central hub for AI tool access

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  handler: (params: any) => Promise<any>;
}

export class MCPServer {
  private tools: Map<string, MCPTool> = new Map();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.registerCOTTools();
    this.registerTradingTools();
    this.registerNoteTools();
    this.registerMarketTools();
    this.registerWorldMonitorTools();
    this.registerOpenClawTools();
    this.registerNewsTools();

    this.isInitialized = true;
    console.log('MCP Server initialized with', this.tools.size, 'tools');
  }

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return await tool.handler(params);
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getToolsList(): { name: string; description: string }[] {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description
    }));
  }

  private async fetchCOTData(asset: string, startDate: Date, endDate: Date) {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    const apiUrl = `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?` +
      `$where=market_and_exchange_names like '%25${encodeURIComponent(asset)}%25' AND ` +
      `report_date_as_yyyy_mm_dd between '${start}' and '${end}'&` +
      `$order=report_date_as_yyyy_mm_dd ASC&$limit=500`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('CFTC API error');
      const data = await response.json();

      return data.map((item: any) => ({
        date: item.report_date_as_yyyy_mm_dd,
        asset: item.market_and_exchange_names,
        commercialLong: parseInt(item.comm_positions_long_all || 0),
        commercialShort: parseInt(item.comm_positions_short_all || 0),
        commercialNet: parseInt(item.comm_positions_long_all || 0) - parseInt(item.comm_positions_short_all || 0),
        nonCommercialLong: parseInt(item.noncomm_positions_long_all || 0),
        nonCommercialShort: parseInt(item.noncomm_positions_short_all || 0),
        nonCommercialNet: parseInt(item.noncomm_positions_long_all || 0) - parseInt(item.noncomm_positions_short_all || 0),
        nonReportableLong: parseInt(item.nonrept_positions_long_all || 0),
        nonReportableShort: parseInt(item.nonrept_positions_short_all || 0),
        nonReportableNet: parseInt(item.nonrept_positions_long_all || 0) - parseInt(item.nonrept_positions_short_all || 0),
        openInterest: parseInt(item.open_interest_all || 0),
        change: parseFloat(item.change_in_open_interest_all || 0)
      }));
    } catch (error) {
      console.error('COT fetch error:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════
  // COT Tools
  // ═══════════════════════════════════════════
  private registerCOTTools(): void {
    this.registerTool({
      name: 'get_cot_data',
      description: 'Get Commitment of Traders (COT) data for a specific asset',
      inputSchema: {
        type: 'object',
        properties: {
          asset: { type: 'string', description: 'Asset name (e.g., "GOLD")' },
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
        },
        required: ['asset']
      },
      handler: async (params) => {
        const { asset, startDate, endDate } = params;
        const start = startDate ? new Date(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
        const end = endDate ? new Date(endDate) : new Date();
        const data = await this.fetchCOTData(asset, start, end);
        return { success: true, data: data.slice(-10), count: data.length, latest: data[data.length - 1] };
      }
    });

    this.registerTool({
      name: 'analyze_cot',
      description: 'Analyze COT data and provide insights',
      inputSchema: { type: 'object', properties: { asset: { type: 'string' } }, required: ['asset'] },
      handler: async (params) => {
        const data = await this.fetchCOTData(params.asset, new Date(new Date().setFullYear(new Date().getFullYear() - 1)), new Date());
        if (!data || data.length === 0) return { success: false, error: 'No data available' };
        const latest = data[data.length - 1];
        const nets = data.map((d: any) => d.nonCommercialNet);
        const min = Math.min(...nets);
        const max = Math.max(...nets);
        const cotIndex = max === min ? 50 : ((latest.nonCommercialNet - min) / (max - min)) * 100;
        return {
          success: true,
          analysis: {
            cotIndex, sentiment: cotIndex > 70 ? 'Extremely Bullish' : cotIndex > 50 ? 'Bullish' : cotIndex < 30 ? 'Extremely Bearish' : 'Bearish',
            largeTraders: { net: latest.nonCommercialNet, direction: latest.nonCommercialNet > 0 ? 'Long' : 'Short' },
            commercial: { net: latest.commercialNet, direction: latest.commercialNet > 0 ? 'Long' : 'Short' },
            openInterest: latest.openInterest,
            interpretation: this.interpretCOT(cotIndex, latest)
          }
        };
      }
    });

    this.registerTool({
      name: 'get_cot_assets',
      description: 'Get list of available COT assets',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => ({
        success: true,
        assets: [
          'GOLD - COMMODITY EXCHANGE INC.', 'SILVER - COMMODITY EXCHANGE INC.',
          'CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE', 'EURO FX - CHICAGO MERCANTILE EXCHANGE',
          'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE', 'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE',
          'E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE', 'BITCOIN - CHICAGO MERCANTILE EXCHANGE'
        ]
      })
    });
  }

  // ═══════════════════════════════════════════
  // Trading Tools
  // ═══════════════════════════════════════════
  private registerTradingTools(): void {
    this.registerTool({
      name: 'get_trades',
      description: 'Get user trading history',
      inputSchema: { type: 'object', properties: { limit: { type: 'number' } }, required: [] },
      handler: async (params) => {
        const trades = JSON.parse(localStorage.getItem('trades') || '[]');
        return { success: true, trades: trades.slice(0, params.limit || 10), total: trades.length };
      }
    });

    this.registerTool({
      name: 'analyze_performance',
      description: 'Analyze trading performance metrics',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => {
        const trades = JSON.parse(localStorage.getItem('trades') || '[]');
        const winning = trades.filter((t: any) => (t.pnl || 0) > 0);
        const losing = trades.filter((t: any) => (t.pnl || 0) < 0);
        const totalPnL = trades.reduce((s: number, t: any) => s + (t.pnl || 0), 0);
        return {
          success: true,
          metrics: {
            totalTrades: trades.length, winningTrades: winning.length, losingTrades: losing.length,
            winRate: trades.length > 0 ? ((winning.length / trades.length) * 100).toFixed(2) + '%' : '0%',
            totalPnL,
            averageWin: winning.length > 0 ? winning.reduce((s: number, t: any) => s + (t.pnl || 0), 0) / winning.length : 0,
            averageLoss: losing.length > 0 ? losing.reduce((s: number, t: any) => s + Math.abs(t.pnl || 0), 0) / losing.length : 0
          }
        };
      }
    });

    this.registerTool({
      name: 'add_trade',
      description: 'Add a new trade to the journal',
      inputSchema: {
        type: 'object',
        properties: {
          symbol: { type: 'string' }, direction: { type: 'string' },
          entryPrice: { type: 'number' }, exitPrice: { type: 'number' }, quantity: { type: 'number' }
        },
        required: ['symbol', 'direction', 'entryPrice']
      },
      handler: async (params) => {
        const trades = JSON.parse(localStorage.getItem('trades') || '[]');
        const newTrade = {
          id: Date.now().toString(), ...params, createdAt: new Date().toISOString(),
          pnl: params.exitPrice && params.quantity
            ? (params.exitPrice - params.entryPrice) * params.quantity * (params.direction === 'Long' ? 1 : -1) : 0
        };
        trades.push(newTrade);
        localStorage.setItem('trades', JSON.stringify(trades));
        return { success: true, trade: newTrade };
      }
    });
  }

  // ═══════════════════════════════════════════
  // Note Tools
  // ═══════════════════════════════════════════
  private registerNoteTools(): void {
    this.registerTool({
      name: 'search_notes',
      description: 'Search user notes by title or content',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      handler: async (params) => {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const results = notes.filter((n: any) =>
          n.title?.toLowerCase().includes(params.query.toLowerCase()) ||
          n.content?.toLowerCase().includes(params.query.toLowerCase())
        );
        return { success: true, notes: results, count: results.length };
      }
    });

    this.registerTool({
      name: 'create_note',
      description: 'Create a new note',
      inputSchema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] },
      handler: async (params) => {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const newNote = { id: Date.now().toString(), title: params.title, content: params.content, createdAt: new Date().toISOString() };
        notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        return { success: true, note: newNote };
      }
    });
  }

  // ═══════════════════════════════════════════
  // Market Tools
  // ═══════════════════════════════════════════
  private registerMarketTools(): void {
    this.registerTool({
      name: 'get_market_overview',
      description: 'Get current market overview and sentiment',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => {
        const cached = localStorage.getItem('market_data_cache');
        if (cached) { try { return { success: true, ...JSON.parse(cached) }; } catch {} }
        return {
          success: true,
          markets: { crypto: { btc: 'N/A', eth: 'N/A' }, forex: { eurusd: 'N/A', usdjpy: 'N/A' }, commodities: { gold: 'N/A', oil: 'N/A' } },
          lastUpdate: new Date().toISOString()
        };
      }
    });

    this.registerTool({
      name: 'calculate_position_size',
      description: 'Calculate optimal position size based on risk parameters',
      inputSchema: {
        type: 'object',
        properties: {
          accountSize: { type: 'number' }, riskPercent: { type: 'number' },
          entryPrice: { type: 'number' }, stopLoss: { type: 'number' }
        },
        required: ['accountSize', 'riskPercent', 'entryPrice', 'stopLoss']
      },
      handler: async (params) => {
        const { accountSize, riskPercent, entryPrice, stopLoss } = params;
        const riskAmount = accountSize * (riskPercent / 100);
        const riskPerUnit = Math.abs(entryPrice - stopLoss);
        const positionSize = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0;
        return {
          success: true,
          calculation: { accountSize, riskPercent, riskAmount, entryPrice, stopLoss, riskPerUnit, positionSize: Math.floor(positionSize), totalValue: Math.floor(positionSize) * entryPrice }
        };
      }
    });
  }

  // ═══════════════════════════════════════════
  // World Monitor Tools
  // ═══════════════════════════════════════════
  private registerWorldMonitorTools(): void {
    this.registerTool({
      name: 'get_world_intelligence',
      description: 'ดึงข้อมูลข่าวกรองโลก: ภัยพิบัติ แผ่นดินไหว ไฟป่า ประท้วง อินเทอร์เน็ตขัดข้อง พร้อม AI World Brief',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => {
        try {
          const { worldMonitorService } = await import('@/services/WorldMonitorService');
          const data = await worldMonitorService.fetchIntelligence();
          return {
            success: true, worldBrief: data.worldBrief,
            summary: { disasters: data.disasters.length, earthquakes: data.earthquakes.length, eonet: data.eonet.length, protests: data.protests.length, fires: data.fires.length, outages: data.outages.length },
            timestamp: data.timestamp, sources: data.sources,
            topDisasters: data.disasters.slice(0, 5),
            topEarthquakes: data.earthquakes.sort((a: any, b: any) => (b.mag || 0) - (a.mag || 0)).slice(0, 5),
            topProtests: data.protests.slice(0, 5),
          };
        } catch { return { success: false, error: 'Failed to fetch world intelligence' }; }
      }
    });

    this.registerTool({
      name: 'get_country_instability',
      description: 'ดึง Country Instability Index (CII) จัดลำดับจากสูงไปต่ำ',
      inputSchema: { type: 'object', properties: { limit: { type: 'number' } }, required: [] },
      handler: async (params) => {
        try {
          const { worldMonitorService } = await import('@/services/WorldMonitorService');
          const intelligence = await worldMonitorService.fetchIntelligence();
          const cii = worldMonitorService.computeCII(intelligence);
          return {
            success: true,
            countries: cii.slice(0, params.limit || 10).map(c => ({ name: c.country.name, code: c.country.code, region: c.country.region, score: c.score, trend: c.trend, factors: c.factors, baselineRisk: c.country.baselineRisk })),
            total: cii.length
          };
        } catch { return { success: false, error: 'Failed to compute CII' }; }
      }
    });

    this.registerTool({
      name: 'get_theater_posture',
      description: 'ดึงสถานะยุทธศาสตร์ 9 พื้นที่ทั่วโลก',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => {
        try {
          const { worldMonitorService } = await import('@/services/WorldMonitorService');
          const intelligence = await worldMonitorService.fetchIntelligence();
          const theaters = worldMonitorService.computeTheaterPosture(intelligence);
          return { success: true, theaters: theaters.map(t => ({ name: t.name, region: t.region, level: t.level, score: t.score, triggers: t.triggers })) };
        } catch { return { success: false, error: 'Failed to compute theater posture' }; }
      }
    });

    this.registerTool({
      name: 'detect_convergence',
      description: 'ตรวจจับจุดที่มีสัญญาณซ้อนทับกัน',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => {
        try {
          const { worldMonitorService } = await import('@/services/WorldMonitorService');
          const intelligence = await worldMonitorService.fetchIntelligence();
          const convergence = worldMonitorService.detectConvergence(intelligence);
          return { success: true, hotspots: convergence, count: convergence.length };
        } catch { return { success: false, error: 'Failed to detect convergence' }; }
      }
    });

    this.registerTool({
      name: 'get_strategic_assets',
      description: 'ดึงข้อมูลสินทรัพย์เชิงยุทธศาสตร์: ฐานทัพ, นิวเคลียร์, สายเคเบิล, ท่อส่งน้ำมัน',
      inputSchema: { type: 'object', properties: { type: { type: 'string' } }, required: ['type'] },
      handler: async (params) => {
        try {
          const { worldMonitorService } = await import('@/services/WorldMonitorService');
          switch (params.type) {
            case 'military_bases': return { success: true, data: worldMonitorService.getMilitaryBases().slice(0, 20) };
            case 'nuclear': return { success: true, data: worldMonitorService.getNuclearFacilities().slice(0, 20) };
            case 'cables': return { success: true, data: worldMonitorService.getUnderseaCables().slice(0, 20) };
            case 'pipelines': return { success: true, data: worldMonitorService.getPipelines().slice(0, 20) };
            case 'chokepoints': return { success: true, data: worldMonitorService.getChokepoints() };
            case 'conflicts': return { success: true, data: worldMonitorService.getConflictZones() };
            case 'hotspots': return { success: true, data: worldMonitorService.getHotspots() };
            default: return { success: false, error: 'Unknown type' };
          }
        } catch { return { success: false, error: 'Failed to get strategic assets' }; }
      }
    });
  }

  // ═══════════════════════════════════════════
  // OpenClaw Tools (Screen Analysis, UI Control, Web Search)
  // ═══════════════════════════════════════════
  private registerOpenClawTools(): void {
    this.registerTool({
      name: 'analyze_screen',
      description: 'ถ่ายภาพหน้าจอปัจจุบันแล้วให้ AI วิเคราะห์ — ใช้ได้กับกราฟ, chart, UI',
      inputSchema: { type: 'object', properties: { question: { type: 'string', description: 'คำถามที่ต้องการวิเคราะห์' } }, required: ['question'] },
      handler: async (params) => {
        try {
          const { VisionService } = await import('../vision/VisionService');
          const screenshot = await VisionService.captureScreen();
          const analysis = await VisionService.analyzeWithVision(
            screenshot.base64, params.question,
            'คุณเป็น ABLE AI วิเคราะห์ UI และ Trading Charts ตอบเป็นภาษาไทย'
          );
          return { success: true, analysis, screenshotSize: screenshot.fileSize };
        } catch (error) {
          return { success: false, error: `Screen analysis failed: ${error}` };
        }
      }
    });

    this.registerTool({
      name: 'analyze_chart',
      description: 'วิเคราะห์ Trading Chart — หา trend, pattern, support/resistance',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => {
        try {
          const { VisionService } = await import('../vision/VisionService');
          const result = await VisionService.analyzeChart();
          return { success: true, ...result };
        } catch (error) {
          return { success: false, error: `Chart analysis failed: ${error}` };
        }
      }
    });

    this.registerTool({
      name: 'execute_ui_goal',
      description: 'สั่งให้ OpenClaw AI Agent ทำอะไรบนหน้าจออัตโนมัติ เช่น เปิด panel, คลิก, พิมพ์',
      inputSchema: { type: 'object', properties: { goal: { type: 'string', description: 'เป้าหมายที่ต้องการ' } }, required: ['goal'] },
      handler: async (params) => {
        try {
          const { OpenClawService } = await import('../openclaw/OpenClawService');
          const session = await OpenClawService.executeGoal(params.goal);
          return {
            success: session.status === 'completed', status: session.status,
            commandsExecuted: session.commands.length,
            results: session.results.slice(-3).map(r => r.message)
          };
        } catch (error) {
          return { success: false, error: `UI goal execution failed: ${error}` };
        }
      }
    });

    this.registerTool({
      name: 'web_search',
      description: 'ค้นหาข้อมูลจากอินเทอร์เน็ต — ใช้เมื่อต้องการข้อมูล real-time',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      handler: async (params) => {
        try {
          const { OpenClawService } = await import('../openclaw/OpenClawService');
          return await OpenClawService.webSearch(params.query);
        } catch (error) {
          return { success: false, error: `Web search failed: ${error}` };
        }
      }
    });

    this.registerTool({
      name: 'take_snapshot',
      description: 'ดู elements ทั้งหมดบนหน้าจอปัจจุบัน — ใช้ก่อนสั่ง click หรือ interact',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => {
        try {
          const { OpenClawAgent } = await import('../openclaw/OpenClawAgent');
          const snapshot = OpenClawAgent.snapshot();
          return {
            success: true, title: snapshot.title, url: snapshot.url,
            elementCount: snapshot.elements.length,
            elements: snapshot.elements.slice(0, 20).map((e: any) => ({ index: e.index, type: e.tag || e.type, text: e.text?.substring(0, 50) }))
          };
        } catch (error) {
          return { success: false, error: `Snapshot failed: ${error}` };
        }
      }
    });
  }

  // ═══════════════════════════════════════════
  // News Tools
  // ═══════════════════════════════════════════
  private registerNewsTools(): void {
    this.registerTool({
      name: 'get_latest_news',
      description: 'ดึงข่าวล่าสุดจาก 50+ แหล่ง พร้อม sentiment analysis',
      inputSchema: {
        type: 'object',
        properties: {
          assets: { type: 'array', items: { type: 'string' }, description: 'symbols เช่น ["XAUUSD"]' },
          limit: { type: 'number', description: 'จำนวนข่าว (default: 20)' }
        },
        required: []
      },
      handler: async (params) => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data, error } = await supabase.functions.invoke('news-aggregator', {
            body: { pinnedAssets: params.assets || [] }
          });
          if (error) throw error;
          const news = (data?.rawNews || []).slice(0, params.limit || 20);
          return {
            success: true, totalFetched: data?.rawNews?.length || 0,
            news: news.map((n: any) => ({ title: n.title, source: n.source, sentiment: n.sentiment, importance: n.importance, ageText: n.ageText, relatedAssets: n.relatedAssets })),
            macroSummary: data?.macro?.slice(0, 5) || []
          };
        } catch (error) {
          return { success: false, error: `News fetch failed: ${error}` };
        }
      }
    });

    this.registerTool({
      name: 'get_global_map_data',
      description: 'ดึงข้อมูลทั้งหมดจาก Global Map: แผ่นดินไหว, เที่ยวบิน, สภาพอากาศ, พายุ, ความขัดแย้ง, ข้อมูลยุทธศาสตร์',
      inputSchema: {
        type: 'object',
        properties: {
          layers: {
            type: 'array',
            items: { type: 'string', enum: ['earthquakes', 'flights', 'weather', 'cyclones', 'conflicts', 'strategic', 'all'] },
            description: 'เลเยอร์ที่ต้องการ (default: all)'
          }
        },
        required: []
      },
      handler: async (params) => {
        const layers = params.layers || ['all'];
        const isAll = layers.includes('all');
        const result: Record<string, any> = { success: true, timestamp: new Date().toISOString() };

        try {
          // Earthquakes
          if (isAll || layers.includes('earthquakes')) {
            try {
              const res = await fetch('https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=15&minmagnitude=4.5&orderby=time');
              const data = await res.json();
              result.earthquakes = {
                count: data.features?.length || 0,
                items: data.features?.map((f: any) => ({
                  place: f.properties.place, magnitude: f.properties.mag,
                  time: new Date(f.properties.time).toLocaleString('th-TH'),
                  depth: f.geometry.coordinates[2],
                  lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
                  tsunami: f.properties.tsunami === 1
                })) || []
              };
            } catch { result.earthquakes = { count: 0, items: [], error: 'fetch failed' }; }
          }

          // Live Flights (OpenSky)
          if (isAll || layers.includes('flights')) {
            try {
              const res = await fetch('https://opensky-network.org/api/states/all?lamin=0&lomin=60&lamax=30&lomax=120');
              if (res.ok) {
                const data = await res.json();
                const flights = (data.states || []).slice(0, 30).map((s: any) => ({
                  callsign: s[1]?.trim(), origin: s[2], lat: s[6], lng: s[5],
                  altitude: Math.round(s[7] || 0), velocity: Math.round((s[9] || 0) * 3.6),
                  heading: Math.round(s[10] || 0), onGround: s[8]
                }));
                result.flights = { count: flights.length, items: flights };
              } else {
                result.flights = { count: 0, items: [], note: 'OpenSky rate limited' };
              }
            } catch { result.flights = { count: 0, items: [], error: 'fetch failed' }; }
          }

          // Weather Alerts
          if (isAll || layers.includes('weather')) {
            try {
              const { WeatherService } = await import('@/services/WeatherService');
              const alerts = await WeatherService.getWeatherAlerts();
              result.weather = { count: alerts.length, items: alerts.slice(0, 15) };
            } catch { result.weather = { count: 0, items: [], error: 'fetch failed' }; }
          }

          // Cyclones
          if (isAll || layers.includes('cyclones')) {
            try {
              const { default: CycloneService } = await import('@/services/CycloneService');
              const cyclones = await CycloneService.fetchAllCyclones();
              result.cyclones = { count: cyclones.length, items: cyclones };
            } catch { result.cyclones = { count: 0, items: [], error: 'fetch failed' }; }
          }

          // Conflicts
          if (isAll || layers.includes('conflicts')) {
            try {
              const { ConflictService } = await import('@/services/ConflictService');
              const conflicts = await ConflictService.getConflictData();
              result.conflicts = { count: conflicts.length, items: conflicts.slice(0, 20) };
            } catch { result.conflicts = { count: 0, items: [], error: 'fetch failed' }; }
          }

          // Strategic Assets (from WorldMonitorService)
          if (isAll || layers.includes('strategic')) {
            try {
              const { worldMonitorService } = await import('@/services/WorldMonitorService');
              result.strategic = {
                militaryBases: worldMonitorService.getMilitaryBases().length,
                nuclearFacilities: worldMonitorService.getNuclearFacilities().length,
                underseaCables: worldMonitorService.getUnderseaCables().length,
                pipelines: worldMonitorService.getPipelines().length,
                datacenters: worldMonitorService.getDatacenters().length,
                conflictZones: worldMonitorService.getConflictZones().map(z => ({ name: z.name, severity: z.severity, parties: z.parties })),
                chokepoints: worldMonitorService.getChokepoints().map(c => ({ name: c.name, lat: c.lat, lng: c.lng, currentThreat: c.currentThreat })),
                hotspots: worldMonitorService.getHotspots().map(h => ({ name: h.name, type: h.type, lat: h.lat, lng: h.lng })).slice(0, 15)
              };
            } catch { result.strategic = { error: 'fetch failed' }; }
          }

          // World Intelligence Brief
          if (isAll) {
            try {
              const { worldMonitorService } = await import('@/services/WorldMonitorService');
              const intel = await worldMonitorService.fetchIntelligence();
              result.worldBrief = intel.worldBrief;
              result.theaterPosture = worldMonitorService.computeTheaterPosture(intel).map(t => ({
                name: t.name, level: t.level, score: t.score
              }));
              result.convergenceHotspots = worldMonitorService.detectConvergence(intel).slice(0, 5);
            } catch { /* non-critical */ }
          }

          return result;
        } catch (error) {
          return { success: false, error: `Global map data failed: ${error}` };
        }
      }
    });
  }

  private interpretCOT(index: number, latest: any): string {
    if (index > 70) return 'Large speculators are heavily long. Strong bullish sentiment, but could signal a potential market top.';
    if (index > 50) return 'Large speculators are moderately long. Market sentiment is bullish but not extreme.';
    if (index < 30) return 'Large speculators are heavily short. Strong bearish sentiment, but could signal a potential market bottom.';
    return 'Large speculators are moderately short. Market sentiment is bearish but not extreme.';
  }
}

export const mcpServer = new MCPServer();
