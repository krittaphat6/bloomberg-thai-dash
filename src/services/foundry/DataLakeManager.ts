import { supabase } from '@/integrations/supabase/client';

export interface DataQuery {
  symbol: string;
  startDate: Date;
  endDate: Date;
  interval?: '1m' | '5m' | '15m' | '1h' | '1d';
  fields?: string[];
}

export interface AggregationParams {
  symbol: string;
  function: 'avg' | 'sum' | 'min' | 'max' | 'count';
  field: string;
  groupBy?: 'hour' | 'day' | 'week' | 'month';
}

export interface MartDefinition {
  name: string;
  sourceTable: string;
  transformations: Array<{
    type: 'filter' | 'aggregate' | 'join';
    config: any;
  }>;
  refreshInterval?: number;
}

/**
 * Data Lake Manager - Enterprise Data Storage
 * จัดการ data lake สำหรับเก็บและ query ข้อมูลจำนวนมหาศาล
 */
export class DataLakeManager {
  private static instance: DataLakeManager;
  private dataMarts: Map<string, MartDefinition> = new Map();

  private constructor() {
    this.initializeDataLake();
  }

  static getInstance(): DataLakeManager {
    if (!DataLakeManager.instance) {
      DataLakeManager.instance = new DataLakeManager();
    }
    return DataLakeManager.instance;
  }

  private async initializeDataLake(): Promise<void> {
    console.log('🏗️ Initializing Data Lake...');
    
    // ตรวจสอบว่ามี tables ที่จำเป็นหรือไม่
    const { data: tables } = await supabase
      .from('market_data')
      .select('*')
      .limit(1);
    
    if (tables !== null) {
      console.log('✅ Data Lake initialized successfully');
    }
  }

  /**
   * สร้าง Data Lake ใหม่สำหรับ namespace ที่กำหนด
   */
  async createDataLake(name: string): Promise<void> {
    console.log(`🌊 Creating data lake: ${name}`);
    
    // ในระบบจริงจะสร้าง partitioned tables หรือ separate schemas
    // ตอนนี้เราใช้ metadata เพื่อจัดกลุ่ม
    const { error } = await supabase.from('api_usage_logs').insert({
      api_name: `datalake_${name}`,
      status_code: 201,
      endpoint: 'create_lake'
    });
    
    if (error) {
      console.error('❌ Failed to create data lake:', error);
      throw error;
    }
    
    console.log(`✅ Data lake "${name}" created`);
  }

  /**
   * เก็บ time series data ลง data lake
   */
  async storeTimeSeries(symbol: string, data: any[]): Promise<void> {
    console.log(`💾 Storing time series for ${symbol}...`);
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('⚠️ No data to store');
      return;
    }
    
    // Batch insert สำหรับ performance
    const batchSize = 100;
    let stored = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('market_data')
        .insert(batch.map(item => ({
          symbol,
          price: item.price || 0,
          volume: item.volume || 0,
          change: item.change || 0,
          change_percent: item.changePercent || 0,
          high: item.high || 0,
          low: item.low || 0,
          open: item.open || 0,
          bid: item.bid,
          ask: item.ask,
          source: item.source || 'timeseries',
          timestamp: item.timestamp || new Date().toISOString()
        })));
      
