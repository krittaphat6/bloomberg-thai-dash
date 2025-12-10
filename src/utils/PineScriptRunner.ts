export interface PineScriptResult {
  name: string;
  values: number[];
  type: 'line' | 'histogram' | 'arrow' | 'hline';
  color?: string;
  lineWidth?: number;
  hlineValue?: number;
}

export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PineScriptError {
  line: number;
  message: string;
}

export class PineScriptRunner {
  private static debugMode = false;

  static setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
  }

  /**
   * Run Pine Script code with provided market data
   */
  static async runPineScript(code: string, data: OHLCData[]): Promise<PineScriptResult[]> {
    try {
      if (this.debugMode) {
        console.log('🔧 Pine Script Debug: Starting execution');
        console.log('Code:', code);
        console.log('Data points:', data.length);
      }

      // Parse Pine Script and convert to JavaScript
      const jsCode = this.transpilePineToJS(code);

      if (this.debugMode) {
        console.log('Transpiled JS:', jsCode);
      }

      // Create execution context
      const context = {
        data,
        close: data.map(d => d.close),
        open: data.map(d => d.open),
        high: data.map(d => d.high),
        low: data.map(d => d.low),
        volume: data.map(d => d.volume),
        ta: this.getTALibrary(),
        math: Math,
        results: [] as PineScriptResult[],
        debug: this.debugMode ? console.log.bind(console) : () => {},
      };

      // Execute the transpiled code
      const func = new Function('context', `
        with(context) {
          ${jsCode}
          return results;
        }
      `);

      const results = func(context);

      if (this.debugMode) {
        console.log('Results:', results);
      }

      return results;
    } catch (error) {
      console.error('Pine Script execution error:', error);
      throw new Error(`Pine Script Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate Pine Script syntax
   */
  static validateScript(code: string): PineScriptError[] {
    const errors: PineScriptError[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check for basic syntax issues
      const trimmed = line.trim();
      
      // Check unclosed parentheses
      const openParens = (trimmed.match(/\(/g) || []).length;
      const closeParens = (trimmed.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push({ line: index + 1, message: 'Unbalanced parentheses' });
      }

      // Check for undefined function calls (basic check)
      const funcMatch = trimmed.match(/(\w+)\s*\(/g);
      if (funcMatch) {
        const knownFuncs = ['ta.sma', 'ta.ema', 'ta.rsi', 'ta.macd', 'ta.stoch', 'ta.atr', 
          'ta.bb', 'ta.vwap', 'ta.stdev', 'ta.crossover', 'ta.crossunder', 'ta.highest', 
          'ta.lowest', 'plot', 'hline', 'input', 'indicator', 'strategy', 'math.abs', 
          'math.max', 'math.min', 'math.sqrt', 'math.pow'];
        // Basic validation could be expanded
      }
    });

    return errors;
  }

  /**
   * Transpile Pine Script to JavaScript
   */
  private static transpilePineToJS(pineCode: string): string {
    let js = pineCode;

    // Remove version directive
    js = js.replace(/^\/\/@version=\d+/gm, '// Pine Script');

    // Convert indicator() declaration
    js = js.replace(/indicator\s*\((.*?)\)/g, (match, params) => {
      const titleMatch = params.match(/["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : 'Indicator';
      return `const indicatorTitle = "${title}";`;
    });

    // Convert strategy() declaration
    js = js.replace(/strategy\s*\((.*?)\)/g, (match, params) => {
      const titleMatch = params.match(/["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : 'Strategy';
      return `const strategyTitle = "${title}";`;
    });

    // Convert input() to variable declarations - multiple formats
    js = js.replace(/(\w+)\s*=\s*input\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*title\s*=\s*["']([^"']+)["']\s*\)/g, 
      (match, varName, defaultValue, title) => {
        return `const ${varName} = ${defaultValue}; // ${title}`;
      }
    );
    
    js = js.replace(/(\w+)\s*=\s*input\s*\(\s*(\d+(?:\.\d+)?)\s*\)/g, 
      (match, varName, defaultValue) => {
        return `const ${varName} = ${defaultValue};`;
      }
    );

    // Convert ta.stdev()
    js = js.replace(/ta\.stdev\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.stdev($1, $2)');

    // Convert ta.atr() - needs high, low, close
    js = js.replace(/ta\.atr\s*\(\s*close\s*,\s*high\s*,\s*low\s*,\s*(\w+)\s*\)/g, 'ta.atr(high, low, close, $1)');
    js = js.replace(/ta\.atr\s*\(\s*(\w+)\s*\)/g, 'ta.atr(high, low, close, $1)');

    // Convert ta.stoch()
    js = js.replace(/ta\.stoch\s*\(\s*close\s*,\s*high\s*,\s*low\s*,\s*(\w+)\s*\)/g, 'ta.stoch(close, high, low, $1)');

    // Convert ta.vwap()
    js = js.replace(/ta\.vwap\s*\(\s*close\s*,\s*volume\s*\)/g, 'ta.vwap(close, volume)');

    // Convert plot() - multiple formats
    js = js.replace(/plot\s*\(\s*(\w+)\s*,\s*color\s*=\s*color\.(\w+)\s*,\s*title\s*=\s*["']([^"']+)["']\s*\)/g,
      (match, series, color, title) => {
        const colorValue = this.getColorHex(color);
        return `results.push({ name: "${title}", values: ${series}, type: 'line', color: '${colorValue}' });`;
      }
    );

    js = js.replace(/plot\s*\(\s*(\w+)\s*,\s*title\s*=\s*["']([^"']+)["']\s*,\s*color\s*=\s*color\.(\w+)\s*\)/g,
      (match, series, title, color) => {
        const colorValue = this.getColorHex(color);
        return `results.push({ name: "${title}", values: ${series}, type: 'line', color: '${colorValue}' });`;
      }
    );

    js = js.replace(/plot\s*\(\s*(\w+)\s*,\s*color\s*=\s*color\.(\w+)\s*\)/g,
      (match, series, color) => {
        const colorValue = this.getColorHex(color);
        return `results.push({ name: "${series}", values: ${series}, type: 'line', color: '${colorValue}' });`;
      }
    );

    // Convert hline()
    js = js.replace(/hline\s*\(\s*(\d+)\s*,\s*["']([^"']+)["']\s*,\s*color\s*=\s*color\.(\w+)\s*\)/g,
      (match, value, title, color) => {
        const colorValue = this.getColorHex(color);
        return `results.push({ name: "${title}", values: Array(close.length).fill(${value}), type: 'hline', color: '${colorValue}', hlineValue: ${value} });`;
      }
    );

    js = js.replace(/hline\s*\(\s*(\d+)\s*,\s*["']([^"']+)["']\s*\)/g,
      (match, value, title) => {
        return `results.push({ name: "${title}", values: Array(close.length).fill(${value}), type: 'hline', color: '#888888', hlineValue: ${value} });`;
      }
    );

    // Convert variable assignments with ta functions
    js = js.replace(/(\w+)\s*=\s*ta\.(\w+)\s*\((.*?)\)/g, 
      (match, varName, funcName, args) => {
        return `const ${varName} = ta.${funcName}(${args});`;
      }
    );

    // Convert simple arithmetic on arrays
    js = js.replace(/(\w+)\s*=\s*(\w+)\s*-\s*(\w+)/g,
      (match, result, a, b) => {
        // Check if these are array operations
        return `const ${result} = Array.isArray(${a}) ? ${a}.map((v, i) => v - ${b}[i]) : ${a} - ${b};`;
      }
    );

    js = js.replace(/(\w+)\s*=\s*(\w+)\s*\+\s*(\w+)/g,
      (match, result, a, b) => {
        return `const ${result} = Array.isArray(${a}) ? ${a}.map((v, i) => v + ${b}[i]) : ${a} + ${b};`;
      }
    );

    return js;
  }

  /**
   * Get color hex code from Pine Script color name
   */
  private static getColorHex(colorName: string): string {
    const colorMap: Record<string, string> = {
      blue: '#3B82F6',
      red: '#EF4444',
      green: '#22C55E',
      purple: '#8B5CF6',
      orange: '#F97316',
      gray: '#6B7280',
      yellow: '#EAB308',
      teal: '#14B8A6',
      white: '#FFFFFF',
      black: '#000000',
      aqua: '#00FFFF',
      lime: '#00FF00',
      fuchsia: '#FF00FF',
      silver: '#C0C0C0',
      maroon: '#800000',
      navy: '#000080',
      olive: '#808000',
    };
    return colorMap[colorName.toLowerCase()] || '#3B82F6';
  }

  /**
   * Technical Analysis library with all functions
   */
  private static getTALibrary() {
    return {
      sma: (data: number[], length: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < data.length; i++) {
          if (i < length - 1) {
            result.push(NaN);
          } else {
            const sum = data.slice(i - length + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / length);
          }
        }
        return result;
      },

      ema: (data: number[], length: number): number[] => {
        const k = 2 / (length + 1);
        const result: number[] = [data[0]];
        for (let i = 1; i < data.length; i++) {
          result.push(data[i] * k + result[i - 1] * (1 - k));
        }
        return result;
      },

      wma: (data: number[], length: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < data.length; i++) {
          if (i < length - 1) {
            result.push(NaN);
          } else {
            let weightedSum = 0;
            let weightSum = 0;
            for (let j = 0; j < length; j++) {
              const weight = length - j;
              weightedSum += data[i - j] * weight;
              weightSum += weight;
            }
            result.push(weightedSum / weightSum);
          }
        }
        return result;
      },

      rsi: (data: number[], length: number = 14): number[] => {
        const changes: number[] = [];
        for (let i = 1; i < data.length; i++) {
          changes.push(data[i] - data[i - 1]);
        }

        const gains = changes.map(c => (c > 0 ? c : 0));
        const losses = changes.map(c => (c < 0 ? -c : 0));

        const avgGains: number[] = [];
        const avgLosses: number[] = [];

        let gainSum = gains.slice(0, length).reduce((a, b) => a + b, 0) / length;
        let lossSum = losses.slice(0, length).reduce((a, b) => a + b, 0) / length;

        avgGains.push(gainSum);
        avgLosses.push(lossSum);

        for (let i = length; i < gains.length; i++) {
          gainSum = (avgGains[avgGains.length - 1] * (length - 1) + gains[i]) / length;
          lossSum = (avgLosses[avgLosses.length - 1] * (length - 1) + losses[i]) / length;
          avgGains.push(gainSum);
          avgLosses.push(lossSum);
        }

        const rsi = avgGains.map((gain, i) => {
          const avgLoss = avgLosses[i];
          if (avgLoss === 0) return 100;
          const rs = gain / avgLoss;
          return 100 - 100 / (1 + rs);
        });

        return Array(length).fill(NaN).concat(rsi);
      },

      stdev: (data: number[], length: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < data.length; i++) {
          if (i < length - 1) {
            result.push(NaN);
          } else {
            const slice = data.slice(i - length + 1, i + 1);
            const mean = slice.reduce((a, b) => a + b, 0) / length;
            const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / length;
            result.push(Math.sqrt(variance));
          }
        }
        return result;
      },

      atr: (high: number[], low: number[], close: number[], length: number): number[] => {
        const tr: number[] = [];
        for (let i = 0; i < high.length; i++) {
          if (i === 0) {
            tr.push(high[i] - low[i]);
          } else {
            const hl = high[i] - low[i];
            const hc = Math.abs(high[i] - close[i - 1]);
            const lc = Math.abs(low[i] - close[i - 1]);
            tr.push(Math.max(hl, hc, lc));
          }
        }
        
        // Use RMA (same as EMA with different smoothing)
        const result: number[] = [];
        let sum = 0;
        for (let i = 0; i < tr.length; i++) {
          if (i < length) {
            sum += tr[i];
            result.push(i === length - 1 ? sum / length : NaN);
          } else {
            const atr = (result[i - 1] * (length - 1) + tr[i]) / length;
            result.push(atr);
          }
        }
        return result;
      },

      stoch: (close: number[], high: number[], low: number[], length: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < close.length; i++) {
          if (i < length - 1) {
            result.push(NaN);
          } else {
            const highSlice = high.slice(i - length + 1, i + 1);
            const lowSlice = low.slice(i - length + 1, i + 1);
            const hh = Math.max(...highSlice);
            const ll = Math.min(...lowSlice);
            const k = ((close[i] - ll) / (hh - ll)) * 100;
            result.push(k);
          }
        }
        return result;
      },

      vwap: (close: number[], volume: number[]): number[] => {
        const result: number[] = [];
        let cumVol = 0;
        let cumVolPrice = 0;
        
        for (let i = 0; i < close.length; i++) {
          cumVol += volume[i];
          cumVolPrice += close[i] * volume[i];
          result.push(cumVolPrice / cumVol);
        }
        return result;
      },

      crossover: (series1: number[], series2: number[]): boolean[] => {
        return series1.map((v, i) => {
          if (i === 0) return false;
          return series1[i - 1] <= series2[i - 1] && v > series2[i];
        });
      },

      crossunder: (series1: number[], series2: number[]): boolean[] => {
        return series1.map((v, i) => {
          if (i === 0) return false;
          return series1[i - 1] >= series2[i - 1] && v < series2[i];
        });
      },

      highest: (data: number[], length: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < data.length; i++) {
          if (i < length - 1) {
            result.push(NaN);
          } else {
            const slice = data.slice(i - length + 1, i + 1);
            result.push(Math.max(...slice));
          }
        }
        return result;
      },

      lowest: (data: number[], length: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < data.length; i++) {
          if (i < length - 1) {
            result.push(NaN);
          } else {
            const slice = data.slice(i - length + 1, i + 1);
            result.push(Math.min(...slice));
          }
        }
        return result;
      },

      change: (data: number[], length: number = 1): number[] => {
        return data.map((v, i) => i < length ? NaN : v - data[i - length]);
      },

      mom: (data: number[], length: number): number[] => {
        return data.map((v, i) => i < length ? NaN : v - data[i - length]);
      },

      roc: (data: number[], length: number): number[] => {
        return data.map((v, i) => {
          if (i < length) return NaN;
          return ((v - data[i - length]) / data[i - length]) * 100;
        });
      },
    };
  }

  /**
   * Generate mock OHLC data for testing
   */
  static generateMockOHLC(bars: number = 100): OHLCData[] {
    const data: OHLCData[] = [];
    let price = 100;
    const startTime = Date.now() - bars * 24 * 60 * 60 * 1000;

    for (let i = 0; i < bars; i++) {
      const change = (Math.random() - 0.5) * 4;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      const volume = Math.floor(Math.random() * 1000000) + 500000;

      data.push({
        timestamp: startTime + i * 24 * 60 * 60 * 1000,
        open,
        high,
        low,
        close,
        volume
      });

      price = close;
    }

    return data;
  }
}
