// CDPService.ts - Chrome DevTools Protocol-like Browser Control
// Web-based DOM manipulation with OpenClaw-style API

export interface BrowserProfile {
  id: string;
  name: string;
  cdpPort: number;
  headless: boolean;
  userDataDir?: string;
}

export interface BrowserSnapshot {
  url: string;
  title: string;
  html: string;
  screenshot?: string;
  elements: Array<{
    index: number;
    tag: string;
    text: string;
    selector: string;
    boundingBox: { x: number; y: number; width: number; height: number };
  }>;
  timestamp: number;
}

export interface CDPElement {
  index: number;
  element: HTMLElement;
  text: string;
  tag: string;
  selector: string;
  rect: DOMRect;
}

class CDPServiceClass {
  private activeProfile: BrowserProfile | null = null;
  private elementIndex: Map<number, CDPElement> = new Map();
  private lastSnapshot: BrowserSnapshot | null = null;

  /**
   * Initialize CDP connection (OpenClaw-style)
   * For web environment, we use DOM directly instead of external CDP
   */
  async connect(profile?: BrowserProfile): Promise<void> {
    this.activeProfile = profile || {
      id: 'default',
      name: 'Web Browser',
      cdpPort: 0,
      headless: false
    };
    console.log('🌐 CDP Service connected (Web mode)');
  }

  /**
   * Disconnect CDP
   */
  disconnect(): void {
    this.activeProfile = null;
    this.elementIndex.clear();
    console.log('🔌 CDP Service disconnected');
  }

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<void> {
    if (url.startsWith('/')) {
      // Relative path - use router
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      window.location.href = url;
    }
    await this.wait(500);
  }

  /**
   * Take snapshot (OpenClaw browser snapshot command)
   */
  async snapshot(): Promise<BrowserSnapshot> {
    // Index all interactive elements
    this.elementIndex.clear();
    const elements: BrowserSnapshot['elements'] = [];
    let index = 0;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const el = node as HTMLElement;
          if (this.isInteractive(el) && this.isVisible(el)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const el = node as HTMLElement;
      const rect = el.getBoundingClientRect();
      const text = this.getElementText(el);
      const selector = this.generateSelector(el);

      elements.push({
        index,
        tag: el.tagName.toLowerCase(),
        text,
        selector,
        boundingBox: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        }
      });

      this.elementIndex.set(index, {
        index,
        element: el,
        text,
        tag: el.tagName.toLowerCase(),
        selector,
        rect
      });

      index++;
    }

    this.lastSnapshot = {
      url: window.location.href,
      title: document.title,
      html: document.documentElement.outerHTML,
      elements,
      timestamp: Date.now()
    };

