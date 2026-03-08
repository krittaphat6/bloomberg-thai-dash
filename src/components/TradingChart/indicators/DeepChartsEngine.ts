// DeepCharts Pro V4.1 - Faithful PineScript Port
// ATR-normalized intensity Z-scores, Smart SL/TP, Volume Bubbles, Dynamic Profile

import { Candle } from '../ABLEChartEngine/types';
import { OrderBookData } from '@/services/BinanceOrderBookService';

// ==================== CONFIG ====================
export interface DeepChartsConfig {
  // Colors
  buyColor: string;
  sellColor: string;
  anomalyColor: string;
  textColor: string;
  pocColor: string;
  vahColor: string;
  valColor: string;
  slColor: string;
  tp1Color: string;
  tp2Color: string;
  profileNormalColor: string;
  profileVaColor: string;

  // Big Trades Detection
  sigma: number;
  tier2Mult: number;
  tier3Mult: number;
  showTier2: boolean;
  showTier3: boolean;

  // Anomaly Detection
  enableAnomaly: boolean;
  anomalyThreshold: number;
  anomalyExtendBars: number;
  showAnomalyLabel: boolean;

  // Volume Price Map
  enablePriceMap: boolean;
  profileLookback: number;
  profileBins: number;
  profileWidth: number;
  profileOffset: number;
  showPOC: boolean;
  showVAH: boolean;
  showVAL: boolean;
  vaPercent: number;

  // OI Filter
  enableOIFilter: boolean;
  oiSensitivity: number;
  oiBoostPercent: number;

  // Smart SL/TP
  enableSLTP: boolean;
  sltpSource: 'close' | 'hl2' | 'hlc3';
  minDistATR: number;
  slBufferATR: number;
  hvnMultiplier: number;
  sltpZoneBins: number;
  sltpAtrFallback: number;
  tp2AtrFallback: number;
  showSLTPLabels: boolean;
  showTP2: boolean;
  showSLTPStats: boolean;

  // Dynamic Profile
  enableDynProfile: boolean;
  dynLookback: number;

  // Volume Bubbles
  showMapBubbles: boolean;
  mapBubbleThreshold: number;
  projectLevels: boolean;
  maxProjectedLevels: number;

  // Display
  showVolBars: boolean;
  showStats: boolean;
  showGlowCircles: boolean;

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
  slColor: '#FF1744',
  tp1Color: '#00E676',
  tp2Color: '#76FF03',
  profileNormalColor: '#555555',
  profileVaColor: '#888888',

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
  profileOffset: 5,
  showPOC: true,
  showVAH: true,
  showVAL: true,
  vaPercent: 70,

  enableOIFilter: true,
  oiSensitivity: 1.5,
  oiBoostPercent: 30,

  enableSLTP: false,
  sltpSource: 'close',
  minDistATR: 0.5,
  slBufferATR: 0.3,
  hvnMultiplier: 1.5,
  sltpZoneBins: 50,
  sltpAtrFallback: 1.5,
  tp2AtrFallback: 3.0,
  showSLTPLabels: true,
  showTP2: true,
  showSLTPStats: true,

  enableDynProfile: false,
  dynLookback: 100,

  showMapBubbles: false,
  mapBubbleThreshold: 1.5,
  projectLevels: false,
  maxProjectedLevels: 5,

  showVolBars: true,
  showStats: true,
  showGlowCircles: true,

  enabled: false,
};

// ==================== DATA STRUCTURES ====================
export interface BigTradeSignal {
  barIndex: number;
  type: 'buy' | 'sell';
  tier: 2 | 3;
  volume: number;
  zScore: number;
  price: number;
  oiBoosted: boolean;
  intensity: number;
}

export type AnomalyType = 'CRITICAL' | 'REVERSAL' | 'OI_SPIKE';

export interface AnomalyZone {
  startIndex: number;
  endIndex: number;
  priceHigh: number;
  priceLow: number;
  volume: number;
  zScore: number;
  anomalyType: AnomalyType;
}

export interface VolumeProfileBin {
  priceLevel: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  isHVN: boolean;
  isLVN: boolean;
  zone?: 'sl' | 'tp1' | 'tp2' | 'poc' | 'va' | 'normal';
}

export interface VolumeProfileResult {
  bins: VolumeProfileBin[];
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  windowHigh: number;
  windowLow: number;
}

