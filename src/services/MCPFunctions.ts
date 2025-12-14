// MCP Functions - เชื่อมต่อทุกฟังก์ชันในโปรเจกต์

export interface MCPFunction {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
}

class MCPSystem {
  private functions: Map<string, MCPFunction> = new Map();

  // Register function
  register(func: MCPFunction) {
    this.functions.set(func.name, func);
  }

  // Execute function
  async execute(name: string, params: any): Promise<any> {
    const func = this.functions.get(name);
    if (!func) throw new Error(`MCP Function not found: ${name}`);
    
    console.log(`🔧 MCP: Executing ${name}`, params);
    return await func.execute(params);
  }

  // Get all functions
  list(): MCPFunction[] {
    return Array.from(this.functions.values());
  }
  
  // Get function count
  count(): number {
    return this.functions.size;
  }
}

export const mcp = new MCPSystem();

// ===== COT Functions =====

mcp.register({
  name: 'get_cot_data',
  description: 'ดึงข้อมูล COT สำหรับ asset ที่กำหนด',
  execute: async (params: { asset: string; days?: number }) => {
    const { asset, days = 365 } = params;
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const apiUrl = `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?market_and_exchange_names=${encodeURIComponent(asset)}&$where=report_date_as_yyyy_mm_dd between '${startDate}' and '${endDate}'&$order=report_date_as_yyyy_mm_dd DESC&$limit=10`;
    
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('CFTC API error');
      const data = await response.json();
      
      return {
        success: true,
        asset,
        dataPoints: data.length,
        latest: data[0],
        data: data.slice(0, 10)
      };
    } catch (error) {
      console.error('COT fetch error:', error);
      return {
        success: false,
        error: 'Failed to fetch COT data',
        asset
      };
    }
  }
});

mcp.register({
  name: 'analyze_cot',
  description: 'วิเคราะห์ข้อมูล COT และให้ insight',
  execute: async (params: { asset: string }) => {
    const cotData = await mcp.execute('get_cot_data', { asset: params.asset, days: 365 });
    
    if (!cotData.success || !cotData.latest) {
      return { success: false, error: 'No data available' };
    }
    
    const latest = cotData.latest;
    const commercialNet = parseInt(latest.comm_positions_long_all || 0) - parseInt(latest.comm_positions_short_all || 0);
    const largeNet = parseInt(latest.noncomm_positions_long_all || 0) - parseInt(latest.noncomm_positions_short_all || 0);
    const openInterest = parseInt(latest.open_interest_all || 0);
    
    let interpretation = '';
    if (largeNet > 50000) {
      interpretation = 'Large traders มี position long สูง - แนวโน้มขาขึ้น';
    } else if (largeNet < -50000) {
      interpretation = 'Large traders มี position short สูง - แนวโน้มขาลง';
    } else {
      interpretation = 'Large traders อยู่ในสภาวะ neutral';
    }
    
    return {
      success: true,
      asset: params.asset,
      date: latest.report_date_as_yyyy_mm_dd,
      analysis: {
        commercialNet,
        commercialDirection: commercialNet > 0 ? 'LONG' : 'SHORT',
        largeTraderNet: largeNet,
        largeTraderDirection: largeNet > 0 ? 'LONG' : 'SHORT',
        openInterest,
        interpretation
      }
    };
  }
});

// ===== Trading Functions =====

mcp.register({
  name: 'get_trades',
  description: 'ดึงประวัติการเทรดจาก localStorage',
  execute: async (params: { limit?: number }) => {
    const trades = JSON.parse(localStorage.getItem('trades') || '[]');
    return {
      success: true,
      total: trades.length,
      trades: trades.slice(0, params.limit || 10)
    };
  }
});

