import { NewsSourceConfig, AIModelConfig } from '@/types/news';

export const NEWS_SOURCES: NewsSourceConfig[] = [
  // === TIER 1: Premium Financial News ===
  {
    id: 'forexfactory',
    name: 'ForexFactory',
    shortName: 'FF',
    icon: 'Calendar',
    color: '#1E88E5',
    type: 'rss',
    endpoint: 'https://www.forexfactory.com/rss.php',
    apiKeyRequired: false,
    rateLimit: 30,
    priority: 1,
    categories: ['forex', 'economic', 'calendar'],
    enabled: true,
    parseFunction: 'parseForexFactoryRSS'
  },
  {
    id: 'kitco',
    name: 'Kitco News',
    shortName: 'Kitco',
    icon: 'Gem',
    color: '#FFD700',
    type: 'rss',
    endpoint: 'https://www.kitco.com/rss/news.xml',
    apiKeyRequired: false,
    rateLimit: 30,
    priority: 1,
    categories: ['gold', 'silver', 'commodities', 'precious-metals'],
    enabled: true,
    parseFunction: 'parseKitcoRSS'
  },
  {
    id: 'investing',
    name: 'Investing.com',
    shortName: 'Inv',
    icon: 'TrendingUp',
    color: '#00AA00',
    type: 'rss',
    endpoint: 'https://www.investing.com/rss/news.rss',
    apiKeyRequired: false,
    rateLimit: 30,
    priority: 1,
    categories: ['all', 'stocks', 'forex', 'crypto', 'commodities'],
    enabled: true,
    parseFunction: 'parseInvestingRSS'
  },
  
  // === TIER 2: Forex Specific ===
  {
    id: 'fxstreet',
    name: 'FXStreet',
    shortName: 'FXS',
    icon: 'DollarSign',
    color: '#003366',
    type: 'rss',
    endpoint: 'https://www.fxstreet.com/rss/news',
    apiKeyRequired: false,
    rateLimit: 30,
    priority: 2,
    categories: ['forex', 'analysis'],
    enabled: true,
    parseFunction: 'parseFXStreetRSS'
  },
  {
    id: 'dailyfx',
    name: 'DailyFX',
    shortName: 'DFX',
    icon: 'LineChart',
    color: '#1A1A2E',
    type: 'rss',
    endpoint: 'https://www.dailyfx.com/feeds/market-news',
    apiKeyRequired: false,
    rateLimit: 30,
    priority: 2,
    categories: ['forex', 'analysis', 'technical'],
    enabled: true,
    parseFunction: 'parseDailyFXRSS'
  },
  
  // === TIER 2: Crypto Specific ===
  {
    id: 'cryptopanic',
    name: 'CryptoPanic',
    shortName: 'CP',
    icon: 'Zap',
    color: '#00D395',
    type: 'api',
    endpoint: 'https://cryptopanic.com/api/v1/posts/',
    apiKeyRequired: true,
    apiKeyEnvVar: 'CRYPTOPANIC_API_KEY',
    rateLimit: 60,
    priority: 2,
    categories: ['crypto', 'bitcoin', 'altcoins'],
    enabled: true,
    parseFunction: 'parseCryptoPanicAPI'
  },
  {
    id: 'coindesk',
    name: 'CoinDesk',
    shortName: 'CD',
    icon: 'Bitcoin',
    color: '#F7931A',
    type: 'rss',
    endpoint: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    apiKeyRequired: false,
    rateLimit: 30,
    priority: 2,
    categories: ['crypto', 'blockchain', 'defi'],
    enabled: true,
    parseFunction: 'parseCoindeskRSS'
  },
  {
    id: 'theblock',
    name: 'The Block',
    shortName: 'TB',
    icon: 'Box',
    color: '#000000',
    type: 'rss',
    endpoint: 'https://www.theblock.co/rss.xml',
    apiKeyRequired: false,
    rateLimit: 30,
    priority: 2,
    categories: ['crypto', 'defi', 'institutional'],
    enabled: true,
    parseFunction: 'parseTheBlockRSS'
  },
  {
    id: 'decrypt',
    name: 'Decrypt',
    shortName: 'Dec',
    icon: 'Lock',
    color: '#5B21B6',
    type: 'rss',
    endpoint: 'https://decrypt.co/feed',
    apiKeyRequired: false,
    rateLimit: 30,
    priority: 3,
    categories: ['crypto', 'web3', 'nft'],
    enabled: true,
    parseFunction: 'parseDecryptRSS'
  },
  
  // === TIER 3: Community/Social ===
  {
    id: 'reddit-crypto',
    name: 'r/cryptocurrency',
    shortName: 'r/crypto',
    icon: 'MessageCircle',
    color: '#FF5700',
    type: 'api',
    endpoint: 'https://www.reddit.com/r/cryptocurrency/hot.json',
    apiKeyRequired: false,
    rateLimit: 60,
    priority: 3,
    categories: ['crypto', 'community'],
    enabled: true,
    parseFunction: 'parseRedditAPI'
  },
  {
    id: 'reddit-forex',
    name: 'r/Forex',
    shortName: 'r/forex',
    icon: 'MessageCircle',
    color: '#FF5700',
    type: 'api',
    endpoint: 'https://www.reddit.com/r/Forex/hot.json',
    apiKeyRequired: false,
    rateLimit: 60,
    priority: 3,
    categories: ['forex', 'community'],
    enabled: true,
    parseFunction: 'parseRedditAPI'
  },
  {
    id: 'reddit-gold',
    name: 'r/Gold',
    shortName: 'r/gold',
    icon: 'MessageCircle',
    color: '#FF5700',
    type: 'api',
    endpoint: 'https://www.reddit.com/r/Gold/hot.json',
    apiKeyRequired: false,
    rateLimit: 60,
    priority: 3,
    categories: ['gold', 'community'],
    enabled: true,
    parseFunction: 'parseRedditAPI'
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    shortName: 'HN',
    icon: 'Zap',
    color: '#FF6600',
    type: 'api',
    endpoint: 'https://hn.algolia.com/api/v1/search?tags=story&query=',
    apiKeyRequired: false,
    rateLimit: 100,
    priority: 4,
    categories: ['tech', 'finance', 'startup'],
    enabled: true,
    parseFunction: 'parseHackerNewsAPI'
  },
  
  // === TIER 1: Stock Market ===
  {
    id: 'seekingalpha',
    name: 'Seeking Alpha',
    shortName: 'SA',
    icon: 'BookOpen',
    color: '#F98F1F',
    type: 'rss',
    endpoint: 'https://seekingalpha.com/market_currents.xml',
    apiKeyRequired: false,
    rateLimit: 30,
    priority: 2,
    categories: ['stocks', 'analysis', 'earnings'],
    enabled: true,
    parseFunction: 'parseSeekingAlphaRSS'
  },
  {
    id: 'finnhub',
    name: 'Finnhub',
    shortName: 'FH',
    icon: 'BarChart3',
    color: '#2563EB',
    type: 'api',
    endpoint: 'https://finnhub.io/api/v1/news',
    apiKeyRequired: true,
    apiKeyEnvVar: 'FINNHUB_API_KEY',
    rateLimit: 60,
    priority: 2,
    categories: ['stocks', 'market', 'earnings'],
    enabled: false,
    parseFunction: 'parseFinnhubAPI'
  },
  {
    id: 'cryptocompare',
    name: 'CryptoCompare',
    shortName: 'CC',
    icon: 'Globe',
    color: '#00D395',
    type: 'api',
    endpoint: 'https://min-api.cryptocompare.com/data/v2/news/',
    apiKeyRequired: false,
    rateLimit: 60,
    priority: 2,
    categories: ['crypto'],
    enabled: true,
    parseFunction: 'parseCryptoCompareAPI'
  }
];

