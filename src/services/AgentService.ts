// AgentService.ts - Vercept-style DOM Interaction & Visual Automation
// Full browser automation with visual feedback like Vercept.com

export interface AgentAction {
  type: 'click' | 'type' | 'scroll' | 'scrollTo' | 'wait' | 'hover' | 'openPanel' | 'closePanel' | 'screenshot' | 'analyze' | 'sendMessage' | 'navigate' | 'select' | 'doubleClick' | 'rightClick' | 'dragTo' | 'pressKey';
  target?: string; // CSS selector, coordinates, or panel ID
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
  interactiveElements: Array<{ type: string; text: string; selector: string; rect: DOMRect }>;
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
  }>;
  dominantColors: string[];
  layoutType: 'dashboard' | 'form' | 'list' | 'chat' | 'unknown';
}

class AgentServiceClass {
  private highlightOverlay: HTMLDivElement | null = null;
  private cursorOverlay: HTMLDivElement | null = null;
  private thinkingOverlay: HTMLDivElement | null = null;
  private actionListeners: Set<(log: string) => void> = new Set();
  private cursorPosition: { x: number; y: number } = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  private isAnimating: boolean = false;
  private activeHighlights: HTMLDivElement[] = [];

  constructor() {
    this.injectAgentStyles();
  }

  // Subscribe to action logs
  onAction(callback: (log: string) => void) {
    this.actionListeners.add(callback);
    return () => this.actionListeners.delete(callback);
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    const logMessage = `[${timestamp}] ${message}`;
    console.log('🤖 Agent:', logMessage);
    this.actionListeners.forEach(cb => cb(logMessage));
  }

  // Inject Vercept-style animation styles
  private injectAgentStyles() {
    if (document.getElementById('vercept-agent-styles')) return;

    const style = document.createElement('style');
    style.id = 'vercept-agent-styles';
    style.textContent = `
      @keyframes vercept-pulse {
        0% { 
          border-color: #a855f7; 
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.3), inset 0 0 0 rgba(168, 85, 247, 0.1);
          transform: scale(1);
        }
        50% { 
          border-color: #c084fc; 
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.6), inset 0 0 20px rgba(168, 85, 247, 0.15);
          transform: scale(1.02);
        }
        100% { 
          border-color: #a855f7; 
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.3), inset 0 0 0 rgba(168, 85, 247, 0.1);
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

      @keyframes vercept-typing-cursor {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }

      @keyframes vercept-fade-in {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes vercept-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
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
        background: radial-gradient(circle, #a855f7 0%, rgba(168, 85, 247, 0.3) 50%, transparent 70%);
        border: 2px solid #a855f7;
        border-radius: 50%;
        animation: vercept-cursor-glow 1.5s ease-in-out infinite;
      }

      .vercept-cursor-pointer {
        position: absolute;
        top: -2px;
        left: -2px;
        width: 0;
        height: 0;
        border-left: 8px solid #a855f7;
        border-right: 8px solid transparent;
        border-bottom: 14px solid transparent;
        filter: drop-shadow(0 0 4px rgba(168, 85, 247, 0.8));
      }

      .vercept-click-effect {
        position: absolute;
        width: 20px;
        height: 20px;
        background: rgba(168, 85, 247, 0.5);
        border-radius: 50%;
        animation: vercept-click-ripple 0.6s ease-out forwards;
        pointer-events: none;
      }

      .vercept-highlight-box {
        position: fixed;
        border: 3px solid #a855f7;
        border-radius: 8px;
        background: rgba(168, 85, 247, 0.08);
        pointer-events: none;
        z-index: 99998;
        animation: vercept-pulse 1.5s ease-in-out infinite;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .vercept-highlight-label {
        position: absolute;
        top: -28px;
        left: 0;
        background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%);
        color: white;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 4px;
        white-space: nowrap;
        box-shadow: 0 2px 10px rgba(168, 85, 247, 0.4);
        animation: vercept-fade-in 0.2s ease-out;
      }

      .vercept-thinking-panel {
        position: fixed;
        top: 16px;
        right: 16px;
        width: 320px;
        max-height: 400px;
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 10, 30, 0.95) 100%);
        border: 1px solid rgba(168, 85, 247, 0.3);
        border-radius: 16px;
        padding: 16px;
        z-index: 999997;
        backdrop-filter: blur(20px);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(168, 85, 247, 0.15);
        animation: vercept-slide-up 0.3s ease-out;
        overflow: hidden;
      }

      .vercept-thinking-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(168, 85, 247, 0.2);
      }

      .vercept-thinking-icon {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%);
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
        color: rgba(168, 85, 247, 0.8);
      }

      .vercept-thinking-dots {
        display: flex;
        gap: 4px;
        margin-left: auto;
      }

      .vercept-thinking-dot {
        width: 6px;
        height: 6px;
        background: #a855f7;
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
        background: rgba(168, 85, 247, 0.05);
        border-radius: 8px;
        animation: vercept-fade-in 0.3s ease-out;
        border: 1px solid transparent;
        transition: all 0.2s ease;
      }

      .vercept-step.active {
        background: rgba(168, 85, 247, 0.15);
        border-color: rgba(168, 85, 247, 0.3);
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
        background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%);
        color: white;
        animation: vercept-cursor-glow 1s ease-in-out infinite;
      }

      .vercept-step-icon.completed {
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        color: white;
      }

      .vercept-step-icon.failed {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
        background: linear-gradient(90deg, transparent 0%, #a855f7 50%, transparent 100%);
        animation: vercept-scan-line 2s ease-in-out infinite;
        box-shadow: 0 0 20px 5px rgba(168, 85, 247, 0.4);
      }

      .vercept-typing-cursor-indicator {
        display: inline-block;
        width: 2px;
        height: 14px;
        background: #a855f7;
        margin-left: 2px;
        animation: vercept-typing-cursor 0.8s step-end infinite;
      }

      .vercept-fullscreen-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        pointer-events: none;
        z-index: 99995;
        backdrop-filter: blur(1px);
      }
    `;
    document.head.appendChild(style);
  }

