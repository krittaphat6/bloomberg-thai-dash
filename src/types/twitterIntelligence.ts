// Twitter Intelligence System Types & Constants

export interface TwitterAccount {
  id: string;
  username: string;
  displayName: string;
  category: 'political' | 'central_bank' | 'economist' | 'hedge_fund' | 
            'media' | 'crypto' | 'commodities' | 'technical' | 'fintech';
  priority: 1 | 2 | 3;
  description: string;
  marketImpact: 'extreme' | 'high' | 'medium';
  enabled: boolean;
}

export interface TwitterPost {
  id: string;
  accountId: string;
  username: string;
  displayName: string;
  content: string;
  timestamp: number;
  likes: number;
  retweets: number;
  replies: number;
  url: string;
  isAnalyzed: boolean;
  aiSummary?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  confidence?: number;
  affectedAssets?: string[];
  urgency?: 'critical' | 'high' | 'medium' | 'low';
  ableAnalysis?: {
    symbol: string;
    P_up_pct: number;
    confidence: number;
    decision: string;
    quantum_enhancement: number;
    neural_enhancement: number;
    thai_summary: string;
    key_drivers: string[];
  };
}

export interface TwitterIntelligenceState {
  accounts: TwitterAccount[];
  posts: TwitterPost[];
  isMonitoring: boolean;
  lastUpdate: number;
  stats: {
    totalPosts: number;
    analyzedPosts: number;
    criticalAlerts: number;
  };
}