// Source credibility weights for impact scoring
export const SOURCE_CREDIBILITY: Record<string, number> = {
  'forexfactory': 20,
  'kitco': 19,
  'investing': 18,
  'fxstreet': 17,
  'dailyfx': 17,
  'coindesk': 16,
  'theblock': 16,
  'cryptopanic': 15,
  'seekingalpha': 15,
  'finnhub': 15,
  'cryptocompare': 14,
  'decrypt': 14,
  'reddit-crypto': 10,
  'reddit-forex': 10,
  'reddit-gold': 10,
  'hackernews': 10
};

export const AI_MODELS: AIModelConfig[] = [
  {
    id: 'groq-llama',
    provider: 'groq',
    name: 'Groq Llama 3.1 70B',
    model: 'llama-3.1-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    maxTokens: 2000,
    temperature: 0.3,
    costPer1kTokens: 0,
    speed: 'fast',
    accuracy: 'high',
    supportsStreaming: true
  },
  {
    id: 'groq-llama-small',
    provider: 'groq',
    name: 'Groq Llama 3.1 8B',
    model: 'llama-3.1-8b-instant',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    maxTokens: 2000,
    temperature: 0.3,
    costPer1kTokens: 0,
    speed: 'fast',
    accuracy: 'medium',
    supportsStreaming: true
  },
  {
    id: 'openai-gpt4',
    provider: 'openai',
    name: 'GPT-4 Turbo',
    model: 'gpt-4-turbo-preview',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    maxTokens: 2000,
    temperature: 0.3,
    costPer1kTokens: 0.01,
    speed: 'medium',
    accuracy: 'high',
    supportsStreaming: true
  },
  {
    id: 'openai-gpt35',
    provider: 'openai',
    name: 'GPT-3.5 Turbo',
    model: 'gpt-3.5-turbo',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    maxTokens: 2000,
    temperature: 0.3,
    costPer1kTokens: 0.0005,
    speed: 'fast',
    accuracy: 'medium',
    supportsStreaming: true
  },
  {
    id: 'anthropic-claude',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    model: 'claude-3-5-sonnet-20241022',
    endpoint: 'https://api.anthropic.com/v1/messages',
    maxTokens: 2000,
    temperature: 0.3,
    costPer1kTokens: 0.003,
    speed: 'medium',
    accuracy: 'high',
    supportsStreaming: true
  },
  {
    id: 'ollama-llama',
    provider: 'ollama',
    name: 'Ollama Llama 3.2',
    model: 'llama3.2',
    endpoint: 'http://localhost:11434/api/chat',
    maxTokens: 2000,
    temperature: 0.3,
    costPer1kTokens: 0,
    speed: 'slow',
    accuracy: 'medium',
    supportsStreaming: true
  },
  {
    id: 'gemini-flash',
    provider: 'gemini',
    name: 'Gemini 2.0 Flash',
    model: 'gemini-2.0-flash-exp',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    maxTokens: 2000,
    temperature: 0.3,
    costPer1kTokens: 0,
    speed: 'fast',
    accuracy: 'high',
    supportsStreaming: true
  },
  {
    id: 'lovable-ai',
    provider: 'lovable',
    name: 'Lovable AI (Gemini)',
    model: 'google/gemini-2.5-flash',
    endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    maxTokens: 2000,
    temperature: 0.3,
    costPer1kTokens: 0,
    speed: 'fast',
    accuracy: 'high',
    supportsStreaming: false
  }
];

