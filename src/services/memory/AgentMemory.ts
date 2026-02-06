// AgentMemory.ts - SuperClaw Memory & Learning System
// Persistent memory with pattern learning for improved automation

import { supabase } from '@/integrations/supabase/client';

export interface ActionMemory {
  id: string;
  goal: string;
  action: string;
  target: string;
  method: 'css' | 'text' | 'vision' | 'memory' | 'cdp';
  success: boolean;
  confidence: number;
  executionTime: number;
  timestamp: number;
  screenshot?: string;
  errorMessage?: string;
}

export interface LearningPattern {
  pattern: string;
  category: string;
  successRate: number;
  usageCount: number;
  bestMethod: string;
  avgConfidence: number;
  lastUsed: number;
}

export interface MemoryStats {
  totalMemories: number;
  successRate: number;
  topMethods: Array<{ method: string; count: number }>;
  recentFailures: ActionMemory[];
}

class AgentMemoryClass {
  private cache: Map<string, ActionMemory[]> = new Map();
  private patterns: Map<string, LearningPattern> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private userId: string | null = null;

  /**
   * Initialize with user ID
   */
  initialize(userId: string): void {
    this.userId = userId;
  }

  /**
   * Remember a successful or failed action
   */
  async remember(memory: Omit<ActionMemory, 'id' | 'timestamp'>): Promise<void> {
    if (!this.userId) {
      console.log('⚠️ No user ID set, memory not saved');
      return;
    }

    const record: ActionMemory = {
      ...memory,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    try {
      await supabase.from('agent_memory').insert({
        id: record.id,
        user_id: this.userId,
        goal: record.goal,
        action: record.action,
        target: record.target,
        method: record.method,
        success: record.success,
        confidence: record.confidence,
        execution_time: record.executionTime,
        screenshot: record.screenshot,
        error_message: record.errorMessage
      });

      // Update cache
      const cacheKey = this.getCacheKey(record.goal, record.action);
      if (!this.cache.has(cacheKey)) {
        this.cache.set(cacheKey, []);
      }
      this.cache.get(cacheKey)!.push(record);

      // Learn from this action
      await this.learn(record);

      console.log(`🧠 Memory saved: ${record.action} ${record.success ? '✅' : '❌'}`);
    } catch (error) {
      console.error('Failed to save memory:', error);
    }
  }

  /**
   * Recall past successful actions
   */
  async recall(goal: string, action: string, limit = 10): Promise<ActionMemory[]> {
    if (!this.userId) return [];

    const cacheKey = this.getCacheKey(goal, action);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.length > 0) {
      return cached.filter(m => m.success).slice(0, limit);
    }

    // Query database
    const { data, error } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('user_id', this.userId)
      .ilike('goal', `%${goal}%`)
      .eq('action', action)
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to recall memory:', error);
      return [];
    }

    const memories: ActionMemory[] = (data || []).map(d => ({
      id: d.id,
      goal: d.goal,
      action: d.action,
      target: d.target,
      method: d.method as ActionMemory['method'],
      success: d.success,
      confidence: d.confidence,
      executionTime: d.execution_time,
      timestamp: new Date(d.created_at).getTime(),
      screenshot: d.screenshot,
      errorMessage: d.error_message
    }));

    this.cache.set(cacheKey, memories);
    return memories;
  }

  /**
   * Get best method for an action based on learning
   */
  async getBestMethod(action: string): Promise<{ method: string; confidence: number }> {
    const pattern = this.patterns.get(action);
    if (pattern && pattern.successRate > 70) {
      return {
        method: pattern.bestMethod,
        confidence: pattern.avgConfidence
      };
    }

    // Query database for statistics
    if (!this.userId) {
      return { method: 'css', confidence: 50 };
    }

    const { data, error } = await supabase.rpc('get_best_method_stats', {
      action_type: action
    });

    if (error || !data || data.length === 0) {
      return { method: 'css', confidence: 50 };
    }

    const best = data[0];
    return {
      method: best.method,
      confidence: best.avg_confidence || 50
    };
  }

  /**
   * Get learning statistics
   */
  async getStats(): Promise<MemoryStats> {
    if (!this.userId) {
      return {
        totalMemories: 0,
        successRate: 0,
        topMethods: [],
        recentFailures: []
      };
    }

    // Get total count and success rate
    const { data: statsData } = await supabase
      .from('agent_memory')
      .select('success')
      .eq('user_id', this.userId);

    const totalMemories = statsData?.length || 0;
    const successCount = statsData?.filter(m => m.success).length || 0;
    const successRate = totalMemories > 0 ? (successCount / totalMemories) * 100 : 0;

    // Get top methods
    const { data: methodData } = await supabase
      .from('agent_memory')
      .select('method')
      .eq('user_id', this.userId)
      .eq('success', true);

    const methodCounts: Record<string, number> = {};
    methodData?.forEach(m => {
      methodCounts[m.method] = (methodCounts[m.method] || 0) + 1;
    });

    const topMethods = Object.entries(methodCounts)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent failures
    const { data: failureData } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('user_id', this.userId)
      .eq('success', false)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentFailures: ActionMemory[] = (failureData || []).map(d => ({
      id: d.id,
      goal: d.goal,
      action: d.action,
      target: d.target,
      method: d.method as ActionMemory['method'],
      success: d.success,
      confidence: d.confidence,
      executionTime: d.execution_time,
      timestamp: new Date(d.created_at).getTime(),
      errorMessage: d.error_message
    }));

    return {
      totalMemories,
      successRate,
      topMethods,
      recentFailures
    };
  }

  /**
   * Clear old memories (keep last 30 days)
   */
  async cleanup(): Promise<void> {
    if (!this.userId) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await supabase
      .from('agent_memory')
      .delete()
      .eq('user_id', this.userId)
      .lt('created_at', thirtyDaysAgo.toISOString());

    this.cache.clear();
    console.log('🧹 Memory cleanup completed');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.patterns.clear();
  }

  // =================== Private Methods ===================

  private async learn(memory: ActionMemory): Promise<void> {
    const patternKey = memory.action;

    let pattern = this.patterns.get(patternKey);
    if (!pattern) {
      pattern = {
        pattern: memory.action,
        category: this.categorizeAction(memory.action),
        successRate: 0,
        usageCount: 0,
        bestMethod: memory.method,
        avgConfidence: 0,
        lastUsed: memory.timestamp
      };
      this.patterns.set(patternKey, pattern);
    }

    // Update statistics
    pattern.usageCount++;
    pattern.lastUsed = memory.timestamp;

    const successValue = memory.success ? 100 : 0;
    pattern.successRate =
      (pattern.successRate * (pattern.usageCount - 1) + successValue) / pattern.usageCount;

    pattern.avgConfidence =
      (pattern.avgConfidence * (pattern.usageCount - 1) + memory.confidence) / pattern.usageCount;

    if (memory.success && memory.confidence > pattern.avgConfidence) {
      pattern.bestMethod = memory.method;
    }
  }

  private getCacheKey(goal: string, action: string): string {
    return `${goal.toLowerCase().replace(/\s+/g, '_')}_${action}`;
  }

  private categorizeAction(action: string): string {
    if (action.includes('click') || action.includes('type')) return 'interaction';
    if (action.includes('navigate') || action.includes('scroll')) return 'navigation';
    if (action.includes('analyze') || action.includes('vision')) return 'analysis';
    return 'other';
  }
}

export const AgentMemory = new AgentMemoryClass();
