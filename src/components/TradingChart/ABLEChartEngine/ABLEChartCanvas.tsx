// ABLE Chart Engine - Main Canvas Component
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { ChartRenderer } from './ChartRenderer';
import { ChartInteraction, InteractionCallbacks } from './ChartInteraction';
import { DOMRenderer, DOMRenderConfig } from './DOMRenderer';
import { Candle, ChartViewport, ChartThemeColors, ChartDimensions, CrosshairState, DrawingObject, ChartMode, DrawingType, IndicatorData, DOMConfig } from './types';
import { OHLCVData } from '@/services/ChartDataService';
import { ChartTheme } from '../ChartThemes';
import { binanceWS } from '@/services/BinanceWebSocketService';
import { binanceOrderBook, OrderBookData } from '@/services/BinanceOrderBookService';

interface ABLEChartCanvasProps {
  data: OHLCVData[];
  symbol: string;
  symbolType: 'crypto' | 'stock' | 'forex' | 'set';
  timeframe: string;
  width: number;
  height: number;
  theme: ChartTheme;
  indicators?: IndicatorData[];
  drawingMode?: DrawingType | null;
  domConfig?: DOMConfig;
  onCrosshairMove?: (data: { price: number; time: number; visible: boolean }) => void;
}

const convertToCandles = (data: OHLCVData[]): Candle[] => {
  return data.map(d => ({
    timestamp: d.timestamp,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
    volume: d.volume,
  }));
};

