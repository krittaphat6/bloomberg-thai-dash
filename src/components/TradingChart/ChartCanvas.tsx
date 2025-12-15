import React, { useRef, useEffect, useCallback, useState } from 'react';
import { OHLCVData } from '@/services/ChartDataService';
import { DrawingTool, ChartIndicator, CrosshairData } from './types';
import { ChartTheme } from './ChartThemes';
import { PineScriptResult } from '@/utils/PineScriptRunner';

interface ChartCanvasProps {
  data: OHLCVData[];
  width: number;
  height: number;
  indicators: ChartIndicator[];
  drawings: DrawingTool[];
  selectedDrawingTool: string | null;
  onAddDrawing: (drawing: DrawingTool) => void;
  crosshair: CrosshairData;
  onCrosshairMove: (data: CrosshairData) => void;
  visibleRange: { start: number; end: number };
  onZoom: (delta: number, center: number) => void;
  onPan: (delta: number) => void;
  theme: ChartTheme;
  customIndicators?: { results: PineScriptResult[]; visible: boolean }[];
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({
  data,
  width,
  height,
  indicators,
  drawings,
  selectedDrawingTool,
  onAddDrawing,
  crosshair,
  onCrosshairMove,
  visibleRange,
  onZoom,
  onPan,
  theme,
  customIndicators = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanX, setLastPanX] = useState(0);
  const [pendingDrawing, setPendingDrawing] = useState<DrawingTool | null>(null);
  
  // Touch state for gestures
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; dist?: number } | null>(null);

  // Chart dimensions - more right padding like TradingView
  const chartHeight = height * 0.7;
  const volumeHeight = height * 0.15;
  const padding = { top: 20, right: 100, bottom: 30, left: 10 };

  // Calculate visible data - leave space at right edge like TradingView
  const rightMarginBars = 5; // Empty space at right for future candles
  const visibleData = data.slice(visibleRange.start, visibleRange.end);
  const totalBarsWidth = visibleData.length + rightMarginBars;
  const candleWidth = (width - padding.left - padding.right) / totalBarsWidth;

  // Price range with offset for free vertical panning
  const [priceOffset, setPriceOffset] = useState(0);
  
  const basePriceRange = {
    min: Math.min(...visibleData.map(d => d.low)) * 0.999,
    max: Math.max(...visibleData.map(d => d.high)) * 1.001,
  };
  
  const priceRange = {
    min: basePriceRange.min - priceOffset,
    max: basePriceRange.max - priceOffset,
  };

  // Convert price to Y coordinate
  const priceToY = useCallback((price: number) => {
    return padding.top + (priceRange.max - price) / (priceRange.max - priceRange.min) * (chartHeight - padding.top - 10);
  }, [priceRange, chartHeight]);

  // Convert Y to price
  const yToPrice = useCallback((y: number) => {
    return priceRange.max - (y - padding.top) / (chartHeight - padding.top - 10) * (priceRange.max - priceRange.min);
  }, [priceRange, chartHeight]);

  // Convert index to X coordinate
  const indexToX = useCallback((index: number) => {
    return padding.left + (index - visibleRange.start + 0.5) * candleWidth;
  }, [visibleRange.start, candleWidth]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || visibleData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with theme background
    ctx.fillStyle = theme.colors.background;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx);

    // Draw candlesticks
    drawCandlesticks(ctx);

    // Draw volume
    drawVolume(ctx);

    // Draw indicators
    drawIndicators(ctx);

    // Draw custom Pine Script indicators
    drawCustomIndicators(ctx);

    // Draw drawings
    drawDrawings(ctx);

    // Draw crosshair
    if (crosshair.visible) {
      drawCrosshair(ctx);
    }

    // Draw price axis
    drawPriceAxis(ctx);

