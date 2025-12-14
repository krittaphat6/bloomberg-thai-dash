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

        return {
          success: true,
          data: data.slice(-10),
          count: data.length,
          latest: data[data.length - 1]
        };
      }
    });

    this.registerTool({
      name: 'analyze_cot',
      description: 'Analyze COT data and provide insights',
      inputSchema: {
        type: 'object',
        properties: {
          asset: { type: 'string', description: 'Asset name' }
        },
        required: ['asset']
      },
      handler: async (params) => {
        const { asset } = params;
        const data = await this.fetchCOTData(
          asset,
          new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          new Date()
        );

        if (!data || data.length === 0) {
          return { success: false, error: 'No data available' };
        }

        const latest = data[data.length - 1];
        const nets = data.map((d: any) => d.nonCommercialNet);
        const min = Math.min(...nets);
        const max = Math.max(...nets);
        const cotIndex = max === min ? 50 : ((latest.nonCommercialNet - min) / (max - min)) * 100;

        return {
          success: true,
          analysis: {
            cotIndex,
            sentiment: cotIndex > 70 ? 'Extremely Bullish' :
                       cotIndex > 50 ? 'Bullish' :
                       cotIndex < 30 ? 'Extremely Bearish' : 'Bearish',
            largeTraders: {
              net: latest.nonCommercialNet,
              direction: latest.nonCommercialNet > 0 ? 'Long' : 'Short'
            },
            commercial: {
              net: latest.commercialNet,
              direction: latest.commercialNet > 0 ? 'Long' : 'Short'
            },
            openInterest: latest.openInterest,
            interpretation: this.interpretCOT(cotIndex, latest)
          }
        };
      }
    });

    this.registerTool({
      name: 'get_cot_assets',
      description: 'Get list of available COT assets',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async () => {
        const defaultAssets = [
          'GOLD - COMMODITY EXCHANGE INC.',
          'SILVER - COMMODITY EXCHANGE INC.',
          'CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE',
          'EURO FX - CHICAGO MERCANTILE EXCHANGE',
          'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE',
          'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE',
          'E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE',
          'BITCOIN - CHICAGO MERCANTILE EXCHANGE'
        ];
        return { success: true, assets: defaultAssets };
      }
    });
  }

  private registerTradingTools(): void {
    this.registerTool({
      name: 'get_trades',
      description: 'Get user trading history',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of trades to return' }
        },
        required: []
      },
      handler: async (params) => {
        const trades = JSON.parse(localStorage.getItem('trades') || '[]');
        return {
          success: true,
          trades: trades.slice(0, params.limit || 10),
          total: trades.length
        };
      }
    });

    this.registerTool({
      name: 'analyze_performance',
      description: 'Analyze trading performance metrics',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async () => {
        const trades = JSON.parse(localStorage.getItem('trades') || '[]');
        const winningTrades = trades.filter((t: any) => (t.pnl || 0) > 0);
        const losingTrades = trades.filter((t: any) => (t.pnl || 0) < 0);
        const totalPnL = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

        return {
          success: true,
          metrics: {
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: trades.length > 0 ? ((winningTrades.length / trades.length) * 100).toFixed(2) + '%' : '0%',
            totalPnL,
            averageWin: winningTrades.length > 0
              ? winningTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) / winningTrades.length
              : 0,
            averageLoss: losingTrades.length > 0
              ? losingTrades.reduce((sum: number, t: any) => sum + Math.abs(t.pnl || 0), 0) / losingTrades.length
              : 0
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
          symbol: { type: 'string', description: 'Trading symbol' },
          direction: { type: 'string', description: 'Long or Short' },
          entryPrice: { type: 'number', description: 'Entry price' },
          exitPrice: { type: 'number', description: 'Exit price' },
          quantity: { type: 'number', description: 'Trade quantity' }
        },
        required: ['symbol', 'direction', 'entryPrice']
      },
      handler: async (params) => {
        const trades = JSON.parse(localStorage.getItem('trades') || '[]');
        const newTrade = {
          id: Date.now().toString(),
          ...params,
          createdAt: new Date().toISOString(),
          pnl: params.exitPrice && params.quantity
            ? (params.exitPrice - params.entryPrice) * params.quantity * (params.direction === 'Long' ? 1 : -1)
            : 0
        };
        trades.push(newTrade);
        localStorage.setItem('trades', JSON.stringify(trades));
        return { success: true, trade: newTrade };
      }
    });
  }

  private registerNoteTools(): void {
    this.registerTool({
      name: 'search_notes',
      description: 'Search user notes by title or content',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      },
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
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Note title' },
          content: { type: 'string', description: 'Note content' }
        },
        required: ['title', 'content']
      },
      handler: async (params) => {
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const newNote = {
          id: Date.now().toString(),
          title: params.title,
          content: params.content,
          createdAt: new Date().toISOString()
        };
        notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        return { success: true, note: newNote };
      }
    });
  }

  private registerMarketTools(): void {
    this.registerTool({
      name: 'get_market_overview',
      description: 'Get current market overview and sentiment',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      },
      handler: async () => {
        const cachedData = localStorage.getItem('market_data_cache');
        if (cachedData) {
          try {
            return { success: true, ...JSON.parse(cachedData) };
          } catch {
            // ignore parse error
          }
        }
        
        return {
          success: true,
          markets: {
            crypto: { btc: 'N/A', eth: 'N/A' },
            forex: { eurusd: 'N/A', usdjpy: 'N/A' },
            commodities: { gold: 'N/A', oil: 'N/A' }
          },
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
          accountSize: { type: 'number', description: 'Account size in USD' },
          riskPercent: { type: 'number', description: 'Risk percentage per trade' },
          entryPrice: { type: 'number', description: 'Entry price' },
          stopLoss: { type: 'number', description: 'Stop loss price' }
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
          calculation: {
            accountSize,
            riskPercent,
            riskAmount,
            entryPrice,
            stopLoss,
            riskPerUnit,
            positionSize: Math.floor(positionSize),
            totalValue: Math.floor(positionSize) * entryPrice
          }
        };
      }
    });
  }

  private interpretCOT(index: number, latest: any): string {
    if (index > 70) {
      return 'Large speculators are heavily long. This typically indicates strong bullish sentiment, but could also signal a potential market top if extremely overbought.';
    } else if (index > 50) {
      return 'Large speculators are moderately long. Market sentiment is bullish but not extreme.';
    } else if (index < 30) {
      return 'Large speculators are heavily short. This indicates strong bearish sentiment, but could signal a potential market bottom if extremely oversold.';
    } else {
      return 'Large speculators are moderately short. Market sentiment is bearish but not extreme.';
    }
  }
}

export const mcpServer = new MCPServer();
