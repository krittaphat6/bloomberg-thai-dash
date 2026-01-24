// ActionCache.ts - Cache successful action sequences for faster replay
// Vercept-style workflow caching for improved performance

interface CachedAction {
  type: string;
  target: string;
  value?: any;
  selector?: string;
  timestamp: number;
}

interface CachedWorkflow {
  goal: string;
  actions: CachedAction[];
  successCount: number;
  lastUsed: number;
  avgDuration: number;
}

class ActionCacheService {
  private cache: Map<string, CachedWorkflow> = new Map();
  private maxCacheSize = 50;
  private STORAGE_KEY = 'able-agent-action-cache';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
      }
    } catch (e) {
      console.warn('Failed to load action cache:', e);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save action cache:', e);
    }
  }

  /**
   * Normalize goal text for matching
   */
  private normalizeGoal(goal: string): string {
    return goal
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[^\w\sก-๙]/g, '');
  }

  /**
   * Extract keywords from goal for matching
   */
  private extractKeywords(goal: string): Set<string> {
    const normalized = this.normalizeGoal(goal);
    const words = normalized.split(/\s+/).filter(w => w.length > 2);
    return new Set(words);
  }

  /**
   * Find similar cached workflow
   */
  findSimilar(goal: string): CachedWorkflow | null {
    const normalized = this.normalizeGoal(goal);

    // Exact match
    if (this.cache.has(normalized)) {
      const cached = this.cache.get(normalized)!;
      cached.lastUsed = Date.now();
      this.saveToStorage();
      console.log('🎯 ActionCache: Exact match found for goal');
      return cached;
    }

    // Fuzzy match using keywords
    const goalKeywords = this.extractKeywords(goal);
    let bestMatch: CachedWorkflow | null = null;
    let bestScore = 0;

    for (const [key, workflow] of this.cache) {
      const cachedKeywords = this.extractKeywords(key);
      const score = this.calculateSimilarity(goalKeywords, cachedKeywords);

      if (score > 0.7 && score > bestScore) {
        bestScore = score;
        bestMatch = workflow;
      }
    }

    if (bestMatch) {
      bestMatch.lastUsed = Date.now();
      this.saveToStorage();
      console.log(`🎯 ActionCache: Fuzzy match found (${Math.round(bestScore * 100)}% similarity)`);
      return bestMatch;
    }

    return null;
  }

  /**
   * Calculate similarity between two keyword sets
   */
  private calculateSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;

    let matches = 0;
    for (const word of setA) {
      if (setB.has(word)) {
        matches++;
      } else {
        // Partial match check
        for (const bWord of setB) {
          if (word.includes(bWord) || bWord.includes(word)) {
            matches += 0.5;
            break;
          }
        }
      }
    }

    return matches / Math.max(setA.size, setB.size);
  }

  /**
   * Cache a successful workflow
   */
  cacheWorkflow(goal: string, actions: CachedAction[], duration: number): void {
    const normalized = this.normalizeGoal(goal);

    const existing = this.cache.get(normalized);
    if (existing) {
      existing.successCount++;
      existing.actions = actions;
      existing.lastUsed = Date.now();
      existing.avgDuration = (existing.avgDuration + duration) / 2;
    } else {
      // Evict oldest if at capacity
      if (this.cache.size >= this.maxCacheSize) {
        let oldestKey = '';
        let oldestTime = Infinity;
        for (const [key, workflow] of this.cache) {
          if (workflow.lastUsed < oldestTime) {
            oldestTime = workflow.lastUsed;
            oldestKey = key;
          }
        }
        if (oldestKey) {
          this.cache.delete(oldestKey);
          console.log('🗑️ ActionCache: Evicted oldest entry');
        }
      }

      this.cache.set(normalized, {
        goal,
        actions,
        successCount: 1,
        lastUsed: Date.now(),
        avgDuration: duration
      });
    }

    this.saveToStorage();
    console.log(`💾 ActionCache: Cached workflow for "${goal.substring(0, 30)}..."`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; totalSuccesses: number; avgDuration: number } {
    let totalSuccesses = 0;
    let totalDuration = 0;

    for (const workflow of this.cache.values()) {
      totalSuccesses += workflow.successCount;
      totalDuration += workflow.avgDuration;
    }

    return {
      size: this.cache.size,
      totalSuccesses,
      avgDuration: this.cache.size > 0 ? totalDuration / this.cache.size : 0
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🧹 ActionCache: Cleared');
  }
}

export const ActionCache = new ActionCacheService();
