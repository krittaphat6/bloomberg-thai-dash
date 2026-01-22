// AgentService.ts - Vercept-style DOM Interaction & Visual Automation
// Full browser automation with visual feedback like Vercept.com
// Implements: Smart element finding, fuzzy matching, deep DOM traversal, fallback strategies

export interface AgentAction {
  type: 'click' | 'type' | 'scroll' | 'scrollTo' | 'wait' | 'hover' | 'openPanel' | 'closePanel' | 'screenshot' | 'analyze' | 'sendMessage' | 'navigate' | 'select' | 'doubleClick' | 'rightClick' | 'dragTo' | 'pressKey';
  target?: string; // CSS selector, text content, or panel ID
  value?: string | number;
  description: string;
  coordinates?: { x: number; y: number };
}

export interface AgentTask {
  id: string;
  goal: string;
  actions: AgentAction[];
  status: 'pending' | 'planning' | 'running' | 'completed' | 'failed';
  currentActionIndex: number;
  logs: string[];
  error?: string;
  thinkingSteps?: string[];
  startTime?: number;
  endTime?: number;
}

export interface PageContext {
  url: string;
  title: string;
  visibleText: string;
  buttons: Array<{ text: string; selector: string; agentId?: string; rect?: DOMRect }>;
  links: Array<{ text: string; href: string; selector: string }>;
  inputs: Array<{ type: string; placeholder?: string; selector: string; value?: string; label?: string }>;
  panels: string[];
  interactiveElements: Array<{ type: string; text: string; selector: string; rect: DOMRect; index: number }>;
  viewportSize: { width: number; height: number };
  scrollPosition: { x: number; y: number };
}

export interface ScreenAnalysis {
  elements: Array<{
    type: 'button' | 'input' | 'link' | 'text' | 'image' | 'panel';
    text: string;
    selector: string;
    boundingBox: { x: number; y: number; width: number; height: number };
    isVisible: boolean;
    isInteractive: boolean;
    index: number;
  }>;
  dominantColors: string[];
  layoutType: 'dashboard' | 'form' | 'list' | 'chat' | 'unknown';
}

// Element index for AI referencing
interface IndexedElement {
  element: HTMLElement;
  index: number;
  text: string;
  type: string;
  rect: DOMRect;
  selector: string;
}

class AgentServiceClass {
  private highlightOverlay: HTMLDivElement | null = null;
  private cursorOverlay: HTMLDivElement | null = null;
  private thinkingOverlay: HTMLDivElement | null = null;
  private actionListeners: Set<(log: string) => void> = new Set();
  private cursorPosition: { x: number; y: number } = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  private isAnimating: boolean = false;
  private activeHighlights: HTMLDivElement[] = [];
  private indexedElements: Map<number, IndexedElement> = new Map();
  private lastIndexTime: number = 0;

  constructor() {
    this.injectAgentStyles();
  }

  // Subscribe to action logs
  onAction(callback: (log: string) => void): () => void {
    this.actionListeners.add(callback);
    return () => { this.actionListeners.delete(callback); };
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    const logMessage = `[${timestamp}] ${message}`;
    console.log('🤖 Agent:', logMessage);
    this.actionListeners.forEach(cb => cb(logMessage));
  }

  // =================== SMART ELEMENT FINDING (browser-use style) ===================

  /**
   * Index all interactive elements on the page for AI reference
   */
  indexPageElements(): Map<number, IndexedElement> {
    this.indexedElements.clear();
    let index = 0;

    const selectors = [
      'button', 'a', 'input', 'textarea', 'select',
      '[role="button"]', '[role="tab"]', '[role="menuitem"]',
      '[onclick]', '[data-agent-id]', '[data-testid]',
      '.btn', '.clickable', '[tabindex]'
    ].join(', ');

    document.querySelectorAll(selectors).forEach((el) => {
      const element = el as HTMLElement;
      const rect = element.getBoundingClientRect();

      // Only visible and reasonably sized elements
      if (rect.width > 5 && rect.height > 5 && 
          rect.top < window.innerHeight + 500 && rect.bottom > -500 &&
          rect.left < window.innerWidth + 500 && rect.right > -500) {
        
        const text = this.getElementVisibleText(element);
        const type = this.getElementType(element);
        
        this.indexedElements.set(index, {
          element,
          index,
          text: text.substring(0, 100),
          type,
          rect,
          selector: this.generateUniqueSelector(element)
        });
        
        index++;
      }
    });

    this.lastIndexTime = Date.now();
    this.log(`📊 Indexed ${this.indexedElements.size} interactive elements`);
    return this.indexedElements;
  }

  private getElementVisibleText(element: HTMLElement): string {
    // Get text content, placeholder, aria-label, title, or value
    const text = element.textContent?.trim() ||
                 element.getAttribute('placeholder') ||
                 element.getAttribute('aria-label') ||
                 element.getAttribute('title') ||
                 (element as HTMLInputElement).value ||
                 '';
    return text.replace(/\s+/g, ' ').trim();
  }

  private getElementType(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const type = element.getAttribute('type');
    
    if (tag === 'button' || role === 'button') return 'button';
    if (tag === 'a') return 'link';
    if (tag === 'input') return type || 'input';
    if (tag === 'textarea') return 'textarea';
    if (tag === 'select') return 'select';
    if (role === 'tab') return 'tab';
    if (role === 'menuitem') return 'menuitem';
    return 'element';
  }

  private generateUniqueSelector(element: HTMLElement): string {
    // Try data attributes first (most reliable)
    const agentId = element.getAttribute('data-agent-id');
    if (agentId) return `[data-agent-id="${agentId}"]`;

    const testId = element.getAttribute('data-testid');
    if (testId) return `[data-testid="${testId}"]`;

    // Try ID
    if (element.id) return `#${element.id}`;

    // Build a path-based selector
    const path: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        path.unshift(`#${current.id}`);
        break;
      }
      
      // Add class if meaningful
      const classes = Array.from(current.classList)
        .filter(c => !c.match(/^(hover|active|focus|selected|open)/))
        .slice(0, 2);
      if (classes.length) {
        selector += '.' + classes.join('.');
      }
      