export const ABLEChartCanvas: React.FC<ABLEChartCanvasProps> = ({
  data,
  symbol,
  symbolType,
  timeframe,
  width,
  height,
  theme,
  indicators = [],
  drawingMode,
  domConfig,
  onCrosshairMove,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ChartRenderer | null>(null);
  const domRendererRef = useRef<DOMRenderer | null>(null);
  const interactionRef = useRef<ChartInteraction | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [candles, setCandles] = useState<Candle[]>([]);
  const [viewport, setViewport] = useState<ChartViewport>({
    startIndex: 0,
    endIndex: 0,
    priceMin: 0,
    priceMax: 100,
    offsetX: 0,
    scaleX: 1,
    scaleY: 1,
  });
  const [crosshair, setCrosshair] = useState<CrosshairState>({
    visible: false,
    x: 0,
    y: 0,
    price: 0,
    time: 0,
    candle: null,
  });
  const [drawings, setDrawings] = useState<DrawingObject[]>([]);
  const [mode, setMode] = useState<ChartMode>('normal');
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [domConnected, setDomConnected] = useState(false);

  // Convert theme to colors
  const colors: ChartThemeColors = useMemo(() => theme.colors, [theme]);

  // Calculate dimensions
  const dimensions: ChartDimensions = useMemo(() => {
    const priceAxisWidth = 80;
    const timeAxisHeight = 25;
    const volumeHeight = Math.max(30, height * 0.15);
    
    return {
      width,
      height,
      chartArea: {
        x: 0,
        y: 0,
        width: width - priceAxisWidth,
        height: height - timeAxisHeight - volumeHeight,
      },
      priceAxisWidth,
      timeAxisHeight,
      volumeHeight,
    };
  }, [width, height]);

  // Convert data to candles
  useEffect(() => {
    if (data.length > 0) {
      const newCandles = convertToCandles(data);
      setCandles(newCandles);
      
      // Initialize viewport
      const visibleCount = Math.min(100, newCandles.length);
      const startIdx = Math.max(0, newCandles.length - visibleCount);
      
      let min = Infinity, max = -Infinity;
      for (let i = startIdx; i < newCandles.length; i++) {
        min = Math.min(min, newCandles[i].low);
        max = Math.max(max, newCandles[i].high);
      }
      
      const padding = (max - min) * 0.05;
      
      setViewport(prev => ({
        ...prev,
        startIndex: startIdx,
        endIndex: newCandles.length - 1,
        priceMin: min - padding,
        priceMax: max + padding,
      }));
    }
  }, [data]);

  // Real-time updates for crypto
  useEffect(() => {
    if (symbolType !== 'crypto' || candles.length === 0) return;

    const interval = timeframe === '1D' ? '1d' : timeframe === '1W' ? '1w' : timeframe === '1M' ? '1M' : timeframe.toLowerCase();
    
    const unsubscribe = binanceWS.subscribeToKline(symbol, interval, (update) => {
      setCandles(prev => {
        const newCandles = [...prev];
        const lastCandle = newCandles[newCandles.length - 1];
        
        const updateCandle: Candle = {
          timestamp: update.kline.timestamp,
          open: update.kline.open,
          high: update.kline.high,
          low: update.kline.low,
          close: update.kline.close,
          volume: update.kline.volume,
        };
        
        if (lastCandle && Math.floor(lastCandle.timestamp / 60000) === Math.floor(update.kline.timestamp / 60000)) {
          newCandles[newCandles.length - 1] = updateCandle;
        } else {
          newCandles.push(updateCandle);
        }
        
        return newCandles;
      });
    });

    return unsubscribe;
  }, [symbol, symbolType, timeframe, candles.length]);

  // DOM (Depth of Market) connection for crypto
  useEffect(() => {
    if (symbolType !== 'crypto' || !domConfig?.enabled) {
      binanceOrderBook.disconnect();
      setOrderBook(null);
      setDomConnected(false);
      return;
    }

    // Connect to order book for this symbol
    binanceOrderBook.connect(symbol, domConfig.rows || 15);

    const unsubOrderBook = binanceOrderBook.subscribe((data) => {
      setOrderBook(data);
    });

    const unsubConnection = binanceOrderBook.subscribeToConnection((connected) => {
      setDomConnected(connected);
    });

    return () => {
      unsubOrderBook();
      unsubConnection();
    };
  }, [symbol, symbolType, domConfig?.enabled, domConfig?.rows]);

  // Initialize canvas and renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    rendererRef.current = new ChartRenderer(ctx, dpr);
    domRendererRef.current = new DOMRenderer(ctx, dpr, {
      rows: domConfig?.rows || 15,
      showVolumeBars: true,
      showImbalance: domConfig?.showImbalance ?? true,
      position: domConfig?.position || 'right',
      opacity: domConfig?.opacity || 0.95,
    });
  }, [width, height, domConfig]);

  // Initialize interaction handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const callbacks: InteractionCallbacks = {
      onViewportChange: setViewport,
      onCrosshairMove: (ch) => {
        setCrosshair(ch);
        onCrosshairMove?.({ price: ch.price, time: ch.time, visible: ch.visible });
      },
      onDrawingUpdate: setDrawings,
      onModeChange: setMode,
    };

    interactionRef.current = new ChartInteraction(
      canvas,
      dimensions,
      viewport,
      candles,
      callbacks
    );

    return () => {
      interactionRef.current?.destroy();
    };
  }, [candles.length > 0]);

  // Update interaction state
  useEffect(() => {
    interactionRef.current?.updateState(dimensions, viewport, candles);
  }, [dimensions, viewport, candles]);

  // Handle drawing mode change
  useEffect(() => {
    if (drawingMode) {
      interactionRef.current?.setMode('drawing', drawingMode);
    } else {
      interactionRef.current?.setMode('normal');
    }
  }, [drawingMode]);

  // Render loop
  const render = useCallback(() => {
    const renderer = rendererRef.current;
    const domRenderer = domRendererRef.current;
    if (!renderer || candles.length === 0) return;

    // Clear
    renderer.clear(dimensions, colors);
    
    // Draw grid
    renderer.drawGrid(dimensions, viewport, colors);
    
    // Draw candles
    renderer.drawCandles(candles, viewport, dimensions, colors);
    
    // Draw volume
    renderer.drawVolume(candles, viewport, dimensions, colors);
    
    // Draw indicators
    if (indicators.length > 0) {
      renderer.drawIndicators(indicators, candles, viewport, dimensions);
    }
    
    // Draw drawings
    if (drawings.length > 0) {
      renderer.drawDrawings(drawings, viewport, dimensions, colors);
    }
    
    // Draw axes
    renderer.drawPriceAxis(viewport, dimensions, colors);
    renderer.drawTimeAxis(candles, viewport, dimensions, colors);
    
    // Draw DOM (Depth of Market) table
    if (domConfig?.enabled && orderBook && domRenderer) {
      const currentPrice = candles[candles.length - 1]?.close || 0;
      domRenderer.drawDOM(orderBook, dimensions, colors, currentPrice);
    }
    
    // Draw watermark at bottom left (above time axis)
    renderer.drawWatermark(dimensions);
    
    // Draw crosshair and tooltip last (on top)
    renderer.drawCrosshair(crosshair, dimensions, colors);
    renderer.drawTooltip(crosshair, dimensions, colors);
  }, [candles, viewport, dimensions, colors, crosshair, drawings, indicators, orderBook, domConfig]);

  // Animation frame for rendering
  useEffect(() => {
    const animate = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="block"
      style={{
        width: width,
        height: height,
        cursor: mode === 'drawing' ? 'crosshair' : 'default',
      }}
    />
  );
};

export default ABLEChartCanvas;
