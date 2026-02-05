import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, Time, CrosshairMode, LineStyle } from 'lightweight-charts';
import { OHLCVData } from '@/services/ChartDataService';
import { ChartTheme } from './ChartThemes';
import { binanceWS } from '@/services/BinanceWebSocketService';
import { ChartIndicator } from './types';

interface LightweightChartCanvasProps {
  data: OHLCVData[];
  symbol: string;
  symbolType: 'crypto' | 'stock' | 'forex' | 'set';
  timeframe: string;
  width: number;
  height: number;
  theme: ChartTheme;
  indicators?: ChartIndicator[];
  onCrosshairMove?: (data: { price: number; time: number; visible: boolean }) => void;
}

export const LightweightChartCanvas: React.FC<LightweightChartCanvasProps> = ({
  data,
  symbol,
  symbolType,
  timeframe,
  width,
  height,
  theme,
  indicators = [],
  onCrosshairMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const onCrosshairMoveRef = useRef(onCrosshairMove);

  // Keep onCrosshairMove ref updated
  useEffect(() => {
    onCrosshairMoveRef.current = onCrosshairMove;
  }, [onCrosshairMove]);

  // Convert OHLCV data to lightweight-charts format
  const formatCandleData = useCallback((ohlcv: OHLCVData[]): CandlestickData[] => {
    return ohlcv.map(d => ({
      time: Math.floor(d.timestamp / 1000) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
  }, []);

  const formatVolumeData = useCallback((ohlcv: OHLCVData[], themeColors: ChartTheme['colors']): HistogramData[] => {
    return ohlcv.map(d => ({
      time: Math.floor(d.timestamp / 1000) as Time,
      value: d.volume,
      color: d.close >= d.open 
        ? themeColors.volumeUp 
        : themeColors.volumeDown,
    }));
  }, []);

  // Initialize chart - only run once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart with initial size
    const chart = createChart(containerRef.current, {
      width: width || containerRef.current.clientWidth || 800,
      height: height || containerRef.current.clientHeight || 500,
      layout: {
        background: { color: theme.colors.background },
        textColor: theme.colors.text,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      },
      grid: {
        vertLines: { color: theme.colors.grid, style: LineStyle.Dotted },
        horzLines: { color: theme.colors.grid, style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: theme.colors.crosshair,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: theme.colors.crosshair,
        },
        horzLine: {
          color: theme.colors.crosshair,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: theme.colors.crosshair,
        },
      },
      rightPriceScale: {
        borderColor: theme.colors.grid,
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: theme.colors.grid,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
        minBarSpacing: 1,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
      },
      watermark: {
        visible: true,
        fontSize: 16,
        horzAlign: 'left',
        vertAlign: 'bottom',
        color: 'rgba(255, 176, 0, 0.15)',
        text: 'ABLE',
      },
    });

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: theme.colors.bullCandle.fill,
      downColor: theme.colors.bearCandle.fill,
      borderUpColor: theme.colors.bullCandle.border,
      borderDownColor: theme.colors.bearCandle.border,
      wickUpColor: theme.colors.bullCandle.border,
      wickDownColor: theme.colors.bearCandle.border,
    });

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    // Subscribe to crosshair movement
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        onCrosshairMoveRef.current?.({ price: 0, time: 0, visible: false });
        return;
      }
      
      const price = param.seriesData.get(candleSeries);
      if (price) {
        onCrosshairMoveRef.current?.({
          price: (price as CandlestickData).close,
          time: (param.time as number) * 1000,
          visible: true,
        });
      }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current.clear();
    };
  }, []); // Only run on mount

  // Update theme
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    chartRef.current.applyOptions({
      layout: {
        background: { color: theme.colors.background },
        textColor: theme.colors.text,
      },
      grid: {
        vertLines: { color: theme.colors.grid },
        horzLines: { color: theme.colors.grid },
      },
      crosshair: {
        vertLine: { color: theme.colors.crosshair, labelBackgroundColor: theme.colors.crosshair },
        horzLine: { color: theme.colors.crosshair, labelBackgroundColor: theme.colors.crosshair },
      },
      rightPriceScale: { borderColor: theme.colors.grid },
      timeScale: { borderColor: theme.colors.grid },
    });

    candleSeriesRef.current.applyOptions({
      upColor: theme.colors.bullCandle.fill,
      downColor: theme.colors.bearCandle.fill,
      borderUpColor: theme.colors.bullCandle.border,
      borderDownColor: theme.colors.bearCandle.border,
      wickUpColor: theme.colors.bullCandle.border,
      wickDownColor: theme.colors.bearCandle.border,
    });
  }, [theme]);

  // Update chart size
  useEffect(() => {
    if (chartRef.current && width > 0 && height > 0) {
      chartRef.current.resize(width, height);
    }
  }, [width, height]);

  // Update data when it changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || data.length === 0) return;

    const candleData = formatCandleData(data);
    const volumeData = formatVolumeData(data, theme.colors);

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    // Fit content with some padding on the right
    chartRef.current?.timeScale().fitContent();
  }, [data, formatCandleData, formatVolumeData, theme.colors]);

  // Real-time updates for crypto
  useEffect(() => {
    if (symbolType !== 'crypto' || !candleSeriesRef.current) return;

    const interval = timeframe === '1D' ? '1d' : timeframe === '1W' ? '1w' : timeframe === '1M' ? '1M' : timeframe.toLowerCase();
    
    const unsubscribe = binanceWS.subscribeToKline(symbol, interval, (update) => {
      if (!candleSeriesRef.current) return;
      
      const candleUpdate: CandlestickData = {
        time: Math.floor(update.kline.timestamp / 1000) as Time,
        open: update.kline.open,
        high: update.kline.high,
        low: update.kline.low,
        close: update.kline.close,
      };
      
      candleSeriesRef.current.update(candleUpdate);
      
      if (volumeSeriesRef.current) {
        const volumeUpdate: HistogramData = {
          time: Math.floor(update.kline.timestamp / 1000) as Time,
          value: update.kline.volume,
          color: update.kline.close >= update.kline.open 
            ? theme.colors.volumeUp 
            : theme.colors.volumeDown,
        };
        volumeSeriesRef.current.update(volumeUpdate);
      }
    });

    return unsubscribe;
  }, [symbol, symbolType, timeframe, theme.colors]);

  // Draw indicators
  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    // Remove old indicator series
    indicatorSeriesRef.current.forEach((series) => {
      try {
        chartRef.current?.removeSeries(series);
      } catch (e) {
        // Series may already be removed
      }
    });
    indicatorSeriesRef.current.clear();

    // Add new indicators
    indicators
      .filter(ind => ind.visible && ind.type === 'overlay')
      .forEach(ind => {
        if (ind.name.startsWith('SMA') || ind.name.startsWith('EMA')) {
          const length = ind.settings.length as number || 20;
          const isEMA = ind.name.startsWith('EMA');
          
          const values = calculateMA(data, length, isEMA);
          
          const series = chartRef.current!.addLineSeries({
            color: ind.color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
            crosshairMarkerVisible: true,
          });
          
          series.setData(values.map((v, i) => ({
            time: Math.floor(data[i].timestamp / 1000) as Time,
            value: v,
          })).filter(d => d.value > 0));
          
          indicatorSeriesRef.current.set(ind.id, series);
        }
      });
  }, [indicators, data]);

  // Calculate Moving Average
  const calculateMA = (ohlcv: OHLCVData[], length: number, isEMA: boolean): number[] => {
    const result: number[] = [];
    
    if (isEMA) {
      const k = 2 / (length + 1);
      let ema = ohlcv[0]?.close || 0;
      
      for (let i = 0; i < ohlcv.length; i++) {
        if (i < length - 1) {
          result.push(0);
        } else {
          ema = ohlcv[i].close * k + ema * (1 - k);
          result.push(ema);
        }
      }
    } else {
      for (let i = 0; i < ohlcv.length; i++) {
        if (i < length - 1) {
          result.push(0);
        } else {
          const sum = ohlcv.slice(i - length + 1, i + 1).reduce((a, b) => a + b.close, 0);
          result.push(sum / length);
        }
      }
    }
    
    return result;
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ 
        minHeight: height || 400,
        minWidth: width || 600,
      }}
    />
  );
};

export default LightweightChartCanvas;
