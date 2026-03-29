import { AIFunctionRegistry } from './AIFunctionRegistry';

import { Trade, TradingMetrics, calculateMetrics, calculateRMultiples, runMonteCarloSimulation, detectPsychologyPatterns, calculateCostOfEmotions, calculatePnLByDimension } from './tradingMetrics';
import { supabase } from '@/integrations/supabase/client';

export interface AppContext {
  navigate?: (path: string) => void;
  createNote?: (params: { title: string; content: string; tags: string[] }) => void;
  searchNotes?: (query: string) => any[];
  runPythonCode?: (code: string) => Promise<any>;
  runPineScript?: (code: string) => Promise<any>;
  addTrade?: (params: any) => void;
  analyzeTrades?: (timeframe: string) => Promise<any>;
  getTrades?: (timeframe?: string) => Trade[];
  getJournalMetrics?: (timeframe?: string) => TradingMetrics;
}

/**
 * Register all available AI functions
 */
export function registerAllFunctions(appContext: AppContext = {}): void {
  // Clear existing functions
  AIFunctionRegistry.clear();

  // Navigation Functions
  AIFunctionRegistry.register({
    name: 'open_dashboard',
    description: 'Open the Relationship Dashboard with network visualization',
    parameters: {},
    handler: async () => {
      if (appContext.navigate) {
        appContext.navigate('/relationship-dashboard');
      } else {
        window.location.href = '/relationship-dashboard';
      }
      return { success: true, message: 'Opening Relationship Dashboard' };
    }
  });

  AIFunctionRegistry.register({
    name: 'open_notes',
    description: 'Open the Notes and Visualization page',
    parameters: {},
    handler: async () => {
      if (appContext.navigate) {
        appContext.navigate('/notes');
      } else {
        window.location.href = '/notes';
      }
      return { success: true, message: 'Opening Notes page' };
    }
  });

  // Notes Functions
  AIFunctionRegistry.register({
    name: 'create_note',
    description: 'Create a new note with title, content, and tags',
    parameters: {
      title: {
        type: 'string',
        description: 'The title of the note'
      },
      content: {
        type: 'string',
        description: 'The content/body of the note'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of tags to categorize the note'
      }
    },
    handler: async (params) => {
      if (appContext.createNote) {
        appContext.createNote(params);
        return {
          success: true,
          message: `Created note "${params.title}" with ${params.tags?.length || 0} tags`
        };
      }
      return {
        success: false,
        message: 'Note creation not available in current context'
      };
    }
  });

  AIFunctionRegistry.register({
    name: 'search_notes',
    description: 'Search notes by query string (searches titles, content, and tags)',
    parameters: {
      query: {
        type: 'string',
        description: 'Search query string'
      }
    },
    handler: async (params) => {
      if (appContext.searchNotes) {
        const results = appContext.searchNotes(params.query);
        return {
          success: true,
          results,
          count: results.length,
          message: `Found ${results.length} notes matching "${params.query}"`
        };
      }
      return {
        success: false,
        message: 'Search not available in current context',
        results: []
      };
    }
  });

  // Code Execution Functions
  AIFunctionRegistry.register({
    name: 'run_python_code',
    description: 'Execute Python code in the code editor',
    parameters: {
      code: {
        type: 'string',
        description: 'Python code to execute'
      }
    },
    handler: async (params) => {
      if (appContext.runPythonCode) {
        try {
          const result = await appContext.runPythonCode(params.code);
          return {
            success: true,
            output: result,
            message: 'Python code executed successfully'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Python execution failed'
          };
        }
      }
      return {
        success: false,
        message: 'Python execution not available'
      };
    }
  });

  AIFunctionRegistry.register({
    name: 'run_pine_script',
    description: 'Execute Pine Script indicator/strategy code',
    parameters: {
      code: {
        type: 'string',
        description: 'Pine Script code to execute'
      }
    },
    handler: async (params) => {
      if (appContext.runPineScript) {
        try {
          const result = await appContext.runPineScript(params.code);
          return {
            success: true,
            output: result,
            message: 'Pine Script executed successfully'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Pine Script execution failed'
          };
        }
      }
      return {
        success: false,
        message: 'Pine Script execution not available'
      };
    }
  });

  // Trading Journal Functions
  AIFunctionRegistry.register({
    name: 'add_trade',
    description: 'Add a new trade entry to the trading journal',
    parameters: {
      symbol: {
        type: 'string',
        description: 'Trading symbol (e.g., AAPL, BTCUSD)'
      },
      side: {
        type: 'string',
        enum: ['LONG', 'SHORT'],
        description: 'Trade direction (LONG or SHORT)'
      },
      entryPrice: {
        type: 'number',
        description: 'Entry price for the trade'
      },
      quantity: {
        type: 'number',
        description: 'Quantity/size of the position'
      },
      strategy: {
        type: 'string',
        description: 'Trading strategy name',
        required: false
      },
      notes: {
        type: 'string',
        description: 'Additional notes about the trade',
        required: false
      }
    },
    handler: async (params) => {
      if (appContext.addTrade) {
        appContext.addTrade(params);
        return {
          success: true,
          message: `Added ${params.side} trade for ${params.symbol} at ${params.entryPrice}`
        };
      }
      return {
        success: false,
        message: 'Trading journal not available'
      };
    }
  });

  AIFunctionRegistry.register({
    name: 'analyze_trades',
    description: 'Analyze trading performance and generate insights',
    parameters: {
      timeframe: {
        type: 'string',
        enum: ['day', 'week', 'month', 'year', 'all'],
        description: 'Timeframe for analysis'
      }
    },
    handler: async (params) => {
      if (appContext.analyzeTrades) {
        try {
          const analysis = await appContext.analyzeTrades(params.timeframe);
          return {
            success: true,
            analysis,
            message: `Analysis complete for timeframe: ${params.timeframe}`
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Analysis failed'
          };
        }
      }
      return {
        success: false,
        message: 'Trade analysis not available'
      };
    }
  });

  // Utility Functions
  AIFunctionRegistry.register({
    name: 'get_current_time',
    description: 'Get the current date and time',
    parameters: {},
    handler: async () => {
      const now = new Date();
      return {
        success: true,
        timestamp: now.toISOString(),
        formatted: now.toLocaleString(),
        message: `Current time: ${now.toLocaleString()}`
      };
    }
  });

  AIFunctionRegistry.register({
    name: 'calculate',
    description: 'Perform mathematical calculations',
    parameters: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)")'
      }
    },
    handler: async (params) => {
      try {
        // Safe evaluation using Function (limited to math operations)
        const safeEval = new Function('Math', `return ${params.expression}`);
        const result = safeEval(Math);
        return {
          success: true,
          expression: params.expression,
          result,
          message: `${params.expression} = ${result}`
        };
      } catch (error) {
        return {
          success: false,
          error: 'Invalid expression',
          message: 'Could not evaluate the expression'
        };
      }
    }
  });

  // ─── QuantAgent: Multi-Agent HFT Analysis ───────────────────────────────
  AIFunctionRegistry.register({
    name: 'run_quantagent',
    description: 'รัน QuantAgent วิเคราะห์กราฟด้วย 4 AI agents: IndicatorAgent, PatternAgent, TrendAgent, RiskAgent — ใช้สำหรับวิเคราะห์ technical analysis แบบลึก',
    parameters: {
      symbol: {
        type: 'string',
        description: 'Trading symbol เช่น XAUUSD, BTCUSD, EURUSD, AAPL, TSLA'
      },
      timeframe: {
        type: 'string',
        enum: ['1m', '5m', '15m', '1h', '4h', '1D'],
        description: 'Timeframe สำหรับการวิเคราะห์',
        required: false
      },
      includeVision: {
        type: 'boolean',
        description: 'ถ้า true จะส่ง chart screenshot ให้ PatternAgent วิเคราะห์ด้วย vision AI',
        required: false
      }
    },
    handler: async (params) => {
      try {
        let chartImage: string | undefined;
        if (params.includeVision !== false) {
          try {
            const { VisionService } = await import('@/services/vision/VisionService');
            const screenshot = await VisionService.captureScreen();
            chartImage = screenshot.base64;
          } catch { /* Vision not available */ }
        }

        const { data, error } = await supabase.functions.invoke('quant-agent', {
          body: {
            symbol: params.symbol.toUpperCase(),
            timeframe: params.timeframe ?? '1h',
            chartImage,
            includeVision: !!chartImage,
          }
        });

        if (error) throw new Error(error.message);
        if (!data?.success) throw new Error(data?.error ?? 'QuantAgent failed');

        const { agents, finalDecision } = data;
        const signalEmoji: Record<string, string> = {
          STRONG_BUY: '🟢🟢', BUY: '🟢', HOLD: '🟡',
          SELL: '🔴', STRONG_SELL: '🔴🔴', WATCH: '👁️'
        };
        const emoji = signalEmoji[finalDecision.signal] ?? '🟡';

        return {
          success: true,
          formatted: `${emoji} **QuantAgent: ${data.symbol}** (${data.timeframe})
🎯 **${finalDecision.signal}** — Confidence ${finalDecision.confidence}%
💰 Target: $${finalDecision.priceTarget} | SL: $${finalDecision.stopLoss} | R:R ${finalDecision.riskReward}
📊 Indicator: ${agents.indicator.signal} (${agents.indicator.confidence}%)
🔍 Pattern: ${agents.pattern.signal} (${agents.pattern.confidence}%)
📈 Trend: ${agents.trend.signal} (${agents.trend.confidence}%)
🛡️ Risk: ${agents.risk.signal} (${agents.risk.confidence}%)

${finalDecision.rationale}`,
          raw: data,
        };
      } catch (err: any) {
        return { success: false, error: err.message, message: `QuantAgent failed: ${err.message}` };
      }
    }
  });
}
