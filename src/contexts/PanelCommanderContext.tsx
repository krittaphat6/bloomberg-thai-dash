import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// Panel configuration type - matches MarketData's availableComponents
export interface PanelConfig {
  id: string;
  title: string;
  keywords: string[]; // Keywords for AI to match
  category: string;
}

// All available panels with their keywords for AI matching
export const AVAILABLE_PANELS: PanelConfig[] = [
  // Trading Tools
  { id: 'trading-chart', title: '📊 TRADING CHART', keywords: ['chart', 'trading chart', 'กราฟ', 'technical', 'price chart', 'แท่งเทียน'], category: 'trading' },
  { id: 'options-3d', title: '📈 OPTIONS-3D', keywords: ['options', '3d', 'greeks', 'ออปชัน'], category: 'trading' },
  { id: 'stockdio', title: 'STOCKDIO CHARTS', keywords: ['stockdio', 'stock charts'], category: 'trading' },
  { id: 'forex', title: '💱 FOREX & ECONOMICS', keywords: ['forex', 'fx', 'currency', 'ฟอเร็กซ์', 'สกุลเงิน'], category: 'trading' },
  { id: 'fedwatch', title: '🏦 FED WATCH', keywords: ['fed', 'federal reserve', 'interest rate', 'ดอกเบี้ย', 'fed watch'], category: 'trading' },
  { id: 'screeners', title: '🔍 SCREENERS', keywords: ['screener', 'filter', 'scan', 'scanner', 'screen', 'ค้นหา', 'กรอง'], category: 'trading' },
  
  // Market Analysis
  { id: 'crypto', title: '₿ CRYPTO LIVE', keywords: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'คริปโต'], category: 'analysis' },
  { id: 'crypto-map', title: '🗺️ CRYPTO MARKET MAP', keywords: ['crypto map', 'market map', 'heatmap crypto'], category: 'analysis' },
  { id: 'scatter', title: 'SCATTER ANALYSIS', keywords: ['scatter', 'correlation', 'rs ratio'], category: 'analysis' },
  { id: 'scatter-point', title: '📍 SCATTER POINT', keywords: ['scatter point', 'rrg', 'quadrant'], category: 'analysis' },
  { id: 'correlation-matrix', title: '🔢 CORRELATION MATRIX', keywords: ['correlation', 'matrix', 'pearson', 'spearman'], category: 'analysis' },
  { id: 'cvd', title: '📊 CVD CHART', keywords: ['cvd', 'cumulative volume delta', 'volume delta', 'orderflow'], category: 'analysis' },
  { id: 'topnews', title: '🔥 TOP NEWS', keywords: ['news', 'top news', 'ข่าว', 'sentiment'], category: 'communication' },
  { id: 'pie', title: '🥧 MARKET PIE', keywords: ['pie', 'sector', 'allocation', 'พาย'], category: 'analysis' },
  { id: 'heatmap', title: '🔥 HEAT MAP', keywords: ['heatmap', 'heat map', 'sector performance'], category: 'analysis' },
  { id: 'depth', title: '📊 MARKET DEPTH', keywords: ['depth', 'order book', 'market depth', 'liquidity'], category: 'analysis' },
  { id: 'volume', title: '📉 TRADING VOLUME', keywords: ['volume', 'trading volume', 'ปริมาณ'], category: 'analysis' },
  { id: 'currency', title: '💵 CURRENCY TABLE', keywords: ['currency', 'exchange rate', 'ค่าเงิน'], category: 'analysis' },
  { id: 'indicators', title: '📈 ECONOMIC INDICATORS', keywords: ['indicators', 'economic indicators', 'gdp', 'inflation', 'ตัวชี้วัด'], category: 'analysis' },
  { id: 'cot', title: '📋 COT DATA', keywords: ['cot', 'commitment of traders', 'cot data', 'positioning'], category: 'analysis' },
  { id: 'gold', title: '🥇 SPDR GOLD DATA', keywords: ['gold', 'gld', 'spdr', 'ทอง', 'gold data'], category: 'analysis' },
  { id: 'realmarket', title: '📡 REAL MARKET DATA', keywords: ['real market', 'live data', 'real-time'], category: 'analysis' },
  { id: 'bitcoin', title: '⛏️ BITCOIN MEMPOOL', keywords: ['mempool', 'bitcoin mempool', 'btc mempool', 'blockchain'], category: 'analysis' },
  { id: 'polymarket', title: '🔮 POLYMARKET HUB', keywords: ['polymarket', 'prediction', 'probability', 'forecast', 'prediction market', 'พยากรณ์', 'ทำนาย', 'betting'], category: 'analysis' },
  
  // Intelligence & AI
  { id: 'able-focus', title: '🔍 ABLE-FOCUS', keywords: ['focus', 'able focus', 'relationship', 'network'], category: 'intelligence' },
  { id: 'intelligence', title: '🧠 INTELLIGENCE PLATFORM', keywords: ['intelligence', 'palantir', 'analytics', 'intelligence platform'], category: 'intelligence' },
  { id: 'able3ai', title: '🤖 ABLE AI', keywords: ['ai', 'able ai', 'chat ai', 'ollama', 'gemini'], category: 'intelligence' },
  { id: 'able-hf-40', title: '🧠 ABLE-HF 40 MODULES', keywords: ['40 modules', 'hf 40', 'hedge fund', 'able hf', 'modules'], category: 'intelligence' },
  
  
  // Utilities
  { id: 'code', title: '💻 PYTHON CODE EDITOR', keywords: ['code', 'python', 'editor', 'programming', 'pine script', 'โค้ด'], category: 'utilities' },
  { id: 'notes', title: '📝 NOTES', keywords: ['notes', 'note', 'โน้ต', 'บันทึก', 'memo'], category: 'utilities' },
  { id: 'journal', title: '📔 TRADING JOURNAL', keywords: ['journal', 'trading journal', 'บันทึกการเทรด', 'trade log', 'performance'], category: 'utilities' },
  { id: 'monte-carlo', title: '🎲 MONTE CARLO SIM', keywords: ['monte carlo', 'simulation', 'backtest', 'probability', 'มอนติ'], category: 'utilities' },
  { id: 'calendar', title: '📅 ECONOMIC CALENDAR', keywords: ['calendar', 'economic calendar', 'ปฏิทิน', 'events'], category: 'utilities' },
  { id: 'investing', title: '📰 INVESTING.COM', keywords: ['investing', 'investing.com'], category: 'utilities' },
  
  // Communication
  { id: 'messenger', title: '💬 MESSENGER', keywords: ['chat', 'messenger', 'video call', 'แชท'], category: 'communication' },
  { id: 'news', title: '📰 BLOOMBERG NEWS', keywords: ['bloomberg news', 'financial news', 'ข่าว bloomberg'], category: 'communication' },
  { id: 'tv', title: '📺 BLOOMBERG LIVE TV', keywords: ['tv', 'live tv', 'bloomberg tv', 'ทีวี'], category: 'communication' },
  
  // Global Markets
  { id: 'wol', title: '🌍 WORLD MARKETS', keywords: ['world', 'world markets', 'global', 'exchanges', 'ตลาดโลก'], category: 'global' },
  { id: 'uamap', title: '🗺️ LIVE UA MAP', keywords: ['ua map', 'ukraine', 'geopolitics', 'แผนที่'], category: 'global' },
  { id: 'debtclock', title: '💸 US DEBT CLOCK', keywords: ['debt', 'us debt', 'debt clock', 'หนี้'], category: 'global' },
  { id: 'bloomberg-map', title: '🌐 GLOBAL MAP', keywords: ['global map', 'world map', 'earthquake', 'แผนที่โลก'], category: 'global' },
  
  // Entertainment
  { id: 'pacman', title: '🎮 PAC-MAN', keywords: ['pacman', 'game', 'เกม', 'pac-man'], category: 'entertainment' },
  { id: 'chess', title: '♟️ CHESS PUZZLE', keywords: ['chess', 'หมากรุก', 'puzzle'], category: 'entertainment' },
  
  // Admin
  { id: 'face-approval', title: '👤 FACE APPROVAL', keywords: ['face', 'approval', 'อนุมัติ', 'admin', 'ผู้ใช้'], category: 'admin' },
];

