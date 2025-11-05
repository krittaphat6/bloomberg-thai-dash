export interface AIFunction {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

export interface FunctionDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

/**
 * AI Function Registry - จัดการ AI functions สำหรับ Apollo AI Engine
 */
export class AIFunctionRegistry {
  private static functions = new Map<string, AIFunction>();

  /**
   * Register a new AI function
   */
  static register(func: AIFunction): void {
    this.functions.set(func.name, func);
    console.log(`✅ Registered AI function: ${func.name}`);
  }

  /**
   * Get all registered functions
   */
  static getAll(): AIFunction[] {
    return Array.from(this.functions.values());
  }

  /**
   * Execute a function by name
   */
  static async execute(name: string, params: any): Promise<any> {
    const func = this.functions.get(name);
    if (!func) {
      throw new Error(`Function ${name} not found`);
    }

    try {
      console.log(`⚡ Executing function: ${name}`);
      return await func.handler(params);
    } catch (error) {
      console.error(`❌ Error executing function ${name}:`, error);
      throw error;
    }
  }

  /**
   * Check if a function exists
   */
  static has(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Get function definitions for Claude API
   */
  static getFunctionDefinitionsForClaude(): any[] {
    return Array.from(this.functions.values()).map(f => ({
      name: f.name,
      description: f.description,
      input_schema: {
        type: 'object',
        properties: f.parameters,
        required: Object.keys(f.parameters).filter(key => 
          f.parameters[key].required !== false
        )
      }
    }));
  }

  /**
   * Get function definitions for OpenAI API
   */
  static getFunctionDefinitionsForOpenAI(): FunctionDefinition[] {
    return Array.from(this.functions.values()).map(f => ({
      type: 'function',
      function: {
        name: f.name,
        description: f.description,
        parameters: {
          type: 'object',
          properties: f.parameters,
          required: Object.keys(f.parameters).filter(key => 
            f.parameters[key].required !== false
          )
        }
      }
    }));
  }

  /**
   * Clear all registered functions
   */
  static clear(): void {
    this.functions.clear();
    console.log('🗑️ Cleared all AI functions');
  }

  /**
   * Get function count
   */
  static count(): number {
    return this.functions.size;
  }

  /**
   * Remove a specific function
   */
  static unregister(name: string): boolean {
    const result = this.functions.delete(name);
    if (result) {
      console.log(`🗑️ Unregistered AI function: ${name}`);
    }
    return result;
  }

  /**
   * Get function by name
   */
  static get(name: string): AIFunction | undefined {
    return this.functions.get(name);
  }
}

// Export singleton instance
export const aiFunctionRegistry = AIFunctionRegistry;
