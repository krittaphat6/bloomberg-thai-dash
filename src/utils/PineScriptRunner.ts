export interface PineScriptResult {
  name: string;
  values: number[];
  type: 'line' | 'histogram' | 'arrow' | 'hline' | 'bgcolor';
  color?: string;
  lineWidth?: number;
  hlineValue?: number;
  style?: string;
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
  type: 'syntax' | 'runtime' | 'validation';
  line: number;
  column?: number;
  message: string;
  suggestion?: string;
}

export interface ExecutionMetrics {
  startTime: number;
  endTime: number;
  executionMs: number;
  dataPoints: number;
}

export class PineScriptRunner {
  private static debugMode = false;
  private static lastMetrics: ExecutionMetrics | null = null;

  static setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
  }

  static getLastMetrics(): ExecutionMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Run Pine Script code with provided market data
   */
  static async runPineScript(code: string, data: OHLCData[]): Promise<PineScriptResult[]> {
    const startTime = performance.now();
    
    try {
      if (this.debugMode) {
        console.log('🔧 Pine Script Debug: Starting execution');
        console.log('Code:', code);
        console.log('Data points:', data.length);
      }

      // Validate first
      const errors = this.validateScript(code);
      if (errors.length > 0) {
        const errorMsg = errors.map(e => `Line ${e.line}: ${e.message}`).join('\n');
        throw new Error(`Validation errors:\n${errorMsg}`);
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
        hl2: data.map(d => (d.high + d.low) / 2),
        hlc3: data.map(d => (d.high + d.low + d.close) / 3),
        ohlc4: data.map(d => (d.open + d.high + d.low + d.close) / 4),
        ta: this.getTALibrary(),
        math: Math,
        na: NaN,
        results: [] as PineScriptResult[],
        debug: this.debugMode ? console.log.bind(console) : () => {},
        color: this.getColorLibrary(),
      };

      // Execute the transpiled code safely
      const func = new Function('context', `
        with(context) {
          try {
            ${jsCode}
            return results;
          } catch(e) {
            throw new Error('Runtime: ' + e.message);
          }
        }
      `);

      const results = func(context);
      
      const endTime = performance.now();
      this.lastMetrics = {
        startTime,
        endTime,
        executionMs: endTime - startTime,
        dataPoints: data.length,
      };

      if (this.debugMode) {
        console.log('Results:', results);
        console.log('Execution time:', this.lastMetrics.executionMs.toFixed(2), 'ms');
      }

      return results;
    } catch (error) {
      console.error('Pine Script execution error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Pine Script Error: ${message}`);
    }
  }

  /**
   * Validate Pine Script syntax
   */
  static validateScript(code: string): PineScriptError[] {
    const errors: PineScriptError[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;
      
      // Check unclosed parentheses
      const openParens = (trimmed.match(/\(/g) || []).length;
      const closeParens = (trimmed.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push({ 
          type: 'syntax',
          line: index + 1, 
          message: 'Unbalanced parentheses',
          suggestion: 'Check for missing ( or )'
        });
      }

      // Check unclosed brackets
      const openBrackets = (trimmed.match(/\[/g) || []).length;
      const closeBrackets = (trimmed.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        errors.push({ 
          type: 'syntax',
          line: index + 1, 
          message: 'Unbalanced brackets',
          suggestion: 'Check for missing [ or ]'
        });
      }

      // Check for common Pine Script typos
      if (/\bta\.\w+\s*[^(]/.test(trimmed) && !trimmed.includes('=')) {
        const match = trimmed.match(/\bta\.(\w+)/);
        if (match) {
          errors.push({
            type: 'syntax',
            line: index + 1,
            message: `ta.${match[1]} appears to be missing parentheses`,
            suggestion: `Use ta.${match[1]}(...)`
          });
        }
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
    js = js.replace(/^\/\/@version=\d+\s*/gm, '// Pine Script\n');

    // Remove single-line comments but preserve them as JS comments
    js = js.replace(/\/\/(.*)$/gm, '// $1');

    // Convert indicator() declaration - handle all parameter formats
    js = js.replace(/indicator\s*\(\s*["']([^"']+)["'](?:\s*,\s*[^)]*?)?\s*\)/g, (match, title) => {
      return `const indicatorTitle = "${title}";`;
    });

    // Convert strategy() declaration
    js = js.replace(/strategy\s*\(\s*["']([^"']+)["'](?:\s*,\s*[^)]*?)?\s*\)/g, (match, title) => {
      return `const strategyTitle = "${title}";`;
    });

    // Convert input.int(), input.float(), input.bool(), input.string()
    js = js.replace(/(\w+)\s*=\s*input\.int\s*\(\s*(\d+)(?:\s*,\s*["']([^"']+)["'])?[^)]*\)/g, 
      (match, varName, defaultValue, title) => {
        return `const ${varName} = ${defaultValue};${title ? ` // ${title}` : ''}`;
      }
    );
    
    js = js.replace(/(\w+)\s*=\s*input\.float\s*\(\s*([\d.]+)(?:\s*,\s*["']([^"']+)["'])?[^)]*\)/g, 
      (match, varName, defaultValue, title) => {
        return `const ${varName} = ${defaultValue};${title ? ` // ${title}` : ''}`;
      }
    );

    js = js.replace(/(\w+)\s*=\s*input\.bool\s*\(\s*(true|false)(?:\s*,\s*["']([^"']+)["'])?[^)]*\)/g, 
      (match, varName, defaultValue, title) => {
        return `const ${varName} = ${defaultValue};${title ? ` // ${title}` : ''}`;
      }
    );

    js = js.replace(/(\w+)\s*=\s*input\.string\s*\(\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?[^)]*\)/g, 
      (match, varName, defaultValue, title) => {
        return `const ${varName} = "${defaultValue}";${title ? ` // ${title}` : ''}`;
      }
    );

    // Convert input() to variable declarations - various formats
    js = js.replace(/(\w+)\s*=\s*input\s*\(\s*([\d.]+)\s*,\s*title\s*=\s*["']([^"']+)["'][^)]*\)/g, 
      (match, varName, defaultValue, title) => {
        return `const ${varName} = ${defaultValue}; // ${title}`;
      }
    );

    js = js.replace(/(\w+)\s*=\s*input\s*\(\s*([\d.]+)\s*,\s*["']([^"']+)["'][^)]*\)/g, 
      (match, varName, defaultValue, title) => {
        return `const ${varName} = ${defaultValue}; // ${title}`;
      }
    );
    
    js = js.replace(/(\w+)\s*=\s*input\s*\(\s*([\d.]+)\s*\)/g, 
      (match, varName, defaultValue) => {
        return `const ${varName} = ${defaultValue};`;
      }
    );

    // Convert var and varip declarations
    js = js.replace(/\bvar\s+(\w+)\s*=/g, 'let $1 =');
    js = js.replace(/\bvarip\s+(\w+)\s*=/g, 'let $1 =');

    // Convert ta.crossover and ta.crossunder
    js = js.replace(/ta\.crossover\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.crossover($1, $2)');
    js = js.replace(/ta\.crossunder\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.crossunder($1, $2)');

    // Convert ta.highest and ta.lowest
    js = js.replace(/ta\.highest\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.highest($1, $2)');
    js = js.replace(/ta\.lowest\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.lowest($1, $2)');

    // Convert ta.change
    js = js.replace(/ta\.change\s*\(\s*(\w+)\s*\)/g, 'ta.change($1, 1)');
    js = js.replace(/ta\.change\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.change($1, $2)');

    // Convert ta.stdev()
    js = js.replace(/ta\.stdev\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.stdev($1, $2)');

    // Convert ta.atr() - handle various formats
    js = js.replace(/ta\.atr\s*\(\s*close\s*,\s*high\s*,\s*low\s*,\s*(\w+)\s*\)/g, 'ta.atr(high, low, close, $1)');
    js = js.replace(/ta\.atr\s*\(\s*(\w+)\s*\)/g, 'ta.atr(high, low, close, $1)');

    // Convert ta.stoch()
    js = js.replace(/ta\.stoch\s*\(\s*close\s*,\s*high\s*,\s*low\s*,\s*(\w+)\s*\)/g, 'ta.stoch(close, high, low, $1)');

    // Convert ta.vwap()
    js = js.replace(/ta\.vwap\s*\(\s*close\s*,\s*volume\s*\)/g, 'ta.vwap(close, volume)');
    js = js.replace(/ta\.vwap\s*\(\s*(\w+)\s*\)/g, 'ta.vwap($1, volume)');

    // Convert ta.bb() - Bollinger Bands
    js = js.replace(/ta\.bb\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.bb($1, $2, $3)');

    // Convert ta.macd()
    js = js.replace(/ta\.macd\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.macd($1, $2, $3, $4)');

    // Convert ta.cci()
    js = js.replace(/ta\.cci\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.cci($1, $2)');
    js = js.replace(/ta\.cci\s*\(\s*(\w+)\s*\)/g, 'ta.cci(hlc3, $1)');

    // Convert ta.wpr() - Williams %R
    js = js.replace(/ta\.wpr\s*\(\s*(\w+)\s*\)/g, 'ta.wpr(high, low, close, $1)');

    // Convert ta.obv()
    js = js.replace(/ta\.obv\s*\(\s*\)/g, 'ta.obv(close, volume)');

    // Convert ta.pivothigh and ta.pivotlow
    js = js.replace(/ta\.pivothigh\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.pivothigh($1, $2, $3)');
    js = js.replace(/ta\.pivotlow\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.pivotlow($1, $2, $3)');

    // Convert ta.adx()
    js = js.replace(/ta\.adx\s*\(\s*(\w+)\s*\)/g, 'ta.adx(high, low, close, $1)');

    // Convert plot() - handle all formats
    // plot(series, color=color.blue, title="Title")
    js = js.replace(/plot\s*\(\s*(\w+)\s*,\s*color\s*=\s*color\.(\w+)\s*,\s*title\s*=\s*["']([^"']+)["'](?:\s*,\s*[^)]*?)?\s*\)/g,
      (match, series, colorName, title) => {
        const colorValue = this.getColorHex(colorName);
        return `results.push({ name: "${title}", values: ${series}, type: 'line', color: '${colorValue}' });`;
      }
    );

    // plot(series, title="Title", color=color.blue)
    js = js.replace(/plot\s*\(\s*(\w+)\s*,\s*title\s*=\s*["']([^"']+)["']\s*,\s*color\s*=\s*color\.(\w+)(?:\s*,\s*[^)]*?)?\s*\)/g,
      (match, series, title, colorName) => {
        const colorValue = this.getColorHex(colorName);
        return `results.push({ name: "${title}", values: ${series}, type: 'line', color: '${colorValue}' });`;
      }
    );

    // plot(series, color=color.blue)
    js = js.replace(/plot\s*\(\s*(\w+)\s*,\s*color\s*=\s*color\.(\w+)(?:\s*,\s*[^)]*?)?\s*\)/g,
      (match, series, colorName) => {
        const colorValue = this.getColorHex(colorName);
        return `results.push({ name: "${series}", values: ${series}, type: 'line', color: '${colorValue}' });`;
      }
    );

    // plot(series, "Title") - simple format
    js = js.replace(/plot\s*\(\s*(\w+)\s*,\s*["']([^"']+)["']\s*\)/g,
      (match, series, title) => {
        return `results.push({ name: "${title}", values: ${series}, type: 'line', color: '#3B82F6' });`;
      }
    );

    // plot(series) - simplest format
    js = js.replace(/plot\s*\(\s*(\w+)\s*\)/g,
      (match, series) => {
        return `results.push({ name: "${series}", values: ${series}, type: 'line', color: '#3B82F6' });`;
      }
    );

    // Convert color.new() - handle transparency
    js = js.replace(/color\.new\s*\(\s*color\.(\w+)\s*,\s*(\d+)\s*\)/g, (match, colorName, transp) => {
      const hex = this.getColorHex(colorName);
      const alpha = Math.round((100 - parseInt(transp)) / 100 * 255).toString(16).padStart(2, '0');
      return `'${hex}${alpha}'`;
    });

    // Convert hline()
    js = js.replace(/hline\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*["']([^"']+)["']\s*,\s*color\s*=\s*color\.(\w+)(?:\s*,\s*[^)]*?)?\s*\)/g,
      (match, value, title, colorName) => {
        const colorValue = this.getColorHex(colorName);
        return `results.push({ name: "${title}", values: Array(close.length).fill(${value}), type: 'hline', color: '${colorValue}', hlineValue: ${value} });`;
      }
    );

    js = js.replace(/hline\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*["']([^"']+)["']\s*\)/g,
      (match, value, title) => {
        return `results.push({ name: "${title}", values: Array(close.length).fill(${value}), type: 'hline', color: '#888888', hlineValue: ${value} });`;
      }
    );

    js = js.replace(/hline\s*\(\s*(\d+(?:\.\d+)?)\s*\)/g,
      (match, value) => {
        return `results.push({ name: "Level ${value}", values: Array(close.length).fill(${value}), type: 'hline', color: '#888888', hlineValue: ${value} });`;
      }
    );

    // Convert bgcolor()
    js = js.replace(/bgcolor\s*\(\s*(\w+)\s*\?\s*color\.(\w+)\s*:\s*na(?:\s*,\s*[^)]*?)?\s*\)/g,
      (match, condition, colorName) => {
        const colorValue = this.getColorHex(colorName);
        return `results.push({ name: "bgcolor", values: ${condition}.map(v => v ? 1 : 0), type: 'bgcolor', color: '${colorValue}' });`;
      }
    );

    // Convert variable assignments with ta functions
    js = js.replace(/(\w+)\s*=\s*ta\.(sma|ema|wma|rsi|stoch|atr|vwap|stdev|highest|lowest|change|mom|roc|cci|obv|adx|wpr)\s*\(([^)]+)\)/g, 
      (match, varName, funcName, args) => {
        return `const ${varName} = ta.${funcName}(${args});`;
      }
    );

    // Convert array operations (subtraction)
    js = js.replace(/(\w+)\s*=\s*(\w+)\s*-\s*(\w+)(?![.\w])/g,
      (match, result, a, b) => {
        // Only convert if not already converted
        if (match.includes('const ') || match.includes('let ')) return match;
        return `const ${result} = Array.isArray(${a}) && Array.isArray(${b}) ? ${a}.map((v, i) => v - ${b}[i]) : (Array.isArray(${a}) ? ${a}.map(v => v - ${b}) : ${a} - ${b});`;
      }
    );

    // Convert array operations (addition)
    js = js.replace(/(\w+)\s*=\s*(\w+)\s*\+\s*(\w+)(?![.\w])/g,
      (match, result, a, b) => {
        if (match.includes('const ') || match.includes('let ')) return match;
        return `const ${result} = Array.isArray(${a}) && Array.isArray(${b}) ? ${a}.map((v, i) => v + ${b}[i]) : (Array.isArray(${a}) ? ${a}.map(v => v + ${b}) : ${a} + ${b});`;
      }
    );

    // Convert array operations (multiplication)
    js = js.replace(/(\w+)\s*=\s*(\w+)\s*\*\s*(\w+)(?![.\w])/g,
      (match, result, a, b) => {
        if (match.includes('const ') || match.includes('let ')) return match;
        return `const ${result} = Array.isArray(${a}) && Array.isArray(${b}) ? ${a}.map((v, i) => v * ${b}[i]) : (Array.isArray(${a}) ? ${a}.map(v => v * ${b}) : ${a} * ${b});`;
      }
    );

    // Convert array operations (division)
    js = js.replace(/(\w+)\s*=\s*(\w+)\s*\/\s*(\w+)(?![.\w])/g,
      (match, result, a, b) => {
        if (match.includes('const ') || match.includes('let ')) return match;
        return `const ${result} = Array.isArray(${a}) && Array.isArray(${b}) ? ${a}.map((v, i) => v / ${b}[i]) : (Array.isArray(${a}) ? ${a}.map(v => v / ${b}) : ${a} / ${b});`;
      }
    );

    // Handle if-else ternary conditions
    js = js.replace(/(\w+)\s*\?\s*(\w+)\s*:\s*na/g, '$1 ? $2 : NaN');

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
      grey: '#6B7280',
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
      new: '#3B82F6', // Default for color.new
    };
    return colorMap[colorName.toLowerCase()] || '#3B82F6';
  }

  /**
   * Color library for Pine Script
   */
  private static getColorLibrary() {
    return {
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
      new: (baseColor: string, transparency: number) => {
        const hex = typeof baseColor === 'string' && baseColor.startsWith('#') ? baseColor : '#3B82F6';
        const alpha = Math.round((100 - transparency) / 100 * 255).toString(16).padStart(2, '0');
        return `${hex}${alpha}`;
      }
    };
  }

  /**
   * Technical Analysis library with all functions
   */
  private static getTALibrary() {
    // Define helper functions first so they can reference each other
    const sma = (data: number[], length: number): number[] => {
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
    };

    const ema = (data: number[], length: number): number[] => {
      const k = 2 / (length + 1);
      const result: number[] = [data[0]];
      for (let i = 1; i < data.length; i++) {
        result.push(data[i] * k + result[i - 1] * (1 - k));
      }
      return result;
    };

    const stdev = (data: number[], length: number): number[] => {
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
    };

    const rma = (data: number[], length: number): number[] => {
      const alpha = 1 / length;
      const result: number[] = [];
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        if (i < length) {
          sum += data[i];
          result.push(i === length - 1 ? sum / length : NaN);
        } else {
          const prev = result[i - 1];
          result.push(alpha * data[i] + (1 - alpha) * prev);
        }
      }
      return result;
    };

    return {
      sma,
      ema,
      stdev,
      rma,

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

        const rsiValues = avgGains.map((gain, i) => {
          const avgLoss = avgLosses[i];
          if (avgLoss === 0) return 100;
          const rs = gain / avgLoss;
          return 100 - 100 / (1 + rs);
        });

        return Array(length).fill(NaN).concat(rsiValues);
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
        
        const result: number[] = [];
        let sum = 0;
        for (let i = 0; i < tr.length; i++) {
          if (i < length) {
            sum += tr[i];
            result.push(i === length - 1 ? sum / length : NaN);
          } else {
            const atrVal = (result[i - 1] * (length - 1) + tr[i]) / length;
            result.push(atrVal);
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
            const k = hh !== ll ? ((close[i] - ll) / (hh - ll)) * 100 : 50;
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
          result.push(cumVol > 0 ? cumVolPrice / cumVol : close[i]);
        }
        return result;
      },

      macd: (data: number[], fastLen: number, slowLen: number, signalLen: number): { macd: number[]; signal: number[]; hist: number[] } => {
        const fastEma = ema(data, fastLen);
        const slowEma = ema(data, slowLen);
        const macdLine = fastEma.map((v, i) => v - slowEma[i]);
        const signalLine = ema(macdLine, signalLen);
        const histogram = macdLine.map((v, i) => v - signalLine[i]);
        return { macd: macdLine, signal: signalLine, hist: histogram };
      },

      bb: (data: number[], length: number, mult: number): { upper: number[]; middle: number[]; lower: number[] } => {
        const middle = sma(data, length);
        const stdDev = stdev(data, length);
        const upper = middle.map((v, i) => v + mult * stdDev[i]);
        const lower = middle.map((v, i) => v - mult * stdDev[i]);
        return { upper, middle, lower };
      },

      cci: (hlc3: number[], length: number): number[] => {
        const smaValues = sma(hlc3, length);
        const result: number[] = [];
        
        for (let i = 0; i < hlc3.length; i++) {
          if (i < length - 1) {
            result.push(NaN);
          } else {
            const slice = hlc3.slice(i - length + 1, i + 1);
            const meanDev = slice.reduce((a, b) => a + Math.abs(b - smaValues[i]), 0) / length;
            result.push(meanDev !== 0 ? (hlc3[i] - smaValues[i]) / (0.015 * meanDev) : 0);
          }
        }
        return result;
      },

      wpr: (high: number[], low: number[], close: number[], length: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < close.length; i++) {
          if (i < length - 1) {
            result.push(NaN);
          } else {
            const hh = Math.max(...high.slice(i - length + 1, i + 1));
            const ll = Math.min(...low.slice(i - length + 1, i + 1));
            result.push(hh !== ll ? ((hh - close[i]) / (hh - ll)) * -100 : -50);
          }
        }
        return result;
      },

      obv: (close: number[], volume: number[]): number[] => {
        const result: number[] = [volume[0]];
        for (let i = 1; i < close.length; i++) {
          if (close[i] > close[i - 1]) {
            result.push(result[i - 1] + volume[i]);
          } else if (close[i] < close[i - 1]) {
            result.push(result[i - 1] - volume[i]);
          } else {
            result.push(result[i - 1]);
          }
        }
        return result;
      },

      adx: (high: number[], low: number[], close: number[], length: number): number[] => {
        const tr: number[] = [];
        const plusDM: number[] = [];
        const minusDM: number[] = [];
        
        for (let i = 0; i < high.length; i++) {
          if (i === 0) {
            tr.push(high[i] - low[i]);
            plusDM.push(0);
            minusDM.push(0);
          } else {
            const hl = high[i] - low[i];
            const hc = Math.abs(high[i] - close[i - 1]);
            const lc = Math.abs(low[i] - close[i - 1]);
            tr.push(Math.max(hl, hc, lc));
            
            const upMove = high[i] - high[i - 1];
            const downMove = low[i - 1] - low[i];
            plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
            minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
          }
        }
        
        const smoothTR = rma(tr, length);
        const smoothPlusDM = rma(plusDM, length);
        const smoothMinusDM = rma(minusDM, length);
        
        const plusDI = smoothPlusDM.map((v, i) => smoothTR[i] !== 0 ? (v / smoothTR[i]) * 100 : 0);
        const minusDI = smoothMinusDM.map((v, i) => smoothTR[i] !== 0 ? (v / smoothTR[i]) * 100 : 0);
        const dx = plusDI.map((v, i) => {
          const sum = v + minusDI[i];
          return sum !== 0 ? (Math.abs(v - minusDI[i]) / sum) * 100 : 0;
        });
        
        return rma(dx, length);
      },

      pivothigh: (data: number[], leftBars: number, rightBars: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < data.length; i++) {
          if (i < leftBars || i >= data.length - rightBars) {
            result.push(NaN);
            continue;
          }
          
          let isPivot = true;
          const pivotValue = data[i - rightBars];
          for (let j = i - leftBars - rightBars; j <= i; j++) {
            if (j !== i - rightBars && data[j] >= pivotValue) {
              isPivot = false;
              break;
            }
          }
          result.push(isPivot ? pivotValue : NaN);
        }
        return result;
      },

      pivotlow: (data: number[], leftBars: number, rightBars: number): number[] => {
        const result: number[] = [];
        for (let i = 0; i < data.length; i++) {
          if (i < leftBars || i >= data.length - rightBars) {
            result.push(NaN);
            continue;
          }
          
          let isPivot = true;
          const pivotValue = data[i - rightBars];
          for (let j = i - leftBars - rightBars; j <= i; j++) {
            if (j !== i - rightBars && data[j] <= pivotValue) {
              isPivot = false;
              break;
            }
          }
          result.push(isPivot ? pivotValue : NaN);
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
          if (i < length || data[i - length] === 0) return NaN;
          return ((v - data[i - length]) / data[i - length]) * 100;
        });
      },

      tr: (high: number[], low: number[], close: number[]): number[] => {
        const result: number[] = [];
        for (let i = 0; i < high.length; i++) {
          if (i === 0) {
            result.push(high[i] - low[i]);
          } else {
            const hl = high[i] - low[i];
            const hc = Math.abs(high[i] - close[i - 1]);
            const lc = Math.abs(low[i] - close[i - 1]);
            result.push(Math.max(hl, hc, lc));
          }
        }
        return result;
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
