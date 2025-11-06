import { supabase } from '@/integrations/supabase/client';

export interface AnomalyReport {
  anomalies: Array<{
    symbol: string;
    type: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
    description: string;
    value: number;
    expected: number;
    deviation: number;
  }>;
  summary: string;
}

export interface Correlation {
  symbol1: string;
  symbol2: string;
  coefficient: number;
  strength: 'weak' | 'moderate' | 'strong';
  direction: 'positive' | 'negative';
}

export interface DataSet {
  symbol: string;
  data: any[];
  type: 'market' | 'sentiment' | 'alternative';
}

/**
 * Foundry Core - Data Processing Engine
 * เหมือน Palantir Foundry สำหรับประมวลผลข้อมูลขั้นสูง
 */
export class FoundryCore {
  private static instance: FoundryCore;

  private constructor() {}

  static getInstance(): FoundryCore {
    if (!FoundryCore.instance) {
      FoundryCore.instance = new FoundryCore();
    }
    return FoundryCore.instance;
  }

  /**
   * รับข้อมูลจาก data stream และบันทึกลง database
   */
  async ingestDataStream(source: string, data: any): Promise<void> {
    console.log(`📥 Ingesting data from ${source}...`);
    
    try {
      // แปลงข้อมูลตาม source type
      const transformedData = await this.transformData(source, data);
      
      // Enrich ด้วย metadata
      const enrichedData = await this.enrichWithMetadata(transformedData);
      
      // บันทึกลง market_data table
      if (Array.isArray(enrichedData)) {
        const { error } = await supabase
          .from('market_data')
          .insert(enrichedData.map(item => ({
            symbol: item.symbol,
            price: item.price,
            volume: item.volume,
            change: item.change,
            change_percent: item.changePercent,
            high: item.high,
            low: item.low,
            open: item.open,
            bid: item.bid,
            ask: item.ask,
            source: source,
            timestamp: new Date().toISOString()
          })));

        if (error) throw error;
        console.log(`✅ Ingested ${enrichedData.length} records from ${source}`);
      }
    } catch (error) {
      console.error(`❌ Ingestion failed for ${source}:`, error);
      
      // Log error to api_usage_logs
      await supabase.from('api_usage_logs').insert({
        api_name: source,
        status_code: 500,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * แปลงข้อมูลตาม pipeline ที่กำหนด
   */
  async transformData(pipeline: string, rawData: any): Promise<any> {
    console.log(`🔄 Transforming data with pipeline: ${pipeline}`);
    
    switch (pipeline) {
      case 'twelveData':
        return this.transformTwelveData(rawData);
      case 'yahooFinance':
        return this.transformYahooData(rawData);
      case 'alphaVantage':
        return this.transformAlphaVantageData(rawData);
      default:
        return rawData;
    }
  }

  private transformTwelveData(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => ({
        symbol: item.symbol,
        price: parseFloat(item.close || item.price || '0'),
        change: parseFloat(item.change || '0'),
        changePercent: parseFloat(item.percent_change || '0'),
        volume: parseInt(item.volume || '0'),
        high: parseFloat(item.high || '0'),
        low: parseFloat(item.low || '0'),
        open: parseFloat(item.open || '0'),
      }));
    }
    return data;
  }

  private transformYahooData(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => ({
        symbol: item.symbol,
        price: item.regularMarketPrice || 0,
        change: item.regularMarketChange || 0,
        changePercent: item.regularMarketChangePercent || 0,
        volume: item.regularMarketVolume || 0,
        high: item.regularMarketDayHigh || 0,
        low: item.regularMarketDayLow || 0,
        open: item.regularMarketOpen || 0,
        bid: item.bid,
        ask: item.ask,
      }));
    }
    return data;
  }

  private transformAlphaVantageData(data: any): any {
    if (data['Global Quote']) {
      const quote = data['Global Quote'];
      return [{
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price'] || '0'),
        change: parseFloat(quote['09. change'] || '0'),
        changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
        volume: parseInt(quote['06. volume'] || '0'),
        high: parseFloat(quote['03. high'] || '0'),
        low: parseFloat(quote['04. low'] || '0'),
        open: parseFloat(quote['02. open'] || '0'),
      }];
    }
    return data;
  }

