// ABLE Chart Engine - Interaction Handler
import { Candle, ChartViewport, ChartDimensions, DrawingObject, CrosshairState, DrawingType, ChartMode } from './types';

export interface InteractionCallbacks {
  onViewportChange: (viewport: ChartViewport) => void;
  onCrosshairMove: (crosshair: CrosshairState) => void;
  onDrawingUpdate: (drawings: DrawingObject[]) => void;
  onModeChange: (mode: ChartMode) => void;
}

export class ChartInteraction {
  private canvas: HTMLCanvasElement;
  private dimensions: ChartDimensions;
  private viewport: ChartViewport;
  private candles: Candle[];
  private callbacks: InteractionCallbacks;
  
  private isDragging = false;
  private isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private touchStartDistance = 0;
  
  private mode: ChartMode = 'normal';
  private drawingType: DrawingType = 'trendline';
  private drawings: DrawingObject[] = [];
  private currentDrawing: DrawingObject | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    dimensions: ChartDimensions,
    viewport: ChartViewport,
    candles: Candle[],
    callbacks: InteractionCallbacks
  ) {
    this.canvas = canvas;
    this.dimensions = dimensions;
    this.viewport = viewport;
    this.candles = candles;
    this.callbacks = callbacks;

    this.bindEvents();
  }

  updateState(dimensions: ChartDimensions, viewport: ChartViewport, candles: Candle[]) {
    this.dimensions = dimensions;
    this.viewport = viewport;
    this.candles = candles;
  }

  setMode(mode: ChartMode, drawingType?: DrawingType) {
    this.mode = mode;
    if (drawingType) this.drawingType = drawingType;
    this.canvas.style.cursor = mode === 'drawing' ? 'crosshair' : 'default';
    this.callbacks.onModeChange(mode);
  }

  getDrawings(): DrawingObject[] {
    return this.drawings;
  }

  setDrawings(drawings: DrawingObject[]) {
    this.drawings = drawings;
    this.callbacks.onDrawingUpdate(drawings);
  }

  clearDrawings() {
    this.drawings = [];
    this.currentDrawing = null;
    this.callbacks.onDrawingUpdate([]);
  }

  private bindEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
  }

  destroy() {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }

  private getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handleMouseDown = (e: MouseEvent) => {
    const { x, y } = this.getCanvasCoords(e);
    this.lastMouseX = x;
    this.lastMouseY = y;

    if (this.mode === 'drawing') {
      this.startDrawing(x, y);
    } else {
      this.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const { x, y } = this.getCanvasCoords(e);
    const { chartArea } = this.dimensions;

    if (this.isPanning) {
      const deltaX = x - this.lastMouseX;
      this.pan(deltaX);
      this.lastMouseX = x;
      this.lastMouseY = y;
    } else if (this.mode === 'drawing' && this.currentDrawing) {
      this.updateDrawing(x, y);
    }

    // Update crosshair
    if (x >= chartArea.x && x <= chartArea.x + chartArea.width &&
        y >= chartArea.y && y <= chartArea.y + chartArea.height) {
      const crosshair = this.getCrosshairData(x, y);
      this.callbacks.onCrosshairMove(crosshair);
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.mode === 'drawing' ? 'crosshair' : 'default';
    }
    
    if (this.mode === 'drawing' && this.currentDrawing) {
      this.finishDrawing();
    }
  };

  private handleMouseLeave = () => {
    this.isPanning = false;
    this.canvas.style.cursor = 'default';
    this.callbacks.onCrosshairMove({ visible: false, x: 0, y: 0, price: 0, time: 0, candle: null });
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    const { x } = this.getCanvasCoords(e);
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    
    this.zoom(zoomFactor, x);
  };

  private handleDoubleClick = (e: MouseEvent) => {
    // Reset viewport to fit all data
    if (this.candles.length > 0) {
      const newViewport = { ...this.viewport };
      newViewport.startIndex = 0;
      newViewport.endIndex = this.candles.length - 1;
      
      // Calculate price range
      let min = Infinity, max = -Infinity;
      for (const candle of this.candles) {
        min = Math.min(min, candle.low);
        max = Math.max(max, candle.high);
      }
      
      const padding = (max - min) * 0.1;
      newViewport.priceMin = min - padding;
      newViewport.priceMax = max + padding;
      
      this.viewport = newViewport;
      this.callbacks.onViewportChange(newViewport);
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    // Could implement context menu here
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      const { x, y } = this.getCanvasCoords(e.touches[0]);
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.isPanning = true;
    } else if (e.touches.length === 2) {
      this.touchStartDistance = this.getTouchDistance(e.touches);
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && this.isPanning) {
      const { x, y } = this.getCanvasCoords(e.touches[0]);
      const deltaX = x - this.lastMouseX;
      this.pan(deltaX);
      this.lastMouseX = x;
      this.lastMouseY = y;
      
      // Update crosshair
      const crosshair = this.getCrosshairData(x, y);
      this.callbacks.onCrosshairMove(crosshair);
    } else if (e.touches.length === 2) {
      const newDistance = this.getTouchDistance(e.touches);
      const zoomFactor = this.touchStartDistance / newDistance;
      
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const rect = this.canvas.getBoundingClientRect();
      this.zoom(zoomFactor, centerX - rect.left);
      
      this.touchStartDistance = newDistance;
    }
  };

  private handleTouchEnd = () => {
    this.isPanning = false;
    this.callbacks.onCrosshairMove({ visible: false, x: 0, y: 0, price: 0, time: 0, candle: null });
  };

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private pan(deltaX: number) {
    const { chartArea } = this.dimensions;
    const indexRange = this.viewport.endIndex - this.viewport.startIndex;
    const deltaIndex = Math.round(deltaX / chartArea.width * indexRange);
    
    const newViewport = { ...this.viewport };
    newViewport.startIndex = Math.max(0, this.viewport.startIndex - deltaIndex);
    newViewport.endIndex = Math.min(this.candles.length - 1, this.viewport.endIndex - deltaIndex);
    
    // Keep range consistent
    const newRange = newViewport.endIndex - newViewport.startIndex;
    if (newRange !== indexRange) {
      if (newViewport.startIndex === 0) {
        newViewport.endIndex = Math.min(this.candles.length - 1, indexRange);
      } else {
        newViewport.startIndex = Math.max(0, this.candles.length - 1 - indexRange);
      }
    }
    
    // Update price range for visible candles
    this.updatePriceRange(newViewport);
    
    this.viewport = newViewport;
    this.callbacks.onViewportChange(newViewport);
  }

  private zoom(factor: number, centerX: number) {
    const { chartArea } = this.dimensions;
    const indexRange = this.viewport.endIndex - this.viewport.startIndex;
    
    // Calculate center index
    const centerRatio = (centerX - chartArea.x) / chartArea.width;
    const centerIndex = this.viewport.startIndex + indexRange * centerRatio;
    
    // Calculate new range
    const newRange = Math.max(10, Math.min(this.candles.length, Math.round(indexRange * factor)));
    
    // Calculate new start/end maintaining center
    const newViewport = { ...this.viewport };
    newViewport.startIndex = Math.max(0, Math.round(centerIndex - newRange * centerRatio));
    newViewport.endIndex = Math.min(this.candles.length - 1, newViewport.startIndex + newRange);
    
    // Adjust if hitting boundaries
    if (newViewport.endIndex >= this.candles.length - 1) {
      newViewport.endIndex = this.candles.length - 1;
      newViewport.startIndex = Math.max(0, newViewport.endIndex - newRange);
    }
    
    // Update price range
    this.updatePriceRange(newViewport);
    
    this.viewport = newViewport;
    this.callbacks.onViewportChange(newViewport);
  }

  private updatePriceRange(viewport: ChartViewport) {
    let min = Infinity, max = -Infinity;
    
    for (let i = Math.max(0, viewport.startIndex); i <= Math.min(this.candles.length - 1, viewport.endIndex); i++) {
      const candle = this.candles[i];
      if (candle) {
        min = Math.min(min, candle.low);
        max = Math.max(max, candle.high);
      }
    }
    
    if (min !== Infinity && max !== -Infinity) {
      const padding = (max - min) * 0.05;
      viewport.priceMin = min - padding;
      viewport.priceMax = max + padding;
    }
  }

  private getCrosshairData(x: number, y: number): CrosshairState {
    const { chartArea } = this.dimensions;
    
    // Calculate index and price
    const indexRange = this.viewport.endIndex - this.viewport.startIndex;
    const index = Math.floor(this.viewport.startIndex + (x - chartArea.x) / chartArea.width * indexRange);
    
    const priceRange = this.viewport.priceMax - this.viewport.priceMin;
    const price = this.viewport.priceMax - (y - chartArea.y) / chartArea.height * priceRange;
    
    const candle = this.candles[index] || null;
    const time = candle ? candle.timestamp : 0;
    
    return {
      visible: true,
      x,
      y,
      price,
      time,
      candle,
    };
  }

  private startDrawing(x: number, y: number) {
    const { chartArea } = this.dimensions;
    const price = this.viewport.priceMax - (y - chartArea.y) / chartArea.height * (this.viewport.priceMax - this.viewport.priceMin);
    const indexRange = this.viewport.endIndex - this.viewport.startIndex;
    const index = this.viewport.startIndex + (x - chartArea.x) / chartArea.width * indexRange;
    const time = this.candles[Math.floor(index)]?.timestamp || Date.now();

    this.currentDrawing = {
      id: `drawing_${Date.now()}`,
      type: this.drawingType,
      points: [{ x, y, price, time }],
      color: '#ffb000',
      lineWidth: 2,
      isComplete: false,
    };
  }

  private updateDrawing(x: number, y: number) {
    if (!this.currentDrawing) return;
    
    const { chartArea } = this.dimensions;
    const price = this.viewport.priceMax - (y - chartArea.y) / chartArea.height * (this.viewport.priceMax - this.viewport.priceMin);
    const indexRange = this.viewport.endIndex - this.viewport.startIndex;
    const index = this.viewport.startIndex + (x - chartArea.x) / chartArea.width * indexRange;
    const time = this.candles[Math.floor(index)]?.timestamp || Date.now();

    if (this.currentDrawing.points.length === 1) {
      this.currentDrawing.points.push({ x, y, price, time });
    } else {
      this.currentDrawing.points[1] = { x, y, price, time };
    }
    
    // Preview drawing
    this.callbacks.onDrawingUpdate([...this.drawings, this.currentDrawing]);
  }

  private finishDrawing() {
    if (!this.currentDrawing) return;
    
    if (this.currentDrawing.points.length >= 2 || 
        this.currentDrawing.type === 'horizontal' || 
        this.currentDrawing.type === 'vertical') {
      this.currentDrawing.isComplete = true;
      this.drawings.push(this.currentDrawing);
    }
    
    this.currentDrawing = null;
    this.callbacks.onDrawingUpdate([...this.drawings]);
  }
}
