// OI Bubbles Indicator - Open Interest visualization for ABLE Chart
// Inspired by BackQuant's OI Bubbles Pine Script

import { supabase } from '@/integrations/supabase/client';

export interface OIBubble {
  timestamp: number;
  price: number;
  oiDelta: number;
  oiValue: number;
  normalized: number;
  isPositive: boolean;
  size: 'tiny' | 'small' | 'normal' | 'large' | 'huge';
  color: string;
}

export interface OIBubblesConfig {
  enabled: boolean;
  threshold: number;        // Base threshold (default 1.5)
  extremeThreshold: number; // Extreme threshold (default 3.0)
  maxBubbles: number;       // Max bubbles to show (default 20)
  normalization: 'zscore' | 'stdnorm' | 'none';
  showPositive: boolean;
  showNegative: boolean;
}

export const DEFAULT_OI_CONFIG: OIBubblesConfig = {
  enabled: true,
  threshold: 1.5,
  extremeThreshold: 3.0,
  maxBubbles: 20,
  normalization: 'zscore',
  showPositive: true,
  showNegative: true,
};

// Color palette inspired by BackQuant theme
const POSITIVE_COLORS = [
  'rgba(0, 255, 128, 0.4)',   // Light green
  'rgba(0, 200, 100, 0.5)',   // Green
  'rgba(0, 255, 255, 0.5)',   // Cyan
  'rgba(0, 128, 255, 0.6)',   // Blue
  'rgba(128, 0, 255, 0.7)',   // Purple (extreme)
];

const NEGATIVE_COLORS = [
  'rgba(255, 100, 100, 0.4)', // Light red
  'rgba(255, 50, 50, 0.5)',   // Red
  'rgba(255, 128, 0, 0.5)',   // Orange
  'rgba(255, 255, 0, 0.6)',   // Yellow
  'rgba(255, 0, 128, 0.7)',   // Magenta (extreme)
];

export class OIBubblesService {
  private cachedData: Map<string, { oi: number; timestamp: number }[]> = new Map();
  private bubbles: OIBubble[] = [];
  private symbol: string = '';

  /**
   * Fetch Open Interest data from Binance Futures
   */
  async fetchOIData(symbol: string, limit: number = 100): Promise<{ oi: number; timestamp: number }[]> {
    const cacheKey = `${symbol}-${limit}`;
    
    // Use cache if fresh (< 5 seconds old)
    const cached = this.cachedData.get(cacheKey);
    if (cached && cached.length > 0) {
      const age = Date.now() - cached[cached.length - 1].timestamp;
      if (age < 5000) {
        return cached;
      }
    }

    try {
      // Fetch from Binance Futures Open Interest endpoint via proxy
      const { data, error } = await supabase.functions.invoke('market-data-proxy', {
        body: {
          endpoint: 'openInterest',
          symbol: symbol.replace('/', ''),
          limit
        }
      });

      if (error) throw error;
      
      const oiData = data?.openInterest || [];
      this.cachedData.set(cacheKey, oiData);
      return oiData;
    } catch (err) {
      console.warn('OI Bubbles: Failed to fetch OI data', err);
      return [];
    }
  }

  /**
   * Calculate Z-Score normalization
   */
  private calculateZScore(values: number[], index: number, length: number = 20): number {
    if (index < length) return 0;
    
    const slice = values.slice(index - length, index);
    const mean = slice.reduce((a, b) => a + b, 0) / length;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / length;
    const std = Math.sqrt(variance);
    
    if (std === 0) return 0;
    return (values[index] - mean) / std;
  }