mcp.register({
  name: 'analyze_performance',
  description: 'วิเคราะห์ผลการเทรด',
  execute: async () => {
    const trades = JSON.parse(localStorage.getItem('trades') || '[]');
    
    if (trades.length === 0) {
      return { success: false, message: 'No trades found' };
    }
    
    const closedTrades = trades.filter((t: any) => t.status === 'CLOSED');
    const winningTrades = closedTrades.filter((t: any) => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter((t: any) => (t.pnl || 0) < 0);
    const totalPnL = closedTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
    
    return {
      success: true,
      metrics: {
        totalTrades: trades.length,
        closedTrades: closedTrades.length,
        openTrades: trades.length - closedTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: closedTrades.length > 0 ? ((winningTrades.length / closedTrades.length) * 100).toFixed(2) + '%' : '0%',
        totalPnL: totalPnL.toFixed(2),
        avgWin: winningTrades.length > 0 
          ? (winningTrades.reduce((sum: number, t: any) => sum + t.pnl, 0) / winningTrades.length).toFixed(2)
          : '0',
        avgLoss: losingTrades.length > 0
          ? (losingTrades.reduce((sum: number, t: any) => sum + Math.abs(t.pnl), 0) / losingTrades.length).toFixed(2)
          : '0'
      }
    };
  }
});

mcp.register({
  name: 'calculate_position_size',
  description: 'คำนวณขนาด position ที่เหมาะสม',
  execute: async (params: { accountSize: number; riskPercent: number; stopLossPips: number }) => {
    const { accountSize, riskPercent, stopLossPips } = params;
    const riskAmount = accountSize * (riskPercent / 100);
    const positionSize = riskAmount / stopLossPips;
    
    return {
      success: true,
      calculation: {
        accountSize,
        riskPercent,
        riskAmount,
        stopLossPips,
        suggestedLots: (positionSize / 10000).toFixed(2),
        suggestedUnits: Math.floor(positionSize)
      }
    };
  }
});

// ===== Note Functions =====

mcp.register({
  name: 'read_note',
  description: 'อ่านโน้ตจาก localStorage',
  execute: async (params: { title: string }) => {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const note = notes.find((n: any) => n.title.toLowerCase().includes(params.title.toLowerCase()));
    
    return {
      success: !!note,
      note: note || null,
      message: note ? `พบโน้ต: ${note.title}` : 'ไม่พบโน้ตที่ค้นหา'
    };
  }
});

mcp.register({
  name: 'create_note',
  description: 'สร้างโน้ตใหม่',
  execute: async (params: { title: string; content: string }) => {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const newNote = {
      id: Date.now().toString(),
      title: params.title,
      content: params.content,
      createdAt: new Date().toISOString()
    };
    notes.push(newNote);
    localStorage.setItem('notes', JSON.stringify(notes));
    
    return {
      success: true,
      note: newNote,
      message: `สร้างโน้ต "${params.title}" สำเร็จ`
    };
  }
});

mcp.register({
  name: 'search_notes',
  description: 'ค้นหาโน้ตทั้งหมด',
  execute: async (params: { query?: string }) => {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    
    if (!params.query) {
      return { success: true, notes: notes.slice(0, 10), total: notes.length };
    }
    
    const filtered = notes.filter((n: any) => 
      n.title.toLowerCase().includes(params.query!.toLowerCase()) ||
      n.content?.toLowerCase().includes(params.query!.toLowerCase())
    );
    
    return { success: true, notes: filtered, total: filtered.length };
  }
});

// ===== Market Data Functions =====

mcp.register({
  name: 'get_market_price',
  description: 'ดึงราคาตลาดปัจจุบัน',
  execute: async (params: { symbol: string }) => {
    const symbol = params.symbol.toUpperCase();
    
    try {
      // ถ้าเป็น crypto ใช้ Binance
      if (symbol.includes('USDT') || symbol.includes('BTC') || symbol.includes('ETH')) {
        const binanceSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`;
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
        
        if (!response.ok) throw new Error('Binance API error');
        const data = await response.json();
        
        return {
          success: true,
          symbol: binanceSymbol,
          price: parseFloat(data.lastPrice),
          change24h: parseFloat(data.priceChangePercent),
          volume: parseFloat(data.volume),
          source: 'Binance'
        };
      } else {
        // ถ้าเป็นหุ้น ใช้ Yahoo Finance
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
        
        if (!response.ok) throw new Error('Yahoo Finance API error');
        const data = await response.json();
        const meta = data.chart?.result?.[0]?.meta;
        
        if (!meta) throw new Error('No data found');
        
        return {
          success: true,
          symbol,
          price: meta.regularMarketPrice,
          change24h: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2),
          volume: meta.regularMarketVolume,
          source: 'Yahoo Finance'
        };
      }
    } catch (error) {
      console.error('Market price error:', error);
      return {
        success: false,
        symbol,
        error: 'Failed to fetch market price'
      };
    }
  }
});

console.log(`✅ MCP System initialized with ${mcp.count()} functions`);

export default mcp;