export interface SLTPResult {
  slPrice: number;
  tp1Price: number;
  tp2Price: number;
  direction: 'long' | 'short';
  rr1: number;
  rr2: number;
  hasRealSignal: boolean;
}

export type BubbleSizeCategory = 'huge' | 'large' | 'normal' | 'small';

export interface VolumeBubble {
  barIndex: number;
  price: number;
  zScore: number;
  isBull: boolean;
  sizeCategory: BubbleSizeCategory;
}

export interface DynamicProfilePoint {
  barIndex: number;
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
}

export interface DeepChartsResult {
  signals: BigTradeSignal[];
  anomalies: AnomalyZone[];
  volumeProfile: VolumeProfileResult | null;
  sltp: SLTPResult | null;
  bubbles: VolumeBubble[];
  dynProfile: DynamicProfilePoint[];
  stats: {
    totalBuyVol: number;
    totalSellVol: number;
    buyRatio: number;
    avgVolume: number;
    oiImbalance: number;
    oiDeltaPercent: number;
    signalsBuy: number;
    signalsSell: number;
  };
}

// ==================== UTILITY FUNCTIONS ====================
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

/** ATR(14) - Average True Range */
function calcATR(candles: Candle[], period: number = 14): number[] {
  const tr: number[] = new Array(candles.length).fill(0);
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      tr[i] = c.high - c.low;
    } else {
      const prev = candles[i - 1];
      tr[i] = Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close)
      );
    }
  }
  // RMA (Wilder's smoothing) for ATR
  const atr: number[] = new Array(candles.length).fill(0);
  let sum = 0;
  for (let i = 0; i < Math.min(period, candles.length); i++) sum += tr[i];
  if (candles.length >= period) atr[period - 1] = sum / period;
  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

function getBubbleSize(z: number): BubbleSizeCategory {
  if (z >= 4.0) return 'huge';
  if (z >= 3.0) return 'large';
  if (z >= 2.0) return 'normal';
  return 'small';
}

