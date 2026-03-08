// ABLE Chart Engine - Interaction Handler (TradingView-style Scrolling & Zoom)
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
  
  private isPanning = false;
  private isPriceAxisDragging = false;
  private priceAxisDragStartY = 0;
  private priceAxisDragStartPriceMin = 0;
  private priceAxisDragStartPriceMax = 0;
  private isAutoScalePrice = true; // TradingView default: auto-scale on
  private lastMouseX = 0;
  private lastMouseY = 0;
  private touchStartDistance = 0;
  
  // TradingView-style kinetic scroll
  private animationFrame: number | null = null;
  private inertiaAnimationFrame: number | null = null;
  
  // Velocity tracking with EMA (exponential moving average) like TradingView
  private velocityTracker: { time: number; deltaIndex: number }[] = [];
  private readonly VELOCITY_WINDOW = 100; // ms - track last 100ms of movement
  
  // Kinetic scroll physics
  private kineticVelocity = 0;
  private readonly KINETIC_FRICTION = 0.97; // Per-frame friction (TradingView uses ~0.95-0.97)
  private readonly KINETIC_MIN_VELOCITY = 0.001; // Stop threshold in index units
  
  // Right-side padding: TradingView allows ~50% of visible range as empty space on the right
  private readonly RIGHT_PADDING_RATIO = 0.5;
  
  // Zoom
  private readonly ZOOM_INTENSITY = 0.1;

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
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.handleDoubleClick);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
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

  // =========================================================================
  // MOUSE EVENTS - TradingView style: direct 1:1 panning, no smoothing
  // =========================================================================

  private isOnPriceAxis(x: number): boolean {
    const { chartArea } = this.dimensions;
    return x > chartArea.x + chartArea.width;
  }

  private handleMouseDown = (e: MouseEvent) => {
    const { x, y } = this.getCanvasCoords(e);
    this.lastMouseX = x;
    this.lastMouseY = y;

    // Stop any ongoing kinetic scroll immediately
    this.stopKineticScroll();
    this.velocityTracker = [];

    // Check if clicking on price axis (right side) for vertical scaling
    if (this.isOnPriceAxis(x)) {
      this.isPriceAxisDragging = true;
      this.priceAxisDragStartY = y;
      this.priceAxisDragStartPriceMin = this.viewport.priceMin;
      this.priceAxisDragStartPriceMax = this.viewport.priceMax;
      this.isAutoScalePrice = false; // Disable auto-scale when manually adjusting
      this.canvas.style.cursor = 'ns-resize';
      return;
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

    // Price axis dragging - TradingView vertical scale
    if (this.isPriceAxisDragging) {
      const deltaY = y - this.priceAxisDragStartY;
      const priceRange = this.priceAxisDragStartPriceMax - this.priceAxisDragStartPriceMin;
      const center = (this.priceAxisDragStartPriceMax + this.priceAxisDragStartPriceMin) / 2;
      
      // Drag up = zoom in (shrink range), drag down = zoom out (expand range)
      // TradingView uses ~0.005 per pixel sensitivity
      const scaleFactor = Math.exp(deltaY * 0.005);
      const newHalfRange = (priceRange / 2) * scaleFactor;
      
      const newViewport = { ...this.viewport };
      newViewport.priceMin = center - newHalfRange;
      newViewport.priceMax = center + newHalfRange;
      
      this.viewport = newViewport;
      this.callbacks.onViewportChange(newViewport);
      return;
    }

    if (this.isPanning) {
      const deltaX = x - this.lastMouseX;
      
      // Convert pixel delta to index delta (direct 1:1 mapping like TradingView)
      const indexRange = this.viewport.endIndex - this.viewport.startIndex;
      const deltaIndex = -(deltaX / chartArea.width) * indexRange;
      
      // Track velocity for kinetic scroll
      this.velocityTracker.push({ time: performance.now(), deltaIndex });
      // Keep only recent samples
      const now = performance.now();
      this.velocityTracker = this.velocityTracker.filter(v => now - v.time < this.VELOCITY_WINDOW);
      
      // Apply pan directly (no smoothing - this is the TradingView way)
      this.panDirect(deltaIndex);
      
      this.lastMouseX = x;
      this.lastMouseY = y;
    } else if (this.mode === 'drawing' && this.currentDrawing) {
      this.updateDrawing(x, y);
    }

    // Update cursor based on position
    if (!this.isPanning && !this.isPriceAxisDragging && this.mode !== 'drawing') {
      this.canvas.style.cursor = this.isOnPriceAxis(x) ? 'ns-resize' : 'default';
    }

    // Update crosshair
    if (x >= chartArea.x && x <= chartArea.x + chartArea.width &&
        y >= chartArea.y && y <= chartArea.y + chartArea.height) {
      const crosshair = this.getCrosshairData(x, y);
      this.callbacks.onCrosshairMove(crosshair);
    }
  };

  private handleMouseUp = (_e: MouseEvent) => {
    if (this.isPriceAxisDragging) {
      this.isPriceAxisDragging = false;
      this.canvas.style.cursor = 'default';
      return;
    }

    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.mode === 'drawing' ? 'crosshair' : 'default';
      
      // Calculate kinetic velocity from tracked samples
      const velocity = this.calculateKineticVelocity();
      if (Math.abs(velocity) > this.KINETIC_MIN_VELOCITY) {
        this.startKineticScroll(velocity);
      }
    }
    
    if (this.mode === 'drawing' && this.currentDrawing) {
      this.finishDrawing();
    }
  };

  private handleMouseLeave = () => {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
      
      // Still allow kinetic scroll when leaving
      const velocity = this.calculateKineticVelocity();
      if (Math.abs(velocity) > this.KINETIC_MIN_VELOCITY) {
        this.startKineticScroll(velocity);
      }
    }
    this.callbacks.onCrosshairMove({ visible: false, x: 0, y: 0, price: 0, time: 0, candle: null });
  };

  // =========================================================================
  // WHEEL - Zoom centered on cursor (TradingView behavior)
  // =========================================================================

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    const { x } = this.getCanvasCoords(e);
    
    // TradingView uses a continuous zoom feel
    // deltaY is typically ±100 for a single wheel tick
    const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 100) / 100;
    const zoomFactor = 1 + normalizedDelta * this.ZOOM_INTENSITY;
    
    this.zoomAtPoint(zoomFactor, x);
  };

  private handleDoubleClick = (_e: MouseEvent) => {
    // Reset viewport to fit all data with smooth animation
    if (this.candles.length > 0) {
      const newViewport = { ...this.viewport };
      newViewport.startIndex = 0;
      newViewport.endIndex = this.candles.length - 1;
      
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

  // =========================================================================
  // TOUCH EVENTS
  // =========================================================================

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    this.stopKineticScroll();
    this.velocityTracker = [];
    
    if (e.touches.length === 1) {
      const { x, y } = this.getCanvasCoords(e.touches[0]);
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.isPanning = true;
    } else if (e.touches.length === 2) {
      this.isPanning = false;
      this.touchStartDistance = this.getTouchDistance(e.touches);
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && this.isPanning) {
      const { x, y } = this.getCanvasCoords(e.touches[0]);
      const { chartArea } = this.dimensions;
      const deltaX = x - this.lastMouseX;
      
      const indexRange = this.viewport.endIndex - this.viewport.startIndex;
      const deltaIndex = -(deltaX / chartArea.width) * indexRange;
      
      this.velocityTracker.push({ time: performance.now(), deltaIndex });
      const now = performance.now();
      this.velocityTracker = this.velocityTracker.filter(v => now - v.time < this.VELOCITY_WINDOW);
      
      this.panDirect(deltaIndex);
      this.lastMouseX = x;
      this.lastMouseY = y;
      
      const crosshair = this.getCrosshairData(x, y);
      this.callbacks.onCrosshairMove(crosshair);
    } else if (e.touches.length === 2) {
      const newDistance = this.getTouchDistance(e.touches);
      const zoomFactor = this.touchStartDistance / newDistance;
      
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const rect = this.canvas.getBoundingClientRect();
      this.zoomAtPoint(zoomFactor, centerX - rect.left);
      
      this.touchStartDistance = newDistance;
    }
  };

  private handleTouchEnd = () => {
    if (this.isPanning) {
      this.isPanning = false;
      
      const velocity = this.calculateKineticVelocity();
      if (Math.abs(velocity) > this.KINETIC_MIN_VELOCITY) {
        this.startKineticScroll(velocity);
      }
    }
    
    this.callbacks.onCrosshairMove({ visible: false, x: 0, y: 0, price: 0, time: 0, candle: null });
  };

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // =========================================================================
  // PANNING - Direct 1:1 mapping (TradingView style)
  // =========================================================================

  private panDirect(deltaIndex: number) {
    const indexRange = this.viewport.endIndex - this.viewport.startIndex;
    const newViewport = { ...this.viewport };
    
    let newStartIndex = this.viewport.startIndex + deltaIndex;
    let newEndIndex = this.viewport.endIndex + deltaIndex;
    
    // TradingView allows scrolling past the right edge (future empty space)
    const maxEndIndex = this.candles.length - 1 + indexRange * this.RIGHT_PADDING_RATIO;
    
    // Clamp left: don't go before index 0
    if (newStartIndex < 0) {
      newStartIndex = 0;
      newEndIndex = indexRange;
    }
    // Clamp right: allow some empty space on the right (like TradingView)
    if (newEndIndex > maxEndIndex) {
      newEndIndex = maxEndIndex;
      newStartIndex = newEndIndex - indexRange;
    }
    
    newViewport.startIndex = newStartIndex;
    newViewport.endIndex = newEndIndex;
    
    // Auto-scale price range for visible candles
    this.updatePriceRange(newViewport);
    
    this.viewport = newViewport;
    this.callbacks.onViewportChange(newViewport);
  }

  // =========================================================================
  // KINETIC SCROLL - TradingView-style momentum after mouse release
  // =========================================================================

  private calculateKineticVelocity(): number {
    if (this.velocityTracker.length < 2) return 0;
    
    const now = performance.now();
    // Only use samples from the last 50ms for velocity calculation
    const recentSamples = this.velocityTracker.filter(v => now - v.time < 50);
    
    if (recentSamples.length < 1) return 0;
    
    // Sum up all deltaIndex values and divide by time span
    let totalDelta = 0;
    for (const sample of recentSamples) {
      totalDelta += sample.deltaIndex;
    }
    
    const timeSpan = recentSamples.length > 1
      ? recentSamples[recentSamples.length - 1].time - recentSamples[0].time
      : 16;
    
    // Velocity in index units per frame (~16ms)
    return (totalDelta / Math.max(timeSpan, 1)) * 16;
  }

  private startKineticScroll(initialVelocity: number) {
    this.kineticVelocity = initialVelocity;
    
    const scroll = () => {
      if (Math.abs(this.kineticVelocity) < this.KINETIC_MIN_VELOCITY) {
        this.inertiaAnimationFrame = null;
        return;
      }
      
      this.panDirect(this.kineticVelocity);
      this.kineticVelocity *= this.KINETIC_FRICTION;
      
      this.inertiaAnimationFrame = requestAnimationFrame(scroll);
    };
    
    this.inertiaAnimationFrame = requestAnimationFrame(scroll);
  }

  private stopKineticScroll() {
    if (this.inertiaAnimationFrame) {
      cancelAnimationFrame(this.inertiaAnimationFrame);
      this.inertiaAnimationFrame = null;
    }
    this.kineticVelocity = 0;
  }

  // =========================================================================
  // ZOOM - Anchored at cursor position (TradingView style)
  // =========================================================================

  private zoomAtPoint(factor: number, centerX: number) {
    const { chartArea } = this.dimensions;
    const indexRange = this.viewport.endIndex - this.viewport.startIndex;
    
    // Anchor point: the index under the cursor stays in place
    const centerRatio = (centerX - chartArea.x) / chartArea.width;
    const anchorIndex = this.viewport.startIndex + indexRange * centerRatio;
    
    // New range
    const newRange = Math.max(5, Math.min(this.candles.length * 2, indexRange * factor));
    
    // Reposition around anchor
    const newViewport = { ...this.viewport };
    let newStartIndex = anchorIndex - newRange * centerRatio;
    let newEndIndex = newStartIndex + newRange;
    
    // Clamp
    const maxEndIndex = this.candles.length - 1 + newRange * this.RIGHT_PADDING_RATIO;
    if (newStartIndex < 0) {
      newStartIndex = 0;
      newEndIndex = newRange;
    }
    if (newEndIndex > maxEndIndex) {
      newEndIndex = maxEndIndex;
      newStartIndex = Math.max(0, newEndIndex - newRange);
    }
    
    newViewport.startIndex = newStartIndex;
    newViewport.endIndex = newEndIndex;
    
    // Smooth price auto-scale during zoom
    this.updatePriceRangeSmooth(newViewport);
    
    this.viewport = newViewport;
    this.callbacks.onViewportChange(newViewport);
  }

  // =========================================================================
  // ANIMATED VIEWPORT TRANSITION (for double-click reset)
  // =========================================================================

  private animateToViewport(targetViewport: ChartViewport) {
    const LERP_SPEED = 0.15;
    
    const animate = () => {
      const currentViewport = { ...this.viewport };
      
      currentViewport.startIndex += (targetViewport.startIndex - currentViewport.startIndex) * LERP_SPEED;
      currentViewport.endIndex += (targetViewport.endIndex - currentViewport.endIndex) * LERP_SPEED;
      currentViewport.priceMin += (targetViewport.priceMin - currentViewport.priceMin) * LERP_SPEED;
      currentViewport.priceMax += (targetViewport.priceMax - currentViewport.priceMax) * LERP_SPEED;
      
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

  // =========================================================================
  // PRICE RANGE AUTO-SCALING
  // =========================================================================

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
      const padding = (max - min) * 0.08;
      const targetMin = min - padding;
      const targetMax = max + padding;
      
      // Smooth price transitions during panning (like TradingView)
      viewport.priceMin = this.viewport.priceMin + (targetMin - this.viewport.priceMin) * 0.15;
      viewport.priceMax = this.viewport.priceMax + (targetMax - this.viewport.priceMax) * 0.15;
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
      const padding = (max - min) * 0.08;
      const targetMin = min - padding;
      const targetMax = max + padding;
      
      viewport.priceMin = this.viewport.priceMin + (targetMin - this.viewport.priceMin) * 0.25;
      viewport.priceMax = this.viewport.priceMax + (targetMax - this.viewport.priceMax) * 0.25;
    }
  }

  // =========================================================================
  // CROSSHAIR
  // =========================================================================

  private getCrosshairData(x: number, y: number): CrosshairState {
    const { chartArea } = this.dimensions;
    
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

  // =========================================================================
  // DRAWING TOOLS
  // =========================================================================

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
