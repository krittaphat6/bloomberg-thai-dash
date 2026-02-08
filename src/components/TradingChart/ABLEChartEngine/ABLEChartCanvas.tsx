// ABLE Chart Engine - Main Canvas Component
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { ChartRenderer, OIBubbleData } from './ChartRenderer';
import { ChartInteraction, InteractionCallbacks } from './ChartInteraction';
import { DOMRenderer } from './DOMRenderer';
import { FullscreenDOMRenderer, DEFAULT_ENHANCED_DOM_CONFIG } from './FullscreenDOMRenderer';
import { Candle, ChartViewport, ChartThemeColors, ChartDimensions, CrosshairState, DrawingObject, ChartMode, DrawingType, IndicatorData, DOMConfig, OIBubbleData as OIBubbleType } from './types';
import { OHLCVData } from '@/services/ChartDataService';
import { ChartTheme } from '../ChartThemes';
import { binanceWS } from '@/services/BinanceWebSocketService';
import { binanceOrderBook, OrderBookData } from '@/services/BinanceOrderBookService';
import { supabase } from '@/integrations/supabase/client';

interface OIBubblesConfig {
  enabled: boolean;
  threshold: number;
  extremeThreshold: number;
}

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
  oiBubblesConfig?: OIBubblesConfig;
  onCrosshairMove?: (data: { price: number; time: number; visible: boolean }) => void;
  /**
   * Optional controlled state for fullscreen DOM.
   * If provided, the component will not manage fullscreen internally.
   */
  domFullscreen?: boolean;
  onDOMFullscreenChange?: (isFullscreen: boolean) => void;
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
  oiBubblesConfig,
  onCrosshairMove,
  domFullscreen: domFullscreenProp,
  onDOMFullscreenChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ChartRenderer | null>(null);
  const domRendererRef = useRef<DOMRenderer | null>(null);
  const fullscreenDOMRef = useRef<FullscreenDOMRenderer | null>(null);
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
  const [oiBubbles, setOiBubbles] = useState<OIBubbleData[]>([]);

  const [domFullscreenInternal, setDomFullscreenInternal] = useState(false);
  const domFullscreen = domFullscreenProp ?? domFullscreenInternal;

  const setDomFullscreen = useCallback(
    (next: boolean) => {
      if (domFullscreenProp === undefined) {
        setDomFullscreenInternal(next);
      }
      onDOMFullscreenChange?.(next);
    },
    [domFullscreenProp, onDOMFullscreenChange]
  );

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

  // Fetch OI data for bubbles indicator
  useEffect(() => {
    if (symbolType !== 'crypto' || !oiBubblesConfig?.enabled || candles.length === 0) {
      setOiBubbles([]);
      return;
    }

    const fetchOIData = async () => {
      try {
        // Fetch OI data via market-data-proxy
        const { data: response, error } = await supabase.functions.invoke('market-data-proxy', {
          body: {
            endpoint: 'openInterest',
            symbol: symbol.replace('/', ''),
            limit: 100
          }
        });

        if (error || !response?.openInterest) {
          console.warn('OI Bubbles: Failed to fetch OI data', error);
          return;
        }

        const oiData = response.openInterest as { oi: number; timestamp: number }[];
        if (oiData.length < 2) return;

        // Calculate OI deltas
        const deltas: number[] = [];
        for (let i = 1; i < oiData.length; i++) {
          deltas.push(oiData[i].oi - oiData[i - 1].oi);
        }

        // Calculate Z-Score normalization
        const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const variance = deltas.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / deltas.length;
        const std = Math.sqrt(variance);

        const threshold = oiBubblesConfig.threshold || 1.5;
        const extremeThreshold = oiBubblesConfig.extremeThreshold || 3.0;

        // Generate bubbles for significant OI changes
        const bubbles: OIBubbleData[] = [];
        for (let i = 0; i < deltas.length; i++) {
          const normalized = std > 0 ? (deltas[i] - mean) / std : 0;
          const absNorm = Math.abs(normalized);

          if (absNorm < threshold) continue;

          // Find matching candle
          const oiTimestamp = oiData[i + 1].timestamp;
          const matchingCandle = candles.find(c => 
            Math.abs(c.timestamp - oiTimestamp) < 60000
          );

          if (!matchingCandle) continue;

          // Determine size based on normalized value
          let size: OIBubbleData['size'] = 'tiny';
          if (absNorm >= extremeThreshold) size = 'huge';
          else if (absNorm >= threshold * 2) size = 'large';
          else if (absNorm >= threshold * 1.5) size = 'normal';
          else if (absNorm >= threshold * 1.2) size = 'small';

          bubbles.push({
            timestamp: oiTimestamp,
            price: matchingCandle.close,
            oiDelta: deltas[i],
            normalized,
            isPositive: normalized > 0,
            size
          });
        }

        setOiBubbles(bubbles.slice(-20)); // Keep last 20 bubbles
      } catch (err) {
        console.warn('OI Bubbles: Error fetching data', err);
      }
    };

    fetchOIData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchOIData, 30000);
    return () => clearInterval(interval);
  }, [symbol, symbolType, oiBubblesConfig?.enabled, candles.length]);
  useEffect(() => {
    if (symbolType !== 'crypto' || !domConfig?.enabled) {
      binanceOrderBook.disconnect();
      setOrderBook(null);
      setDomConnected(false);

      // Ensure fullscreen DOM is closed when DOM gets disabled
      if (domFullscreen) {
        setDomFullscreen(false);
      }
      return;
    }

    // Connect to order book for this symbol - use more rows for fullscreen
    binanceOrderBook.connect(symbol, domConfig.rows || 20);

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
    
    // Initialize fullscreen DOM renderer
    fullscreenDOMRef.current = new FullscreenDOMRenderer(ctx, dpr, {
      ...DEFAULT_ENHANCED_DOM_CONFIG,
      rows: domConfig?.rows || 20,
      enabled: domConfig?.enabled ?? false,
      fullscreen: false,
    });
  }, [width, height, domConfig]);

  // Handle click to toggle fullscreen DOM
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Only toggle if DOM is enabled and we're in normal mode (not drawing)
    if (mode !== 'normal') return;

    if (domConfig?.enabled && orderBook && !domFullscreen) {
      // Activate fullscreen DOM
      setDomFullscreen(true);
    } else if (domFullscreen) {
      // Close fullscreen DOM
      setDomFullscreen(false);
    }
  }, [domConfig?.enabled, orderBook, domFullscreen, mode, setDomFullscreen]);

  // Handle ESC key to close fullscreen DOM
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && domFullscreen) {
        setDomFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [domFullscreen, setDomFullscreen]);

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
    const fullscreenDOM = fullscreenDOMRef.current;
    if (!renderer || candles.length === 0) return;

    // If fullscreen DOM is active, render only the DOM overlay
    if (domFullscreen && fullscreenDOM && orderBook) {
      const currentPrice = candles[candles.length - 1]?.close || 0;
      fullscreenDOM.drawFullscreenDOM(orderBook, dimensions, colors, currentPrice);
      return;
    }

    // Normal chart rendering
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
    
    // Draw OI Bubbles if enabled
    if (oiBubblesConfig?.enabled && oiBubbles.length > 0) {
      renderer.drawOIBubbles(oiBubbles, candles, viewport, dimensions);
    }
    
    // Draw drawings
    if (drawings.length > 0) {
      renderer.drawDrawings(drawings, viewport, dimensions, colors);
    }
    
    // Draw axes
    renderer.drawPriceAxis(viewport, dimensions, colors);
    renderer.drawTimeAxis(candles, viewport, dimensions, colors);
    
    // Draw mini DOM hint if DOM is enabled but not fullscreen
    if (domConfig?.enabled && orderBook && domRenderer && !domFullscreen) {
      const currentPrice = candles[candles.length - 1]?.close || 0;
      domRenderer.drawDOM(orderBook, dimensions, colors, currentPrice);
    }
    
    // Draw watermark at bottom left (above time axis)
    renderer.drawWatermark(dimensions);
    
    // Draw crosshair and tooltip last (on top)
    renderer.drawCrosshair(crosshair, dimensions, colors);
    renderer.drawTooltip(crosshair, dimensions, colors);
  }, [candles, viewport, dimensions, colors, crosshair, drawings, indicators, orderBook, domConfig, domFullscreen, oiBubblesConfig, oiBubbles]);

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
      onClick={handleCanvasClick}
      style={{
        width: width,
        height: height,
        cursor: domFullscreen 
          ? 'pointer' 
          : mode === 'drawing' 
            ? 'crosshair' 
            : domConfig?.enabled && orderBook 
              ? 'pointer' 
              : 'default',
      }}
    />
  );
};

export default ABLEChartCanvas;
