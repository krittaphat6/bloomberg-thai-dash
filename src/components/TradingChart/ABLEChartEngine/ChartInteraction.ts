// ABLE Chart Engine - Interaction Handler (Smooth Scrolling & Zoom)
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
  
  // Smooth scrolling state
  private targetViewport: ChartViewport | null = null;
  private animationFrame: number | null = null;
  private velocity = { x: 0, y: 0 };
  private lastPanTime = 0;
  private inertiaAnimationFrame: number | null = null;
  
  private mode: ChartMode = 'normal';
  private drawingType: DrawingType = 'trendline';
  private drawings: DrawingObject[] = [];
  private currentDrawing: DrawingObject | null = null;

  // Smooth animation constants
  private readonly ZOOM_SMOOTHNESS = 0.15;
  private readonly PAN_SMOOTHNESS = 0.2;
  private readonly INERTIA_DECAY = 0.95;
  private readonly MIN_VELOCITY = 0.01;

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
    
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.inertiaAnimationFrame) cancelAnimationFrame(this.inertiaAnimationFrame);
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
    this.velocity = { x: 0, y: 0 };
    this.lastPanTime = performance.now();

    // Stop any ongoing inertia
    if (this.inertiaAnimationFrame) {
      cancelAnimationFrame(this.inertiaAnimationFrame);
      this.inertiaAnimationFrame = null;
    }

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
    const now = performance.now();

    if (this.isPanning) {
      const deltaX = x - this.lastMouseX;
      const deltaTime = now - this.lastPanTime;
      
      // Track velocity for inertia
      if (deltaTime > 0) {
        this.velocity.x = deltaX / deltaTime * 16; // Normalize to ~60fps
      }
      
      this.panSmooth(deltaX);
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.lastPanTime = now;
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
      
      // Start inertia scrolling if there's velocity
      if (Math.abs(this.velocity.x) > this.MIN_VELOCITY) {
        this.startInertiaScroll();
      }
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
    
    // Use smaller zoom factor for smoother zooming
    const zoomIntensity = 0.05;
    const zoomFactor = 1 + (e.deltaY > 0 ? zoomIntensity : -zoomIntensity);
    
    this.zoomSmooth(zoomFactor, x);
  };

  private handleDoubleClick = (e: MouseEvent) => {
    // Reset viewport to fit all data with animation
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
      
      this.animateToViewport(newViewport);
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    
    // Stop inertia
    if (this.inertiaAnimationFrame) {
      cancelAnimationFrame(this.inertiaAnimationFrame);
      this.inertiaAnimationFrame = null;
    }
    
    if (e.touches.length === 1) {
      const { x, y } = this.getCanvasCoords(e.touches[0]);
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.isPanning = true;
      this.velocity = { x: 0, y: 0 };
      this.lastPanTime = performance.now();
    } else if (e.touches.length === 2) {
      this.touchStartDistance = this.getTouchDistance(e.touches);
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const now = performance.now();
    
    if (e.touches.length === 1 && this.isPanning) {
      const { x, y } = this.getCanvasCoords(e.touches[0]);
      const deltaX = x - this.lastMouseX;
      const deltaTime = now - this.lastPanTime;
      
      // Track velocity for inertia
      if (deltaTime > 0) {
        this.velocity.x = deltaX / deltaTime * 16;
      }
      
      this.panSmooth(deltaX);
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.lastPanTime = now;
      
      // Update crosshair
      const crosshair = this.getCrosshairData(x, y);
      this.callbacks.onCrosshairMove(crosshair);
    } else if (e.touches.length === 2) {
      const newDistance = this.getTouchDistance(e.touches);
      const zoomFactor = this.touchStartDistance / newDistance;
      
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const rect = this.canvas.getBoundingClientRect();
      this.zoomSmooth(zoomFactor, centerX - rect.left);
      
      this.touchStartDistance = newDistance;
    }
  };

  private handleTouchEnd = () => {
    this.isPanning = false;
    
    // Start inertia scrolling if there's velocity
    if (Math.abs(this.velocity.x) > this.MIN_VELOCITY) {
      this.startInertiaScroll();
    }
    
    this.callbacks.onCrosshairMove({ visible: false, x: 0, y: 0, price: 0, time: 0, candle: null });
  };

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private startInertiaScroll() {
    const scroll = () => {
      if (Math.abs(this.velocity.x) < this.MIN_VELOCITY) {
        this.inertiaAnimationFrame = null;
        return;
      }
      
      this.panSmooth(this.velocity.x);
      this.velocity.x *= this.INERTIA_DECAY;
      
      this.inertiaAnimationFrame = requestAnimationFrame(scroll);
    };
    
    this.inertiaAnimationFrame = requestAnimationFrame(scroll);
  }

  private panSmooth(deltaX: number) {
    const { chartArea } = this.dimensions;
    const indexRange = this.viewport.endIndex - this.viewport.startIndex;
    
    // Use floating point for smooth scrolling (no rounding!)
    const deltaIndex = (deltaX / chartArea.width) * indexRange;
    
    const newViewport = { ...this.viewport };
    
    // Calculate new indices with floating point precision
    let newStartIndex = this.viewport.startIndex - deltaIndex;
    let newEndIndex = this.viewport.endIndex - deltaIndex;
    
    // Clamp to valid range
    if (newStartIndex < 0) {
      newStartIndex = 0;
      newEndIndex = indexRange;
    }
    if (newEndIndex > this.candles.length - 1) {
      newEndIndex = this.candles.length - 1;
      newStartIndex = Math.max(0, newEndIndex - indexRange);
    }
    
    newViewport.startIndex = newStartIndex;
    newViewport.endIndex = newEndIndex;
    
    // Update price range for visible candles
    this.updatePriceRange(newViewport);
    
    this.viewport = newViewport;
    this.callbacks.onViewportChange(newViewport);
  }

  private zoomSmooth(factor: number, centerX: number) {
    const { chartArea } = this.dimensions;
    const indexRange = this.viewport.endIndex - this.viewport.startIndex;
    
    // Calculate center index with floating point
    const centerRatio = (centerX - chartArea.x) / chartArea.width;
    const centerIndex = this.viewport.startIndex + indexRange * centerRatio;
    
    // Calculate new range (smooth, no rounding during calculation)
    const newRange = Math.max(5, Math.min(this.candles.length, indexRange * factor));
    
    // Calculate new start/end maintaining center point
    const newViewport = { ...this.viewport };
    let newStartIndex = centerIndex - newRange * centerRatio;
    let newEndIndex = newStartIndex + newRange;
    
    // Clamp to valid range
    if (newStartIndex < 0) {
      newStartIndex = 0;
      newEndIndex = newRange;
    }
    if (newEndIndex > this.candles.length - 1) {
      newEndIndex = this.candles.length - 1;
      newStartIndex = Math.max(0, newEndIndex - newRange);
    }
    
    newViewport.startIndex = newStartIndex;
    newViewport.endIndex = newEndIndex;
    
    // Update price range with smooth auto-scaling
    this.updatePriceRangeSmooth(newViewport);
    
    this.viewport = newViewport;
    this.callbacks.onViewportChange(newViewport);
  }

  private animateToViewport(targetViewport: ChartViewport) {
    const animate = () => {
      const currentViewport = { ...this.viewport };
      
      // Lerp all values
      currentViewport.startIndex += (targetViewport.startIndex - currentViewport.startIndex) * this.ZOOM_SMOOTHNESS;
      currentViewport.endIndex += (targetViewport.endIndex - currentViewport.endIndex) * this.ZOOM_SMOOTHNESS;
      currentViewport.priceMin += (targetViewport.priceMin - currentViewport.priceMin) * this.ZOOM_SMOOTHNESS;
      currentViewport.priceMax += (targetViewport.priceMax - currentViewport.priceMax) * this.ZOOM_SMOOTHNESS;
      
      // Check if animation is complete
      const delta = Math.abs(targetViewport.startIndex - currentViewport.startIndex) +
                    Math.abs(targetViewport.endIndex - currentViewport.endIndex);
      
      this.viewport = currentViewport;
      this.callbacks.onViewportChange(currentViewport);
      
      if (delta > 0.1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.viewport = targetViewport;
        this.callbacks.onViewportChange(targetViewport);
        this.animationFrame = null;
      }
    };
    
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = requestAnimationFrame(animate);
  }

  private updatePriceRange(viewport: ChartViewport) {
    let min = Infinity, max = -Infinity;
    
    const startIdx = Math.max(0, Math.floor(viewport.startIndex));
    const endIdx = Math.min(this.candles.length - 1, Math.ceil(viewport.endIndex));
    
    for (let i = startIdx; i <= endIdx; i++) {
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

  private updatePriceRangeSmooth(viewport: ChartViewport) {
    let min = Infinity, max = -Infinity;
    
    const startIdx = Math.max(0, Math.floor(viewport.startIndex));
    const endIdx = Math.min(this.candles.length - 1, Math.ceil(viewport.endIndex));
    
    for (let i = startIdx; i <= endIdx; i++) {
      const candle = this.candles[i];
      if (candle) {
        min = Math.min(min, candle.low);
        max = Math.max(max, candle.high);
      }
    }
    
    if (min !== Infinity && max !== -Infinity) {
      const padding = (max - min) * 0.05;
      const targetMin = min - padding;
      const targetMax = max + padding;
      
      // Smooth lerp for price range changes
      viewport.priceMin = this.viewport.priceMin + (targetMin - this.viewport.priceMin) * 0.3;
      viewport.priceMax = this.viewport.priceMax + (targetMax - this.viewport.priceMax) * 0.3;
    }
  }

  private getCrosshairData(x: number, y: number): CrosshairState {
    const { chartArea } = this.dimensions;
    
    // Calculate index and price (using floating point for smooth tracking)
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