      if (error) {
        console.error(`❌ Batch ${i / batchSize + 1} failed:`, error);
      } else {
        stored += batch.length;
      }
    }
    
    console.log(`✅ Stored ${stored}/${data.length} records for ${symbol}`);
  }

  /**
   * Query ข้อมูล historical จาก data lake
   */
  async queryHistorical(query: DataQuery): Promise<any[]> {
    console.log(`🔍 Querying historical data for ${query.symbol}...`);
    
    let supabaseQuery = supabase
      .from('market_data')
      .select(query.fields?.join(',') || '*')
      .eq('symbol', query.symbol)
      .gte('timestamp', query.startDate.toISOString())
      .lte('timestamp', query.endDate.toISOString())
      .order('timestamp', { ascending: true });
    
    const { data, error } = await supabaseQuery;
    
    if (error) {
      console.error('❌ Query failed:', error);
      return [];
    }
    
    console.log(`✅ Retrieved ${data?.length || 0} records`);
    return data || [];
  }

  /**
   * รวมข้อมูลด้วย aggregation functions
   */
  async aggregateData(params: AggregationParams): Promise<any> {
    console.log(`📊 Aggregating data for ${params.symbol}...`);
    
    // ดึงข้อมูลทั้งหมดก่อน แล้วทำ aggregation ใน JS
    // (ในระบบจริงควรใช้ SQL aggregation functions)
    const { data, error } = await supabase
      .from('market_data')
      .select('*')
      .eq('symbol', params.symbol)
      .order('timestamp', { ascending: true });
    
    if (error || !data) {
      console.error('❌ Aggregation query failed:', error);
      return null;
    }
    
    // Group by time period ถ้ามีการระบุ
    let groupedData = data;
    if (params.groupBy) {
      groupedData = this.groupByTimePeriod(data, params.groupBy);
    }
    
    // Apply aggregation function
    const result = this.applyAggregation(groupedData, params.function, params.field);
    
    console.log(`✅ Aggregation complete`);
    return result;
  }

  private groupByTimePeriod(data: any[], period: 'hour' | 'day' | 'week' | 'month'): any[] {
    const groups = new Map<string, any[]>();
    
    data.forEach(item => {
      const date = new Date(item.timestamp);
      let key = '';
      
      switch (period) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week':
          const weekNum = Math.floor(date.getDate() / 7);
          key = `${date.getFullYear()}-${date.getMonth()}-W${weekNum}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });
    
    return Array.from(groups.values());
  }

  private applyAggregation(data: any[], func: 'avg' | 'sum' | 'min' | 'max' | 'count', field: string): any {
    if (!Array.isArray(data) || data.length === 0) return null;
    
    // ถ้า data เป็น array of arrays (grouped data)
    if (Array.isArray(data[0])) {
      return data.map(group => this.applyAggregation(group, func, field));
    }
    
    const values = data.map(item => parseFloat(item[field]) || 0).filter(v => !isNaN(v));
    
    switch (func) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return null;
    }
  }

  /**
   * สร้าง Data Mart สำหรับ analytics
   */
  async createDataMart(definition: MartDefinition): Promise<void> {
    console.log(`🏪 Creating data mart: ${definition.name}`);
    
    // บันทึก definition
    this.dataMarts.set(definition.name, definition);
    
    // Execute transformations
    for (const transformation of definition.transformations) {
      await this.executeTransformation(definition.sourceTable, transformation);
    }
    
    console.log(`✅ Data mart "${definition.name}" created`);
    
    // Setup auto-refresh if specified
    if (definition.refreshInterval) {
      setInterval(() => {
        console.log(`🔄 Refreshing data mart: ${definition.name}`);
        this.refreshDataMart(definition.name);
      }, definition.refreshInterval);
    }
  }

  private async executeTransformation(sourceTable: string, transformation: any): Promise<void> {
    console.log(`⚙️ Executing ${transformation.type} transformation...`);
    
    // ในระบบจริงจะ execute SQL transformations
    // ตอนนี้เราแค่ log ไว้
    switch (transformation.type) {
      case 'filter':
        console.log('Applying filters:', transformation.config);
        break;
      case 'aggregate':
        console.log('Applying aggregations:', transformation.config);
        break;
      case 'join':
        console.log('Applying joins:', transformation.config);
        break;
    }
  }

  private async refreshDataMart(name: string): Promise<void> {
    const definition = this.dataMarts.get(name);
    if (!definition) return;
    
    // Re-execute all transformations
    for (const transformation of definition.transformations) {
      await this.executeTransformation(definition.sourceTable, transformation);
    }
  }

  /**
   * Get statistics about data lake
   */
  async getStatistics(): Promise<any> {
    const { data: marketData } = await supabase
      .from('market_data')
      .select('symbol, timestamp');
    
    const { data: sentimentData } = await supabase
      .from('sentiment_data')
      .select('keyword');
    
    const { data: alerts } = await supabase
      .from('alerts')
      .select('type, severity');
    
    return {
      totalRecords: {
        market_data: marketData?.length || 0,
        sentiment_data: sentimentData?.length || 0,
        alerts: alerts?.length || 0
      },
      uniqueSymbols: new Set(marketData?.map(d => d.symbol)).size,
      dataMarts: this.dataMarts.size,
      alertsSummary: {
        total: alerts?.length || 0,
        high: alerts?.filter(a => a.severity === 'high').length || 0,
        medium: alerts?.filter(a => a.severity === 'medium').length || 0,
        low: alerts?.filter(a => a.severity === 'low').length || 0
      }
    };
  }
}

export const dataLakeManager = DataLakeManager.getInstance();
