// ═══════════════════════════════════════════════════════════════
// 📰 MULTI-SOURCE NEWS AGGREGATION SERVICE
// ═══════════════════════════════════════════════════════════════

interface NewsSource {
  id: string;
  title: string;
  url: string;
  source: 'reddit' | 'twitter' | 'rss' | 'api' | 'crypto';
  content?: string;
  author?: string;
  timestamp: number;
  score: number;
  upvotes?: number;
  comments?: number;
  category: string;
  imageUrl?: string;
}

export interface ProcessedNews extends NewsSource {
  // Advanced analytics
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  relevanceScore: number;
  qualityScore: number;
  readingTime: number;
  
  // Entity extraction
  entities: {
    tickers: string[];
    companies: string[];
    people: string[];
    locations: string[];
  };
  
  // Clustering
  clusterId?: string;
  similarArticles?: string[];
  
  // Translation
  translatedTitle?: string;
  translatedContent?: string;
  isTranslated: boolean;
}

class AdvancedNewsService {
  private cache = new Map<string, ProcessedNews[]>();
  private seenArticles = new Set<string>();
  
  // ═══════════════════════════════════════════════════════════════
  // 🔍 MULTI-SOURCE AGGREGATION
  // ═══════════════════════════════════════════════════════════════
  
  async aggregateNews(query: string, sources: string[] = ['all']): Promise<ProcessedNews[]> {
    const allNews: NewsSource[] = [];
    
    // Parallel fetching for speed
    const promises = [];
    
    if (sources.includes('all') || sources.includes('reddit')) {
      promises.push(this.fetchRedditNews(query));
    }
    
    if (sources.includes('all') || sources.includes('crypto')) {
      promises.push(this.fetchCryptoNews(query));
    }
    
    if (sources.includes('all') || sources.includes('finnhub')) {
      promises.push(this.fetchFinnhubNews(query));
    }
    
    const results = await Promise.allSettled(promises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        allNews.push(...result.value);
      }
    });
    
    // Process all news through NLP pipeline
    const processed = await this.processNewsArticles(allNews);
    
    // Deduplicate
    const deduplicated = this.deduplicateNews(processed);
    
    // Cluster similar articles
    const clustered = this.clusterNews(deduplicated);
    
    // Rank by quality and relevance
    const ranked = this.rankNews(clustered, query);
    
    return ranked;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📡 DATA SOURCE FETCHERS
  // ═══════════════════════════════════════════════════════════════
  
  private async fetchRedditNews(query: string): Promise<NewsSource[]> {
    try {
      const searchQuery = `${query} (finance OR trading OR crypto OR stock)`;
      
      const response = await fetch(
        `https://www.reddit.com/search.json?q=${encodeURIComponent(searchQuery)}&sort=relevance&t=day&limit=50`
      );
      
      if (!response.ok) throw new Error('Reddit API error');
      
      const data = await response.json();
      
      return data.data.children.map((post: any) => ({
        id: `reddit-${post.data.id}`,
        title: post.data.title,
        source: 'reddit' as const,
        url: `https://reddit.com${post.data.permalink}`,
        content: post.data.selftext || '',
        author: post.data.author,
        timestamp: post.data.created_utc * 1000,
        score: post.data.score,
        upvotes: post.data.ups,
        comments: post.data.num_comments,
        category: post.data.subreddit,
        imageUrl: post.data.thumbnail !== 'self' ? post.data.thumbnail : undefined
      }));
    } catch (error) {
      console.error('Reddit fetch error:', error);
      return [];
    }
  }
  
  private async fetchCryptoNews(query: string): Promise<NewsSource[]> {
    try {
      const response = await fetch(
        `https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=${query}`
      );
      
      if (!response.ok) throw new Error('CryptoCompare error');
      
      const data = await response.json();
      
      return data.Data.slice(0, 30).map((item: any) => ({
        id: `crypto-${item.id}`,
        title: item.title,
        source: 'crypto' as const,
        url: item.url,
        content: item.body || '',
        author: item.source,
        timestamp: item.published_on * 1000,
        score: 0,
        category: item.categories || 'Cryptocurrency',
        imageUrl: item.imageurl
      }));
    } catch (error) {
      console.error('Crypto news fetch error:', error);
      return [];
    }
  }
  
  private async fetchFinnhubNews(query: string): Promise<NewsSource[]> {
    try {
      // Finnhub API - 60 calls/minute free tier
      const apiKey = 'demo';
      const response = await fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`
      );
      
      if (!response.ok) throw new Error('Finnhub error');
      
      const data = await response.json();
      
      return data.slice(0, 20).map((item: any) => ({
        id: `finnhub-${item.id}`,
        title: item.headline,
        source: 'api' as const,
        url: item.url,
        content: item.summary || '',
        author: item.source,
        timestamp: item.datetime * 1000,
        score: 0,
        category: item.category || 'Finance',
        imageUrl: item.image
      }));
    } catch (error) {
      console.error('Finnhub fetch error:', error);
      return [];
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🧠 NLP PROCESSING PIPELINE
  // ═══════════════════════════════════════════════════════════════
  
  private async processNewsArticles(articles: NewsSource[]): Promise<ProcessedNews[]> {
    return articles.map(article => {
      // 1. Sentiment Analysis
      const sentimentResult = this.analyzeSentiment(article.title + ' ' + (article.content || ''));
      
      // 2. Entity Extraction
      const entities = this.extractEntities(article.title + ' ' + (article.content || ''));
      
      // 3. Quality Scoring
      const qualityScore = this.calculateQualityScore(article);
      
      // 4. Relevance Scoring (will be calculated later with query)
      const relevanceScore = 50;
      
      // 5. Reading Time Estimation
      const readingTime = this.estimateReadingTime(article.content || article.title);
      
      return {
        ...article,
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.score,
        relevanceScore,
        qualityScore,
        readingTime,
        entities,
        isTranslated: false
      };
    });
  }
  
  private analyzeSentiment(text: string): { sentiment: 'bullish' | 'bearish' | 'neutral'; score: number } {
    const lowerText = text.toLowerCase();
    
    // Financial sentiment keywords
    const bullishWords = [
      'bull', 'bullish', 'moon', 'pump', 'surge', 'rally', 'gain', 'profit',
      'breakout', 'soar', 'explode', 'parabolic', 'rocket', 'green', 'up',
      'high', 'record', 'all-time', 'ath', 'breakthrough', 'success', 'win'
    ];
    
    const bearishWords = [
      'bear', 'bearish', 'dump', 'crash', 'fall', 'decline', 'drop', 'plunge',
      'collapse', 'fail', 'scam', 'red', 'down', 'loss', 'plummet', 'tank',
      'correction', 'pullback', 'sell-off', 'liquidation'
    ];
    
    let bullishScore = 0;
    let bearishScore = 0;
    
    bullishWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      bullishScore += matches;
    });
    
    bearishWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      bearishScore += matches;
    });
    
    // Combine scores
    const totalBullish = bullishScore;
    const totalBearish = bearishScore;
    
    if (totalBullish > totalBearish + 2) {
      return { sentiment: 'bullish', score: totalBullish / (totalBullish + totalBearish + 1) };
    } else if (totalBearish > totalBullish + 2) {
      return { sentiment: 'bearish', score: totalBearish / (totalBullish + totalBearish + 1) };
    }
    
    return { sentiment: 'neutral', score: 0.5 };
  }
  
  private extractEntities(text: string): ProcessedNews['entities'] {
    const entities: ProcessedNews['entities'] = {
      tickers: [],
      companies: [],
      people: [],
      locations: []
    };
    
    // Extract stock tickers (simple regex)
    const tickerRegex = /\b[A-Z]{1,5}\b/g;
    const commonTickers = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE'];
    const tickers = text.match(tickerRegex) || [];
    entities.tickers = [...new Set(tickers.filter(t => commonTickers.includes(t)))];
    
    // Extract company names
    const companies = ['Apple', 'Google', 'Microsoft', 'Tesla', 'Amazon', 'Meta', 'Nvidia', 'Bitcoin', 'Ethereum', 'Binance'];
    entities.companies = companies.filter(company => 
      text.includes(company) || text.toLowerCase().includes(company.toLowerCase())
    );
    
    // Extract people
    const people = ['Elon Musk', 'Warren Buffett', 'Jerome Powell', 'Janet Yellen', 'Sam Altman', 'CZ', 'Vitalik'];
    entities.people = people.filter(person => text.includes(person));
    
    return entities;
  }
  
  private calculateQualityScore(article: NewsSource): number {
    let score = 50;
    
    // Source reputation
    const highQualitySources = ['reuters', 'bloomberg', 'wsj', 'ft', 'cnbc', 'coindesk', 'cointelegraph'];
    if (highQualitySources.some(source => article.source.toLowerCase().includes(source) || 
                                           article.author?.toLowerCase().includes(source))) {
      score += 20;
    }
    
    // Title quality (not clickbait)
    const clickbaitWords = ['shocking', 'you won\'t believe', 'this one trick', 'doctors hate'];
    const isClickbait = clickbaitWords.some(word => article.title.toLowerCase().includes(word));
    if (isClickbait) {
      score -= 30;
    }
    
    // Content length
    if (article.content && article.content.length > 500) {
      score += 15;
    }
    
    // Social engagement
    if (article.upvotes && article.upvotes > 100) {
      score += Math.min(20, Math.log10(article.upvotes) * 5);
    }
    
    // Recency bonus
    const hoursOld = (Date.now() - article.timestamp) / (1000 * 60 * 60);
    if (hoursOld < 1) score += 15;
    else if (hoursOld < 6) score += 10;
    else if (hoursOld < 24) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private estimateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🔄 DEDUPLICATION (MinHash-inspired)
  // ═══════════════════════════════════════════════════════════════
  
  private deduplicateNews(articles: ProcessedNews[]): ProcessedNews[] {
    const unique: ProcessedNews[] = [];
    const seen = new Set<string>();
    
    for (const article of articles) {
      const signature = this.generateArticleSignature(article);
      
      let isDuplicate = false;
      for (const seenSig of seen) {
        if (this.calculateSimilarity(signature, seenSig) > 0.8) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        unique.push(article);
        seen.add(signature);
      }
    }
    
    return unique;
  }
  
  private generateArticleSignature(article: ProcessedNews): string {
    const text = (article.title + ' ' + (article.content || '')).toLowerCase();
    return text.substring(0, 150).replace(/[^a-z0-9\s]/g, '');
  }
  
  private calculateSimilarity(sig1: string, sig2: string): number {
    const words1 = new Set(sig1.split(/\s+/));
    const words2 = new Set(sig2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🎯 NEWS CLUSTERING
  // ═══════════════════════════════════════════════════════════════
  
  private clusterNews(articles: ProcessedNews[]): ProcessedNews[] {
    const clusters = new Map<string, ProcessedNews[]>();
    
    articles.forEach(article => {
      let bestCluster: string | null = null;
      let bestSimilarity = 0;
      
      for (const [clusterId, clusterArticles] of clusters) {
        const similarity = this.calculateTopicSimilarity(article, clusterArticles[0]);
        if (similarity > bestSimilarity && similarity > 0.6) {
          bestSimilarity = similarity;
          bestCluster = clusterId;
        }
      }
      
      if (bestCluster) {
        clusters.get(bestCluster)!.push(article);
        article.clusterId = bestCluster;
      } else {
        const newClusterId = `cluster-${clusters.size}`;
        clusters.set(newClusterId, [article]);
        article.clusterId = newClusterId;
      }
    });
    
    articles.forEach(article => {
      if (article.clusterId) {
        const clusterArticles = clusters.get(article.clusterId) || [];
        article.similarArticles = clusterArticles
          .filter(a => a.id !== article.id)
          .slice(0, 3)
          .map(a => a.id);
      }
    });
    
    return articles;
  }
  
  private calculateTopicSimilarity(article1: ProcessedNews, article2: ProcessedNews): number {
    const tickers1 = new Set(article1.entities.tickers);
    const tickers2 = new Set(article2.entities.tickers);
    const tickerOverlap = [...tickers1].filter(t => tickers2.has(t)).length;
    
    const companies1 = new Set(article1.entities.companies);
    const companies2 = new Set(article2.entities.companies);
    const companyOverlap = [...companies1].filter(c => companies2.has(c)).length;
    
    const titleSim = this.calculateSimilarity(
      article1.title.toLowerCase(),
      article2.title.toLowerCase()
    );
    
    return (tickerOverlap * 0.3 + companyOverlap * 0.3 + titleSim * 0.4);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 📊 RANKING ALGORITHM
  // ═══════════════════════════════════════════════════════════════
  
  private rankNews(articles: ProcessedNews[], query: string): ProcessedNews[] {
    articles.forEach(article => {
      article.relevanceScore = this.calculateRelevance(article, query);
    });
    
    const scored = articles.map(article => ({
      article,
      finalScore: (
        article.relevanceScore * 0.35 +
        article.qualityScore * 0.30 +
        article.sentimentScore * 20 * 0.15 +
        (100 - Math.min(100, (Date.now() - article.timestamp) / (1000 * 60 * 10))) * 0.20
      )
    }));
    
    scored.sort((a, b) => b.finalScore - a.finalScore);
    
    return scored.map(s => s.article);
  }
  
  private calculateRelevance(article: ProcessedNews, query: string): number {
    const lowerTitle = article.title.toLowerCase();
    const lowerContent = (article.content || '').toLowerCase();
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/);
    
    let score = 0;
    
    if (lowerTitle.includes(lowerQuery) || lowerContent.includes(lowerQuery)) {
      score += 50;
    }
    
    queryWords.forEach(word => {
      if (lowerTitle.includes(word)) {
        score += 10;
        const position = lowerTitle.indexOf(word);
        score += Math.max(0, 10 - position / 10);
      }
      if (lowerContent.includes(word)) {
        score += 5;
      }
    });
    
    if (article.entities.tickers.some(t => lowerQuery.includes(t.toLowerCase()))) {
      score += 20;
    }
    if (article.entities.companies.some(c => lowerQuery.includes(c.toLowerCase()))) {
      score += 15;
    }
    
    return Math.min(100, score);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🌐 TRANSLATION SERVICE
  // ═══════════════════════════════════════════════════════════════
  
  async translateToThai(articles: ProcessedNews[]): Promise<ProcessedNews[]> {
    const glossary: Record<string, string> = {
      'bull': 'บูล (แนวโน้มขาขึ้น)',
      'bear': 'แบร์ (แนวโน้มขาลง)',
      'bullish': 'ขาขึ้น',
      'bearish': 'ขาลง',
      'rally': 'ทรงตัวขึ้น',
      'crash': 'พังทลาย',
      'surge': 'พุ่งขึ้น',
      'plunge': 'ดิ่งลง',
      'breakout': 'ทะลุแนวต้าน',
      'support': 'แนวรับ',
      'resistance': 'แนวต้าน',
      'Bitcoin': 'บิทคอยน์',
      'Ethereum': 'อีเธอเรียม',
      'cryptocurrency': 'สกุลเงินดิจิทัล',
      'blockchain': 'บล็อกเชน',
      'stock': 'หุ้น',
      'market': 'ตลาด',
      'trading': 'การเทรด',
      'investment': 'การลงทุน',
      'profit': 'กำไร',
      'loss': 'ขาดทุน',
      'price': 'ราคา',
      'volume': 'ปริมาณ',
      'all-time high': 'จุดสูงสุดใหม่',
      'ATH': 'จุดสูงสุดใหม่',
      'pump': 'ปั๊มราคา',
      'dump': 'ทิ้งราคา',
      'whale': 'วาฬ (นักลงทุนรายใหญ่)',
      'hodl': 'ถือยาว',
      'moon': 'ขึ้นดวงจันทร์',
      'dip': 'ราคาตก',
      'correction': 'การปรับฐาน'
    };
    
    const translated = await Promise.all(
      articles.map(async (article) => {
        try {
          const translatedTitle = await this.translateText(article.title, glossary);
          const translatedContent = article.content 
            ? await this.translateText(article.content.substring(0, 500), glossary)
            : undefined;
          
          return {
            ...article,
            translatedTitle,
            translatedContent,
            isTranslated: true
          };
        } catch (error) {
          console.error('Translation error:', error);
          return article;
        }
      })
    );
    
    return translated;
  }
  
  private async translateText(text: string, glossary: Record<string, string>): Promise<string> {
    let protectedText = text;
    const protectedTerms: Array<{ original: string; placeholder: string }> = [];
    
    // Protect tickers
    const tickerRegex = /\b[A-Z]{2,5}\b/g;
    const tickers = text.match(tickerRegex) || [];
    tickers.forEach((ticker, i) => {
      const placeholder = `__TICKER${i}__`;
      protectedTerms.push({ original: ticker, placeholder });
      protectedText = protectedText.replace(new RegExp(`\\b${ticker}\\b`), placeholder);
    });
    
    // Apply glossary terms
    Object.entries(glossary).forEach(([en, th]) => {
      const regex = new RegExp(`\\b${en}\\b`, 'gi');
      protectedText = protectedText.replace(regex, th);
    });
    
    // Mock translation (add [TH] prefix to indicate translated)
    const mockTranslated = `[TH] ${protectedText}`;
    
    // Restore protected terms
    let finalText = mockTranslated;
    protectedTerms.forEach(({ original, placeholder }) => {
      finalText = finalText.replace(placeholder, original);
    });
    
    return finalText;
  }
}

export const advancedNewsService = new AdvancedNewsService();