// ==================== MAIN COMPUTATION ====================
export function computeDeepCharts(
  candles: Candle[],
  config: DeepChartsConfig,
  orderBook: OrderBookData | null,
  visibleStart: number,
  visibleEnd: number
): DeepChartsResult {
  const signals: BigTradeSignal[] = [];
  const anomalies: AnomalyZone[] = [];
  const bubbles: VolumeBubble[] = [];
  const dynProfile: DynamicProfilePoint[] = [];

  const safeStart = Math.max(0, Math.min(visibleStart, candles.length - 1));
  const safeEnd = Math.max(0, Math.min(visibleEnd, candles.length - 1));

  const emptyResult: DeepChartsResult = {
    signals, anomalies, volumeProfile: null, sltp: null, bubbles, dynProfile,
    stats: { totalBuyVol: 0, totalSellVol: 0, buyRatio: 0.5, avgVolume: 0, oiImbalance: 0, oiDeltaPercent: 0, signalsBuy: 0, signalsSell: 0 },
  };

  if (candles.length < 30 || safeStart > safeEnd) return emptyResult;

  // === ATR calculation ===
  const atr = calcATR(candles, 14);

  // === Buy/Sell intensity (ATR-normalized) ===
  const buyIntensity: number[] = [];
  const sellIntensity: number[] = [];
  const totalVols: number[] = [];
  const buyVols: number[] = [];
  const sellVols: number[] = [];

  for (let idx = 0; idx < candles.length; idx++) {
    const c = candles[idx];
    if (!c || typeof c.high !== 'number' || typeof c.low !== 'number') {
      buyIntensity.push(0); sellIntensity.push(0);
      totalVols.push(0); buyVols.push(0); sellVols.push(0);
      continue;
    }
    const range = c.high - c.low;
    const safeRange = range > 0 ? range : 0.0001;
    const safeATR = atr[idx] > 0 ? atr[idx] : safeRange;
    const vol = c.volume || 0;

    const buyWt = (c.close - c.low) / safeRange;
    const sellWt = (c.high - c.close) / safeRange;
    const bVol = vol * buyWt;
    const sVol = vol * sellWt;

    // Intensity = volume / range / ATR (PineScript original)
    buyIntensity.push(bVol / safeRange / safeATR);
    sellIntensity.push(sVol / safeRange / safeATR);
    totalVols.push(vol);
    buyVols.push(bVol);
    sellVols.push(sVol);
  }

  // === Z-scores on intensity (period=30 per original) ===
  const period = 30;
  const buyMean = sma(buyIntensity, period);
  const buyStd = stdev(buyIntensity, period);
  const sellMean = sma(sellIntensity, period);
  const sellStd = stdev(sellIntensity, period);
  const totalVolMean = sma(totalVols, period);
  const totalVolStd = stdev(totalVols, period);

  // OI proxy from order book
  const oiImbalance = orderBook ? orderBook.imbalance : 0;
  const totalBidVol = orderBook ? orderBook.bids.reduce((s, b) => s + b[1], 0) : 0;
  const totalAskVol = orderBook ? orderBook.asks.reduce((s, a) => s + a[1], 0) : 0;
  const oiDeltaPercent = (totalBidVol + totalAskVol) > 0
    ? ((totalBidVol - totalAskVol) / (totalBidVol + totalAskVol)) * 100 : 0;
  const oiSpike = Math.abs(oiImbalance) > config.oiSensitivity;

  // Determine uptick/downtick from last candle
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : null;
  const isUptick = lastCandle && prevCandle ? lastCandle.close >= prevCandle.close : true;

  // === Signal Detection (compute ALL candles, renderer clips to viewport) ===
  for (let i = period; i < candles.length; i++) {
    const c = candles[i];
    if (!c || typeof c.high !== 'number') continue;

    // Z-scores on intensity
    const zBuy = buyStd[i] > 0 ? (buyIntensity[i] - buyMean[i]) / buyStd[i] : 0;
    const zSell = sellStd[i] > 0 ? (sellIntensity[i] - sellMean[i]) / sellStd[i] : 0;

    // OI boost: additive, direction-filtered (PineScript original)
    let zBuyFinal = zBuy;
    let zSellFinal = zSell;
    if (config.enableOIFilter && oiSpike) {
      const boostFactor = config.oiBoostPercent / 100;
      // Only boost buy when uptick AND oiDelta > 0
      if (oiImbalance > 0 && isUptick) {
        zBuyFinal = zBuy + zBuy * boostFactor; // additive
      }
      // Only boost sell when downtick AND oiDelta < 0
      if (oiImbalance < 0 && !isUptick) {
        zSellFinal = zSell + zSell * boostFactor; // additive
      }
    }

    // Tier thresholds (PineScript: t2 = sigma * tier2Mult, t3 = sigma * tier3Mult)
    const t2Thresh = config.sigma * config.tier2Mult;
    const t3Thresh = config.sigma * config.tier3Mult;

    // Buy signals
    if (zBuyFinal >= t3Thresh && config.showTier3) {
      signals.push({
        barIndex: i, type: 'buy', tier: 3, volume: buyVols[i],
        zScore: zBuyFinal, price: c.low, intensity: buyIntensity[i],
        oiBoosted: config.enableOIFilter && oiSpike && oiImbalance > 0 && isUptick,
      });
    } else if (zBuyFinal >= t2Thresh && config.showTier2) {
      signals.push({
        barIndex: i, type: 'buy', tier: 2, volume: buyVols[i],
        zScore: zBuyFinal, price: c.low, intensity: buyIntensity[i],
        oiBoosted: config.enableOIFilter && oiSpike && oiImbalance > 0 && isUptick,
      });
    }

    // Sell signals
    if (zSellFinal >= t3Thresh && config.showTier3) {
      signals.push({
        barIndex: i, type: 'sell', tier: 3, volume: sellVols[i],
        zScore: zSellFinal, price: c.high, intensity: sellIntensity[i],
        oiBoosted: config.enableOIFilter && oiSpike && oiImbalance < 0 && !isUptick,
      });
    } else if (zSellFinal >= t2Thresh && config.showTier2) {
      signals.push({
        barIndex: i, type: 'sell', tier: 2, volume: sellVols[i],
        zScore: zSellFinal, price: c.high, intensity: sellIntensity[i],
        oiBoosted: config.enableOIFilter && oiSpike && oiImbalance < 0 && !isUptick,
      });
    }

    // === Anomaly Detection (3 types) ===
    if (config.enableAnomaly) {
      const totalZ = totalVolStd[i] > 0 ? (totalVols[i] - totalVolMean[i]) / totalVolStd[i] : 0;

      if (Math.abs(totalZ) >= config.anomalyThreshold) {
        // Classify anomaly type
        let anomalyType: AnomalyType = 'CRITICAL';
        if (config.enableOIFilter && oiSpike && Math.abs(oiImbalance) > config.oiSensitivity * 2) {
          anomalyType = 'OI_SPIKE';
        } else if (totalZ < 0 || (c.close < c.open && totalZ > config.anomalyThreshold)) {
          anomalyType = 'REVERSAL';
        }

        anomalies.push({
          startIndex: i,
          endIndex: Math.min(i + config.anomalyExtendBars, candles.length - 1),
          priceHigh: c.high,
          priceLow: c.low,
          volume: totalVols[i],
          zScore: totalZ,
          anomalyType,
        });
      }
    }

    // === Volume Bubbles ===
    if (config.showMapBubbles) {
      const volZ = totalVolStd[i] > 0 ? (totalVols[i] - totalVolMean[i]) / totalVolStd[i] : 0;
      if (volZ >= config.mapBubbleThreshold) {
        const hl2 = (c.high + c.low) / 2;
        bubbles.push({
          barIndex: i,
          price: hl2,
          zScore: volZ,
          isBull: c.close >= c.open,
          sizeCategory: getBubbleSize(volZ),
        });
      }
    }
  }

  // === Volume Profile ===
  let volumeProfile: VolumeProfileResult | null = null;
  if (config.enablePriceMap && candles.length > 0) {
    volumeProfile = computeVolumeProfile(candles, config, safeStart, safeEnd, totalVols, buyVols, sellVols);
  }

  // === Smart SL/TP ===
  let sltp: SLTPResult | null = null;
  if (config.enableSLTP && volumeProfile && signals.length > 0 && atr.length > 0) {
    sltp = computeSLTP(candles, config, volumeProfile, signals, atr, safeEnd);
  }

  // === Dynamic Profile ===
  if (config.enableDynProfile) {
    const step = Math.max(1, Math.floor((safeEnd - safeStart) / 50)); // ~50 points max
    for (let i = Math.max(safeStart + config.dynLookback, period); i <= safeEnd; i += step) {
      const dpStart = Math.max(0, i - config.dynLookback);
      let windowHigh = -Infinity, windowLow = Infinity;
      for (let j = dpStart; j <= i; j++) {
        if (candles[j]) {
          windowHigh = Math.max(windowHigh, candles[j].high);
          windowLow = Math.min(windowLow, candles[j].low);
        }
      }
      if (windowHigh <= windowLow) continue;

      const bins = 30;
      const pStep = (windowHigh - windowLow) / bins;
      const binVols = new Array(bins).fill(0);
      for (let j = dpStart; j <= i; j++) {
        const bi = Math.min(bins - 1, Math.max(0, Math.floor((candles[j].close - windowLow) / pStep)));
        binVols[bi] += totalVols[j];
      }

      let pocIdx = 0, maxV = 0;
      const totalV = binVols.reduce((s: number, v: number) => s + v, 0);
      for (let b = 0; b < bins; b++) {
        if (binVols[b] > maxV) { maxV = binVols[b]; pocIdx = b; }
      }

      const targetVA = totalV * (config.vaPercent / 100);
      let vaVol = binVols[pocIdx], vaUp = pocIdx, vaDn = pocIdx;
      while (vaVol < targetVA) {
        const canUp = vaUp < bins - 1;
        const canDn = vaDn > 0;
        if (!canUp && !canDn) break;
        const upV = canUp ? binVols[vaUp + 1] : 0;
        const dnV = canDn ? binVols[vaDn - 1] : 0;
        if (canUp && (upV >= dnV || !canDn)) { vaUp++; vaVol += upV; }
        else if (canDn) { vaDn--; vaVol += dnV; }
      }

      dynProfile.push({
        barIndex: i,
        pocPrice: windowLow + (pocIdx + 0.5) * pStep,
        vahPrice: windowLow + (vaUp + 1) * pStep,
        valPrice: windowLow + vaDn * pStep,
      });
    }
  }

  // === Stats ===
  const visibleBuyVol = buyVols.slice(safeStart, safeEnd + 1).reduce((s, v) => s + v, 0);
  const visibleSellVol = sellVols.slice(safeStart, safeEnd + 1).reduce((s, v) => s + v, 0);
  const totalVis = visibleBuyVol + visibleSellVol;
  const visibleTotalVols = totalVols.slice(safeStart, safeEnd + 1);
  const avgVol = visibleTotalVols.length > 0 ? visibleTotalVols.reduce((s, v) => s + v, 0) / visibleTotalVols.length : 0;

  // Count visible signals for stats
  const visibleSignalsBuy = signals.filter(s => s.type === 'buy' && s.barIndex >= safeStart && s.barIndex <= safeEnd).length;
  const visibleSignalsSell = signals.filter(s => s.type === 'sell' && s.barIndex >= safeStart && s.barIndex <= safeEnd).length;

  return {
    signals, anomalies, volumeProfile, sltp, bubbles, dynProfile,
    stats: {
      totalBuyVol: visibleBuyVol,
      totalSellVol: visibleSellVol,
      buyRatio: totalVis > 0 ? visibleBuyVol / totalVis : 0.5,
      avgVolume: avgVol,
      oiImbalance,
      oiDeltaPercent,
      signalsBuy: visibleSignalsBuy,
      signalsSell: visibleSignalsSell,
    },
  };
}