export const AI_PROMPTS = {
  tradingAnalysis: `คุณเป็นนักวิเคราะห์การเงินมืออาชีพระดับ Wall Street เชี่ยวชาญ Gold, Forex, Crypto

วิเคราะห์ข่าวต่อไปนี้และให้ผลลัพธ์เป็น JSON:

กฎการวิเคราะห์:
1. sentiment: "bullish" / "bearish" / "neutral"
2. confidence: 0.0-1.0 (ความมั่นใจในการวิเคราะห์)
3. impact: "critical" / "high" / "medium" / "low"
4. timeHorizon: "immediate" (<1ชม.) / "short" (<1วัน) / "medium" (<1สัปดาห์) / "long" (>1สัปดาห์)
5. tradingSignal: คำแนะนำการเทรด
6. relatedTickers: สินทรัพย์ที่เกี่ยวข้อง (XAUUSD, EURUSD, BTC, etc.)
7. summary: สรุปเป็นภาษาไทย 1 ประโยค (ไม่เกิน 80 ตัวอักษร)
8. keyPoints: จุดสำคัญ 2-3 ข้อเป็นภาษาไทย (แต่ละข้อไม่เกิน 40 ตัวอักษร)

ข่าวที่ต้องวิเคราะห์:
{headlines}

ตอบเป็น JSON เท่านั้น ห้ามมี markdown หรือ text อื่น:
{
  "analyses": [
    {
      "id": "news-id",
      "sentiment": "bullish",
      "confidence": 0.85,
      "impact": "high",
      "timeHorizon": "short",
      "tradingSignal": {
        "action": "buy",
        "strength": 75,
        "suggestedAssets": ["XAUUSD", "EURUSD"],
        "direction": "long",
        "timeframe": "4H-1D",
        "reasoning": "Fed dovish = USD weak = Gold strong",
        "riskLevel": "medium"
      },
      "relatedTickers": ["XAUUSD", "DXY", "EURUSD", "GLD"],
      "summary": "Fed ส่งสัญญาณ dovish หนุนทองคำและ EUR",
      "keyPoints": ["Fed อาจชะลอขึ้นดอกเบี้ย", "Dollar อ่อนค่า", "Safe haven demand เพิ่ม"]
    }
  ]
}`,

  quickSentiment: `วิเคราะห์ sentiment ของหัวข้อข่าวนี้แบบรวดเร็ว:
"{headline}"

ตอบเป็น JSON เท่านั้น:
{"sentiment": "bullish/bearish/neutral", "confidence": 0.0-1.0, "impact": "high/medium/low"}`,

  marketImpact: `วิเคราะห์ผลกระทบของข่าวนี้ต่อตลาดต่างๆ:
"{headline}"

ให้ผลกระทบต่อ:
1. USD Index (DXY)
2. Gold (XAUUSD)
3. EUR/USD
4. USD/JPY
5. BTC/USD
6. S&P 500

ตอบเป็น JSON:
{
  "impacts": [
    {"asset": "DXY", "direction": "up/down/neutral", "magnitude": "strong/moderate/weak", "reason": "..."},
  ]
}`
};