  /**
   * Process OI data and generate bubbles
   */
  processBubbles(
    oiData: { oi: number; timestamp: number }[],
    priceData: { close: number; timestamp: number }[],
    config: OIBubblesConfig
  ): OIBubble[] {
    if (oiData.length < 2 || priceData.length < 2) {
      return [];
    }

    const bubbles: OIBubble[] = [];
    
    // Calculate OI deltas
    const deltas: number[] = [];
    for (let i = 1; i < oiData.length; i++) {
      deltas.push(oiData[i].oi - oiData[i - 1].oi);
    }

    // Normalize deltas
    const normalizedDeltas = deltas.map((_, i) => {
      if (config.normalization === 'zscore') {
        return this.calculateZScore(deltas, i);
      } else if (config.normalization === 'stdnorm') {
        // Simple standard normalization
        const max = Math.max(...deltas.map(Math.abs));
        return max > 0 ? deltas[i] / max : 0;
      }
      return deltas[i];
    });

    // Generate bubbles for significant OI changes
    for (let i = 0; i < normalizedDeltas.length; i++) {
      const normalized = normalizedDeltas[i];
      const absNorm = Math.abs(normalized);
      
      // Skip if below threshold
      if (absNorm < config.threshold) continue;
      
      const isPositive = normalized > 0;
      
      // Filter by config
      if (isPositive && !config.showPositive) continue;
      if (!isPositive && !config.showNegative) continue;

      // Find matching price data
      const oiTimestamp = oiData[i + 1].timestamp;
      const pricePoint = priceData.find(p => 
        Math.abs(p.timestamp - oiTimestamp) < 60000 // Within 1 minute
      );
      
      if (!pricePoint) continue;

      // Determine size based on normalized value
      let size: OIBubble['size'] = 'tiny';
      if (absNorm >= config.extremeThreshold) size = 'huge';
      else if (absNorm >= config.threshold * 2) size = 'large';
      else if (absNorm >= config.threshold * 1.5) size = 'normal';
      else if (absNorm >= config.threshold * 1.2) size = 'small';

      // Get color based on intensity
      const colorIndex = Math.min(4, Math.floor((absNorm - config.threshold) / ((config.extremeThreshold - config.threshold) / 5)));
      const colors = isPositive ? POSITIVE_COLORS : NEGATIVE_COLORS;
      const color = colors[colorIndex] || colors[0];

      bubbles.push({
        timestamp: oiTimestamp,
        price: pricePoint.close,
        oiDelta: deltas[i],
        oiValue: oiData[i + 1].oi,
        normalized,
        isPositive,
        size,
        color
      });
    }

    // Limit to max bubbles (most recent)
    this.bubbles = bubbles.slice(-config.maxBubbles);
    return this.bubbles;
  }

  /**
   * Draw bubbles on canvas
   */
  drawBubbles(
    ctx: CanvasRenderingContext2D,
    bubbles: OIBubble[],
    viewport: { startIndex: number; endIndex: number; priceMin: number; priceMax: number },
    chartArea: { x: number; y: number; width: number; height: number },
    dpr: number = 1
  ) {
    if (bubbles.length === 0) return;

    const sizeMap: Record<OIBubble['size'], number> = {
      tiny: 4,
      small: 8,
      normal: 12,
      large: 18,
      huge: 28
    };

    bubbles.forEach(bubble => {
      // Calculate position
      const priceRange = viewport.priceMax - viewport.priceMin;
      const y = chartArea.y + (1 - (bubble.price - viewport.priceMin) / priceRange) * chartArea.height;
      
      // X position based on time (simplified - would need proper time mapping)
      const indexRange = viewport.endIndex - viewport.startIndex;
      const x = chartArea.x + (0.8 * chartArea.width); // Place towards right for now
      
      const radius = sizeMap[bubble.size] * dpr;

      // Draw bubble
      ctx.beginPath();
      ctx.arc(x * dpr, y * dpr, radius, 0, Math.PI * 2);
      ctx.fillStyle = bubble.color;
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = bubble.isPositive ? 'rgba(0, 255, 128, 0.8)' : 'rgba(255, 100, 100, 0.8)';
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      // Draw label for larger bubbles
      if (bubble.size === 'large' || bubble.size === 'huge') {
        ctx.fillStyle = bubble.isPositive ? '#00ff80' : '#ff6464';
        ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        const label = `${bubble.isPositive ? '+' : ''}${(bubble.oiDelta / 1000000).toFixed(2)}M`;
        ctx.fillText(label, x * dpr, (y - radius / dpr - 4) * dpr);
      }
    });
  }

  getBubbles(): OIBubble[] {
    return this.bubbles;
  }

  clear() {
    this.bubbles = [];
    this.cachedData.clear();
  }
}

export const oiBubblesService = new OIBubblesService();
