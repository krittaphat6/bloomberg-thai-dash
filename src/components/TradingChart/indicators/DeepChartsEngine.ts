// DeepCharts Pro V4.1 - Calculation Engine
// Converts PineScript logic to TypeScript, using candle data + DOM order book data

import { Candle } from '../ABLEChartEngine/types';
import { OrderBookData } from '@/services/BinanceOrderBookService';

export interface DeepChartsConfig {
  // Colors
  buyColor: string;
  sellColor: string;
  anomalyColor: string;
  textColor: string;
  pocColor: string;
  vahColor: string;
  valColor: string;

  // Big Trades Detection
  sigma: number;           // Sensitivity (1.0 - 5.0)
  tier2Mult: number;       // Tier 2 multiplier
  tier3Mult: number;       // Tier 3 multiplier
  showTier2: boolean;
  showTier3: boolean;

  // Anomaly Detection
  enableAnomaly: boolean;
  anomalyThreshold: number; // 2.0 - 5.0
  anomalyExtendBars: number;
  showAnomalyLabel: boolean;

  // Volume Price Map
  enablePriceMap: boolean;
  profileLookback: number;  // bars to look back
  profileBins: number;      // price bins
  profileWidth: number;     // visual width
  showPOC: boolean;
  showVAH: boolean;
  showVAL: boolean;
  vaPercent: number;        // value area percentage (default 70)

  // OI Filter (uses order book imbalance as proxy)
  enableOIFilter: boolean;
  oiSensitivity: number;
  oiBoostPercent: number;

  // Display
  showVolBars: boolean;
  showStats: boolean;
  showGlowCircles: boolean;

  // Overall
  enabled: boolean;
}

export const DEFAULT_DEEPCHARTS_CONFIG: DeepChartsConfig = {
  buyColor: '#00BCD4',
  sellColor: '#E91E63',
  anomalyColor: '#FFD700',
  textColor: '#FFFFFF',
  pocColor: '#FF6B00',
  vahColor: '#4CAF50',
  valColor: '#F44336',

  sigma: 2.5,
  tier2Mult: 1.5,
  tier3Mult: 2.0,
  showTier2: true,
  showTier3: true,

  enableAnomaly: true,
  anomalyThreshold: 3.0,
  anomalyExtendBars: 10,
  showAnomalyLabel: true,

  enablePriceMap: true,
  profileLookback: 200,
  profileBins: 50,
  profileWidth: 120,
  showPOC: true,
  showVAH: true,
  showVAL: true,
  vaPercent: 70,

  enableOIFilter: true,
  oiSensitivity: 1.5,
  oiBoostPercent: 30,

  showVolBars: true,
  showStats: true,
  showGlowCircles: true,

  enabled: false,
};

export interface BigTradeSignal {
  barIndex: number;
  type: 'buy' | 'sell';
  tier: 2 | 3;
  volume: number;
  zScore: number;
  price: number;      // display price (low for buy, high for sell)
  oiBoosted: boolean;
}

export interface AnomalyZone {
  startIndex: number;
  endIndex: number;
  priceHigh: number;
  priceLow: number;
  volume: number;
  zScore: number;
}

export interface VolumeProfileBin {
  priceLevel: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  isHVN: boolean;     // High Volume Node
  isLVN: boolean;     // Low Volume Node
}

export interface VolumeProfileResult {
  bins: VolumeProfileBin[];
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  windowHigh: number;
  windowLow: number;
}

export interface DeepChartsResult {
  signals: BigTradeSignal[];
  anomalies: AnomalyZone[];
  volumeProfile: VolumeProfileResult | null;
  stats: {
    totalBuyVol: number;
    totalSellVol: number;
    buyRatio: number;
    avgVolume: number;
    oiImbalance: number;
  };
}

// Utility: calculate standard deviation
function stdev(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    const mean = sum / period;
    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) sqSum += (values[j] - mean) ** 2;
    result[i] = Math.sqrt(sqSum / period);
  }
  return result;
}

function sma(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    result[i] = sum / period;
  }
  return result;
}

