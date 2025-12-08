import React, { useRef, useEffect, useCallback, useState } from 'react';
import { OHLCVData } from '@/services/ChartDataService';
import { DrawingTool, ChartIndicator, CrosshairData, CHART_COLORS } from './types';

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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanX, setLastPanX] = useState(0);
  const [pendingDrawing, setPendingDrawing] = useState<DrawingTool | null>(null);

  // Chart dimensions
  const chartHeight = height * 0.7;
  const volumeHeight = height * 0.15;
  const oscillatorHeight = height * 0.15;
  const padding = { top: 20, right: 80, bottom: 30, left: 10 };

  // Calculate visible data
  const visibleData = data.slice(visibleRange.start, visibleRange.end);
  const candleWidth = (width - padding.left - padding.right) / visibleData.length;

  // Price range
  const priceRange = {
    min: Math.min(...visibleData.map(d => d.low)) * 0.999,
    max: Math.max(...visibleData.map(d => d.high)) * 1.001,
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

    // Clear canvas
    ctx.fillStyle = CHART_COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx);

    // Draw candlesticks
    drawCandlesticks(ctx);

    // Draw volume
    drawVolume(ctx);

    // Draw indicators
    drawIndicators(ctx);

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

  }, [visibleData, width, height, indicators, drawings, crosshair, priceRange]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = CHART_COLORS.grid;
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
      ctx.strokeStyle = isBullish ? CHART_COLORS.bullish : CHART_COLORS.bearish;
      ctx.fillStyle = isBullish ? CHART_COLORS.bullish : CHART_COLORS.bearish;

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
      
      if (isBullish) {
        ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
      } else {
        ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
      }
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

      ctx.fillStyle = isBullish ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
      const barWidth = Math.max(candleWidth * 0.8, 1);
      ctx.fillRect(x - barWidth / 2, volumeTop + volumeChartHeight - barHeight, barWidth, barHeight);
    });
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

    // Draw bands
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
        
        // Price label
        ctx.fillStyle = drawing.color;
        ctx.font = '11px monospace';
        ctx.fillText(drawing.points[0].price?.toFixed(2) || '', width - padding.right + 5, y + 4);
      } else if (drawing.type === 'fibonacci' && drawing.points.length >= 2) {
        const y1 = drawing.points[0].y;
        const y2 = drawing.points[1].y;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const price1 = drawing.points[0].price || 0;
        const price2 = drawing.points[1].price || 0;

        levels.forEach((level, i) => {
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
    ctx.strokeStyle = CHART_COLORS.crosshair;
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
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(width - padding.right, crosshair.y - 10, padding.right, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    ctx.fillText(crosshair.price.toFixed(2), width - padding.right + 5, crosshair.y + 4);
  };

  const drawPriceAxis = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = CHART_COLORS.text;
    ctx.font = '10px monospace';

    const priceStep = (priceRange.max - priceRange.min) / 8;
    for (let i = 0; i <= 8; i++) {
      const price = priceRange.min + priceStep * i;
      const y = priceToY(price);
      ctx.fillText(price.toFixed(2), width - padding.right + 5, y + 3);
    }
  };

  const drawTimeAxis = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = CHART_COLORS.text;
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
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isPanning) {
      const delta = x - lastPanX;
      onPan(delta);
      setLastPanX(x);
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
    if (e.button === 0 && !selectedDrawingTool) {
      setIsPanning(true);
      setLastPanX(e.clientX - (canvasRef.current?.getBoundingClientRect().left || 0));
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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    onZoom(e.deltaY > 0 ? 1 : -1, x);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="cursor-crosshair"
    />
  );
};

export default ChartCanvas;
