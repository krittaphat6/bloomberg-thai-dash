// Pine Script v5/v6 Runner - Complete Implementation

export interface PineScriptResult {
  name: string;
  values: number[];
  type: 'line' | 'histogram' | 'arrow' | 'hline' | 'bgcolor' | 'circles';
  color?: string;
  lineWidth?: number;
  hlineValue?: number;
  style?: string;
  plotType?: 'line' | 'stepline' | 'histogram' | 'cross' | 'area' | 'columns' | 'circles';
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
  severity: 'error' | 'warning' | 'info';
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
  private static version: 5 | 6 = 6;

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
        console.log('Code length:', code.length, 'characters');
        console.log('Data points:', data.length);
      }

      // Detect version from code
      const versionMatch = code.match(/\/\/@version=(\d+)/);
      if (versionMatch) {
        this.version = parseInt(versionMatch[1]) as 5 | 6;
        if (this.debugMode) {
          console.log(`📌 Detected Pine Script v${this.version}`);
        }
      }

      // Validate syntax first
      const errors = this.validateScript(code);
      const criticalErrors = errors.filter(e => e.severity === 'error');
      
      if (criticalErrors.length > 0) {
        const errorMsg = criticalErrors
          .map(e => `Line ${e.line}: ${e.message}${e.suggestion ? `\n💡 Suggestion: ${e.suggestion}` : ''}`)
          .join('\n\n');
        throw new Error(`Validation failed:\n${errorMsg}`);
      }

      // Show warnings in debug mode
      const warnings = errors.filter(e => e.severity === 'warning');
      if (warnings.length > 0 && this.debugMode) {
        warnings.forEach(w => console.warn(`⚠️ Line ${w.line}: ${w.message}`));
      }

      // Transpile Pine Script to JavaScript
      const jsCode = this.transpilePineToJS(code);

      if (this.debugMode) {
        console.log('📝 Transpiled JavaScript:');
        console.log(jsCode);
      }

      // Create execution context with full Pine Script environment
      const context = this.createExecutionContext(data);

      // Execute the transpiled code safely
      const func = new Function('context', `
        with(context) {
          try {
            ${jsCode}
            return results;
          } catch(e) {
            throw new Error('Runtime Error: ' + e.message);
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
        console.log('✅ Execution completed');
        console.log('Results:', results);
        console.log(`⏱️ Execution time: ${this.lastMetrics.executionMs.toFixed(2)}ms`);
        console.log(`📊 Generated ${results.length} indicator(s)`);
      }

      return results;
    } catch (error) {
      console.error('❌ Pine Script execution error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Pine Script Error:\n${message}`);
    }
  }

  /**
   * Create full execution context with all Pine Script built-ins
   */
  private static createExecutionContext(data: OHLCData[]) {
    const close = data.map(d => d.close);
    const open = data.map(d => d.open);
    const high = data.map(d => d.high);
    const low = data.map(d => d.low);
    const volume = data.map(d => d.volume);
    const time = data.map(d => d.timestamp);

    const results: PineScriptResult[] = [];

    const context = {
      // Raw data
      data,
      
      // Built-in series
      close,
      open,
      high,
      low,
      volume,
      time,
      
      // Calculated series
      hl2: data.map(d => (d.high + d.low) / 2),
      hlc3: data.map(d => (d.high + d.low + d.close) / 3),
      ohlc4: data.map(d => (d.open + d.high + d.low + d.close) / 4),
      
      // Built-in variables
      bar_index: Array.from({ length: data.length }, (_, i) => i),
      na: NaN,
      
      // v6 simulated bid/ask
      bid: close.map(c => c * 0.9999),
      ask: close.map(c => c * 1.0001),
      
      // Namespaces
      ta: this.getTALibrary(),
      math: this.getMathLibrary(),
      array: this.getArrayLibrary(),
      str: this.getStringLibrary(),
      color: this.getColorLibrary(),
      
      // Plot function
      plot: (series: any, titleOrOptions?: string | any, color?: string, linewidth?: number, style?: string) => {
        let title = 'Plot';
        let plotColor = '#2962FF';
        let plotLinewidth = 1;
        let plotStyle = 'line';

        if (typeof titleOrOptions === 'string') {
          title = titleOrOptions;
        } else if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
          title = titleOrOptions.title || title;
          plotColor = titleOrOptions.color || plotColor;
          plotLinewidth = titleOrOptions.linewidth || plotLinewidth;
          plotStyle = titleOrOptions.style || plotStyle;
        }

        if (color) plotColor = color;
        if (linewidth) plotLinewidth = linewidth;
        if (style) plotStyle = style;

        results.push({
          name: title,
          values: Array.isArray(series) ? series : Array(data.length).fill(series),
          type: 'line',
          color: plotColor,
          lineWidth: plotLinewidth,
          plotType: plotStyle as any
        });
      },
      
      // HLine function
      hline: (price: number, titleOrOptions?: string | any, color?: string, linewidth?: number) => {
        let title = `Level ${price}`;
        let hlineColor = '#787B86';
        let hlineLinewidth = 1;

        if (typeof titleOrOptions === 'string') {
          title = titleOrOptions;
        } else if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
          title = titleOrOptions.title || title;
          hlineColor = titleOrOptions.color || hlineColor;
          hlineLinewidth = titleOrOptions.linewidth || hlineLinewidth;
        }

        if (color) hlineColor = color;
        if (linewidth) hlineLinewidth = linewidth;

        results.push({
          name: title,
          values: Array(data.length).fill(price),
          type: 'hline',
          color: hlineColor,
          lineWidth: hlineLinewidth,
          hlineValue: price
        });
      },
      
      // Background color function
      bgcolor: (colorOrCondition: any, transp?: number, title?: string) => {
        results.push({
          name: title || 'Background',
          values: Array(data.length).fill(1),
          type: 'bgcolor',
          color: typeof colorOrCondition === 'string' ? colorOrCondition : '#3B82F6'
        });
      },

      // Fill function (between two plots)
      fill: (plot1: any, plot2: any, color?: string, title?: string) => {
        // Fill is tracked but not directly rendered as a result
        if (this.debugMode) {
          console.log(`Fill between plots: ${title || 'unnamed'}`);
        }
      },
      
      // Input functions (return default values in execution)
      input: (defval: any, title?: string) => defval,
      'input.int': (defval: number, title?: string) => Math.floor(defval),
      'input.float': (defval: number, title?: string) => defval,
      'input.bool': (defval: boolean, title?: string) => defval,
      'input.string': (defval: string, title?: string) => defval,
      'input.color': (defval: string, title?: string) => defval,
      'input.source': (defval: any, title?: string) => defval,
      'input.timeframe': (defval: string, title?: string) => defval,
      
      // Results array
      results,
      
      // Debug logging
      debug: this.debugMode ? console.log.bind(console, '🐛') : () => {},
      log: this.debugMode ? console.log.bind(console, '📋') : () => {},

      // Helper for NaN checks
      nz: (value: number, replacement: number = 0) => isNaN(value) ? replacement : value,
      na_fn: (value: any) => value === null || value === undefined || (typeof value === 'number' && isNaN(value)),
    };

    return context;
  }

  /**
   * Enhanced validation with better error messages
   */
  static validateScript(code: string): PineScriptError[] {
    const errors: PineScriptError[] = [];
    const lines = code.split('\n');

    // Check version directive
    const hasVersion = code.match(/\/\/@version=\d+/);
    if (!hasVersion) {
      errors.push({
        type: 'validation',
        line: 1,
        severity: 'warning',
        message: 'Missing version directive',
        suggestion: 'Add //@version=6 at the top of your script'
      });
    }

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;
      
      const lineNum = index + 1;

      // Check balanced parentheses
      const openParens = (trimmed.match(/\(/g) || []).length;
      const closeParens = (trimmed.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push({
          type: 'syntax',
          line: lineNum,
          severity: 'error',
          message: 'Unbalanced parentheses',
          suggestion: openParens > closeParens ? 'Add closing )' : 'Remove extra )'
        });
      }

      // Check balanced brackets
      const openBrackets = (trimmed.match(/\[/g) || []).length;
      const closeBrackets = (trimmed.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        errors.push({
          type: 'syntax',
          line: lineNum,
          severity: 'error',
          message: 'Unbalanced brackets',
          suggestion: openBrackets > closeBrackets ? 'Add closing ]' : 'Remove extra ]'
        });
      }

      // Check for function calls that might be missing parentheses
      if (/\b(ta|math|array|str)\.\w+\s*[^(=,\s]/.test(trimmed) && !trimmed.includes('//')) {
        const match = trimmed.match(/\b(ta|math|array|str)\.(\w+)/);
        if (match) {
          errors.push({
            type: 'syntax',
            line: lineNum,
            severity: 'warning',
            message: `${match[1]}.${match[2]}() might be missing parentheses`,
            suggestion: `Use ${match[1]}.${match[2]}(...)`
          });
        }
      }

      // Check for reserved keywords used as variables (v6)
      const reservedKeywords = ['catch', 'class', 'do', 'ellipse', 'in', 'is', 'polygon', 'range', 'return', 'struct', 'text', 'throw', 'try'];
      reservedKeywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\s*=`, 'i');
        if (regex.test(trimmed)) {
          errors.push({
            type: 'validation',
            line: lineNum,
            severity: 'error',
            message: `'${keyword}' is a reserved keyword and cannot be used as a variable name`,
            suggestion: `Use a different name like my_${keyword} or ${keyword}_value`
          });
        }
      });
    });

    return errors;
  }

  /**
   * COMPLETE TRANSPILER for Pine Script v5/v6
   */
  private static transpilePineToJS(pineCode: string): string {
    let js = pineCode;

    // Remove version directive
    js = js.replace(/^\/\/@version=\d+\s*/gm, '');

    // Preserve comments as JS comments
    js = js.replace(/\/\/(.*)$/gm, '// $1');

    // === DECLARATIONS ===

    // indicator() declaration - handle all parameter formats
    js = js.replace(
      /indicator\s*\(\s*["']([^"']+)["'](?:\s*,\s*[^)]*?)?\s*\)/g,
      (match, title) => `const indicatorTitle = "${title}";`
    );

    // strategy() declaration
    js = js.replace(
      /strategy\s*\(\s*["']([^"']+)["'](?:\s*,\s*[^)]*?)?\s*\)/g,
      (match, title) => `const strategyTitle = "${title}";`
    );

    // library() declaration
    js = js.replace(
      /library\s*\(\s*["']([^"']+)["'](?:\s*,\s*[^)]*?)?\s*\)/g,
      (match, title) => `const libraryTitle = "${title}";`
    );

    // === INPUT FUNCTIONS ===

    // input.int() with all parameter formats
    js = js.replace(
      /(\w+)\s*=\s*input\.int\s*\(\s*(\d+)(?:\s*,\s*(?:title\s*=\s*)?["']([^"']+)["'])?(?:[^)]*)\)/g,
      (match, varName, defval, title) => `const ${varName} = ${defval};${title ? ` // ${title}` : ''}`
    );

    // input.float()
    js = js.replace(
      /(\w+)\s*=\s*input\.float\s*\(\s*([\d.]+)(?:\s*,\s*(?:title\s*=\s*)?["']([^"']+)["'])?(?:[^)]*)\)/g,
      (match, varName, defval, title) => `const ${varName} = ${defval};${title ? ` // ${title}` : ''}`
    );

    // input.bool()
    js = js.replace(
      /(\w+)\s*=\s*input\.bool\s*\(\s*(true|false)(?:\s*,\s*(?:title\s*=\s*)?["']([^"']+)["'])?(?:[^)]*)\)/g,
      (match, varName, defval, title) => `const ${varName} = ${defval};${title ? ` // ${title}` : ''}`
    );

    // input.string()
    js = js.replace(
      /(\w+)\s*=\s*input\.string\s*\(\s*["']([^"']+)["'](?:\s*,\s*(?:title\s*=\s*)?["']([^"']+)["'])?(?:[^)]*)\)/g,
      (match, varName, defval, title) => `const ${varName} = "${defval}";${title ? ` // ${title}` : ''}`
    );

    // input() generic - multiple formats
    js = js.replace(
      /(\w+)\s*=\s*input\s*\(\s*([\d.]+)\s*,\s*(?:title\s*=\s*)?["']([^"']+)["'](?:[^)]*)\)/g,
      (match, varName, defval, title) => `const ${varName} = ${defval}; // ${title}`
    );

    js = js.replace(
      /(\w+)\s*=\s*input\s*\(\s*([\d.]+)\s*\)/g,
      (match, varName, defval) => `const ${varName} = ${defval};`
    );

    // === VARIABLE DECLARATIONS ===

    // var and varip declarations
    js = js.replace(/\bvar\s+(\w+)\s*=/g, 'let $1 =');
    js = js.replace(/\bvarip\s+(\w+)\s*=/g, 'let $1 =');

    // === TA FUNCTION CONVERSIONS ===

    // ta.sma, ta.ema, ta.wma, ta.rsi
    js = js.replace(/(\w+)\s*=\s*ta\.(sma|ema|wma|rsi)\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g,
      (match, varName, func, src, len) => `const ${varName} = ta.${func}(${src}, ${len});`
    );

    // ta.stdev
    js = js.replace(/(\w+)\s*=\s*ta\.stdev\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g,
      (match, varName, src, len) => `const ${varName} = ta.stdev(${src}, ${len});`
    );

    // ta.atr - handle various formats
    js = js.replace(/(\w+)\s*=\s*ta\.atr\s*\(\s*(\w+)\s*\)/g,
      (match, varName, len) => `const ${varName} = ta.atr(high, low, close, ${len});`
    );

    // ta.stoch
    js = js.replace(/(\w+)\s*=\s*ta\.stoch\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g,
      (match, varName, src, hi, lo, len) => `const ${varName} = ta.stoch(${src}, ${hi}, ${lo}, ${len});`
    );

    // ta.vwap
    js = js.replace(/(\w+)\s*=\s*ta\.vwap\s*\(\s*(\w+)\s*\)/g,
      (match, varName, src) => `const ${varName} = ta.vwap(${src}, high, low, volume);`
    );

    // ta.bb - Bollinger Bands (returns object)
    js = js.replace(/\[(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\]\s*=\s*ta\.bb\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g,
      (match, upper, basis, lower, src, len, mult) => 
        `const __bb = ta.bb(${src}, ${len}, ${mult}); const ${upper} = __bb.upper; const ${basis} = __bb.middle; const ${lower} = __bb.lower;`
    );

    // ta.macd (returns object)
    js = js.replace(/\[(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\]\s*=\s*ta\.macd\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g,
      (match, macdLine, signalLine, hist, src, fast, slow, sig) => 
        `const __macd = ta.macd(${src}, ${fast}, ${slow}, ${sig}); const ${macdLine} = __macd.macd; const ${signalLine} = __macd.signal; const ${hist} = __macd.hist;`
    );

    // ta.crossover and ta.crossunder
    js = js.replace(/ta\.crossover\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.crossover($1, $2)');
    js = js.replace(/ta\.crossunder\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.crossunder($1, $2)');

    // ta.highest, ta.lowest
    js = js.replace(/ta\.highest\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.highest($1, $2)');
    js = js.replace(/ta\.lowest\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.lowest($1, $2)');

    // ta.change
    js = js.replace(/ta\.change\s*\(\s*(\w+)\s*\)/g, 'ta.change($1, 1)');
    js = js.replace(/ta\.change\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.change($1, $2)');

    // ta.mom, ta.roc
    js = js.replace(/ta\.mom\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.mom($1, $2)');
    js = js.replace(/ta\.roc\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.roc($1, $2)');

    // ta.cci
    js = js.replace(/ta\.cci\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.cci($1, $2)');

    // ta.obv
    js = js.replace(/ta\.obv\s*\(\s*\)/g, 'ta.obv(close, volume)');

    // ta.adx
    js = js.replace(/ta\.adx\s*\(\s*(\w+)\s*\)/g, 'ta.adx(high, low, close, $1)');

    // ta.pivothigh, ta.pivotlow
    js = js.replace(/ta\.pivothigh\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.pivothigh($1, $2, $3)');
    js = js.replace(/ta\.pivotlow\s*\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)/g, 'ta.pivotlow($1, $2, $3)');

    // === PLOT FUNCTIONS ===

    // plot(series, title, color, linewidth) - positional
    js = js.replace(
      /plot\s*\(\s*(\w+)\s*,\s*["']([^"']+)["']\s*,\s*color\.(\w+)(?:\s*,\s*(\d+))?\s*\)/g,
      (match, series, title, colorName, linewidth) => {
        const hex = this.getColorHex(colorName);
        return `plot(${series}, "${title}", "${hex}", ${linewidth || 1});`;
      }
    );

    // plot(series, color=color.xxx, title="xxx")
    js = js.replace(
      /plot\s*\(\s*(\w+)\s*,\s*color\s*=\s*color\.(\w+)\s*,\s*title\s*=\s*["']([^"']+)["'](?:[^)]*)\)/g,
      (match, series, colorName, title) => {
        const hex = this.getColorHex(colorName);
        return `plot(${series}, "${title}", "${hex}");`;
      }
    );

    // plot(series, title="xxx", color=color.xxx)
    js = js.replace(
      /plot\s*\(\s*(\w+)\s*,\s*title\s*=\s*["']([^"']+)["']\s*,\s*color\s*=\s*color\.(\w+)(?:[^)]*)\)/g,
      (match, series, title, colorName) => {
        const hex = this.getColorHex(colorName);
        return `plot(${series}, "${title}", "${hex}");`;
      }
    );

    // plot(series, color=color.xxx)
    js = js.replace(
      /plot\s*\(\s*(\w+)\s*,\s*color\s*=\s*color\.(\w+)(?:[^)]*)\)/g,
      (match, series, colorName) => {
        const hex = this.getColorHex(colorName);
        return `plot(${series}, "${series}", "${hex}");`;
      }
    );

    // plot(series, "title") - simple
    js = js.replace(
      /plot\s*\(\s*(\w+)\s*,\s*["']([^"']+)["']\s*\)/g,
      (match, series, title) => `plot(${series}, "${title}", "#3B82F6");`
    );

    // plot(series) - simplest
    js = js.replace(
      /plot\s*\(\s*(\w+)\s*\)(?!\s*[;,])/g,
      (match, series) => `plot(${series}, "${series}", "#3B82F6");`
    );

    // === HLINE ===
    
    // hline(price, "title", color=color.xxx)
    js = js.replace(
      /hline\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*["']([^"']+)["']\s*,\s*color\s*=\s*color\.(\w+)(?:[^)]*)\)/g,
      (match, price, title, colorName) => {
        const hex = this.getColorHex(colorName);
        return `hline(${price}, "${title}", "${hex}");`;
      }
    );

    // hline(price, "title")
    js = js.replace(
      /hline\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*["']([^"']+)["']\s*\)/g,
      (match, price, title) => `hline(${price}, "${title}", "#787B86");`
    );

    // hline(price)
    js = js.replace(
      /hline\s*\(\s*(\d+(?:\.\d+)?)\s*\)/g,
      (match, price) => `hline(${price}, "Level ${price}", "#787B86");`
    );

    // === BGCOLOR ===

    // bgcolor(condition ? color.xxx : na)
    js = js.replace(
      /bgcolor\s*\(\s*(\w+)\s*\?\s*color\.new\s*\(\s*color\.(\w+)\s*,\s*(\d+)\s*\)\s*:\s*na(?:[^)]*)\)/g,
      (match, cond, colorName, transp) => {
        const hex = this.getColorHex(colorName);
        return `bgcolor("${hex}");`;
      }
    );

    // bgcolor(color.new(color.xxx, transp))
    js = js.replace(
      /bgcolor\s*\(\s*color\.new\s*\(\s*color\.(\w+)\s*,\s*(\d+)\s*\)(?:[^)]*)\)/g,
      (match, colorName) => {
        const hex = this.getColorHex(colorName);
        return `bgcolor("${hex}");`;
      }
    );

    // === COLOR.NEW ===
    js = js.replace(
      /color\.new\s*\(\s*color\.(\w+)\s*,\s*(\d+)\s*\)/g,
      (match, colorName, transp) => {
        const hex = this.getColorHex(colorName);
        const alpha = Math.round((100 - parseInt(transp)) / 100 * 255).toString(16).padStart(2, '0');
        return `"${hex}${alpha}"`;
      }
    );

    // === OPERATORS ===

    // Boolean operators
    js = js.replace(/\band\b/g, '&&');
    js = js.replace(/\bor\b/g, '||');
    js = js.replace(/\bnot\b/g, '!');

    // na (Not Available)
    js = js.replace(/\bna\b(?!\w)/g, 'NaN');

    // Ternary with na
    js = js.replace(/(\w+)\s*\?\s*(\w+)\s*:\s*NaN/g, '$1 ? $2 : NaN');

    // === ARRAY OPERATIONS ===

    // Simple variable assignments with array operations
    // Only convert if not already declared
    const arrayOps = [
      // Subtraction
      { 
        pattern: /^(\w+)\s*=\s*(\w+)\s*-\s*(\w+)$/gm,
        replacement: (m: string, res: string, a: string, b: string) => {
          if (m.includes('const ') || m.includes('let ')) return m;
          return `const ${res} = Array.isArray(${a}) ? ${a}.map((v, i) => v - (Array.isArray(${b}) ? ${b}[i] : ${b})) : ${a} - ${b};`;
        }
      },
      // Addition
      {
        pattern: /^(\w+)\s*=\s*(\w+)\s*\+\s*(\w+)$/gm,
        replacement: (m: string, res: string, a: string, b: string) => {
          if (m.includes('const ') || m.includes('let ')) return m;
          return `const ${res} = Array.isArray(${a}) ? ${a}.map((v, i) => v + (Array.isArray(${b}) ? ${b}[i] : ${b})) : ${a} + ${b};`;
        }
      },
      // Multiplication
      {
        pattern: /^(\w+)\s*=\s*(\w+)\s*\*\s*(\w+)$/gm,
        replacement: (m: string, res: string, a: string, b: string) => {
          if (m.includes('const ') || m.includes('let ')) return m;
          return `const ${res} = Array.isArray(${a}) ? ${a}.map((v, i) => v * (Array.isArray(${b}) ? ${b}[i] : ${b})) : ${a} * ${b};`;
        }
      },
      // Division
      {
        pattern: /^(\w+)\s*=\s*(\w+)\s*\/\s*(\w+)$/gm,
        replacement: (m: string, res: string, a: string, b: string) => {
          if (m.includes('const ') || m.includes('let ')) return m;
          return `const ${res} = Array.isArray(${a}) ? ${a}.map((v, i) => v / (Array.isArray(${b}) ? ${b}[i] : ${b})) : ${a} / ${b};`;
        }
      }
    ];

    // Apply array operation conversions
    // arrayOps.forEach(op => {
    //   js = js.replace(op.pattern, op.replacement as any);
    // });

    // === CLEAN UP ===

    // Remove multiple newlines
    js = js.replace(/\n{3,}/g, '\n\n');

    // Ensure statements end with semicolons (but not control structures)
    js = js.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed || 
          trimmed.startsWith('//') || 
          trimmed.endsWith('{') || 
          trimmed.endsWith('}') || 
          trimmed.endsWith(';') ||
          trimmed.startsWith('if') ||
          trimmed.startsWith('else') ||
          trimmed.startsWith('for') ||
          trimmed.startsWith('while')) {
        return line;
      }
      return line + ';';
    }).join('\n');

    return js;
  }

  /**
   * Get color hex code from Pine Script color name
   */
  private static getColorHex(colorName: string): string {
    const colorMap: Record<string, string> = {
      blue: '#2962FF',
      red: '#F23645',
      green: '#089981',
      purple: '#7B1FA2',
      orange: '#FF9800',
      gray: '#787B86',
      grey: '#787B86',
      yellow: '#FFEB3B',
      teal: '#00897B',
      white: '#FFFFFF',
      black: '#000000',
      aqua: '#00BCD4',
      lime: '#C6FF00',
      fuchsia: '#E040FB',
      silver: '#B2B5BE',
      maroon: '#880E4F',
      navy: '#311B92',
      olive: '#827717',
      new: '#2962FF',
    };
    return colorMap[colorName.toLowerCase()] || '#2962FF';
  }

  /**
   * Color library for Pine Script
   */
  private static getColorLibrary() {
    return {
      blue: '#2962FF',
      red: '#F23645',
      green: '#089981',
      purple: '#7B1FA2',
      orange: '#FF9800',
      gray: '#787B86',
      yellow: '#FFEB3B',
      teal: '#00897B',
      white: '#FFFFFF',
      black: '#000000',
      aqua: '#00BCD4',
      lime: '#C6FF00',
      fuchsia: '#E040FB',
      silver: '#B2B5BE',
      maroon: '#880E4F',
      navy: '#311B92',
      olive: '#827717',
      new: (baseColor: string, transparency: number) => {
        const hex = typeof baseColor === 'string' && baseColor.startsWith('#') ? baseColor : '#2962FF';
        const alpha = Math.round((100 - transparency) / 100 * 255).toString(16).padStart(2, '0');
        return `${hex}${alpha}`;
      },
      rgb: (r: number, g: number, b: number) => {
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      },
      fromGradient: (value: number, low: number, mid: number, high: number, colorLow: string, colorMid: string, colorHigh: string) => {
        // Simplified gradient - just return mid color
        return colorMid;
      }
    };
  }

  /**
   * Math library
   */
  private static getMathLibrary() {
    return {
      abs: Math.abs,
      acos: Math.acos,
      asin: Math.asin,
      atan: Math.atan,
      ceil: Math.ceil,
      cos: Math.cos,
      exp: Math.exp,
      floor: Math.floor,
      log: Math.log,
      log10: Math.log10,
      max: Math.max,
      min: Math.min,
      pow: Math.pow,
      round: Math.round,
      sign: Math.sign,
      sin: Math.sin,
      sqrt: Math.sqrt,
      tan: Math.tan,
      avg: (...args: number[]) => args.reduce((a, b) => a + b, 0) / args.length,
      sum: (...args: number[]) => args.reduce((a, b) => a + b, 0),
      toradians: (degrees: number) => degrees * (Math.PI / 180),
      todegrees: (radians: number) => radians * (180 / Math.PI),
      random: (min: number = 0, max: number = 1) => Math.random() * (max - min) + min
    };
  }

  /**
   * Array library
   */
  private static getArrayLibrary() {
    return {
      new: <T>(size: number, initial?: T): T[] => Array(size).fill(initial !== undefined ? initial : NaN),
      from: <T>(...args: T[]): T[] => args,
      size: <T>(arr: T[]): number => arr.length,
      get: <T>(arr: T[], index: number): T | undefined => index < 0 ? arr[arr.length + index] : arr[index],
      set: <T>(arr: T[], index: number, value: T): void => { arr[index < 0 ? arr.length + index : index] = value; },
      push: <T>(arr: T[], value: T): void => { arr.push(value); },
      pop: <T>(arr: T[]): T | undefined => arr.pop(),
      sum: (arr: number[]): number => arr.reduce((a, b) => a + b, 0),
      avg: (arr: number[]): number => arr.reduce((a, b) => a + b, 0) / arr.length,
      min: (arr: number[]): number => Math.min(...arr),
      max: (arr: number[]): number => Math.max(...arr),
      stdev: (arr: number[]): number => {
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
        return Math.sqrt(variance);
      }
    };
  }

  /**
   * String library
   */
  private static getStringLibrary() {
    return {
      length: (str: string): number => str.length,
      tonumber: (str: string): number => parseFloat(str),
      tostring: (val: any): string => String(val),
      format: (format: string, ...args: any[]): string => {
        let result = format;
        args.forEach((arg, i) => {
          result = result.replace(`{${i}}`, String(arg));
        });
        return result;
      },
      contains: (str: string, substr: string): boolean => str.includes(substr),
      lower: (str: string): string => str.toLowerCase(),
      upper: (str: string): string => str.toUpperCase(),
      trim: (str: string): string => str.trim(),
      split: (str: string, separator: string): string[] => str.split(separator)
    };
  }

  /**
   * Technical Analysis library with all functions
   */
  private static getTALibrary() {
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
        return rma(tr, length);
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

      vwap: (close: number[], high: number[], low: number[], volume: number[]): number[] => {
        const result: number[] = [];
        let cumVol = 0;
        let cumVolPrice = 0;
        const tp = close.map((c, i) => (high[i] + low[i] + c) / 3);
        
        for (let i = 0; i < close.length; i++) {
          cumVol += volume[i];
          cumVolPrice += tp[i] * volume[i];
          result.push(cumVol > 0 ? cumVolPrice / cumVol : tp[i]);
        }
        return result;
      },

      macd: (data: number[], fastLen: number, slowLen: number, signalLen: number) => {
        const fastEma = ema(data, fastLen);
        const slowEma = ema(data, slowLen);
        const macdLine = fastEma.map((v, i) => v - slowEma[i]);
        const signalLine = ema(macdLine, signalLen);
        const histogram = macdLine.map((v, i) => v - signalLine[i]);
        return { macd: macdLine, signal: signalLine, hist: histogram };
      },

      bb: (data: number[], length: number, mult: number) => {
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
            result.push(Math.max(...data.slice(i - length + 1, i + 1)));
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
            result.push(Math.min(...data.slice(i - length + 1, i + 1)));
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
  static generateMockOHLC(bars: number = 200): OHLCData[] {
    const data: OHLCData[] = [];
    let price = 100;
    const startTime = Date.now() - bars * 60 * 60 * 1000;

    for (let i = 0; i < bars; i++) {
      const change = (Math.random() - 0.5) * 4;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      const volume = Math.floor(Math.random() * 1000000) + 500000;

      data.push({
        timestamp: startTime + i * 60 * 60 * 1000,
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

export default PineScriptRunner;
