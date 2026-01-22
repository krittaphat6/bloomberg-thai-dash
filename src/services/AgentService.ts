// AgentService.ts - DOM Interaction & Page Analysis for AI Agent Mode

export interface AgentAction {
  type: 'click' | 'type' | 'scroll' | 'scrollTo' | 'wait' | 'hover' | 'openPanel' | 'closePanel' | 'screenshot' | 'analyze' | 'sendMessage';
  target?: string; // CSS selector or panel ID
  value?: string | number;
  description: string;
}

export interface AgentTask {
  id: string;
  goal: string;
  actions: AgentAction[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentActionIndex: number;
  logs: string[];
  error?: string;
}

export interface PageContext {
  url: string;
  title: string;
  visibleText: string;
  buttons: Array<{ text: string; selector: string; agentId?: string }>;
  links: Array<{ text: string; href: string; selector: string }>;
  inputs: Array<{ type: string; placeholder?: string; selector: string; value?: string }>;
  panels: string[];
}

class AgentServiceClass {
  private highlightOverlay: HTMLDivElement | null = null;
  private cursorOverlay: HTMLDivElement | null = null;
  private actionListeners: Set<(log: string) => void> = new Set();

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

  // =================== DOM INTERACTION ===================

  async click(selector: string): Promise<boolean> {
    try {
      const element = document.querySelector(selector) as HTMLElement;
      if (!element) {
        this.log(`❌ Element not found: ${selector}`);
        return false;
      }

      await this.highlightElement(element);
      await this.animateCursorTo(element);
      
      element.click();
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

      await this.highlightElement(element);
      element.focus();
      
      // Simulate typing character by character
      for (const char of text) {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        await this.wait(50);
      }

      element.dispatchEvent(new Event('change', { bubbles: true }));
      this.log(`✅ Typed "${text}" into ${selector}`);
      return true;
    } catch (error) {
      this.log(`❌ Type failed: ${error}`);
      return false;
    }
  }

  async scroll(direction: 'up' | 'down', amount: number = 300): Promise<boolean> {
    try {
      const scrollAmount = direction === 'down' ? amount : -amount;
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      this.log(`✅ Scrolled ${direction} by ${amount}px`);
      return true;
    } catch (error) {
      this.log(`❌ Scroll failed: ${error}`);
      return false;
    }
  }

  async scrollTo(selector: string): Promise<boolean> {
    try {
      const element = document.querySelector(selector);
      if (!element) {
        this.log(`❌ Element not found for scroll: ${selector}`);
        return false;
      }

      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.highlightElement(element as HTMLElement);
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

      await this.highlightElement(element);
      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
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

  getButtons(): Array<{ text: string; selector: string; agentId?: string }> {
    const buttons: Array<{ text: string; selector: string; agentId?: string }> = [];
    
    document.querySelectorAll('button, [role="button"], .btn').forEach((el, index) => {
      const text = el.textContent?.trim() || '';
      const agentId = el.getAttribute('data-agent-id');
      
      if (text || agentId) {
        buttons.push({
          text: text.substring(0, 50),
          selector: agentId ? `[data-agent-id="${agentId}"]` : `button:nth-of-type(${index + 1})`,
          agentId: agentId || undefined
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

  getFormFields(): Array<{ type: string; placeholder?: string; selector: string; value?: string }> {
    const inputs: Array<{ type: string; placeholder?: string; selector: string; value?: string }> = [];
    
    document.querySelectorAll('input, textarea, select').forEach((el, index) => {
      const type = el.getAttribute('type') || el.tagName.toLowerCase();
      const placeholder = el.getAttribute('placeholder') || undefined;
      const value = (el as HTMLInputElement).value || undefined;
      const agentId = el.getAttribute('data-agent-id');
      
      inputs.push({
        type,
        placeholder,
        selector: agentId ? `[data-agent-id="${agentId}"]` : `input:nth-of-type(${index + 1})`,
        value
      });
    });
    
    return inputs.slice(0, 30);
  }

  getPageContext(): PageContext {
    return {
      url: window.location.href,
      title: document.title,
      visibleText: this.getPageContent(),
      buttons: this.getButtons(),
      links: this.getLinks(),
      inputs: this.getFormFields(),
      panels: this.getCurrentPanels()
    };
  }

  getCurrentPanels(): string[] {
    // Look for open panels in ABLE Terminal
    const panels: string[] = [];
    
    document.querySelectorAll('[data-panel-id], .floating-window, .panel-container').forEach(el => {
      const panelId = el.getAttribute('data-panel-id') || el.getAttribute('data-testid') || '';
      if (panelId) {
        panels.push(panelId);
      }
    });
    
    // Also check for tab titles
    document.querySelectorAll('.tab-title, [role="tab"]').forEach(el => {
      const title = el.textContent?.trim();
      if (title) {
        panels.push(title);
      }
    });
    
    return [...new Set(panels)];
  }

  // =================== VISUAL FEEDBACK ===================

  async highlightElement(element: HTMLElement, duration: number = 1500): Promise<void> {
    this.removeHighlight();
    
    const rect = element.getBoundingClientRect();
    
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.id = 'agent-highlight';
    this.highlightOverlay.style.cssText = `
      position: fixed;
      top: ${rect.top - 4}px;
      left: ${rect.left - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      border: 3px solid #a855f7;
      border-radius: 8px;
      background: rgba(168, 85, 247, 0.1);
      pointer-events: none;
      z-index: 99999;
      animation: agent-pulse 0.5s ease-in-out infinite alternate;
      box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
    `;
    
    // Add animation styles if not exists
    if (!document.getElementById('agent-styles')) {
      const style = document.createElement('style');
      style.id = 'agent-styles';
      style.textContent = `
        @keyframes agent-pulse {
          from { border-color: #a855f7; box-shadow: 0 0 10px rgba(168, 85, 247, 0.3); }
          to { border-color: #c084fc; box-shadow: 0 0 25px rgba(168, 85, 247, 0.6); }
        }
        @keyframes agent-cursor-move {
          from { transform: scale(1); }
          to { transform: scale(1.2); }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(this.highlightOverlay);
    
    setTimeout(() => this.removeHighlight(), duration);
  }

  private async animateCursorTo(element: HTMLElement): Promise<void> {
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    
    if (!this.cursorOverlay) {
      this.cursorOverlay = document.createElement('div');
      this.cursorOverlay.id = 'agent-cursor';
      this.cursorOverlay.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, #a855f7 0%, transparent 70%);
        border: 2px solid #a855f7;
        border-radius: 50%;
        pointer-events: none;
        z-index: 99998;
        transition: all 0.3s ease-out;
      `;
      document.body.appendChild(this.cursorOverlay);
    }
    
    this.cursorOverlay.style.left = `${targetX - 10}px`;
    this.cursorOverlay.style.top = `${targetY - 10}px`;
    
    await this.wait(300);
  }

  removeHighlight(): void {
    if (this.highlightOverlay) {
      this.highlightOverlay.remove();
      this.highlightOverlay = null;
    }
  }

  removeCursor(): void {
    if (this.cursorOverlay) {
      this.cursorOverlay.remove();
      this.cursorOverlay = null;
    }
  }

  cleanup(): void {
    this.removeHighlight();
    this.removeCursor();
  }

  // =================== SCREENSHOT ===================

  async screenshot(): Promise<string | null> {
    // For browser security, we can't take actual screenshots
    // Instead, return a description of the current page
    this.log('📸 Capturing page state...');
    const context = this.getPageContext();
    return JSON.stringify(context, null, 2);
  }
}

export const AgentService = new AgentServiceClass();