export interface OpenPanelCommand {
  panelId: string;
  title: string;
  arrange?: 'center' | 'left' | 'right' | 'maximize' | 'auto';
}

interface PanelCommanderContextType {
  // Open a panel by ID
  openPanel: (panelId: string, arrange?: OpenPanelCommand['arrange']) => boolean;
  
  // Close a panel by ID
  closePanel: (panelId: string) => boolean;
  
  // Find matching panels by keyword
  findPanelsByKeyword: (keyword: string) => PanelConfig[];
  
  // Get all available panels
  getAvailablePanels: () => PanelConfig[];
  
  // Parse AI command and execute
  executeAICommand: (command: string) => { success: boolean; message: string; panelsOpened?: string[] };
  
  // Register panel opener from MarketData
  registerPanelOpener: (opener: (panelId: string) => void) => void;
  
  // Register panel closer from MarketData
  registerPanelCloser: (closer: (panelId: string) => void) => void;
}

const PanelCommanderContext = createContext<PanelCommanderContextType | null>(null);

export const usePanelCommander = () => {
  const context = useContext(PanelCommanderContext);
  if (!context) {
    throw new Error('usePanelCommander must be used within PanelCommanderProvider');
  }
  return context;
};

export const PanelCommanderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const panelOpenerRef = useRef<((panelId: string) => void) | null>(null);
  const panelCloserRef = useRef<((panelId: string) => void) | null>(null);

  const registerPanelOpener = useCallback((opener: (panelId: string) => void) => {
    panelOpenerRef.current = opener;
  }, []);

  const registerPanelCloser = useCallback((closer: (panelId: string) => void) => {
    panelCloserRef.current = closer;
  }, []);

  const findPanelsByKeyword = useCallback((keyword: string): PanelConfig[] => {
    const lowerKeyword = keyword.toLowerCase().trim();
    
    return AVAILABLE_PANELS.filter(panel => {
      // Check title
      if (panel.title.toLowerCase().includes(lowerKeyword)) return true;
      
      // Check keywords
      if (panel.keywords.some(k => k.toLowerCase().includes(lowerKeyword) || lowerKeyword.includes(k.toLowerCase()))) return true;
      
      // Check ID
      if (panel.id.toLowerCase().includes(lowerKeyword)) return true;
      
      return false;
    });
  }, []);

  const getAvailablePanels = useCallback(() => AVAILABLE_PANELS, []);

  const openPanel = useCallback((panelId: string, arrange?: OpenPanelCommand['arrange']): boolean => {
    if (!panelOpenerRef.current) {
      console.warn('Panel opener not registered');
      return false;
    }
    
    const panel = AVAILABLE_PANELS.find(p => p.id === panelId);
    if (!panel) {
      console.warn(`Panel ${panelId} not found`);
      return false;
    }
    
    panelOpenerRef.current(panelId);
    console.log(`✅ Opened panel: ${panel.title}`);
    return true;
  }, []);

  const closePanel = useCallback((panelId: string): boolean => {
    if (!panelCloserRef.current) {
      console.warn('Panel closer not registered');
      return false;
    }
    
    panelCloserRef.current(panelId);
    console.log(`✅ Closed panel: ${panelId}`);
    return true;
  }, []);

  const executeAICommand = useCallback((command: string): { success: boolean; message: string; panelsOpened?: string[] } => {
    const lowerCommand = command.toLowerCase();
    const panelsOpened: string[] = [];
    
    // Parse "open" commands
    const openPatterns = [
      /(?:open|เปิด|show|แสดง|launch|run)\s+(.+?)(?:\s+panel|\s+function|\s+ฟังชัน)?$/i,
      /(?:go to|ไปที่|navigate to)\s+(.+?)$/i,
    ];
    
    for (const pattern of openPatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        const targetName = match[1].trim();
        const matchingPanels = findPanelsByKeyword(targetName);
        
        if (matchingPanels.length === 0) {
          return { 
            success: false, 
            message: `❌ ไม่พบ panel ที่ชื่อ "${targetName}"\n\n📋 **ลองพิมพ์:**\n${AVAILABLE_PANELS.slice(0, 10).map(p => `• "${p.keywords[0]}"`).join('\n')}`
          };
        }
        
        // Open best match
        const bestMatch = matchingPanels[0];
        const opened = openPanel(bestMatch.id);
        
        if (opened) {
          panelsOpened.push(bestMatch.title);
          return { 
            success: true, 
            message: `✅ เปิด **${bestMatch.title}** เรียบร้อยแล้ว!`,
            panelsOpened 
          };
        }
        
        return { success: false, message: `❌ ไม่สามารถเปิด ${bestMatch.title} ได้` };
      }
    }
    
    // Parse "close" commands
    const closePatterns = [
      /(?:close|ปิด|hide|ซ่อน)\s+(.+?)(?:\s+panel|\s+function|\s+ฟังชัน)?$/i,
    ];
    
    for (const pattern of closePatterns) {
      const match = lowerCommand.match(pattern);
      if (match) {
        const targetName = match[1].trim();
        const matchingPanels = findPanelsByKeyword(targetName);
        
        if (matchingPanels.length > 0) {
          const bestMatch = matchingPanels[0];
          closePanel(bestMatch.id);
          return { 
            success: true, 
            message: `✅ ปิด **${bestMatch.title}** เรียบร้อยแล้ว!`
          };
        }
      }
    }
    
    // Parse "list" commands
    if (lowerCommand.includes('list') || lowerCommand.includes('รายการ') || lowerCommand.includes('functions') || lowerCommand.includes('panels')) {
      const categories = [...new Set(AVAILABLE_PANELS.map(p => p.category))];
      let message = '📋 **รายการ Functions ทั้งหมด:**\n\n';
      
      for (const category of categories) {
        const categoryPanels = AVAILABLE_PANELS.filter(p => p.category === category);
        message += `**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n`;
        message += categoryPanels.map(p => `• ${p.title}`).join('\n');
        message += '\n\n';
      }
      
      message += '💡 **ตัวอย่าง:** "เปิด trading journal" หรือ "open cot data"';
      
      return { success: true, message };
    }
    
    return { success: false, message: '' }; // Not a panel command
  }, [openPanel, closePanel, findPanelsByKeyword]);

  return (
    <PanelCommanderContext.Provider
      value={{
        openPanel,
        closePanel,
        findPanelsByKeyword,
        getAvailablePanels,
        executeAICommand,
        registerPanelOpener,
        registerPanelCloser
      }}
    >
      {children}
    </PanelCommanderContext.Provider>
  );
};
