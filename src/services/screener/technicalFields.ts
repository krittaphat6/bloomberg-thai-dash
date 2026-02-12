// ============================================
// Technical Indicator Fields with All Timeframe Intervals
// Generates fields for every indicator × every timeframe
// ============================================

import { FieldDef, ScreenerType } from './fields';

const ALL: ScreenerType[] = ['stock', 'crypto', 'forex', 'bond', 'futures', 'coin'];

const TIME_INTERVAL_CODES = ['1', '5', '15', '30', '60', '120', '240', '1W', '1M'];

const BASE_OSCILLATORS = [
  { name: 'RSI', label: 'RSI (14)' },
  { name: 'RSI7', label: 'RSI (7)' },
  { name: 'Stoch.K', label: 'Stochastic %K' },
  { name: 'Stoch.D', label: 'Stochastic %D' },
  { name: 'MACD.macd', label: 'MACD Line' },
  { name: 'MACD.signal', label: 'MACD Signal' },
  { name: 'Mom', label: 'Momentum' },
  { name: 'CCI20', label: 'CCI (20)' },
  { name: 'ADX', label: 'ADX (14)' },
  { name: 'ADX+DI', label: 'ADX +DI' },
  { name: 'ADX-DI', label: 'ADX -DI' },
  { name: 'AO', label: 'Awesome Oscillator' },
  { name: 'ATR', label: 'ATR (14)' },
  { name: 'BBPower', label: 'Bull Bear Power' },
  { name: 'UO', label: 'Ultimate Oscillator' },
  { name: 'ROC', label: 'Rate of Change' },
  { name: 'W.R', label: 'Williams %R' },
];

const BASE_MOVING_AVERAGES = [
  { name: 'SMA5', label: 'SMA 5' },
  { name: 'SMA10', label: 'SMA 10' },
  { name: 'SMA20', label: 'SMA 20' },
  { name: 'SMA30', label: 'SMA 30' },
  { name: 'SMA50', label: 'SMA 50' },
  { name: 'SMA100', label: 'SMA 100' },
  { name: 'SMA200', label: 'SMA 200' },
  { name: 'EMA5', label: 'EMA 5' },
  { name: 'EMA10', label: 'EMA 10' },
  { name: 'EMA20', label: 'EMA 20' },
  { name: 'EMA30', label: 'EMA 30' },
  { name: 'EMA50', label: 'EMA 50' },
  { name: 'EMA100', label: 'EMA 100' },
  { name: 'EMA200', label: 'EMA 200' },
  { name: 'VWMA', label: 'VWMA' },
  { name: 'HullMA9', label: 'Hull MA (9)' },
];

const BASE_BOLLINGER = [
  { name: 'BB.upper', label: 'BB Upper' },
  { name: 'BB.lower', label: 'BB Lower' },
  { name: 'BB.basis', label: 'BB Basis' },
];

const BASE_RECOMMENDATIONS = [
  { name: 'Recommend.All', label: 'Overall Rating' },
  { name: 'Recommend.MA', label: 'MA Rating' },
  { name: 'Recommend.Other', label: 'Oscillator Rating' },
];

const BASE_ICHIMOKU = [
  { name: 'Ichimoku.BLine', label: 'Ichimoku Base' },
  { name: 'Ichimoku.CLine', label: 'Ichimoku Conversion' },
];

const BASE_PIVOT = [
  { name: 'Pivot.M.Classic.Middle', label: 'Pivot' },
  { name: 'Pivot.M.Classic.R1', label: 'Pivot R1' },
  { name: 'Pivot.M.Classic.R2', label: 'Pivot R2' },
  { name: 'Pivot.M.Classic.R3', label: 'Pivot R3' },
  { name: 'Pivot.M.Classic.S1', label: 'Pivot S1' },
  { name: 'Pivot.M.Classic.S2', label: 'Pivot S2' },
  { name: 'Pivot.M.Classic.S3', label: 'Pivot S3' },
];

const INTERVAL_LABELS: Record<string, string> = {
  '1': '1m', '5': '5m', '15': '15m', '30': '30m',
  '60': '1H', '120': '2H', '240': '4H', '1W': '1W', '1M': '1M',
};

const ALL_BASES = [
  ...BASE_OSCILLATORS,
  ...BASE_MOVING_AVERAGES,
  ...BASE_BOLLINGER,
  ...BASE_RECOMMENDATIONS,
  ...BASE_ICHIMOKU,
  ...BASE_PIVOT,
];

/**
 * Generate all technical fields with timeframe suffixes.
 * Each base indicator gets variants for every time interval.
 * Example: RSI → RSI|1, RSI|5, RSI|15, RSI|30, RSI|60, RSI|240, RSI|1W, RSI|1M
 */
export function generateAllTechnicalFields(): FieldDef[] {
  const fields: FieldDef[] = [];

  ALL_BASES.forEach(indicator => {
    TIME_INTERVAL_CODES.forEach(interval => {
      const fieldName = `${indicator.name}|${interval}`;
      const label = `${indicator.label} (${INTERVAL_LABELS[interval]})`;

      let category: FieldDef['category'] = 'technical';
      if (BASE_OSCILLATORS.some(b => b.name === indicator.name)) category = 'oscillator';
      else if (BASE_MOVING_AVERAGES.some(b => b.name === indicator.name)) category = 'moving_average';
      else if (BASE_BOLLINGER.some(b => b.name === indicator.name)) category = 'bollinger';
      else if (BASE_RECOMMENDATIONS.some(b => b.name === indicator.name)) category = 'recommendation';
      else if (BASE_PIVOT.some(b => b.name === indicator.name)) category = 'pivot';

      fields.push({
        name: fieldName,
        label,
        format: indicator.name.startsWith('Recommend') ? 'rating' : 'number',
        category,
        screeners: ALL,
      });
    });
  });

  return fields;
}

// Pre-generated for import
export const ALL_TIMEFRAME_TECHNICAL_FIELDS = generateAllTechnicalFields();
