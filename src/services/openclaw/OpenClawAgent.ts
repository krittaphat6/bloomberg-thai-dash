// OpenClawAgent.ts - OpenClaw-style Browser Automation
// AI-first Snapshot System with numeric element references
// Compatible with natural language commands via ABLE AI

import { supabase } from '@/integrations/supabase/client';

// =================== TYPES ===================

export interface SnapshotElement {
  index: number;
  tag: string;
  role?: string;
  text: string;
  value?: string;
  placeholder?: string;
  href?: string;
  disabled?: boolean;
  checked?: boolean;
  rect: { x: number; y: number; w: number; h: number };
  interactable: boolean;
}

export interface AISnapshot {
  url: string;
  title: string;
  timestamp: number;
  viewportSize: { width: number; height: number };
  scrollPosition: { x: number; y: number };
  elements: SnapshotElement[];
  focusedElement?: number;
  textContent: string; // AI-readable page summary
}

export interface RoleSnapshot {
  url: string;
  title: string;
  tree: AccessibilityNode[];
}

export interface AccessibilityNode {
  role: string;
  name?: string;
  value?: string;
  index?: number;
  children?: AccessibilityNode[];
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  screenshot?: string;
  nextSnapshot?: AISnapshot;
}

export type OpenClawCommand = 
  | { type: 'click'; target: number | string }
  | { type: 'type'; target: number | string; text: string }
  | { type: 'scroll'; direction: 'up' | 'down' | 'left' | 'right'; amount?: number }
  | { type: 'scrollTo'; target: number | string }
  | { type: 'hover'; target: number | string }
  | { type: 'select'; target: number | string; value: string }
  | { type: 'press'; key: string }
  | { type: 'wait'; ms: number }
  | { type: 'snapshot' }
  | { type: 'navigate'; url: string }
  | { type: 'back' }
  | { type: 'forward' }
  | { type: 'refresh' };

// =================== OPENCLAW AGENT ===================

class OpenClawAgentClass {
  private elements: Map<number, HTMLElement> = new Map();
  private lastSnapshot: AISnapshot | null = null;
  private isRunning = false;
  private listeners: Set<(log: string) => void> = new Set();

  // =================== LOGGING ===================

  onLog(callback: (log: string) => void): () => void {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }

  private log(message: string) {
    const ts = new Date().toLocaleTimeString('th-TH');
    const formatted = `[${ts}] 🦞 ${message}`;
    console.log(formatted);
    this.listeners.forEach(cb => cb(formatted));
  }

  // =================== AI SNAPSHOT (Core Feature) ===================

  /**
   * Generate AI-optimized snapshot of the page
   * Returns structured data with indexed elements for AI to reference
   */
  snapshot(): AISnapshot {
    this.log('📸 Taking AI Snapshot...');
    this.elements.clear();
    
    const elements: SnapshotElement[] = [];
    let index = 0;

    // Query all interactive elements
    const selectors = [
      'a[href]', 'button', 'input', 'textarea', 'select',
      '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="tab"]',
      '[role="checkbox"]', '[role="radio"]', '[role="switch"]',
      '[role="textbox"]', '[role="combobox"]', '[role="listbox"]',
      '[onclick]', '[tabindex]:not([tabindex="-1"])',
      'label', 'summary', '[contenteditable="true"]'
    ].join(', ');

    const nodeList = document.querySelectorAll(selectors);
    
    for (const node of nodeList) {
      const el = node as HTMLElement;
      if (!this.isVisible(el)) continue;

      const rect = el.getBoundingClientRect();
      const text = this.getElementText(el);
      
      // Skip empty or tiny elements
      if (rect.width < 5 || rect.height < 5) continue;
      if (!text && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') continue;

      const snapshotEl: SnapshotElement = {
        index,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || this.getImplicitRole(el),
        text: text.substring(0, 100),
        rect: {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        },
        interactable: this.isInteractable(el)
      };

      // Add specific attributes
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.value) snapshotEl.value = el.value.substring(0, 50);
        if (el.placeholder) snapshotEl.placeholder = el.placeholder;
        if (el instanceof HTMLInputElement) {
          if (el.type === 'checkbox' || el.type === 'radio') {
            snapshotEl.checked = el.checked;
          }
        }
      }
      if (el instanceof HTMLAnchorElement) {
        snapshotEl.href = el.href;
      }
      if (el.hasAttribute('disabled')) {
        snapshotEl.disabled = true;
      }

      elements.push(snapshotEl);
      this.elements.set(index, el);
      index++;
    }