    console.log(`📸 Snapshot taken: ${elements.length} interactive elements`);
    return this.lastSnapshot;
  }

  /**
   * Click element by index (OpenClaw-style: click e12)
   */
  async click(elementRef: number | string): Promise<boolean> {
    let element: HTMLElement | null = null;

    if (typeof elementRef === 'number') {
      const cdpEl = this.elementIndex.get(elementRef);
      element = cdpEl?.element || null;
    } else {
      element = document.querySelector(elementRef);
    }

    if (!element) {
      console.error('❌ Element not found:', elementRef);
      return false;
    }

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.wait(300);

    // Click
    element.click();
    console.log(`🖱️ Clicked:`, this.getElementText(element).substring(0, 30));
    return true;
  }

  /**
   * Type into element
   */
  async type(elementRef: number | string, text: string): Promise<boolean> {
    let element: HTMLElement | null = null;

    if (typeof elementRef === 'number') {
      const cdpEl = this.elementIndex.get(elementRef);
      element = cdpEl?.element || null;
    } else {
      element = document.querySelector(elementRef);
    }

    if (!element) {
      console.error('❌ Element not found:', elementRef);
      return false;
    }

    const input = element as HTMLInputElement | HTMLTextAreaElement;
    input.focus();
    input.value = '';

    // Type character by character (more realistic)
    for (const char of text) {
      input.value += char;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await this.wait(20);
    }

    input.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`⌨️ Typed: ${text.substring(0, 20)}...`);
    return true;
  }

  /**
   * Scroll element or page
   */
  async scroll(direction: 'up' | 'down' | 'left' | 'right', amount = 300): Promise<void> {
    const scrollOptions: ScrollToOptions = {
      behavior: 'smooth'
    };

    switch (direction) {
      case 'up':
        window.scrollBy({ top: -amount, ...scrollOptions });
        break;
      case 'down':
        window.scrollBy({ top: amount, ...scrollOptions });
        break;
      case 'left':
        window.scrollBy({ left: -amount, ...scrollOptions });
        break;
      case 'right':
        window.scrollBy({ left: amount, ...scrollOptions });
        break;
    }
    await this.wait(300);
  }

  /**
   * Scroll to specific element
   */
  async scrollToElement(elementRef: number | string): Promise<boolean> {
    let element: HTMLElement | null = null;

    if (typeof elementRef === 'number') {
      const cdpEl = this.elementIndex.get(elementRef);
      element = cdpEl?.element || null;
    } else {
      element = document.querySelector(elementRef);
    }

    if (!element) return false;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.wait(300);
    return true;
  }

  /**
   * Hover over element
   */
  async hover(elementRef: number | string): Promise<boolean> {
    let element: HTMLElement | null = null;

    if (typeof elementRef === 'number') {
      const cdpEl = this.elementIndex.get(elementRef);
      element = cdpEl?.element || null;
    } else {
      element = document.querySelector(elementRef);
    }

    if (!element) return false;

    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    return true;
  }

  /**
   * Execute JavaScript in page context
   */
  async eval<T = any>(script: string): Promise<T | null> {
    try {
      return eval(script);
    } catch (error) {
      console.error('CDP eval error:', error);
      return null;
    }
  }

  /**
   * Get element by index
   */
  getElement(index: number): CDPElement | undefined {
    return this.elementIndex.get(index);
  }

  /**
   * Get all indexed elements
   */
  getElements(): CDPElement[] {
    return Array.from(this.elementIndex.values());
  }

  /**
   * Get last snapshot
   */
  getLastSnapshot(): BrowserSnapshot | null {
    return this.lastSnapshot;
  }

  /**
   * Find element by text content
   */
  findByText(text: string): CDPElement | undefined {
    const lowerText = text.toLowerCase();
    return Array.from(this.elementIndex.values()).find(el => 
      el.text.toLowerCase().includes(lowerText)
    );
  }

  /**
   * Find elements by tag
   */
  findByTag(tag: string): CDPElement[] {
    const lowerTag = tag.toLowerCase();
    return Array.from(this.elementIndex.values()).filter(el => 
      el.tag === lowerTag
    );
  }

  // =================== Private Helpers ===================

  private isInteractive(el: HTMLElement): boolean {
    const interactiveTags = ['button', 'a', 'input', 'textarea', 'select'];
    const tag = el.tagName.toLowerCase();
    return (
      interactiveTags.includes(tag) ||
      el.hasAttribute('onclick') ||
      el.hasAttribute('role') ||
      el.getAttribute('tabindex') !== null ||
      el.classList.contains('clickable') ||
      el.classList.contains('btn')
    );
  }

  private isVisible(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      parseFloat(style.opacity) > 0
    );
  }

  private getElementText(el: HTMLElement): string {
    return (
      el.textContent?.trim() ||
      el.getAttribute('placeholder') ||
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      (el as HTMLInputElement).value ||
      ''
    ).substring(0, 100);
  }

  private generateSelector(el: HTMLElement): string {
    if (el.id) return `#${el.id}`;
    
    const dataAgentId = el.getAttribute('data-agent-id');
    if (dataAgentId) return `[data-agent-id="${dataAgentId}"]`;

    const dataTestId = el.getAttribute('data-testid');
    if (dataTestId) return `[data-testid="${dataTestId}"]`;

    const path: string[] = [];
    let current: HTMLElement | null = el;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c && !c.includes(':'));
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.slice(-3).join(' > ');
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const CDPService = new CDPServiceClass();