// ==================== VOLUME PROFILE ====================
function computeVolumeProfile(
  candles: Candle[], config: DeepChartsConfig,
  safeStart: number, safeEnd: number,
  totalVols: number[], buyVols: number[], sellVols: number[]
): VolumeProfileResult | null {
  const profileEnd = Math.min(safeEnd, candles.length - 1);
  const profileStart = Math.max(0, profileEnd - config.profileLookback);

  let windowHigh = -Infinity, windowLow = Infinity;
  for (let i = profileStart; i <= profileEnd; i++) {
    const c = candles[i];
    if (!c || typeof c.high !== 'number') continue;
    windowHigh = Math.max(windowHigh, c.high);
    windowLow = Math.min(windowLow, c.low);
  }
  if (windowHigh === -Infinity || windowLow === Infinity) return null;

  const priceStep = (windowHigh - windowLow) / config.profileBins;
  if (priceStep <= 0) return null;

  const bins: VolumeProfileBin[] = [];
  for (let b = 0; b < config.profileBins; b++) {
    bins.push({
      priceLevel: windowLow + (b + 0.5) * priceStep,
      totalVolume: 0, buyVolume: 0, sellVolume: 0,
      isHVN: false, isLVN: false, zone: 'normal',
    });
  }

  for (let i = profileStart; i <= profileEnd; i++) {
    const c = candles[i];
    if (!c) continue;
    const binIdx = Math.min(config.profileBins - 1, Math.max(0,
      Math.floor((c.close - windowLow) / priceStep)
    ));
    bins[binIdx].totalVolume += totalVols[i];
    bins[binIdx].buyVolume += buyVols[i];
    bins[binIdx].sellVolume += sellVols[i];
  }

  let maxVol = 0, pocIdx = 0;
  const totalVolSum = bins.reduce((s, b) => s + b.totalVolume, 0);
  const avgBinVol = totalVolSum / config.profileBins;

  for (let i = 0; i < bins.length; i++) {
    if (bins[i].totalVolume > maxVol) { maxVol = bins[i].totalVolume; pocIdx = i; }
    bins[i].isHVN = bins[i].totalVolume > avgBinVol * config.hvnMultiplier;
    bins[i].isLVN = bins[i].totalVolume < avgBinVol * 0.5 && bins[i].totalVolume > 0;
  }

  // Value Area
  const targetVA = totalVolSum * (config.vaPercent / 100);
  let vaVol = bins[pocIdx].totalVolume;
  let vaUp = pocIdx, vaDn = pocIdx;

  while (vaVol < targetVA) {
    const canUp = vaUp < config.profileBins - 1;
    const canDn = vaDn > 0;
    if (!canUp && !canDn) break;
    const upV = canUp ? bins[vaUp + 1].totalVolume : 0;
    const dnV = canDn ? bins[vaDn - 1].totalVolume : 0;
    if (canUp && (upV >= dnV || !canDn)) { vaUp++; vaVol += upV; }
    else if (canDn) { vaDn--; vaVol += dnV; }
  }

  // Assign zones
  bins[pocIdx].zone = 'poc';
  for (let i = vaDn; i <= vaUp; i++) {
    if (i !== pocIdx) bins[i].zone = 'va';
  }

  return {
    bins,
    pocPrice: windowLow + (pocIdx + 0.5) * priceStep,
    vahPrice: windowLow + (vaUp + 1) * priceStep,
    valPrice: windowLow + vaDn * priceStep,
    windowHigh, windowLow,
  };
}