      // Add nth-child if needed for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          s => s.tagName === current!.tagName
        );
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          selector += `:nth-child(${idx})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  /**
   * Find element by text content (fuzzy matching)
   */
  findElementByText(searchText: string, elementType?: string): HTMLElement | null {
    const normalizedSearch = searchText.toLowerCase().trim();
    
    // Refresh index if stale (>2 seconds old)
    if (Date.now() - this.lastIndexTime > 2000) {
      this.indexPageElements();
    }

    // First: exact match
    for (const [_, indexed] of this.indexedElements) {
      if (elementType && indexed.type !== elementType) continue;
      if (indexed.text.toLowerCase() === normalizedSearch) {
        this.log(`🎯 Found exact match: "${indexed.text}"`);
        return indexed.element;
      }
    }

    // Second: contains match
    for (const [_, indexed] of this.indexedElements) {
      if (elementType && indexed.type !== elementType) continue;
      if (indexed.text.toLowerCase().includes(normalizedSearch)) {
        this.log(`🎯 Found contains match: "${indexed.text}"`);
        return indexed.element;
      }
    }

    // Third: fuzzy match (search contains in text)
    for (const [_, indexed] of this.indexedElements) {
      if (elementType && indexed.type !== elementType) continue;
      if (normalizedSearch.includes(indexed.text.toLowerCase()) && indexed.text.length > 2) {
        this.log(`🎯 Found fuzzy match: "${indexed.text}"`);
        return indexed.element;
      }
    }

    // Fourth: word matching
    const searchWords = normalizedSearch.split(/\s+/);
    for (const [_, indexed] of this.indexedElements) {
      if (elementType && indexed.type !== elementType) continue;
      const textWords = indexed.text.toLowerCase().split(/\s+/);
      const matchCount = searchWords.filter(w => textWords.some(tw => tw.includes(w))).length;
      if (matchCount >= Math.ceil(searchWords.length / 2)) {
        this.log(`🎯 Found word match: "${indexed.text}"`);
        return indexed.element;
      }
    }

    return null;
  }

  /**
   * Find element by index number
   */
  findElementByIndex(index: number): HTMLElement | null {
    const indexed = this.indexedElements.get(index);
    if (indexed) {
      return indexed.element;
    }
    return null;
  }

  /**
   * Smart element finder - tries multiple strategies
   */
  async findElement(target: string): Promise<HTMLElement | null> {
    this.log(`🔍 Finding: "${target}"`);

    // Strategy 1: CSS Selector
    try {
      const bySelector = document.querySelector(target) as HTMLElement;
      if (bySelector && this.isElementVisible(bySelector)) {
        this.log(`✅ Found by selector`);
        return bySelector;
      }
    } catch (e) {
      // Not a valid selector, continue
    }

    // Strategy 2: Index number (e.g., "[5]" or "5")
    const indexMatch = target.match(/^\[?(\d+)\]?$/);
    if (indexMatch) {
      const index = parseInt(indexMatch[1]);
      const byIndex = this.findElementByIndex(index);
      if (byIndex) {
        this.log(`✅ Found by index ${index}`);
        return byIndex;
      }
    }

    // Strategy 3: Text content search
    const byText = this.findElementByText(target);
    if (byText) {
      return byText;
    }

    // Strategy 4: Partial attribute match
    const attrSelectors = [
      `[aria-label*="${target}" i]`,
      `[title*="${target}" i]`,
      `[placeholder*="${target}" i]`,
      `[data-testid*="${target}" i]`,
      `button:contains("${target}")`, // jQuery-style (custom)
    ];

    for (const selector of attrSelectors) {
      try {
        const el = document.querySelector(selector) as HTMLElement;
        if (el && this.isElementVisible(el)) {
          this.log(`✅ Found by attribute: ${selector}`);
          return el;
        }
      } catch (e) {
        // Invalid selector, continue
      }
    }

    // Strategy 5: Deep text search with TreeWalker
    const deepSearch = this.deepFindByText(target);
    if (deepSearch) {
      this.log(`✅ Found by deep text search`);
      return deepSearch;
    }

    // Strategy 6: Try in iframes
    const iframeSearch = this.findInIframes(target);
    if (iframeSearch) {
      this.log(`✅ Found in iframe`);
      return iframeSearch;
    }

    this.log(`❌ Element not found: "${target}"`);
    return null;
  }

  private isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           parseFloat(style.opacity) > 0;
  }

  private deepFindByText(searchText: string): HTMLElement | null {
    const normalizedSearch = searchText.toLowerCase().trim();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    let node: Node | null;
    const candidates: Array<{ element: HTMLElement; score: number }> = [];

    while ((node = walker.nextNode())) {
      const element = node as HTMLElement;
      const text = this.getElementVisibleText(element).toLowerCase();
      
      if (!text || !this.isInteractiveElement(element)) continue;

      // Calculate match score
      let score = 0;
      if (text === normalizedSearch) score = 100;
      else if (text.includes(normalizedSearch)) score = 80;
      else if (normalizedSearch.includes(text) && text.length > 3) score = 60;
      else {
        // Word overlap
        const searchWords = normalizedSearch.split(/\s+/);
        const textWords = text.split(/\s+/);
        const overlap = searchWords.filter(w => textWords.some(tw => tw.includes(w))).length;
        score = (overlap / searchWords.length) * 50;
      }

      if (score > 30 && this.isElementVisible(element)) {
        candidates.push({ element, score });
      }
    }

    // Return best match
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].element;
    }

    return null;
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'a', 'input', 'textarea', 'select'];
    const tag = element.tagName.toLowerCase();
    
    if (interactiveTags.includes(tag)) return true;
    if (element.getAttribute('role') === 'button') return true;
    if (element.getAttribute('onclick')) return true;
    if (element.getAttribute('tabindex')) return true;
    if (element.classList.contains('btn') || element.classList.contains('clickable')) return true;
    
    // Check if cursor is pointer
    const style = window.getComputedStyle(element);
    if (style.cursor === 'pointer') return true;

    return false;
  }

  private findInIframes(target: string): HTMLElement | null {
    const iframes = document.querySelectorAll('iframe');
    
    for (const iframe of iframes) {
      try {
        // Only same-origin iframes
        const doc = iframe.contentDocument;
        if (!doc) continue;

        // Try selector
        try {
          const el = doc.querySelector(target) as HTMLElement;
          if (el) return el;
        } catch (e) {}

        // Try text search in iframe
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
        let node: Node | null;
        const normalizedSearch = target.toLowerCase();

        while ((node = walker.nextNode())) {
          const element = node as HTMLElement;
          const text = element.textContent?.toLowerCase().trim() || '';
          if (text.includes(normalizedSearch) && this.isInteractiveElement(element)) {
            return element;
          }
        }
      } catch (e) {
        // Cross-origin iframe, skip
      }
    }

    return null;
  }

  // =================== VERCEPT-STYLE ANIMATIONS & CSS ===================

  private injectAgentStyles() {
    if (document.getElementById('vercept-agent-styles')) return;

    const style = document.createElement('style');
    style.id = 'vercept-agent-styles';
    style.textContent = `
      :root {
        --agent-accent: 280 85% 65%;
        --agent-accent-2: 320 85% 55%;
        --agent-success: 142 76% 36%;
        --agent-error: 0 84% 60%;
      }

      @keyframes vercept-pulse {
        0% { 
          border-color: hsl(var(--agent-accent)); 
          box-shadow: 0 0 10px hsl(var(--agent-accent) / 0.3), inset 0 0 0 hsl(var(--agent-accent) / 0.1);
          transform: scale(1);
        }
        50% { 
          border-color: hsl(var(--agent-accent-2)); 
          box-shadow: 0 0 30px hsl(var(--agent-accent) / 0.6), inset 0 0 20px hsl(var(--agent-accent) / 0.15);
          transform: scale(1.02);
        }
        100% { 
          border-color: hsl(var(--agent-accent)); 
          box-shadow: 0 0 10px hsl(var(--agent-accent) / 0.3), inset 0 0 0 hsl(var(--agent-accent) / 0.1);
          transform: scale(1);
        }
      }

      @keyframes vercept-cursor-glow {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }

      @keyframes vercept-click-ripple {
        0% { transform: scale(0); opacity: 1; }
        100% { transform: scale(3); opacity: 0; }
      }

      @keyframes vercept-thinking-dots {
        0%, 20% { opacity: 0.3; transform: translateY(0); }
        50% { opacity: 1; transform: translateY(-5px); }
        80%, 100% { opacity: 0.3; transform: translateY(0); }
      }

      @keyframes vercept-scan-line {
        0% { top: 0; opacity: 0.5; }
        50% { opacity: 1; }
        100% { top: 100%; opacity: 0.5; }
      }

      @keyframes vercept-fade-in {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes vercept-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes vercept-index-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      .vercept-cursor {
        position: fixed;
        width: 24px;
        height: 24px;
        pointer-events: none;
        z-index: 999999;
        transition: left 0.15s cubic-bezier(0.4, 0, 0.2, 1), top 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .vercept-cursor-inner {
        position: absolute;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, hsl(var(--agent-accent)) 0%, hsl(var(--agent-accent) / 0.3) 50%, transparent 70%);
        border: 2px solid hsl(var(--agent-accent));
        border-radius: 50%;
        animation: vercept-cursor-glow 1.5s ease-in-out infinite;
      }

      .vercept-cursor-pointer {
        position: absolute;
        top: -2px;
        left: -2px;
        width: 0;
        height: 0;
        border-left: 8px solid hsl(var(--agent-accent));
        border-right: 8px solid transparent;
        border-bottom: 14px solid transparent;
        filter: drop-shadow(0 0 4px hsl(var(--agent-accent) / 0.8));
      }

      .vercept-click-effect {
        position: fixed;
        width: 20px;
        height: 20px;
        background: hsl(var(--agent-accent) / 0.5);
        border-radius: 50%;
        animation: vercept-click-ripple 0.6s ease-out forwards;
        pointer-events: none;
        z-index: 999999;
      }

      .vercept-highlight-box {
        position: fixed;
        border: 3px solid hsl(var(--agent-accent));
        border-radius: 8px;
        background: hsl(var(--agent-accent) / 0.08);
        pointer-events: none;
        z-index: 99998;
        animation: vercept-pulse 1.5s ease-in-out infinite;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .vercept-highlight-label {
        position: absolute;
        top: -28px;
        left: 0;
        background: linear-gradient(135deg, hsl(var(--agent-accent)) 0%, hsl(var(--agent-accent-2)) 100%);
        color: white;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 4px;
        white-space: nowrap;
        box-shadow: 0 2px 10px hsl(var(--agent-accent) / 0.4);
        animation: vercept-fade-in 0.2s ease-out;
      }

      .vercept-index-badge {
        position: fixed;
        min-width: 20px;
        height: 20px;
        background: linear-gradient(135deg, hsl(var(--agent-accent)) 0%, hsl(var(--agent-accent-2)) 100%);
        color: white;
        font-size: 10px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        padding: 0 4px;
        z-index: 99997;
        pointer-events: none;
        animation: vercept-fade-in 0.3s ease-out;
        box-shadow: 0 2px 8px hsl(var(--agent-accent) / 0.5);
      }

      .vercept-thinking-panel {
        position: fixed;
        top: 16px;
        right: 16px;
        width: 320px;
        max-height: 400px;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 10, 30, 0.95) 100%);
        border: 1px solid hsl(var(--agent-accent) / 0.3);
        border-radius: 16px;
        padding: 16px;
        z-index: 999997;
        backdrop-filter: blur(20px);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px hsl(var(--agent-accent) / 0.15);
        animation: vercept-slide-up 0.3s ease-out;
        overflow: hidden;
      }

      .vercept-thinking-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid hsl(var(--agent-accent) / 0.2);
      }

      .vercept-thinking-icon {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, hsl(var(--agent-accent)) 0%, hsl(var(--agent-accent-2)) 100%);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
      }

      .vercept-thinking-title {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
      }

      .vercept-thinking-subtitle {
        font-size: 11px;
        color: hsl(var(--agent-accent) / 0.85);
      }

      .vercept-thinking-dots {
        display: flex;
        gap: 4px;
        margin-left: auto;
      }

      .vercept-thinking-dot {
        width: 6px;
        height: 6px;
        background: hsl(var(--agent-accent));
        border-radius: 50%;
        animation: vercept-thinking-dots 1.4s ease-in-out infinite;
      }

      .vercept-thinking-dot:nth-child(2) { animation-delay: 0.2s; }
      .vercept-thinking-dot:nth-child(3) { animation-delay: 0.4s; }

      .vercept-step-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 280px;
        overflow-y: auto;
      }

      .vercept-step {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px;
        background: hsl(var(--agent-accent) / 0.05);
        border-radius: 8px;
        animation: vercept-fade-in 0.3s ease-out;
        border: 1px solid transparent;
        transition: all 0.2s ease;
      }

      .vercept-step.active {
        background: hsl(var(--agent-accent) / 0.15);
        border-color: hsl(var(--agent-accent) / 0.3);
      }

      .vercept-step.completed {
        opacity: 0.7;
      }

      .vercept-step-icon {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        flex-shrink: 0;
      }

      .vercept-step-icon.pending {
        background: rgba(100, 100, 100, 0.3);
        color: #888;
      }

      .vercept-step-icon.active {
        background: linear-gradient(135deg, hsl(var(--agent-accent)) 0%, hsl(var(--agent-accent-2)) 100%);
        color: white;
        animation: vercept-cursor-glow 1s ease-in-out infinite;
      }

      .vercept-step-icon.completed {
        background: linear-gradient(135deg, hsl(var(--agent-success)) 0%, hsl(142 76% 26%) 100%);
        color: white;
      }

      .vercept-step-icon.failed {
        background: linear-gradient(135deg, hsl(var(--agent-error)) 0%, hsl(0 84% 50%) 100%);
        color: white;
      }

      .vercept-step-text {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.4;
      }

      .vercept-scan-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 99996;
        overflow: hidden;
      }

      .vercept-scan-line {
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent 0%, hsl(var(--agent-accent)) 50%, transparent 100%);
        animation: vercept-scan-line 2s ease-in-out infinite;
        box-shadow: 0 0 20px 5px hsl(var(--agent-accent) / 0.4);
      }
    `;
    document.head.appendChild(style);
  }

  // =================== VIRTUAL CURSOR ===================

  createVirtualCursor(): void {
    if (this.cursorOverlay) return;

    this.cursorOverlay = document.createElement('div');
    this.cursorOverlay.className = 'vercept-cursor';
    this.cursorOverlay.innerHTML = `
      <div class="vercept-cursor-inner"></div>
      <div class="vercept-cursor-pointer"></div>
    `;
    this.cursorOverlay.style.left = `${this.cursorPosition.x}px`;
    this.cursorOverlay.style.top = `${this.cursorPosition.y}px`;
    document.body.appendChild(this.cursorOverlay);
  }

  async moveCursorTo(x: number, y: number, duration: number = 400): Promise<void> {
    if (!this.cursorOverlay) this.createVirtualCursor();
    
    return new Promise((resolve) => {
      const startX = this.cursorPosition.x;
      const startY = this.cursorPosition.y;
      const deltaX = x - startX;
      const deltaY = y - startY;
      const startTime = performance.now();
      
      // Generate bezier control points for natural curve
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const curveFactor = Math.min(distance * 0.3, 80); // More curve for longer distances
      const cpX = (startX + x) / 2 + (Math.random() - 0.5) * curveFactor;
      const cpY = (startY + y) / 2 + (Math.random() - 0.5) * curveFactor;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic for natural deceleration
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Quadratic bezier curve
        const t = easeProgress;
        const curveX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cpX + t * t * x;
        const curveY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cpY + t * t * y;
        
        // Add micro-jitter for human-like movement
        const jitterX = progress < 0.95 ? (Math.random() - 0.5) * 2 : 0;
        const jitterY = progress < 0.95 ? (Math.random() - 0.5) * 2 : 0;
        
        this.cursorPosition.x = curveX + jitterX;
        this.cursorPosition.y = curveY + jitterY;
        
        if (this.cursorOverlay) {
          this.cursorOverlay.style.left = `${this.cursorPosition.x}px`;
          this.cursorOverlay.style.top = `${this.cursorPosition.y}px`;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Snap to exact position at end
          this.cursorPosition.x = x;
          this.cursorPosition.y = y;
          if (this.cursorOverlay) {
            this.cursorOverlay.style.left = `${x}px`;
            this.cursorOverlay.style.top = `${y}px`;
          }
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  async moveCursorToElement(element: HTMLElement): Promise<void> {
    const rect = element.getBoundingClientRect();
    // Add slight randomness to target point within element
    const offsetX = (Math.random() - 0.5) * Math.min(rect.width * 0.3, 10);
    const offsetY = (Math.random() - 0.5) * Math.min(rect.height * 0.3, 10);
    const targetX = rect.left + rect.width / 2 + offsetX;
    const targetY = rect.top + rect.height / 2 + offsetY;
    await this.moveCursorTo(targetX, targetY);
  }

  showClickEffect(x: number, y: number): void {
    const effect = document.createElement('div');
    effect.className = 'vercept-click-effect';
    effect.style.left = `${x - 10}px`;
    effect.style.top = `${y - 10}px`;
    document.body.appendChild(effect);
    setTimeout(() => effect.remove(), 600);
  }

  // =================== ELEMENT HIGHLIGHTING ===================

  async highlightElement(element: HTMLElement, label?: string, duration: number = 2000): Promise<void> {
    const rect = element.getBoundingClientRect();
    
    const highlight = document.createElement('div');
    highlight.className = 'vercept-highlight-box';
    highlight.style.top = `${rect.top - 4}px`;
    highlight.style.left = `${rect.left - 4}px`;
    highlight.style.width = `${rect.width + 8}px`;
    highlight.style.height = `${rect.height + 8}px`;
    
    if (label) {
      highlight.innerHTML = `<div class="vercept-highlight-label">${label}</div>`;
    }
    
    document.body.appendChild(highlight);
    this.activeHighlights.push(highlight);

    if (duration > 0) {
      setTimeout(() => {
        highlight.remove();
        this.activeHighlights = this.activeHighlights.filter(h => h !== highlight);
      }, duration);
    }
  }

  showIndexBadges(): void {
    this.clearIndexBadges();
    this.indexPageElements();

    for (const [index, indexed] of this.indexedElements) {
      if (index > 50) break; // Limit visible badges

      const badge = document.createElement('div');
      badge.className = 'vercept-index-badge';
      badge.textContent = String(index);
      badge.style.left = `${indexed.rect.left - 10}px`;
      badge.style.top = `${indexed.rect.top - 10}px`;
      badge.setAttribute('data-vercept-badge', 'true');
      document.body.appendChild(badge);
    }
  }

  clearIndexBadges(): void {
    document.querySelectorAll('[data-vercept-badge]').forEach(el => el.remove());
  }

  clearAllHighlights(): void {
    this.activeHighlights.forEach(h => h.remove());
    this.activeHighlights = [];
    this.clearIndexBadges();
  }

  // =================== THINKING PANEL ===================

  showThinkingPanel(goal: string, steps: Array<{ description: string; status: 'pending' | 'active' | 'completed' | 'failed' }>): void {
    this.hideThinkingPanel();

    this.thinkingOverlay = document.createElement('div');
    this.thinkingOverlay.className = 'vercept-thinking-panel';
    this.thinkingOverlay.innerHTML = `
      <div class="vercept-thinking-header">
        <div class="vercept-thinking-icon">🤖</div>
        <div>
          <div class="vercept-thinking-title">ABLE Agent</div>
          <div class="vercept-thinking-subtitle">${goal}</div>
        </div>
        <div class="vercept-thinking-dots">
          <div class="vercept-thinking-dot"></div>
          <div class="vercept-thinking-dot"></div>
          <div class="vercept-thinking-dot"></div>
        </div>
      </div>
      <div class="vercept-step-list">
        ${steps.map((step, i) => `
          <div class="vercept-step ${step.status}">
            <div class="vercept-step-icon ${step.status}">
              ${step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : step.status === 'active' ? '▶' : (i + 1)}
            </div>
            <div class="vercept-step-text">${step.description}</div>
          </div>
        `).join('')}
      </div>
    `;
    
    document.body.appendChild(this.thinkingOverlay);
  }

  updateThinkingStep(index: number, status: 'pending' | 'active' | 'completed' | 'failed'): void {
    if (!this.thinkingOverlay) return;

    const steps = this.thinkingOverlay.querySelectorAll('.vercept-step');
    const icons = this.thinkingOverlay.querySelectorAll('.vercept-step-icon');
    
    if (steps[index] && icons[index]) {
      steps[index].className = `vercept-step ${status}`;
      icons[index].className = `vercept-step-icon ${status}`;
      icons[index].textContent = status === 'completed' ? '✓' : status === 'failed' ? '✗' : status === 'active' ? '▶' : `${index + 1}`;
    }
  }

  hideThinkingPanel(): void {
    if (this.thinkingOverlay) {
      this.thinkingOverlay.remove();
      this.thinkingOverlay = null;
    }
  }

  // =================== SCAN ANIMATION ===================

  showScanAnimation(duration: number = 2000): Promise<void> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'vercept-scan-overlay';
      overlay.innerHTML = '<div class="vercept-scan-line"></div>';
      document.body.appendChild(overlay);

      setTimeout(() => {
        overlay.remove();
        resolve();
      }, duration);
    });
  }

  // =================== SMART CLICK (with auto-find) ===================

  async click(target: string): Promise<boolean> {
    try {
      const element = await this.findElement(target);
      if (!element) {
        this.log(`❌ Element not found: ${target}`);
        return false;
      }

      // Scroll into view if needed
      if (!this.isInViewport(element)) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.wait(300);
      }

      // Visual feedback
      await this.highlightElement(element, 'Clicking...', 0);
      await this.moveCursorToElement(element);
      await this.wait(200);
      
      const rect = element.getBoundingClientRect();
      this.showClickEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
      
      // Dispatch realistic events
      this.dispatchRealClick(element, rect);
      
      this.clearAllHighlights();
      this.log(`✅ Clicked: ${target}`);
      return true;
    } catch (error) {
      this.log(`❌ Click failed: ${error}`);
      return false;
    }
  }

  private dispatchRealClick(element: HTMLElement, rect: DOMRect): void {
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const common = {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y + window.screenY,
    };

    // Full event sequence like real browser
    element.dispatchEvent(new PointerEvent('pointerover', { ...common, pointerType: 'mouse' }));
    element.dispatchEvent(new MouseEvent('mouseover', common));
    element.dispatchEvent(new PointerEvent('pointerenter', { ...common, pointerType: 'mouse' }));
    element.dispatchEvent(new MouseEvent('mouseenter', common));
    element.dispatchEvent(new PointerEvent('pointerdown', { ...common, pointerType: 'mouse', button: 0 }));
    element.dispatchEvent(new MouseEvent('mousedown', { ...common, button: 0 }));
    element.focus();
    element.dispatchEvent(new PointerEvent('pointerup', { ...common, pointerType: 'mouse', button: 0 }));
    element.dispatchEvent(new MouseEvent('mouseup', { ...common, button: 0 }));
    element.dispatchEvent(new MouseEvent('click', { ...common, button: 0 }));
    
    // Also try native click as fallback
    element.click();
  }

  private isInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  // =================== SMART TYPE ===================

  async type(target: string, text: string): Promise<boolean> {
    try {
      const element = await this.findElement(target) as HTMLInputElement | HTMLTextAreaElement;
      if (!element) {
        this.log(`❌ Input not found: ${target}`);
        return false;
      }

      // Scroll into view if needed
      if (!this.isInViewport(element)) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.wait(300);
      }

      await this.highlightElement(element, 'Typing...', 0);
      await this.moveCursorToElement(element);
      await this.wait(200);

      // Focus and clear
      element.focus();
      element.click();
      
      // Use native value setter for React compatibility
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;
      const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;

      const setter = element.tagName === 'TEXTAREA' ? nativeTextAreaValueSetter : nativeInputValueSetter;
      
      // Clear first
      if (setter) {
        setter.call(element, '');
      } else {
        element.value = '';
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));

      // Type character by character
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        // Dispatch keyboard events
        element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
        
        // Update value
        if (setter) {
          setter.call(element, text.substring(0, i + 1));
        } else {
          element.value = text.substring(0, i + 1);
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
        
        // Random delay for realistic typing
        await this.wait(30 + Math.random() * 40);
      }

      element.dispatchEvent(new Event('change', { bubbles: true }));
      this.clearAllHighlights();
      this.log(`✅ Typed "${text}" into ${target}`);
      return true;
    } catch (error) {
      this.log(`❌ Type failed: ${error}`);
      return false;
    }
  }

  // =================== SMART SCROLL ===================

  async scroll(direction: 'up' | 'down', amount: number = 400, targetSelector?: string): Promise<boolean> {
    try {
      let scrollContainer: Element | Window = window;

      if (targetSelector) {
        const target = await this.findElement(targetSelector);
        if (target) {
          scrollContainer = this.getScrollableAncestor(target) || window;
        }
      }

      const scrollAmount = direction === 'down' ? amount : -amount;
      
      if (scrollContainer === window) {
        const start = window.scrollY;
        const target = start + scrollAmount;
        const duration = 500;
        const startTime = performance.now();

        return new Promise((resolve) => {
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            window.scrollTo(0, start + (scrollAmount * easeProgress));
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              this.log(`✅ Scrolled ${direction} by ${amount}px`);
              resolve(true);
            }
          };
          requestAnimationFrame(animate);
        });
      } else {
        const el = scrollContainer as Element;
        el.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        await this.wait(500);
        this.log(`✅ Scrolled ${direction} in container`);
        return true;
      }
    } catch (error) {
      this.log(`❌ Scroll failed: ${error}`);
      return false;
    }
  }

  private getScrollableAncestor(element: HTMLElement): Element | null {
    let current: HTMLElement | null = element.parentElement;
    
    while (current) {
      const style = window.getComputedStyle(current);
      const overflow = style.overflow + style.overflowY + style.overflowX;
      
      if (/(auto|scroll)/.test(overflow)) {
        if (current.scrollHeight > current.clientHeight) {
          return current;
        }
      }
      current = current.parentElement;
    }
    
    return null;
  }

  async scrollTo(target: string): Promise<boolean> {
    try {
      const element = await this.findElement(target);
      if (!element) {
        this.log(`❌ Element not found for scroll: ${target}`);
        return false;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.wait(500);
      await this.highlightElement(element, 'Found!');
      this.log(`✅ Scrolled to: ${target}`);
      return true;
    } catch (error) {
      this.log(`❌ ScrollTo failed: ${error}`);
      return false;
    }
  }

  // =================== OTHER ACTIONS ===================

  async hover(target: string): Promise<boolean> {
    try {
      const element = await this.findElement(target);
      if (!element) {
        this.log(`❌ Element not found for hover: ${target}`);
        return false;
      }

      await this.highlightElement(element, 'Hovering...', 0);
      await this.moveCursorToElement(element);
      
      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      
      this.log(`✅ Hovering: ${target}`);
      return true;
    } catch (error) {
      this.log(`❌ Hover failed: ${error}`);
      return false;
    }
  }

  async waitFor(selector: string, timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = await this.findElement(selector);
      if (element) {
        await this.highlightElement(element, 'Found!');
        this.log(`✅ Found element: ${selector}`);
        return true;
      }
      await this.wait(100);
    }
    
    this.log(`❌ Timeout waiting for: ${selector}`);
    return false;
  }

  async wait(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async doubleClick(target: string): Promise<boolean> {
    try {
      const element = await this.findElement(target);
      if (!element) return false;

      await this.highlightElement(element, 'Double-clicking...', 0);
      await this.moveCursorToElement(element);
      
      const rect = element.getBoundingClientRect();
      this.showClickEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
      await this.wait(150);
      this.showClickEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
      
      element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      element.click();
      element.click();
      
      this.clearAllHighlights();
      this.log(`✅ Double-clicked: ${target}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async pressKey(key: string, modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}): Promise<boolean> {
    try {
      const activeElement = document.activeElement || document.body;
      
      const keyEvent = new KeyboardEvent('keydown', {
        key,
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        ctrlKey: modifiers.ctrl,
        shiftKey: modifiers.shift,
        altKey: modifiers.alt,
        metaKey: modifiers.meta,
        bubbles: true,
        cancelable: true
      });
      
      activeElement.dispatchEvent(keyEvent);
      
      const keyupEvent = new KeyboardEvent('keyup', {
        key,
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        ctrlKey: modifiers.ctrl,
        shiftKey: modifiers.shift,
        altKey: modifiers.alt,
        metaKey: modifiers.meta,
        bubbles: true
      });
      
      activeElement.dispatchEvent(keyupEvent);
      
      this.log(`✅ Pressed key: ${modifiers.ctrl ? 'Ctrl+' : ''}${modifiers.shift ? 'Shift+' : ''}${modifiers.alt ? 'Alt+' : ''}${key}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  // =================== VERCEPT WINDOW CONTROL ===================

  /**
   * Drag a floating window to a new position with natural mouse movement
   */
  async dragWindowTo(windowIdOrTitle: string, targetX: number, targetY: number): Promise<boolean> {
    try {
      // Find the window by ID or title
      const windowEl = document.querySelector(
        `[data-window-id*="${windowIdOrTitle}" i], [data-window-title*="${windowIdOrTitle}" i]`
      ) as HTMLElement;
      
      if (!windowEl) {
        this.log(`❌ Window not found: ${windowIdOrTitle}`);
        return false;
      }

      // Find the drag handle
      const dragHandle = windowEl.querySelector('.drag-handle') as HTMLElement || windowEl;
      const handleRect = dragHandle.getBoundingClientRect();
      
      // Move cursor to drag handle
      await this.moveCursorToElement(dragHandle);
      await this.wait(100);
      
      // Simulate drag start
      const startX = handleRect.left + handleRect.width / 2;
      const startY = handleRect.top + handleRect.height / 2;
      
      this.dispatchMouseEvent(dragHandle, 'mousedown', startX, startY);
      await this.wait(50);
      
      // Animate drag movement with bezier curve
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const easeProgress = 1 - Math.pow(1 - progress, 2);
        
        const currentX = startX + (targetX - startX + handleRect.width / 2) * easeProgress;
        const currentY = startY + (targetY - startY + handleRect.height / 2) * easeProgress;
        
        // Add small jitter
        const jitterX = (Math.random() - 0.5) * 2;
        const jitterY = (Math.random() - 0.5) * 2;
        
        await this.moveCursorTo(currentX + jitterX, currentY + jitterY, 15);
        this.dispatchMouseEvent(document, 'mousemove', currentX + jitterX, currentY + jitterY);
        await this.wait(20);
      }
      
      // Final position
      this.dispatchMouseEvent(document, 'mouseup', targetX + handleRect.width / 2, targetY + handleRect.height / 2);
      
      this.log(`✅ Dragged window "${windowIdOrTitle}" to (${targetX}, ${targetY})`);
      return true;
    } catch (error) {
      this.log(`❌ Drag failed: ${error}`);
      return false;
    }
  }

  /**
   * Resize a floating window with natural mouse movement
   */
  async resizeWindow(windowIdOrTitle: string, width: number, height: number): Promise<boolean> {
    try {
      const windowEl = document.querySelector(
        `[data-window-id*="${windowIdOrTitle}" i], [data-window-title*="${windowIdOrTitle}" i]`
      ) as HTMLElement;
      
      if (!windowEl) {
        this.log(`❌ Window not found: ${windowIdOrTitle}`);
        return false;
      }

      // Find resize handle (bottom-right corner)
      const resizeHandle = windowEl.querySelector('[class*="cursor-se-resize"]') as HTMLElement;
      if (!resizeHandle) {
        this.log(`❌ Resize handle not found`);
        return false;
      }

      const handleRect = resizeHandle.getBoundingClientRect();
      const windowRect = windowEl.getBoundingClientRect();
      
      // Move to resize handle
      await this.moveCursorToElement(resizeHandle);
      await this.wait(100);
      
      const startX = handleRect.left + handleRect.width / 2;
      const startY = handleRect.top + handleRect.height / 2;
      
      // Calculate target position based on desired size
      const deltaX = width - windowRect.width;
      const deltaY = height - windowRect.height;
      const targetX = startX + deltaX;
      const targetY = startY + deltaY;
      
      // Start resize
      this.dispatchMouseEvent(resizeHandle, 'mousedown', startX, startY);
      await this.wait(50);
      
      // Animate resize
      const steps = 15;
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const easeProgress = 1 - Math.pow(1 - progress, 2);
        
        const currentX = startX + deltaX * easeProgress;
        const currentY = startY + deltaY * easeProgress;
        
        await this.moveCursorTo(currentX, currentY, 15);
        this.dispatchMouseEvent(document, 'mousemove', currentX, currentY);
        await this.wait(20);
      }
      
      this.dispatchMouseEvent(document, 'mouseup', targetX, targetY);
      
      this.log(`✅ Resized window "${windowIdOrTitle}" to ${width}x${height}`);
      return true;
    } catch (error) {
      this.log(`❌ Resize failed: ${error}`);
      return false;
    }
  }

  /**
   * Focus and center a window
   */
  async focusWindow(windowIdOrTitle: string): Promise<boolean> {
    try {
      const windowEl = document.querySelector(
        `[data-window-id*="${windowIdOrTitle}" i], [data-window-title*="${windowIdOrTitle}" i]`
      ) as HTMLElement;
      
      if (!windowEl) {
        this.log(`❌ Window not found: ${windowIdOrTitle}`);
        return false;
      }

      // Bring to front
      windowEl.style.zIndex = '100';
      
      // Click to focus
      const dragHandle = windowEl.querySelector('.drag-handle') as HTMLElement || windowEl;
      await this.moveCursorToElement(dragHandle);
      await this.wait(100);
      dragHandle.click();
      
      // Highlight the window
      await this.highlightElement(windowEl, 'Focused!', 1500);
      
      this.log(`✅ Focused window: ${windowIdOrTitle}`);
      return true;
    } catch (error) {
      this.log(`❌ Focus failed: ${error}`);
      return false;
    }
  }

  /**
   * Scroll using wheel events (more natural than scrollTo)
   */
  async wheelScroll(target: string, deltaY: number): Promise<boolean> {
    try {
      const element = await this.findElement(target);
      const scrollTarget = element || document.body;
      
      // Move cursor to the target area
      if (element) {
        await this.moveCursorToElement(element);
      }
      await this.wait(100);
      
      // Dispatch wheel event in steps for smooth scrolling
      const steps = Math.abs(Math.floor(deltaY / 50)) || 1;
      const stepDelta = deltaY / steps;
      
      for (let i = 0; i < steps; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: stepDelta,
          deltaMode: 0, // Pixels
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        scrollTarget.dispatchEvent(wheelEvent);
        await this.wait(30 + Math.random() * 20); // Variable timing for realism
      }
      
      this.log(`✅ Wheel scrolled ${deltaY > 0 ? 'down' : 'up'} by ${Math.abs(deltaY)}px`);
      return true;
    } catch (error) {
      this.log(`❌ Wheel scroll failed: ${error}`);
      return false;
    }
  }

  /**
   * Helper: dispatch mouse event at specific coordinates
   */
  private dispatchMouseEvent(target: Element | Document, type: string, clientX: number, clientY: number): void {
    const event = new MouseEvent(type, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      screenX: clientX,
      screenY: clientY + (window.screenY || 0),
      button: 0
    });
    target.dispatchEvent(event);
  }

  // =================== PAGE ANALYSIS ===================

  getPageContent(): string {
    const body = document.body;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const texts: string[] = [];
    
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text && text.length > 1) {
        texts.push(text);
      }
    }
    
    return texts.slice(0, 200).join(' ').substring(0, 5000);
  }

  getElementText(selector: string): string | null {
    const element = document.querySelector(selector);
    return element?.textContent?.trim() || null;
  }

  getButtons(): Array<{ text: string; selector: string; agentId?: string; rect?: DOMRect }> {
    const buttons: Array<{ text: string; selector: string; agentId?: string; rect?: DOMRect }> = [];
    
    document.querySelectorAll('button, [role="button"], .btn, [data-agent-id]').forEach((el) => {
      const text = (el as HTMLElement).textContent?.trim() || '';
      const agentId = el.getAttribute('data-agent-id');
      const rect = el.getBoundingClientRect();
      
      if ((text || agentId) && rect.width > 0 && rect.height > 0) {
        buttons.push({
          text: text.substring(0, 50),
          selector: agentId ? `[data-agent-id="${agentId}"]` : this.generateUniqueSelector(el as HTMLElement),
          agentId: agentId || undefined,
          rect
        });
      }
    });
    
    return buttons.slice(0, 50);
  }

  getLinks(): Array<{ text: string; href: string; selector: string }> {
    const links: Array<{ text: string; href: string; selector: string }> = [];
    
    document.querySelectorAll('a[href]').forEach((el) => {
      const text = (el as HTMLElement).textContent?.trim() || '';
      const href = el.getAttribute('href') || '';
      
      if (text) {
        links.push({
          text: text.substring(0, 50),
          href,
          selector: this.generateUniqueSelector(el as HTMLElement)
        });
      }
    });
    
    return links.slice(0, 30);
  }

  getFormFields(): Array<{ type: string; placeholder?: string; selector: string; value?: string; label?: string }> {
    const inputs: Array<{ type: string; placeholder?: string; selector: string; value?: string; label?: string }> = [];
    
    document.querySelectorAll('input, textarea, select').forEach((el) => {
      const type = el.getAttribute('type') || el.tagName.toLowerCase();
      const placeholder = el.getAttribute('placeholder') || undefined;
      const value = (el as HTMLInputElement).value || undefined;
      
      const id = el.id;
      const label = id ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim() : undefined;
      
      inputs.push({
        type,
        placeholder,
        selector: this.generateUniqueSelector(el as HTMLElement),
        value,
        label
      });
    });
    
    return inputs.slice(0, 30);
  }

  getInteractiveElements(): Array<{ type: string; text: string; selector: string; rect: DOMRect; index: number }> {
    this.indexPageElements();
    
    const elements: Array<{ type: string; text: string; selector: string; rect: DOMRect; index: number }> = [];
    
    for (const [index, indexed] of this.indexedElements) {
      if (index > 100) break;
      elements.push({
        type: indexed.type,
        text: indexed.text,
        selector: indexed.selector,
        rect: indexed.rect,
        index
      });
    }
    
    return elements;
  }

  getPageContext(): PageContext {
    return {
      url: window.location.href,
      title: document.title,
      visibleText: this.getPageContent(),
      buttons: this.getButtons(),
      links: this.getLinks(),
      inputs: this.getFormFields(),
      panels: this.getCurrentPanels(),
      interactiveElements: this.getInteractiveElements(),
      viewportSize: { width: window.innerWidth, height: window.innerHeight },
      scrollPosition: { x: window.scrollX, y: window.scrollY }
    };
  }

  getCurrentPanels(): string[] {
    const panels: string[] = [];
    
    document.querySelectorAll('[data-panel-id], .floating-window, .panel-container, [data-testid]').forEach(el => {
      const panelId = el.getAttribute('data-panel-id') || el.getAttribute('data-testid') || '';
      if (panelId && !panels.includes(panelId)) {
        panels.push(panelId);
      }
    });
    
    document.querySelectorAll('.tab-title, [role="tab"], .react-grid-item').forEach(el => {
      const title = el.textContent?.trim();
      if (title && title.length < 30 && !panels.includes(title)) {
        panels.push(title);
      }
    });
    
    return [...new Set(panels)];
  }

  async analyzeScreen(): Promise<ScreenAnalysis> {
    this.log('🔍 Analyzing screen...');
    await this.showScanAnimation(1500);
    
    // Index all elements
    this.indexPageElements();
    this.showIndexBadges();
    
    const elements: ScreenAnalysis['elements'] = [];
    
    for (const [index, indexed] of this.indexedElements) {
      elements.push({
        type: indexed.type === 'button' || indexed.type === 'link' ? 'button' : 
              indexed.type.includes('input') || indexed.type === 'textarea' ? 'input' : 'text',
        text: indexed.text,
        selector: indexed.selector,
        boundingBox: { x: indexed.rect.x, y: indexed.rect.y, width: indexed.rect.width, height: indexed.rect.height },
        isVisible: true,
        isInteractive: true,
        index
      });
    }

    this.log(`✅ Found ${elements.length} interactive elements`);
    
    // Hide badges after a delay
    setTimeout(() => this.clearIndexBadges(), 5000);
    
    return {
      elements,
      dominantColors: ['#000', '#22c55e', '#a855f7'],
      layoutType: 'dashboard'
    };
  }

  async screenshot(): Promise<string | null> {
    this.log('📸 Capturing page state...');
    const context = this.getPageContext();
    return JSON.stringify(context, null, 2);
  }

  // =================== CLEANUP ===================

  removeHighlight(): void {
    this.clearAllHighlights();
  }

  removeCursor(): void {
    if (this.cursorOverlay) {
      this.cursorOverlay.remove();
      this.cursorOverlay = null;
    }
    this.cursorPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  cleanup(): void {
    this.clearAllHighlights();
    this.removeCursor();
    this.hideThinkingPanel();
    this.clearIndexBadges();
  }
}

export const AgentService = new AgentServiceClass();