// 100 Twitter Accounts organized by category
export const TWITTER_ACCOUNTS: TwitterAccount[] = [
  // Category 1: Political Leaders & Policy Makers (10)
  { id: 'trump', username: 'realDonaldTrump', displayName: 'Donald J. Trump', category: 'political', priority: 1, description: 'President - Market mover #1', marketImpact: 'extreme', enabled: true },
  { id: 'potus', username: 'POTUS', displayName: 'President Biden', category: 'political', priority: 1, description: 'Official White House', marketImpact: 'extreme', enabled: true },
  { id: 'elon', username: 'elonmusk', displayName: 'Elon Musk', category: 'political', priority: 1, description: 'Tesla, X, DOGE Leader', marketImpact: 'extreme', enabled: true },
  { id: 'fed', username: 'federalreserve', displayName: 'Federal Reserve', category: 'political', priority: 1, description: 'US Central Bank', marketImpact: 'extreme', enabled: true },
  { id: 'yellen', username: 'SecYellen', displayName: 'Janet Yellen', category: 'political', priority: 1, description: 'Treasury Secretary', marketImpact: 'extreme', enabled: true },
  { id: 'whitehouse', username: 'WhiteHouse', displayName: 'The White House', category: 'political', priority: 2, description: 'White House Official', marketImpact: 'high', enabled: true },
  { id: 'speaker', username: 'SpeakerJohnson', displayName: 'Speaker Johnson', category: 'political', priority: 2, description: 'House Speaker', marketImpact: 'high', enabled: true },
  { id: 'schumer', username: 'SenSchumer', displayName: 'Chuck Schumer', category: 'political', priority: 2, description: 'Senate Leader', marketImpact: 'high', enabled: true },
  { id: 'vp', username: 'VP', displayName: 'Vice President', category: 'political', priority: 2, description: 'Vice President', marketImpact: 'high', enabled: true },
  { id: 'powell', username: 'JeromePowell', displayName: 'Jerome Powell', category: 'political', priority: 1, description: 'Fed Chair', marketImpact: 'extreme', enabled: true },

  // Category 2: Central Banks & Monetary Policy (10)
  { id: 'ecb', username: 'ecaborbank', displayName: 'European Central Bank', category: 'central_bank', priority: 1, description: 'ECB Official', marketImpact: 'extreme', enabled: true },
  { id: 'boe', username: 'bankofengland', displayName: 'Bank of England', category: 'central_bank', priority: 1, description: 'UK Central Bank', marketImpact: 'high', enabled: true },
  { id: 'boc', username: 'bankofcanada', displayName: 'Bank of Canada', category: 'central_bank', priority: 2, description: 'Canada Central Bank', marketImpact: 'high', enabled: true },
  { id: 'rba', username: 'RBA', displayName: 'Reserve Bank Australia', category: 'central_bank', priority: 2, description: 'Australia Central Bank', marketImpact: 'high', enabled: true },
  { id: 'boj', username: 'Bank_of_Japan_e', displayName: 'Bank of Japan', category: 'central_bank', priority: 1, description: 'Japan Central Bank', marketImpact: 'high', enabled: true },
  { id: 'snb', username: 'SNB_BNS', displayName: 'Swiss National Bank', category: 'central_bank', priority: 2, description: 'Swiss Central Bank', marketImpact: 'high', enabled: true },
  { id: 'lagarde', username: 'Lagabordie', displayName: 'Christine Lagarde', category: 'central_bank', priority: 1, description: 'ECB President', marketImpact: 'extreme', enabled: true },
  { id: 'banxico', username: 'Banxico', displayName: 'Banco de México', category: 'central_bank', priority: 3, description: 'Mexico Central Bank', marketImpact: 'medium', enabled: true },
  { id: 'rbi', username: 'RBI', displayName: 'Reserve Bank of India', category: 'central_bank', priority: 3, description: 'India Central Bank', marketImpact: 'medium', enabled: true },
  { id: 'pboc', username: 'PDChina', displayName: "People's Bank of China", category: 'central_bank', priority: 1, description: 'China Central Bank', marketImpact: 'extreme', enabled: true },

  // Category 3: Economists & Market Strategists (15)
  { id: 'lizann', username: 'LizAnnSonders', displayName: 'Liz Ann Sonders', category: 'economist', priority: 2, description: 'Schwab Chief Strategist', marketImpact: 'high', enabled: true },
  { id: 'krugman', username: 'paulkrugman', displayName: 'Paul Krugman', category: 'economist', priority: 2, description: 'Nobel Economist', marketImpact: 'high', enabled: true },
  { id: 'elerian', username: 'aborelerian', displayName: 'Mohamed El-Erian', category: 'economist', priority: 1, description: 'Chief Economic Advisor', marketImpact: 'high', enabled: true },
  { id: 'dalio', username: 'RayDalio', displayName: 'Ray Dalio', category: 'economist', priority: 1, description: 'Bridgewater Founder', marketImpact: 'extreme', enabled: true },
  { id: 'housel', username: 'morganhousel', displayName: 'Morgan Housel', category: 'economist', priority: 3, description: 'Psychology of Money', marketImpact: 'medium', enabled: true },
  { id: 'damodaran', username: 'AswsathDamodaran', displayName: 'Aswath Damodaran', category: 'economist', priority: 2, description: 'NYU Valuation Prof', marketImpact: 'high', enabled: true },
  { id: 'reich', username: 'RBReich', displayName: 'Robert Reich', category: 'economist', priority: 3, description: 'Former Labor Secretary', marketImpact: 'medium', enabled: true },
  { id: 'stiglitz', username: 'JosephEStiglitz', displayName: 'Joseph Stiglitz', category: 'economist', priority: 2, description: 'Nobel Laureate', marketImpact: 'high', enabled: true },
  { id: 'bernanke', username: 'benbernanke', displayName: 'Ben Bernanke', category: 'economist', priority: 1, description: 'Former Fed Chair', marketImpact: 'high', enabled: true },
  { id: 'goolsbee', username: 'Austan_Goolsbee', displayName: 'Austan Goolsbee', category: 'economist', priority: 2, description: 'Chicago Fed President', marketImpact: 'high', enabled: true },
  { id: 'delong', username: 'daborelong', displayName: 'Brad DeLong', category: 'economist', priority: 3, description: 'UC Berkeley Economist', marketImpact: 'medium', enabled: true },
  { id: 'yueh', username: 'lindayueh', displayName: 'Linda Yueh', category: 'economist', priority: 3, description: 'BBC Economics Editor', marketImpact: 'medium', enabled: true },
  { id: 'roche', username: 'cullenroche', displayName: 'Cullen Roche', category: 'economist', priority: 3, description: 'Pragmatic Capitalism', marketImpact: 'medium', enabled: true },
  { id: 'gary', username: 'garaboryseconomics', displayName: 'Gary Economics', category: 'economist', priority: 3, description: 'Inequality Expert', marketImpact: 'medium', enabled: true },
  { id: 'macro', username: 'MacroAlf', displayName: 'Alfonso Peccatiello', category: 'economist', priority: 2, description: 'Macro Strategist', marketImpact: 'high', enabled: true },

  // Category 4: Hedge Fund Managers & Investors (15)
  { id: 'ackman', username: 'BillAckman', displayName: 'Bill Ackman', category: 'hedge_fund', priority: 1, description: 'Pershing Square', marketImpact: 'extreme', enabled: true },
  { id: 'icahn', username: 'Carl_C_Icahn', displayName: 'Carl Icahn', category: 'hedge_fund', priority: 1, description: 'Icahn Enterprises', marketImpact: 'extreme', enabled: true },
  { id: 'einhorn', username: 'DavidEinhorn', displayName: 'David Einhorn', category: 'hedge_fund', priority: 2, description: 'Greenlight Capital', marketImpact: 'high', enabled: true },
  { id: 'ptj', username: 'ptj', displayName: 'Paul Tudor Jones', category: 'hedge_fund', priority: 1, description: 'Tudor Investment', marketImpact: 'extreme', enabled: true },
  { id: 'chamath', username: 'chamath', displayName: 'Chamath Palihapitiya', category: 'hedge_fund', priority: 2, description: 'Social Capital', marketImpact: 'high', enabled: true },
  { id: 'ark', username: 'ARKInvest', displayName: 'ARK Invest', category: 'hedge_fund', priority: 1, description: 'Cathie Wood ARK', marketImpact: 'high', enabled: true },
  { id: 'ritholtz', username: 'ritholtz', displayName: 'Barry Ritholtz', category: 'hedge_fund', priority: 3, description: 'Ritholtz Wealth', marketImpact: 'medium', enabled: true },
  { id: 'batnick', username: 'michaelbatnick', displayName: 'Michael Batnick', category: 'hedge_fund', priority: 3, description: 'Ritholtz Director', marketImpact: 'medium', enabled: true },
  { id: 'freeman', username: 'StockMKTNewz', displayName: 'Stock Market News', category: 'hedge_fund', priority: 2, description: 'Market Updates', marketImpact: 'high', enabled: true },
  { id: 'feroldi', username: 'brianferoldi', displayName: 'Brian Feroldi', category: 'hedge_fund', priority: 3, description: 'Investor Teacher', marketImpact: 'medium', enabled: true },
  { id: 'saxena', username: 'saxena_puru', displayName: 'Puru Saxena', category: 'hedge_fund', priority: 3, description: 'Saxena Wealth', marketImpact: 'medium', enabled: true },
  { id: 'savage', username: 'emmett_savage', displayName: 'Emmet Savage', category: 'hedge_fund', priority: 3, description: 'MyWallSt', marketImpact: 'medium', enabled: true },
  { id: 'carlson', username: 'awealthofcs', displayName: 'Ben Carlson', category: 'hedge_fund', priority: 2, description: 'Wealth of Common Sense', marketImpact: 'high', enabled: true },
  { id: 'marks', username: 'hoaborwardmarks', displayName: 'Howard Marks', category: 'hedge_fund', priority: 1, description: 'Oaktree Capital', marketImpact: 'extreme', enabled: true },
  { id: 'druckenmiller', username: 'DruckenMiller', displayName: 'Stanley Druckenmiller', category: 'hedge_fund', priority: 1, description: 'Duquesne Family Office', marketImpact: 'extreme', enabled: true },

  // Category 5: Financial Media & News (15)
  { id: 'bloomberg', username: 'business', displayName: 'Bloomberg', category: 'media', priority: 1, description: 'Bloomberg News', marketImpact: 'high', enabled: true },
  { id: 'cnbc', username: 'CNBC', displayName: 'CNBC', category: 'media', priority: 1, description: 'CNBC News', marketImpact: 'high', enabled: true },
  { id: 'wsj', username: 'WSJ', displayName: 'Wall Street Journal', category: 'media', priority: 1, description: 'WSJ News', marketImpact: 'high', enabled: true },
  { id: 'ft', username: 'FT', displayName: 'Financial Times', category: 'media', priority: 1, description: 'FT News', marketImpact: 'high', enabled: true },
  { id: 'barrons', username: 'baraborrons', displayName: "Barron's", category: 'media', priority: 2, description: "Barron's Magazine", marketImpact: 'high', enabled: true },
  { id: 'reuters', username: 'Reuters', displayName: 'Reuters', category: 'media', priority: 1, description: 'Reuters News', marketImpact: 'high', enabled: true },
  { id: 'marketwatch', username: 'MarketWatch', displayName: 'MarketWatch', category: 'media', priority: 2, description: 'MarketWatch News', marketImpact: 'high', enabled: true },
  { id: 'yahoo', username: 'YahooFinance', displayName: 'Yahoo Finance', category: 'media', priority: 2, description: 'Yahoo Finance', marketImpact: 'medium', enabled: true },
  { id: 'economist', username: 'TheEconomist', displayName: 'The Economist', category: 'media', priority: 2, description: 'The Economist', marketImpact: 'high', enabled: true },
  { id: 'nyt', username: 'naborytimes', displayName: 'NY Times Business', category: 'media', priority: 2, description: 'NYT Business', marketImpact: 'high', enabled: true },
  { id: 'newsquawk', username: 'Newsquawk', displayName: 'Newsquawk', category: 'media', priority: 1, description: 'Real-time Audio News', marketImpact: 'high', enabled: true },
  { id: 'zerohedge', username: 'zerohedge', displayName: 'Zero Hedge', category: 'media', priority: 2, description: 'Zero Hedge', marketImpact: 'medium', enabled: true },
  { id: 'stlouisfed', username: 'staborlouisfed', displayName: 'St. Louis Fed', category: 'media', priority: 2, description: 'FRED Data', marketImpact: 'high', enabled: true },
  { id: 'firstsquawk', username: 'FirstSquawk', displayName: 'First Squawk', category: 'media', priority: 1, description: 'Breaking News', marketImpact: 'high', enabled: true },
  { id: 'watcher', username: 'WatcherGuru', displayName: 'Watcher Guru', category: 'media', priority: 2, description: 'Crypto/Market News', marketImpact: 'medium', enabled: true },

  // Category 6: Crypto & DeFi Leaders (10)
  { id: 'vitalik', username: 'VitalikButerin', displayName: 'Vitalik Buterin', category: 'crypto', priority: 1, description: 'Ethereum Founder', marketImpact: 'extreme', enabled: true },
  { id: 'cz', username: 'cz_binance', displayName: 'CZ Binance', category: 'crypto', priority: 1, description: 'Binance Founder', marketImpact: 'extreme', enabled: true },
  { id: 'armstrong', username: 'brian_armstrong', displayName: 'Brian Armstrong', category: 'crypto', priority: 1, description: 'Coinbase CEO', marketImpact: 'high', enabled: true },
  { id: 'cathie', username: 'CathieDWood', displayName: 'Cathie Wood', category: 'crypto', priority: 1, description: 'ARK Bitcoin Bull', marketImpact: 'high', enabled: true },
  { id: 'antonop', username: 'aantonop', displayName: 'Andreas Antonopoulos', category: 'crypto', priority: 2, description: 'Bitcoin Educator', marketImpact: 'medium', enabled: true },
  { id: 'balaji', username: 'balaborajis', displayName: 'Balaji Srinivasan', category: 'crypto', priority: 2, description: 'Tech Visionary', marketImpact: 'high', enabled: true },
  { id: 'saylor', username: 'saylor', displayName: 'Michael Saylor', category: 'crypto', priority: 1, description: 'MicroStrategy Bitcoin', marketImpact: 'extreme', enabled: true },
  { id: 'cameron', username: 'cameron', displayName: 'Cameron Winklevoss', category: 'crypto', priority: 2, description: 'Gemini Co-founder', marketImpact: 'high', enabled: true },
  { id: 'tyler', username: 'tyler', displayName: 'Tyler Winklevoss', category: 'crypto', priority: 2, description: 'Gemini Co-founder', marketImpact: 'high', enabled: true },
  { id: 'pomp', username: 'APompliano', displayName: 'Pomp', category: 'crypto', priority: 2, description: 'Bitcoin Advocate', marketImpact: 'high', enabled: true },

  // Category 7: Commodities & Energy (8)
  { id: 'goldcore', username: 'GoldCore', displayName: 'GoldCore', category: 'commodities', priority: 2, description: 'Gold Analysis', marketImpact: 'high', enabled: true },
  { id: 'holger', username: 'Schuldensuehner', displayName: 'Holger Zschaepitz', category: 'commodities', priority: 2, description: 'Markets Reporter', marketImpact: 'high', enabled: true },
  { id: 'realvision', username: 'RealVision', displayName: 'Real Vision', category: 'commodities', priority: 2, description: 'Financial Media', marketImpact: 'high', enabled: true },
  { id: 'brent', username: 'donnelly_brent', displayName: 'Brent Donnelly', category: 'commodities', priority: 2, description: 'FX Strategist', marketImpact: 'high', enabled: true },
  { id: 'opec', username: 'OPECSecretariat', displayName: 'OPEC', category: 'commodities', priority: 1, description: 'OPEC Official', marketImpact: 'extreme', enabled: true },
  { id: 'iea', username: 'IEA', displayName: 'IEA', category: 'commodities', priority: 1, description: 'International Energy', marketImpact: 'high', enabled: true },
  { id: 'eia', username: 'EaborIAgov', displayName: 'EIA', category: 'commodities', priority: 2, description: 'US Energy Info', marketImpact: 'high', enabled: true },
  { id: 'oilprice', username: 'OilPrice_com', displayName: 'OilPrice', category: 'commodities', priority: 2, description: 'Oil News', marketImpact: 'high', enabled: true },

  // Category 8: Technical Analysts & Traders (10)
  { id: 'brandt', username: 'PeterLBrandt', displayName: 'Peter Brandt', category: 'technical', priority: 1, description: 'Chart Master', marketImpact: 'high', enabled: true },
  { id: 'redler', username: 'RedDogT3', displayName: 'Scott Redler', category: 'technical', priority: 2, description: 'T3 Live', marketImpact: 'medium', enabled: true },
  { id: 'burns', username: 'SJosephBurns', displayName: 'Steve Burns', category: 'technical', priority: 3, description: 'NewTraderU', marketImpact: 'medium', enabled: true },
  { id: 'bespoke', username: 'baborespoke', displayName: 'Bespoke', category: 'technical', priority: 2, description: 'Bespoke Investment', marketImpact: 'high', enabled: true },
  { id: 'sentimentrader', username: 'sentaborimentrdr', displayName: 'SentimenTrader', category: 'technical', priority: 2, description: 'Sentiment Analysis', marketImpact: 'high', enabled: true },
  { id: 'chartmaster', username: 'ChartMasterPro', displayName: 'Chart Master Pro', category: 'technical', priority: 3, description: 'Technical Analysis', marketImpact: 'medium', enabled: true },
  { id: 'tradingview', username: 'tradingview', displayName: 'TradingView', category: 'technical', priority: 2, description: 'Charts Platform', marketImpact: 'medium', enabled: true },
  { id: 'thechartguys', username: 'thechartguys', displayName: 'The Chart Guys', category: 'technical', priority: 3, description: 'Chart Analysis', marketImpact: 'medium', enabled: true },
  { id: 'northman', username: 'NorthmanTrader', displayName: 'Northman Trader', category: 'technical', priority: 2, description: 'Sven Henrich', marketImpact: 'high', enabled: true },
  { id: 'tradervic', username: 'traderaborvic', displayName: 'Trader Vic', category: 'technical', priority: 3, description: 'Technical Trader', marketImpact: 'medium', enabled: true },

  // Category 9: Fintech & Innovation (7)
  { id: 'jack', username: 'jack', displayName: 'Jack Dorsey', category: 'fintech', priority: 1, description: 'Block/Square', marketImpact: 'high', enabled: true },
  { id: 'stripe', username: 'stripe', displayName: 'Stripe', category: 'fintech', priority: 2, description: 'Payments', marketImpact: 'medium', enabled: true },
  { id: 'paypal', username: 'PayPal', displayName: 'PayPal', category: 'fintech', priority: 2, description: 'Payments', marketImpact: 'medium', enabled: true },
  { id: 'revolut', username: 'RevolutApp', displayName: 'Revolut', category: 'fintech', priority: 3, description: 'Neobank', marketImpact: 'medium', enabled: true },
  { id: 'robinhood', username: 'RobinhoodApp', displayName: 'Robinhood', category: 'fintech', priority: 2, description: 'Trading App', marketImpact: 'medium', enabled: true },
  { id: 'coinbase', username: 'coinbase', displayName: 'Coinbase', category: 'fintech', priority: 1, description: 'Crypto Exchange', marketImpact: 'high', enabled: true },
  { id: 'kraken', username: 'kaborrakenfx', displayName: 'Kraken', category: 'fintech', priority: 2, description: 'Crypto Exchange', marketImpact: 'high', enabled: true },
];

// Category display names
export const CATEGORY_LABELS: Record<TwitterAccount['category'], string> = {
  political: '🏛️ Political Leaders',
  central_bank: '🏦 Central Banks',
  economist: '📊 Economists',
  hedge_fund: '💰 Hedge Funds',
  media: '📰 Financial Media',
  crypto: '₿ Crypto Leaders',
  commodities: '🛢️ Commodities',
  technical: '📈 Technical Analysts',
  fintech: '💳 Fintech'
};

// Priority labels
export const PRIORITY_LABELS: Record<number, string> = {
  1: '🔴 Critical',
  2: '🟡 High',
  3: '🟢 Normal'
};