    // Build AI-readable text summary
    const textContent = this.buildTextContent(elements);

    this.lastSnapshot = {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      viewportSize: { width: window.innerWidth, height: window.innerHeight },
      scrollPosition: { x: window.scrollX, y: window.scrollY },
      elements,
      focusedElement: this.getFocusedIndex(),
      textContent
    };

    this.log(`✅ Snapshot: ${elements.length} elements indexed`);
    return this.lastSnapshot;
  }

  /**
   * Build AI-readable text representation of the page
   * Format: [index] role "text" (attributes)
   */
  private buildTextContent(elements: SnapshotElement[]): string {
    const lines: string[] = [
      `📄 Page: ${document.title}`,
      `🔗 URL: ${window.location.href}`,
      `📐 Viewport: ${window.innerWidth}x${window.innerHeight}`,
      '',
      '🎯 Interactive Elements:',
      ''
    ];

    for (const el of elements.slice(0, 100)) { // Limit for AI context
      let line = `[${el.index}] ${el.role || el.tag}`;
      
      if (el.text) {
        line += ` "${el.text.substring(0, 40)}${el.text.length > 40 ? '...' : ''}"`;
      }
      
      const attrs: string[] = [];
      if (el.placeholder) attrs.push(`placeholder="${el.placeholder}"`);
      if (el.value) attrs.push(`value="${el.value.substring(0, 20)}"`);
      if (el.disabled) attrs.push('disabled');
      if (el.checked !== undefined) attrs.push(el.checked ? 'checked' : 'unchecked');
      
      if (attrs.length > 0) {
        line += ` (${attrs.join(', ')})`;
      }

      lines.push(line);
    }

    if (elements.length > 100) {
      lines.push(`\n... and ${elements.length - 100} more elements`);
    }

    return lines.join('\n');
  }

  /**
   * Get Role-based Accessibility Snapshot
   */
  roleSnapshot(): RoleSnapshot {
    this.log('🎭 Taking Role Snapshot...');
    
    const buildTree = (el: Element): AccessibilityNode | null => {
      const htmlEl = el as HTMLElement;
      const role = htmlEl.getAttribute('role') || this.getImplicitRole(htmlEl);
      
      if (!role && !htmlEl.textContent?.trim()) return null;

      const node: AccessibilityNode = {
        role: role || 'generic',
        name: this.getAccessibleName(htmlEl),
      };

      // Add index if interactable
      for (const [idx, e] of this.elements) {
        if (e === htmlEl) {
          node.index = idx;
          break;
        }
      }

      // Build children
      const children: AccessibilityNode[] = [];
      for (const child of el.children) {
        const childNode = buildTree(child);
        if (childNode) children.push(childNode);
      }
      
      if (children.length > 0) {
        node.children = children;
      }

      return node;
    };

    const tree = buildTree(document.body);

    return {
      url: window.location.href,
      title: document.title,
      tree: tree ? [tree] : []
    };
  }

  // =================== COMMAND EXECUTION ===================

  /**
   * Execute OpenClaw-style command
   * Supports: click 5, type 3 "hello", scroll down, etc.
   */
  async execute(command: OpenClawCommand): Promise<CommandResult> {
    this.log(`⚡ Executing: ${JSON.stringify(command)}`);

    try {
      switch (command.type) {
        case 'click':
          return await this.doClick(command.target);
        
        case 'type':
          return await this.doType(command.target, command.text);
        
        case 'scroll':
          return await this.doScroll(command.direction, command.amount);
        
        case 'scrollTo':
          return await this.doScrollTo(command.target);
        
        case 'hover':
          return await this.doHover(command.target);
        
        case 'select':
          return await this.doSelect(command.target, command.value);
        
        case 'press':
          return await this.doPress(command.key);
        
        case 'wait':
          await this.wait(command.ms);
          return { success: true, message: `Waited ${command.ms}ms` };
        
        case 'snapshot':
          const snap = this.snapshot();
          return { success: true, message: 'Snapshot taken', data: snap };
        
        case 'navigate':
          window.location.href = command.url;
          return { success: true, message: `Navigating to ${command.url}` };
        
        case 'back':
          history.back();
          return { success: true, message: 'Navigated back' };
        
        case 'forward':
          history.forward();
          return { success: true, message: 'Navigated forward' };
        
        case 'refresh':
          location.reload();
          return { success: true, message: 'Refreshing page' };
        
        default:
          return { success: false, message: `Unknown command type` };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.log(`❌ Command failed: ${msg}`);
      return { success: false, message: msg };
    }
  }

  /**
   * Parse natural language or shorthand command
   * Examples: "click 5", "type 3 hello world", "scroll down"
   */
  parseCommand(text: string): OpenClawCommand | null {
    const parts = text.trim().toLowerCase().split(/\s+/);
    const action = parts[0];

    switch (action) {
      case 'click':
      case 'tap': {
        const target = parts[1];
        if (!target) return null;
        return { type: 'click', target: isNaN(Number(target)) ? target : Number(target) };
      }

      case 'type':
      case 'input':
      case 'fill': {
        const target = parts[1];
        const textStart = text.indexOf(parts[1]) + parts[1].length;
        const textToType = text.substring(textStart).trim().replace(/^["']|["']$/g, '');
        if (!target || !textToType) return null;
        return { 
          type: 'type', 
          target: isNaN(Number(target)) ? target : Number(target),
          text: textToType 
        };
      }

      case 'scroll': {
        const direction = parts[1] as 'up' | 'down' | 'left' | 'right';
        const amount = parts[2] ? parseInt(parts[2]) : undefined;
        return { type: 'scroll', direction, amount };
      }

      case 'scrollto':
      case 'goto': {
        const target = parts[1];
        if (!target) return null;
        return { type: 'scrollTo', target: isNaN(Number(target)) ? target : Number(target) };
      }

      case 'hover': {
        const target = parts[1];
        if (!target) return null;
        return { type: 'hover', target: isNaN(Number(target)) ? target : Number(target) };
      }

      case 'select':
      case 'choose': {
        const target = parts[1];
        const value = parts.slice(2).join(' ');
        if (!target || !value) return null;
        return { 
          type: 'select', 
          target: isNaN(Number(target)) ? target : Number(target),
          value 
        };
      }

      case 'press':
      case 'key': {
        const key = parts.slice(1).join(' ');
        if (!key) return null;
        return { type: 'press', key };
      }

      case 'wait': {
        const ms = parseInt(parts[1]) || 1000;
        return { type: 'wait', ms };
      }

      case 'snapshot':
      case 'analyze':
        return { type: 'snapshot' };

      case 'back':
        return { type: 'back' };

      case 'forward':
        return { type: 'forward' };

      case 'refresh':
      case 'reload':
        return { type: 'refresh' };

      case 'navigate':
      case 'open':
      case 'go': {
        const url = parts.slice(1).join(' ');
        if (!url) return null;
        return { type: 'navigate', url: url.startsWith('http') ? url : `https://${url}` };
      }

      default:
        return null;
    }
  }

  /**
   * Execute a text command (natural language or shorthand)
   */
  async run(textCommand: string): Promise<CommandResult> {
    this.log(`📝 Parsing: "${textCommand}"`);
    
    const command = this.parseCommand(textCommand);
    if (!command) {
      return { 
        success: false, 
        message: `Could not parse command: "${textCommand}". Use: click <n>, type <n> <text>, scroll <dir>, etc.` 
      };
    }

    return await this.execute(command);
  }

  /**
   * Execute multiple commands in sequence
   */
  async runBatch(commands: string[]): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    
    for (const cmd of commands) {
      const result = await this.run(cmd);
      results.push(result);
      
      if (!result.success) {
        this.log(`⚠️ Batch stopped at failed command: ${cmd}`);
        break;
      }
      
      await this.wait(100); // Small delay between commands
    }

    return results;
  }

  // =================== ACTION IMPLEMENTATIONS ===================

  private async doClick(target: number | string): Promise<CommandResult> {
    const el = this.resolveElement(target);
    if (!el) {
      return { success: false, message: `Element not found: ${target}` };
    }

    // Scroll into view
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.wait(200);

    // Visual feedback
    this.highlight(el);

    // Click
    el.focus();
    el.click();

    this.log(`✅ Clicked: ${this.describeElement(el)}`);
    
    // Return fresh snapshot
    await this.wait(300);
    return { 
      success: true, 
      message: `Clicked ${this.describeElement(el)}`,
      nextSnapshot: this.snapshot()
    };
  }

  private async doType(target: number | string, text: string): Promise<CommandResult> {
    const el = this.resolveElement(target);
    if (!el) {
      return { success: false, message: `Element not found: ${target}` };
    }

    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      return { success: false, message: `Element is not an input: ${target}` };
    }

    // Focus and clear
    el.focus();
    el.select();
    
    // Type character by character for realism
    el.value = '';
    for (const char of text) {
      el.value += char;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await this.wait(15 + Math.random() * 20);
    }
    
    el.dispatchEvent(new Event('change', { bubbles: true }));

    this.log(`✅ Typed "${text}" into ${this.describeElement(el)}`);
    return { 
      success: true, 
      message: `Typed "${text}"`,
      nextSnapshot: this.snapshot()
    };
  }

  private async doScroll(direction: 'up' | 'down' | 'left' | 'right', amount = 300): Promise<CommandResult> {
    const opts: ScrollToOptions = { behavior: 'smooth' };
    
    switch (direction) {
      case 'up': window.scrollBy({ top: -amount, ...opts }); break;
      case 'down': window.scrollBy({ top: amount, ...opts }); break;
      case 'left': window.scrollBy({ left: -amount, ...opts }); break;
      case 'right': window.scrollBy({ left: amount, ...opts }); break;
    }

    await this.wait(300);
    this.log(`✅ Scrolled ${direction} by ${amount}px`);
    return { success: true, message: `Scrolled ${direction}` };
  }

  private async doScrollTo(target: number | string): Promise<CommandResult> {
    const el = this.resolveElement(target);
    if (!el) {
      return { success: false, message: `Element not found: ${target}` };
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.wait(300);
    
    this.highlight(el);
    this.log(`✅ Scrolled to ${this.describeElement(el)}`);
    return { success: true, message: `Scrolled to element` };
  }

  private async doHover(target: number | string): Promise<CommandResult> {
    const el = this.resolveElement(target);
    if (!el) {
      return { success: false, message: `Element not found: ${target}` };
    }

    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    
    this.highlight(el);
    this.log(`✅ Hovering: ${this.describeElement(el)}`);
    return { success: true, message: `Hovering element` };
  }

  private async doSelect(target: number | string, value: string): Promise<CommandResult> {
    const el = this.resolveElement(target);
    if (!el || !(el instanceof HTMLSelectElement)) {
      return { success: false, message: `Select element not found: ${target}` };
    }

    // Find matching option
    for (const option of el.options) {
      if (option.value === value || option.text.toLowerCase().includes(value.toLowerCase())) {
        el.value = option.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        this.log(`✅ Selected "${option.text}"`);
        return { success: true, message: `Selected "${option.text}"` };
      }
    }

    return { success: false, message: `Option not found: ${value}` };
  }

  private async doPress(key: string): Promise<CommandResult> {
    const keyMap: Record<string, string> = {
      'enter': 'Enter',
      'tab': 'Tab',
      'escape': 'Escape',
      'esc': 'Escape',
      'space': ' ',
      'backspace': 'Backspace',
      'delete': 'Delete',
      'up': 'ArrowUp',
      'down': 'ArrowDown',
      'left': 'ArrowLeft',
      'right': 'ArrowRight',
    };

    const keyCode = keyMap[key.toLowerCase()] || key;
    
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { 
      key: keyCode, 
      bubbles: true 
    }));
    document.activeElement?.dispatchEvent(new KeyboardEvent('keyup', { 
      key: keyCode, 
      bubbles: true 
    }));

    this.log(`✅ Pressed key: ${keyCode}`);
    return { success: true, message: `Pressed ${keyCode}` };
  }

  // =================== HELPER METHODS ===================

  private resolveElement(target: number | string): HTMLElement | null {
    // If number, use index
    if (typeof target === 'number') {
      return this.elements.get(target) || null;
    }

    // If string starts with number, parse it
    if (/^\d+$/.test(target)) {
      return this.elements.get(parseInt(target)) || null;
    }

    // Try CSS selector
    try {
      return document.querySelector(target) as HTMLElement;
    } catch {
      return null;
    }
  }

  private isVisible(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      parseFloat(style.opacity) > 0 &&
      rect.top < window.innerHeight + 500 &&
      rect.bottom > -500
    );
  }

  private isInteractable(el: HTMLElement): boolean {
    return !el.hasAttribute('disabled') && 
           el.getAttribute('aria-hidden') !== 'true' &&
           window.getComputedStyle(el).pointerEvents !== 'none';
  }

  private getElementText(el: HTMLElement): string {
    return (
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      (el as HTMLInputElement).placeholder ||
      el.textContent?.trim() ||
      ''
    ).replace(/\s+/g, ' ').trim();
  }

  private getImplicitRole(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    const type = (el as HTMLInputElement).type;

    const roleMap: Record<string, string> = {
      button: 'button',
      a: 'link',
      input: type === 'checkbox' ? 'checkbox' : type === 'radio' ? 'radio' : 'textbox',
      textarea: 'textbox',
      select: 'combobox',
      img: 'img',
      nav: 'navigation',
      main: 'main',
      header: 'banner',
      footer: 'contentinfo',
      article: 'article',
      aside: 'complementary',
      form: 'form',
      table: 'table',
      ul: 'list',
      ol: 'list',
      li: 'listitem'
    };

    return roleMap[tag] || '';
  }

  private getAccessibleName(el: HTMLElement): string {
    return (
      el.getAttribute('aria-label') ||
      el.getAttribute('alt') ||
      el.getAttribute('title') ||
      (el as HTMLInputElement).placeholder ||
      el.textContent?.trim().substring(0, 50) ||
      ''
    );
  }

  private getFocusedIndex(): number | undefined {
    const focused = document.activeElement as HTMLElement;
    for (const [idx, el] of this.elements) {
      if (el === focused) return idx;
    }
    return undefined;
  }

  private describeElement(el: HTMLElement): string {
    const role = el.getAttribute('role') || this.getImplicitRole(el) || el.tagName.toLowerCase();
    const text = this.getElementText(el).substring(0, 30);
    return text ? `${role} "${text}"` : role;
  }

  private highlight(el: HTMLElement, duration = 1500) {
    const rect = el.getBoundingClientRect();
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      left: ${rect.left - 4}px;
      top: ${rect.top - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      border: 3px solid #a855f7;
      border-radius: 6px;
      background: rgba(168, 85, 247, 0.1);
      pointer-events: none;
      z-index: 999999;
      animation: openclaw-pulse 0.8s ease-in-out infinite;
    `;
    
    // Add animation style if not exists
    if (!document.getElementById('openclaw-styles')) {
      const style = document.createElement('style');
      style.id = 'openclaw-styles';
      style.textContent = `
        @keyframes openclaw-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(div);
    setTimeout(() => div.remove(), duration);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =================== PUBLIC API ===================

  /** Get current snapshot (cached) */
  getSnapshot(): AISnapshot | null {
    return this.lastSnapshot;
  }

  /** Get element count */
  getElementCount(): number {
    return this.elements.size;
  }

  /** Get element by index */
  getElement(index: number): HTMLElement | null {
    return this.elements.get(index) || null;
  }

  /** Show visual element badges */
  showBadges() {
    this.clearBadges();
    
    for (const [index, el] of this.elements) {
      if (index > 50) break; // Limit for performance
      
      const rect = el.getBoundingClientRect();
      const badge = document.createElement('div');
      badge.className = 'openclaw-badge';
      badge.textContent = String(index);
      badge.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top - 18}px;
        min-width: 18px;
        height: 18px;
        background: linear-gradient(135deg, #a855f7, #ec4899);
        color: white;
        font-size: 10px;
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 9px;
        padding: 0 4px;
        z-index: 999998;
        pointer-events: none;
        font-family: monospace;
      `;
      document.body.appendChild(badge);
    }
  }

  /** Clear visual badges */
  clearBadges() {
    document.querySelectorAll('.openclaw-badge').forEach(el => el.remove());
  }

  /** Generate AI prompt with current page state */
  getAIPrompt(): string {
    const snap = this.lastSnapshot || this.snapshot();
    return `คุณเป็น AI Agent ที่สามารถควบคุม browser ได้

${snap.textContent}

📌 คำสั่งที่ใช้ได้:
- click <n> = คลิกที่ element หมายเลข n
- type <n> <text> = พิมพ์ข้อความลงใน input หมายเลข n
- scroll up/down = เลื่อนหน้าจอ
- scrollto <n> = เลื่อนไปยัง element หมายเลข n
- hover <n> = ชี้เมาส์ไปที่ element
- press <key> = กดปุ่ม (enter, tab, escape, etc.)
- snapshot = ถ่ายภาพหน้าจอใหม่

เมื่อต้องการทำอะไร ให้ตอบด้วยคำสั่งเท่านั้น เช่น:
User: "กดปุ่ม Add"
คุณ: click 5

ตอนนี้คุณพร้อมรับคำสั่งแล้ว`;
  }
}

export const OpenClawAgent = new OpenClawAgentClass();