// ==================== SMART SL/TP ====================
function computeSLTP(
  candles: Candle[], config: DeepChartsConfig,
  profile: VolumeProfileResult, signals: BigTradeSignal[],
  atr: number[], safeEnd: number
): SLTPResult | null {
  const lastSignal = signals[signals.length - 1];
  if (!lastSignal) return null;

  const currentATR = atr[Math.min(safeEnd, atr.length - 1)] || 1;
  const direction: 'long' | 'short' = lastSignal.type === 'buy' ? 'long' : 'short';

  // Get trigger price based on config source
  const c = candles[lastSignal.barIndex];
  if (!c) return null;
  let triggerPrice = c.close;
  if (config.sltpSource === 'hl2') triggerPrice = (c.high + c.low) / 2;
  if (config.sltpSource === 'hlc3') triggerPrice = (c.high + c.low + c.close) / 3;

  // Find HVN bins for SL (nearest HVN opposite direction)
  const hvnBins = profile.bins.filter(b => b.isHVN);
  let slPrice = 0;
  let tp1Price = 0;

  if (direction === 'long') {
    // SL = nearest HVN below trigger
    const hvnBelow = hvnBins.filter(b => b.priceLevel < triggerPrice - config.minDistATR * currentATR);
    slPrice = hvnBelow.length > 0
      ? hvnBelow[hvnBelow.length - 1].priceLevel - config.slBufferATR * currentATR
      : triggerPrice - config.sltpAtrFallback * currentATR;

    // TP1 = nearest HVN above trigger
    const hvnAbove = hvnBins.filter(b => b.priceLevel > triggerPrice + config.minDistATR * currentATR);
    tp1Price = hvnAbove.length > 0
      ? hvnAbove[0].priceLevel
      : triggerPrice + config.sltpAtrFallback * currentATR;
  } else {
    const hvnAbove = hvnBins.filter(b => b.priceLevel > triggerPrice + config.minDistATR * currentATR);
    slPrice = hvnAbove.length > 0
      ? hvnAbove[0].priceLevel + config.slBufferATR * currentATR
      : triggerPrice + config.sltpAtrFallback * currentATR;

    const hvnBelow = hvnBins.filter(b => b.priceLevel < triggerPrice - config.minDistATR * currentATR);
    tp1Price = hvnBelow.length > 0
      ? hvnBelow[hvnBelow.length - 1].priceLevel
      : triggerPrice - config.sltpAtrFallback * currentATR;
  }

  // TP2 from VAH/VAL or ATR fallback
  const tp2Price = direction === 'long'
    ? Math.max(profile.vahPrice, triggerPrice + config.tp2AtrFallback * currentATR)
    : Math.min(profile.valPrice, triggerPrice - config.tp2AtrFallback * currentATR);

  const riskDist = Math.abs(triggerPrice - slPrice);
  const rr1 = riskDist > 0 ? Math.abs(tp1Price - triggerPrice) / riskDist : 0;
  const rr2 = riskDist > 0 ? Math.abs(tp2Price - triggerPrice) / riskDist : 0;

  // Mark SL/TP zones on profile bins
  if (profile.bins.length > 0) {
    for (const bin of profile.bins) {
      if (direction === 'long') {
        if (bin.priceLevel <= slPrice) bin.zone = 'sl';
        else if (bin.priceLevel >= tp1Price && bin.priceLevel < tp2Price) bin.zone = 'tp1';
        else if (bin.priceLevel >= tp2Price) bin.zone = 'tp2';
      } else {
        if (bin.priceLevel >= slPrice) bin.zone = 'sl';
        else if (bin.priceLevel <= tp1Price && bin.priceLevel > tp2Price) bin.zone = 'tp1';
        else if (bin.priceLevel <= tp2Price) bin.zone = 'tp2';
      }
    }
  }

  return {
    slPrice, tp1Price, tp2Price, direction, rr1, rr2,
    hasRealSignal: true,
  };
}