  /**
   * เพิ่ม metadata เข้าไปในข้อมูล
   */
  async enrichWithMetadata(data: any): Promise<any> {
    console.log('✨ Enriching data with metadata...');
    
    if (Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        processingTimestamp: new Date().toISOString(),
        dataQuality: this.assessDataQuality(item),
        confidence: this.calculateConfidence(item)
      }));
    }
    
    return {
      ...data,
      processingTimestamp: new Date().toISOString(),
      dataQuality: this.assessDataQuality(data),
      confidence: this.calculateConfidence(data)
    };
  }

  private assessDataQuality(item: any): 'high' | 'medium' | 'low' {
    let score = 0;
    if (item.price > 0) score++;
    if (item.volume > 0) score++;
    if (item.high > 0 && item.low > 0) score++;
    if (item.open > 0) score++;
    
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private calculateConfidence(item: any): number {
    // คำนวณ confidence score จาก completeness ของข้อมูล
    const fields = ['price', 'volume', 'high', 'low', 'open', 'change'];
    const validFields = fields.filter(field => item[field] !== undefined && item[field] !== null && item[field] !== 0);
    return (validFields.length / fields.length) * 100;
  }

  /**
   * ตรวจจับความผิดปกติในชุดข้อมูล
   */
  async detectAnomalies(dataset: any[]): Promise<AnomalyReport> {
    console.log('🔍 Detecting anomalies...');
    
    const anomalies: AnomalyReport['anomalies'] = [];
    
    for (const item of dataset) {
      // คำนวณค่าเฉลี่ย และ standard deviation
      const prices = dataset.map(d => d.price).filter(p => p > 0);
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
      const stdDev = Math.sqrt(variance);
      
      // ตรวจสอบว่าราคาห่างจาก mean เกิน 2 standard deviations หรือไม่
      const deviation = Math.abs(item.price - mean) / stdDev;
      
      if (deviation > 2) {
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (deviation > 3) severity = 'high';
        else if (deviation > 2.5) severity = 'medium';
        
        anomalies.push({
          symbol: item.symbol,
          type: 'price_deviation',
          timestamp: new Date(item.timestamp),
          severity,
          description: `Price deviation detected: ${deviation.toFixed(2)}σ`,
          value: item.price,
          expected: mean,
          deviation: deviation
        });
      }
      
      // ตรวจสอบ volume spike
      const volumes = dataset.map(d => d.volume).filter(v => v > 0);
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const volumeRatio = item.volume / avgVolume;
      
      if (volumeRatio > 3) {
        anomalies.push({
          symbol: item.symbol,
          type: 'volume_spike',
          timestamp: new Date(item.timestamp),
          severity: volumeRatio > 5 ? 'high' : 'medium',
          description: `Volume spike: ${volumeRatio.toFixed(1)}x average`,
          value: item.volume,
          expected: avgVolume,
          deviation: volumeRatio
        });
      }
    }
    
    // บันทึก anomalies ลง alerts table
    if (anomalies.length > 0) {
      await supabase.from('alerts').insert(
        anomalies.map(a => ({
          type: 'anomaly',
          title: `Anomaly detected: ${a.symbol}`,
          message: a.description,
          severity: a.severity,
          symbol: a.symbol,
          data: { value: a.value, expected: a.expected, deviation: a.deviation }
        }))
      );
    }
    
    return {
      anomalies,
      summary: `Detected ${anomalies.length} anomalies. ${anomalies.filter(a => a.severity === 'high').length} high severity.`
    };
  }

  /**
   * วิเคราะห์ความสัมพันธ์ระหว่างชุดข้อมูล
   */
  async crossReferenceData(datasets: DataSet[]): Promise<Correlation[]> {
    console.log('🔗 Cross-referencing datasets...');
    
    const correlations: Correlation[] = [];
    
    // วิเคราะห์ correlation แบบ pairwise
    for (let i = 0; i < datasets.length; i++) {
      for (let j = i + 1; j < datasets.length; j++) {
        const dataset1 = datasets[i];
        const dataset2 = datasets[j];
        
        // ดึงราคาจากทั้งสองชุด
        const prices1 = dataset1.data.map(d => d.price).filter(p => p > 0);
        const prices2 = dataset2.data.map(d => d.price).filter(p => p > 0);
        
        if (prices1.length > 0 && prices2.length > 0) {
          const coefficient = this.calculateCorrelation(prices1, prices2);
          
          let strength: 'weak' | 'moderate' | 'strong' = 'weak';
          if (Math.abs(coefficient) > 0.7) strength = 'strong';
          else if (Math.abs(coefficient) > 0.4) strength = 'moderate';
          
          correlations.push({
            symbol1: dataset1.symbol,
            symbol2: dataset2.symbol,
            coefficient,
            strength,
            direction: coefficient > 0 ? 'positive' : 'negative'
          });
        }
      }
    }
    
    return correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;
    
    const xSlice = x.slice(0, n);
    const ySlice = y.slice(0, n);
    
    const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
    const meanY = ySlice.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    
    for (let i = 0; i < n; i++) {
      const dx = xSlice[i] - meanX;
      const dy = ySlice[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }
    
    if (denomX === 0 || denomY === 0) return 0;
    
    return numerator / Math.sqrt(denomX * denomY);
  }
}

export const foundryCore = FoundryCore.getInstance();