  // =================== VERCEPT-STYLE VISUAL CURSOR ===================

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

  async moveCursorTo(x: number, y: number, duration: number = 300): Promise<void> {
    if (!this.cursorOverlay) this.createVirtualCursor();
    
    return new Promise((resolve) => {
      // Calculate smooth path with easing
      const startX = this.cursorPosition.x;
      const startY = this.cursorPosition.y;
      const deltaX = x - startX;
      const deltaY = y - startY;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic for natural movement
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        this.cursorPosition.x = startX + (deltaX * easeProgress);
        this.cursorPosition.y = startY + (deltaY * easeProgress);
        
        if (this.cursorOverlay) {
          this.cursorOverlay.style.left = `${this.cursorPosition.x}px`;
          this.cursorOverlay.style.top = `${this.cursorPosition.y}px`;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  async moveCursorToElement(element: HTMLElement): Promise<void> {
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    await this.moveCursorTo(targetX, targetY);
  }

  showClickEffect(x: number, y: number): void {
    const effect = document.createElement('div');
    effect.className = 'vercept-click-effect';
    effect.style.left = `${x - 10}px`;
    effect.style.top = `${y - 10}px`;
    effect.style.position = 'fixed';
    effect.style.zIndex = '999999';
    document.body.appendChild(effect);
    
    setTimeout(() => effect.remove(), 600);
  }

  // =================== VERCEPT-STYLE ELEMENT HIGHLIGHTING ===================

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

  clearAllHighlights(): void {
    this.activeHighlights.forEach(h => h.remove());
    this.activeHighlights = [];
  }

  // =================== THINKING/PLANNING UI ===================

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

  // =================== SCREEN SCAN ANIMATION ===================

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

  // =================== DOM INTERACTION (VERCEPT-STYLE) ===================

  async click(selector: string): Promise<boolean> {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (!element) {
        this.log(`❌ Element not found: ${selector}`);
        return false;
      }

      // Visual feedback sequence (like Vercept)
      await this.highlightElement(element, 'Clicking...', 0);
      await this.moveCursorToElement(element);
      await this.wait(200);
      
      // Click effect
      const rect = element.getBoundingClientRect();
      this.showClickEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
      
      // Actually click
      element.click();
      
      this.clearAllHighlights();
      this.log(`✅ Clicked: ${selector}`);
      return true;
    } catch (error) {
      this.log(`❌ Click failed: ${error}`);
      return false;
    }
  }

  async type(selector: string, text: string): Promise<boolean> {
    try {
      const element = document.querySelector(selector) as HTMLInputElement;
      if (!element) {
        this.log(`❌ Input not found: ${selector}`);
        return false;
      }

      await this.highlightElement(element, 'Typing...', 0);
      await this.moveCursorToElement(element);
      await this.wait(200);

      element.focus();
      element.value = '';
      
      // Type character by character with visual feedback
      for (let i = 0; i < text.length; i++) {
        element.value += text[i];
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Random delay for realistic typing
        await this.wait(30 + Math.random() * 50);
      }

      element.dispatchEvent(new Event('change', { bubbles: true }));
      this.clearAllHighlights();
      this.log(`✅ Typed "${text}" into ${selector}`);
      return true;
    } catch (error) {
      this.log(`❌ Type failed: ${error}`);
      return false;
    }
  }

  async scroll(direction: 'up' | 'down', amount: number = 400): Promise<boolean> {
    try {
      const scrollAmount = direction === 'down' ? amount : -amount;
      
      // Smooth scroll with animation
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
    } catch (error) {
      this.log(`❌ Scroll failed: ${error}`);
      return false;
    }
  }

  async scrollTo(selector: string): Promise<boolean> {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (!element) {
        this.log(`❌ Element not found for scroll: ${selector}`);
        return false;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.wait(500);
      await this.highlightElement(element, 'Found!');
      this.log(`✅ Scrolled to: ${selector}`);
      return true;
    } catch (error) {
      this.log(`❌ ScrollTo failed: ${error}`);
      return false;
    }
  }

  async hover(selector: string): Promise<boolean> {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (!element) {
        this.log(`❌ Element not found for hover: ${selector}`);
        return false;
      }

      await this.highlightElement(element, 'Hovering...', 0);
      await this.moveCursorToElement(element);
      
      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      
      this.log(`✅ Hovering: ${selector}`);
      return true;
    } catch (error) {
      this.log(`❌ Hover failed: ${error}`);
      return false;
    }
  }

  async waitFor(selector: string, timeout: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        await this.highlightElement(element as HTMLElement, 'Found!');
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

  async doubleClick(selector: string): Promise<boolean> {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (!element) return false;

      await this.highlightElement(element, 'Double-clicking...', 0);
      await this.moveCursorToElement(element);
      
      const rect = element.getBoundingClientRect();
      this.showClickEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
      await this.wait(150);
      this.showClickEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
      
      element.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      this.clearAllHighlights();
      this.log(`✅ Double-clicked: ${selector}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async pressKey(key: string, modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): Promise<boolean> {
    try {
      const event = new KeyboardEvent('keydown', {
        key,
        code: key,
        ctrlKey: modifiers.ctrl,
        shiftKey: modifiers.shift,
        altKey: modifiers.alt,
        bubbles: true
      });
      document.dispatchEvent(event);
      this.log(`✅ Pressed key: ${modifiers.ctrl ? 'Ctrl+' : ''}${modifiers.shift ? 'Shift+' : ''}${modifiers.alt ? 'Alt+' : ''}${key}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  // =================== ADVANCED PAGE ANALYSIS ===================

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
    
    document.querySelectorAll('button, [role="button"], .btn, [data-agent-id]').forEach((el, index) => {
      const text = el.textContent?.trim() || '';
      const agentId = el.getAttribute('data-agent-id');
      const rect = el.getBoundingClientRect();
      
      // Only include visible elements
      if ((text || agentId) && rect.width > 0 && rect.height > 0) {
        buttons.push({
          text: text.substring(0, 50),
          selector: agentId ? `[data-agent-id="${agentId}"]` : `button:nth-of-type(${index + 1})`,
          agentId: agentId || undefined,
          rect
        });
      }
    });
    
    return buttons.slice(0, 50);
  }

  getLinks(): Array<{ text: string; href: string; selector: string }> {
    const links: Array<{ text: string; href: string; selector: string }> = [];
    
    document.querySelectorAll('a[href]').forEach((el, index) => {
      const text = el.textContent?.trim() || '';
      const href = el.getAttribute('href') || '';
      
      if (text) {
        links.push({
          text: text.substring(0, 50),
          href,
          selector: `a:nth-of-type(${index + 1})`
        });
      }
    });
    
    return links.slice(0, 30);
  }

  getFormFields(): Array<{ type: string; placeholder?: string; selector: string; value?: string; label?: string }> {
    const inputs: Array<{ type: string; placeholder?: string; selector: string; value?: string; label?: string }> = [];
    
    document.querySelectorAll('input, textarea, select').forEach((el, index) => {
      const type = el.getAttribute('type') || el.tagName.toLowerCase();
      const placeholder = el.getAttribute('placeholder') || undefined;
      const value = (el as HTMLInputElement).value || undefined;
      const agentId = el.getAttribute('data-agent-id');
      
      // Try to find associated label
      const id = el.id;
      const label = id ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim() : undefined;
      
      inputs.push({
        type,
        placeholder,
        selector: agentId ? `[data-agent-id="${agentId}"]` : `input:nth-of-type(${index + 1})`,
        value,
        label
      });
    });
    
    return inputs.slice(0, 30);
  }

  getInteractiveElements(): Array<{ type: string; text: string; selector: string; rect: DOMRect }> {
    const elements: Array<{ type: string; text: string; selector: string; rect: DOMRect }> = [];
    
    // Get all clickable elements
    const selectors = 'button, a, input, textarea, select, [role="button"], [onclick], [data-agent-id]';
    document.querySelectorAll(selectors).forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      
      // Only visible elements
      if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
        elements.push({
          type: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 30) || '',
          selector: el.getAttribute('data-agent-id') 
            ? `[data-agent-id="${el.getAttribute('data-agent-id')}"]` 
            : `${el.tagName.toLowerCase()}:nth-of-type(${index + 1})`,
          rect
        });
      }
    });
    
    return elements.slice(0, 100);
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
    
    // Look for open panels in ABLE Terminal
    document.querySelectorAll('[data-panel-id], .floating-window, .panel-container, [data-testid]').forEach(el => {
      const panelId = el.getAttribute('data-panel-id') || el.getAttribute('data-testid') || '';
      if (panelId && !panels.includes(panelId)) {
        panels.push(panelId);
      }
    });
    
    // Also check for tab titles
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
    
    const elements: ScreenAnalysis['elements'] = [];
    
    // Analyze all interactive elements
    const interactive = this.getInteractiveElements();
    interactive.forEach(el => {
      elements.push({
        type: el.type === 'button' || el.type === 'a' ? 'button' : 
              el.type === 'input' || el.type === 'textarea' ? 'input' : 'text',
        text: el.text,
        selector: el.selector,
        boundingBox: { x: el.rect.x, y: el.rect.y, width: el.rect.width, height: el.rect.height },
        isVisible: true,
        isInteractive: true
      });
    });

    this.log(`✅ Found ${elements.length} interactive elements`);
    
    return {
      elements,
      dominantColors: ['#000', '#22c55e', '#a855f7'],
      layoutType: 'dashboard'
    };
  }

  // =================== SCREENSHOT / STATE CAPTURE ===================

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
  }
}

export const AgentService = new AgentServiceClass();