    // Draw time axis
    drawTimeAxis(ctx);

  }, [visibleData, width, height, indicators, drawings, crosshair, priceRange, theme, customIndicators]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = theme.colors.grid;
    ctx.lineWidth = 0.5;

    // Horizontal lines
    const priceStep = (priceRange.max - priceRange.min) / 8;
    for (let i = 0; i <= 8; i++) {
      const price = priceRange.min + priceStep * i;
      const y = priceToY(price);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical lines (time)
    const step = Math.ceil(visibleData.length / 10);
    for (let i = 0; i < visibleData.length; i += step) {
      const x = indexToX(visibleRange.start + i);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, chartHeight);
      ctx.stroke();
    }
  };

  const drawCandlesticks = (ctx: CanvasRenderingContext2D) => {
    visibleData.forEach((candle, i) => {
      const x = indexToX(visibleRange.start + i);
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);

      const isBullish = candle.close >= candle.open;
      const candleColors = isBullish ? theme.colors.bullCandle : theme.colors.bearCandle;
      
      ctx.strokeStyle = candleColors.border;
      ctx.fillStyle = candleColors.fill;

      // Wick
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Body
      const bodyWidth = Math.max(candleWidth * 0.8, 1);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
      
      ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
    });
  };

  const drawVolume = (ctx: CanvasRenderingContext2D) => {
    const volumeIndicator = indicators.find(i => i.name === 'Volume' && i.visible);
    if (!volumeIndicator) return;

    const maxVolume = Math.max(...visibleData.map(d => d.volume));
    const volumeTop = chartHeight + 5;
    const volumeChartHeight = volumeHeight - 10;

    visibleData.forEach((candle, i) => {
      const x = indexToX(visibleRange.start + i);
      const barHeight = (candle.volume / maxVolume) * volumeChartHeight;
      const isBullish = candle.close >= candle.open;

      ctx.fillStyle = isBullish ? theme.colors.volumeUp : theme.colors.volumeDown;
      const barWidth = Math.max(candleWidth * 0.8, 1);
      ctx.fillRect(x - barWidth / 2, volumeTop + volumeChartHeight - barHeight, barWidth, barHeight);
    });
  };

  // Draw CVD (Cumulative Volume Delta) indicator
  const drawCVD = (ctx: CanvasRenderingContext2D, color: string, cumulative: boolean) => {
    const cvdTop = chartHeight + 5;
    const cvdChartHeight = volumeHeight - 10;
    
    // Calculate CVD values
    let cvd = 0;
    const cvdValues: number[] = [];
    const deltaValues: number[] = [];
    
    visibleData.forEach((candle) => {
      // Estimate buy/sell volume based on price movement
      const range = candle.high - candle.low;
      const closeRatio = range > 0 ? (candle.close - candle.low) / range : 0.5;
      const buyVolume = candle.volume * closeRatio;
      const sellVolume = candle.volume * (1 - closeRatio);
      const delta = buyVolume - sellVolume;
      
      deltaValues.push(delta);
      if (cumulative) {
        cvd += delta;
        cvdValues.push(cvd);
      } else {
        cvdValues.push(delta);
      }
    });
    
    if (cvdValues.length === 0) return;
    
    const maxCVD = Math.max(...cvdValues.map(v => Math.abs(v)));
    const minCVD = Math.min(...cvdValues);
    const cvdRange = Math.max(maxCVD, Math.abs(minCVD));
    
    // Draw CVD as bars or line
    const zeroY = cvdTop + cvdChartHeight / 2;
    
    // Draw zero line
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw CVD bars
    visibleData.forEach((candle, i) => {
      const x = indexToX(visibleRange.start + i);
      const value = cvdValues[i];
      const barHeight = (Math.abs(value) / cvdRange) * (cvdChartHeight / 2);
      const isPositive = value >= 0;
      
      ctx.fillStyle = isPositive ? '#00ff00' : '#ff4444';
      const barWidth = Math.max(candleWidth * 0.6, 1);
      
      if (isPositive) {
        ctx.fillRect(x - barWidth / 2, zeroY - barHeight, barWidth, barHeight);
      } else {
        ctx.fillRect(x - barWidth / 2, zeroY, barWidth, barHeight);
      }
    });
    
    // Draw CVD line overlay
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    cvdValues.forEach((value, i) => {
      const x = indexToX(visibleRange.start + i);
      const y = zeroY - (value / cvdRange) * (cvdChartHeight / 2);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  };

  const drawIndicators = (ctx: CanvasRenderingContext2D) => {
    indicators.filter(ind => ind.visible && ind.type === 'overlay').forEach(indicator => {
      if (indicator.name.startsWith('SMA')) {
        const length = indicator.settings.length as number;
        drawSMA(ctx, length, indicator.color);
      } else if (indicator.name.startsWith('EMA')) {
        const length = indicator.settings.length as number;
        drawEMA(ctx, length, indicator.color);
      } else if (indicator.name === 'Bollinger Bands') {
        drawBollingerBands(ctx, indicator.settings.length as number, indicator.settings.mult as number);
      }
    });
    
    // Draw CVD if enabled
    const cvdIndicator = indicators.find(i => i.name === 'CVD' && i.visible);
    if (cvdIndicator) {
      drawCVD(ctx, cvdIndicator.color, cvdIndicator.settings.cumulative as boolean);
    }
  };

  const drawCustomIndicators = (ctx: CanvasRenderingContext2D) => {
    customIndicators.filter(ci => ci.visible).forEach(customInd => {
      customInd.results.forEach(result => {
        if (result.type === 'line' && result.values) {
          ctx.strokeStyle = result.color || '#f97316';
          ctx.lineWidth = result.lineWidth || 1.5;
          ctx.beginPath();

          let started = false;
          result.values.forEach((value, i) => {
            if (isNaN(value) || i < visibleRange.start || i >= visibleRange.end) return;
            
            const x = indexToX(i);
            const y = priceToY(value);

            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          });
          ctx.stroke();
        } else if (result.type === 'hline' && result.hlineValue !== undefined) {
          ctx.strokeStyle = result.color || '#888888';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          const y = priceToY(result.hlineValue);
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(width - padding.right, y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    });
  };

  const drawSMA = (ctx: CanvasRenderingContext2D, length: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    let started = false;
    for (let i = length - 1; i < visibleData.length; i++) {
      const sum = visibleData.slice(i - length + 1, i + 1).reduce((a, b) => a + b.close, 0);
      const sma = sum / length;
      const x = indexToX(visibleRange.start + i);
      const y = priceToY(sma);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  const drawEMA = (ctx: CanvasRenderingContext2D, length: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const k = 2 / (length + 1);
    let ema = visibleData[0]?.close || 0;
    let started = false;

    visibleData.forEach((candle, i) => {
      ema = candle.close * k + ema * (1 - k);
      const x = indexToX(visibleRange.start + i);
      const y = priceToY(ema);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  };

  const drawBollingerBands = (ctx: CanvasRenderingContext2D, length: number, mult: number) => {
    const smaValues: number[] = [];
    const upperBand: number[] = [];
    const lowerBand: number[] = [];

    for (let i = 0; i < visibleData.length; i++) {
      if (i < length - 1) {
        smaValues.push(NaN);
        upperBand.push(NaN);
        lowerBand.push(NaN);
        continue;
      }

      const slice = visibleData.slice(i - length + 1, i + 1).map(d => d.close);
      const sma = slice.reduce((a, b) => a + b, 0) / length;
      const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / length;
      const stdDev = Math.sqrt(variance);

      smaValues.push(sma);
      upperBand.push(sma + mult * stdDev);
      lowerBand.push(sma - mult * stdDev);
    }

    // Draw bands fill
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    
    let started = false;
    for (let i = 0; i < upperBand.length; i++) {
      if (isNaN(upperBand[i])) continue;
      const x = indexToX(visibleRange.start + i);
      const y = priceToY(upperBand[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    
    for (let i = lowerBand.length - 1; i >= 0; i--) {
      if (isNaN(lowerBand[i])) continue;
      const x = indexToX(visibleRange.start + i);
      const y = priceToY(lowerBand[i]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw lines
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 1;
    
    ['upper', 'middle', 'lower'].forEach((band, bandIndex) => {
      const values = bandIndex === 0 ? upperBand : bandIndex === 1 ? smaValues : lowerBand;
      ctx.beginPath();
      started = false;
      values.forEach((value, i) => {
        if (isNaN(value)) return;
        const x = indexToX(visibleRange.start + i);
        const y = priceToY(value);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  };

  const drawDrawings = (ctx: CanvasRenderingContext2D) => {
    drawings.forEach(drawing => {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.lineWidth;

      if (drawing.type === 'trendline' && drawing.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
        ctx.lineTo(drawing.points[1].x, drawing.points[1].y);
        ctx.stroke();
      } else if (drawing.type === 'horizontal' && drawing.points.length >= 1) {
        const y = drawing.points[0].y;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = drawing.color;
        ctx.font = '11px monospace';
        ctx.fillText(drawing.points[0].price?.toFixed(2) || '', width - padding.right + 5, y + 4);
      } else if (drawing.type === 'fibonacci' && drawing.points.length >= 2) {
        const y1 = drawing.points[0].y;
        const y2 = drawing.points[1].y;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const price1 = drawing.points[0].price || 0;
        const price2 = drawing.points[1].price || 0;

        levels.forEach((level) => {
          const y = y1 + (y2 - y1) * level;
          const price = price1 + (price2 - price1) * level;
          ctx.globalAlpha = 0.5 + (1 - level) * 0.5;
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(width - padding.right, y);
          ctx.stroke();
          
          ctx.fillStyle = drawing.color;
          ctx.font = '10px monospace';
          ctx.fillText(`${(level * 100).toFixed(1)}% - ${price.toFixed(2)}`, width - padding.right + 5, y + 4);
        });
        ctx.globalAlpha = 1;
      }
    });

    // Draw pending drawing
    if (pendingDrawing && pendingDrawing.points.length > 0) {
      ctx.strokeStyle = pendingDrawing.color;
      ctx.lineWidth = pendingDrawing.lineWidth;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pendingDrawing.points[0].x, pendingDrawing.points[0].y);
      ctx.lineTo(crosshair.x, crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const drawCrosshair = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = theme.colors.crosshair;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(crosshair.x, padding.top);
    ctx.lineTo(crosshair.x, chartHeight + volumeHeight);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(padding.left, crosshair.y);
    ctx.lineTo(width - padding.right, crosshair.y);
    ctx.stroke();

    ctx.setLineDash([]);

    // Price label
    ctx.fillStyle = theme.colors.grid;
    ctx.fillRect(width - padding.right, crosshair.y - 10, padding.right, 20);
    ctx.fillStyle = theme.colors.text;
    ctx.font = '11px monospace';
    ctx.fillText(crosshair.price.toFixed(2), width - padding.right + 5, crosshair.y + 4);
  };

  const drawPriceAxis = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = theme.colors.text;
    ctx.font = '10px monospace';

    const priceStep = (priceRange.max - priceRange.min) / 8;
    for (let i = 0; i <= 8; i++) {
      const price = priceRange.min + priceStep * i;
      const y = priceToY(price);
      ctx.fillText(price.toFixed(2), width - padding.right + 5, y + 3);
    }
  };

  const drawTimeAxis = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = theme.colors.text;
    ctx.font = '10px monospace';

    const step = Math.ceil(visibleData.length / 8);
    for (let i = 0; i < visibleData.length; i += step) {
      const candle = visibleData[i];
      const x = indexToX(visibleRange.start + i);
      const date = new Date(candle.timestamp);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillText(label, x - 20, height - 5);
    }
  };

  // Mouse handlers
  // State for vertical panning
  const [lastPanY, setLastPanY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isPanning) {
      const deltaX = x - lastPanX;
      const deltaY = y - lastPanY;
      onPan(deltaX);
      // Vertical panning - shift price view
      const priceShift = deltaY * (priceRange.max - priceRange.min) / chartHeight * 0.5;
      setPriceOffset(prev => prev + priceShift);
      setLastPanX(x);
      setLastPanY(y);
      return;
    }

    const price = yToPrice(y);
    const candleIndex = Math.floor((x - padding.left) / candleWidth);
    const dataIndex = visibleRange.start + candleIndex;
    const candle = data[dataIndex];

    onCrosshairMove({
      x,
      y,
      price,
      time: candle?.timestamp || 0,
      visible: x > padding.left && x < width - padding.right && y > padding.top && y < chartHeight,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    if (e.button === 0 && !selectedDrawingTool) {
      setIsPanning(true);
      setLastPanX(e.clientX - rect.left);
      setLastPanY(e.clientY - rect.top);
    } else if (selectedDrawingTool) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const price = yToPrice(y);

      if (!pendingDrawing) {
        setPendingDrawing({
          id: `drawing-${Date.now()}`,
          type: selectedDrawingTool as any,
          points: [{ x, y, price }],
          color: '#f97316',
          lineWidth: 2,
          isComplete: false,
        });
      } else {
        const completedDrawing: DrawingTool = {
          ...pendingDrawing,
          points: [...pendingDrawing.points, { x, y, price }],
          isComplete: true,
        };
        onAddDrawing(completedDrawing);
        setPendingDrawing(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    onCrosshairMove({ x: 0, y: 0, price: 0, time: 0, visible: false });
  };

  // Enhanced wheel zoom with smooth animation
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    onZoom(e.deltaY > 0 ? 1 : -1, x);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      // Pinch gesture
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStart({ x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: 0, dist });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    if (e.touches.length === 1) {
      // Pan
      const delta = e.touches[0].clientX - touchStart.x;
      onPan(delta);
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2 && touchStart.dist) {
      // Pinch zoom
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const delta = newDist > touchStart.dist ? -1 : 1;
      onZoom(delta, centerX);
      setTouchStart({ x: centerX, y: 0, dist: newDist });
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="cursor-crosshair touch-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
};

export default ChartCanvas;