export function computeDeepCharts(
  candles: Candle[],
  config: DeepChartsConfig,
  orderBook: OrderBookData | null,
  visibleStart: number,
  visibleEnd: number
): DeepChartsResult {
  const signals: BigTradeSignal[] = [];
  const anomalies: AnomalyZone[] = [];
  
  // Clamp visible range to valid indices
  const safeStart = Math.max(0, Math.min(visibleStart, candles.length - 1));
  const safeEnd = Math.max(0, Math.min(visibleEnd, candles.length - 1));

  if (candles.length < 30 || safeStart > safeEnd) {
    return {
      signals,
      anomalies,
      volumeProfile: null,
      stats: { totalBuyVol: 0, totalSellVol: 0, buyRatio: 0.5, avgVolume: 0, oiImbalance: 0 },
    };
  }

  // === Calculate buy/sell volume per bar (using close position in range) ===
  const buyVols: number[] = [];
  const sellVols: number[] = [];
  const totalVols: number[] = [];

  for (let idx = 0; idx < candles.length; idx++) {
    const c = candles[idx];
    if (!c || typeof c.high !== 'number' || typeof c.low !== 'number' || typeof c.close !== 'number') {
      buyVols.push(0);
      sellVols.push(0);
      totalVols.push(0);
      continue;
    }
    const range = c.high - c.low;
    const safeRange = range > 0 ? range : 1;
    const buyWt = (c.close - c.low) / safeRange;
    const sellWt = (c.high - c.close) / safeRange;
    const vol = c.volume || 0;
    buyVols.push(vol * buyWt);
    sellVols.push(vol * sellWt);
    totalVols.push(vol);
  }

  // === Big Trade Detection (Z-score based) ===
  const period = 20;
  const buyStd = stdev(buyVols, period);
  const sellStd = stdev(sellVols, period);
  const buyMean = sma(buyVols, period);
  const sellMean = sma(sellVols, period);

  // OI proxy from order book
  const oiImbalance = orderBook ? orderBook.imbalance : 0;
  const oiStrength = Math.min(Math.abs(oiImbalance) / config.oiSensitivity * 100, 100);
  const oiSpike = Math.abs(oiImbalance) > config.oiSensitivity;

  for (let i = Math.max(period, safeStart); i <= Math.min(candles.length - 1, safeEnd + 5); i++) {
    const c = candles[i];
    if (!c || typeof c.high !== 'number') continue;
    // Buy Z-score
    const zBuy = buyStd[i] > 0 ? (buyVols[i] - buyMean[i]) / buyStd[i] : 0;
    const zSell = sellStd[i] > 0 ? (sellVols[i] - sellMean[i]) / sellStd[i] : 0;

    // Apply OI boost
    let zBuyFinal = zBuy;
    let zSellFinal = zSell;
    if (config.enableOIFilter && oiSpike) {
      const boostFactor = 1 + (config.oiBoostPercent / 100);
      if (oiImbalance > 0) zBuyFinal *= boostFactor;
      if (oiImbalance < 0) zSellFinal *= boostFactor;
    }

    // Check buy signals
    const buyT2 = zBuyFinal >= config.sigma;
    const buyT3 = zBuyFinal >= config.sigma * config.tier3Mult;

    if (buyT3 && config.showTier3) {
      signals.push({
        barIndex: i,
        type: 'buy',
        tier: 3,
        volume: buyVols[i],
        zScore: zBuyFinal,
        price: c.low,
        oiBoosted: config.enableOIFilter && oiSpike && oiImbalance > 0,
      });
    } else if (buyT2 && config.showTier2) {
      signals.push({
        barIndex: i,
        type: 'buy',
        tier: 2,
        volume: buyVols[i],
        zScore: zBuyFinal,
        price: c.low,
        oiBoosted: config.enableOIFilter && oiSpike && oiImbalance > 0,
      });
    }

    // Check sell signals
    const sellT2 = zSellFinal >= config.sigma;
    const sellT3 = zSellFinal >= config.sigma * config.tier3Mult;

    if (sellT3 && config.showTier3) {
      signals.push({
        barIndex: i,
        type: 'sell',
        tier: 3,
        volume: sellVols[i],
        zScore: zSellFinal,
        price: c.high,
        oiBoosted: config.enableOIFilter && oiSpike && oiImbalance < 0,
      });
    } else if (sellT2 && config.showTier2) {
      signals.push({
        barIndex: i,
        type: 'sell',
        tier: 2,
        volume: sellVols[i],
        zScore: zSellFinal,
        price: c.high,
        oiBoosted: config.enableOIFilter && oiSpike && oiImbalance < 0,
      });
    }

    // === Anomaly Detection ===
    if (config.enableAnomaly) {
      const totalZ = totalVols[i] > 0 && buyStd[i] > 0
        ? (totalVols[i] - (buyMean[i] + sellMean[i])) / (buyStd[i] + sellStd[i] || 1)
        : 0;
      
      if (Math.abs(totalZ) >= config.anomalyThreshold) {
        anomalies.push({
          startIndex: i,
          endIndex: Math.min(i + config.anomalyExtendBars, candles.length - 1),
          priceHigh: c.high,
          priceLow: c.low,
          volume: totalVols[i],
          zScore: totalZ,
        });
      }
    }
  }

  // === Volume Profile ===
  let volumeProfile: VolumeProfileResult | null = null;
  if (config.enablePriceMap && candles.length > 0) {
    const profileEnd = Math.min(safeEnd, candles.length - 1);
    const profileStart = Math.max(0, profileEnd - config.profileLookback);
    
    let windowHigh = -Infinity;
    let windowLow = Infinity;
    for (let i = profileStart; i <= profileEnd; i++) {
      const c = candles[i];
      if (!c || typeof c.high !== 'number') continue;
      windowHigh = Math.max(windowHigh, c.high);
      windowLow = Math.min(windowLow, c.low);
    }
    if (windowHigh === -Infinity || windowLow === Infinity) windowHigh = windowLow = 0;

    const priceStep = (windowHigh - windowLow) / config.profileBins;
    if (priceStep > 0) {
      const bins: VolumeProfileBin[] = [];
      for (let b = 0; b < config.profileBins; b++) {
        bins.push({
          priceLevel: windowLow + (b + 0.5) * priceStep,
          totalVolume: 0,
          buyVolume: 0,
          sellVolume: 0,
          isHVN: false,
          isLVN: false,
        });
      }

      // Fill bins
      for (let i = profileStart; i <= profileEnd; i++) {
        const c = candles[i];
        const binIdx = Math.min(config.profileBins - 1, Math.max(0,
          Math.floor((c.close - windowLow) / priceStep)
        ));
        bins[binIdx].totalVolume += totalVols[i];
        bins[binIdx].buyVolume += buyVols[i];
        bins[binIdx].sellVolume += sellVols[i];
      }

      // Find POC, VAH, VAL
      let maxVol = 0;
      let pocIdx = 0;
      const totalVolSum = bins.reduce((s, b) => s + b.totalVolume, 0);
      const avgBinVol = totalVolSum / config.profileBins;

      for (let i = 0; i < bins.length; i++) {
        if (bins[i].totalVolume > maxVol) {
          maxVol = bins[i].totalVolume;
          pocIdx = i;
        }
        bins[i].isHVN = bins[i].totalVolume > avgBinVol * 1.5;
        bins[i].isLVN = bins[i].totalVolume < avgBinVol * 0.5 && bins[i].totalVolume > 0;
      }

      // Value Area calculation
      const targetVA = totalVolSum * (config.vaPercent / 100);
      let vaVol = bins[pocIdx].totalVolume;
      let vaUp = pocIdx;
      let vaDn = pocIdx;

      while (vaVol < targetVA) {
        const canUp = vaUp < config.profileBins - 1;
        const canDn = vaDn > 0;
        if (!canUp && !canDn) break;

        const upV = canUp ? bins[vaUp + 1].totalVolume : 0;
        const dnV = canDn ? bins[vaDn - 1].totalVolume : 0;

        if (canUp && (upV >= dnV || !canDn)) {
          vaUp++;
          vaVol += upV;
        } else if (canDn) {
          vaDn--;
          vaVol += dnV;
        }
      }

      volumeProfile = {
        bins,
        pocPrice: windowLow + (pocIdx + 0.5) * priceStep,
        vahPrice: windowLow + (vaUp + 1) * priceStep,
        valPrice: windowLow + vaDn * priceStep,
        windowHigh,
        windowLow,
      };
    }
  }

  // Stats
  const visibleBuyVol = buyVols.slice(safeStart, safeEnd + 1).reduce((s, v) => s + v, 0);
  const visibleSellVol = sellVols.slice(safeStart, safeEnd + 1).reduce((s, v) => s + v, 0);
  const totalVis = visibleBuyVol + visibleSellVol;
  const visibleTotalVols = totalVols.slice(safeStart, safeEnd + 1);
  const avgVol = visibleTotalVols.length > 0 ? visibleTotalVols.reduce((s, v) => s + v, 0) / visibleTotalVols.length : 0;

  return {
    signals,
    anomalies,
    volumeProfile,
    stats: {
      totalBuyVol: visibleBuyVol,
      totalSellVol: visibleSellVol,
      buyRatio: totalVis > 0 ? visibleBuyVol / totalVis : 0.5,
      avgVolume: avgVol,
      oiImbalance,
    },
  };
}
