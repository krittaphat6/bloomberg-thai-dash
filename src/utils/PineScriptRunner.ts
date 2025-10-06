export interface PineScriptResult {
  name: string;
  values: number[];
  type: 'line' | 'histogram' | 'arrow';
  color?: string;
}

export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class PineScriptRunner {
  /**
   * Run Pine Script code with provided market data
   */
  static async runPineScript(code: string, data: OHLCData[]): Promise<PineScriptResult[]> {
    try {
      // Parse Pine Script and convert to JavaScript
      const jsCode = this.transpilePineToJS(code);

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
        results: [] as PineScriptResult[]
      };

      // Execute the transpiled code
      const func = new Function('context', `
        with(context) {
          ${jsCode}
          return results;
        }
      `);

      const results = func(context);
      return results;
    } catch (error) {
      console.error('Pine Script execution error:', error);
      throw new Error(`Pine Script Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transpile Pine Script to JavaScript
   */
  private static transpilePineToJS(pineCode: string): string {
    let js = pineCode;

    // Remove version directive
    js = js.replace(/^\/\/@version=\d+/gm, '// Pine Script');

    // Convert indicator() declaration
    js = js.replace(/indicator\((.*?)\)/g, (match, params) => {
      const titleMatch = params.match(/["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : 'Indicator';
      return `const indicatorTitle = "${title}";`;
    });

    // Convert input() to variable declarations
    js = js.replace(/(\w+)\s*=\s*input\((.*?),\s*title\s*=\s*["']([^"']+)["']\)/g, 
      (match, varName, defaultValue, title) => {
        return `const ${varName} = ${defaultValue}; // ${title}`;
      }
    );

    // Convert plot() to results.push()
    js = js.replace(/plot\((.*?),\s*(?:color\s*=\s*color\.(\w+),\s*)?title\s*=\s*["']([^"']+)["']\)/g,
      (match, series, color, title) => {
        const colorValue = color ? `'${this.getColorHex(color)}'` : "'#3B82F6'";
        return `results.push({ name: "${title}", values: ${series}, type: 'line', color: ${colorValue} });`;
      }
    );

    // Convert hline()
    js = js.replace(/hline\((.*?),\s*["']([^"']+)["'],\s*color\s*=\s*color\.(\w+)\)/g,
      (match, value, title, color) => {
        const colorValue = this.getColorHex(color);
        const arrayValue = `Array(close.length).fill(${value})`;
        return `results.push({ name: "${title}", values: ${arrayValue}, type: 'line', color: '${colorValue}' });`;
      }
    );

    // Convert ta.crossover() and ta.crossunder()
    js = js.replace(/ta\.crossover\(/g, 'ta.crossover(');
    js = js.replace(/ta\.crossunder\(/g, 'ta.crossunder(');

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
      teal: '#14B8A6'
    };
    return colorMap[colorName.toLowerCase()] || '#3B82F6';
  }

  /**
   * Technical Analysis library
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

      rsi: (data: number[], length: number = 14): number[] => {
        const changes: number[] = [];
        for (let i = 1; i < data.length; i++) {
          changes.push(data[i] - data[i - 1]);
        }

        const gains = changes.map(c => (c > 0 ? c : 0));
        const losses = changes.map(c => (c < 0 ? -c : 0));

        const avgGains: number[] = [];
        const avgLosses: number[] = [];

        // Initial averages
        let gainSum = gains.slice(0, length).reduce((a, b) => a + b, 0) / length;
        let lossSum = losses.slice(0, length).reduce((a, b) => a + b, 0) / length;

        avgGains.push(gainSum);
        avgLosses.push(lossSum);

        // Smoothed averages
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

        // Pad beginning with NaN
        return Array(length).fill(NaN).concat(rsi);
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
      }
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
