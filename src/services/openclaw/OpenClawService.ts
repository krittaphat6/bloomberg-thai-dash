// OpenClawService.ts - Integration layer between OpenClaw Agent and ABLE AI
// Provides AI-powered browser automation via natural language

import { OpenClawAgent, AISnapshot, CommandResult } from './OpenClawAgent';
import { supabase } from '@/integrations/supabase/client';

export interface AgentSession {
  id: string;
  goal: string;
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'failed';
  commands: string[];
  results: CommandResult[];
  startTime: number;
  endTime?: number;
}

export interface AgentThought {
  step: number;
  thought: string;
  action?: string;
  result?: string;
}

class OpenClawServiceClass {
  private currentSession: AgentSession | null = null;
  private thoughts: AgentThought[] = [];
  private listeners: Set<(event: { type: string; data: any }) => void> = new Set();
  private maxIterations = 15;

  // =================== EVENT SYSTEM ===================

  on(callback: (event: { type: string; data: any }) => void): () => void {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }

  private emit(type: string, data: any) {
    this.listeners.forEach(cb => cb({ type, data }));
  }

  // =================== MAIN API ===================

  /**
   * Execute a goal using AI-powered automation
   * The AI will analyze the page, plan actions, and execute them
   */
  async executeGoal(goal: string): Promise<AgentSession> {
    console.log('🦞 OpenClaw: Starting goal execution:', goal);
    
    this.currentSession = {
      id: crypto.randomUUID(),
      goal,
      status: 'thinking',
      commands: [],
      results: [],
      startTime: Date.now()
    };
    this.thoughts = [];
    this.emit('session:start', this.currentSession);

    try {
      // Take initial snapshot
      const snapshot = OpenClawAgent.snapshot();
      this.emit('snapshot', snapshot);

      // Run agent loop
      let iteration = 0;
      let completed = false;

      while (iteration < this.maxIterations && !completed) {
        iteration++;
        this.currentSession.status = 'thinking';
        this.emit('status', 'thinking');

        // Get AI decision
        const thought = await this.think(goal, snapshot, iteration);
        this.thoughts.push(thought);
        this.emit('thought', thought);

        if (!thought.action) {
          // AI thinks goal is complete or impossible
          completed = true;
          break;
        }

        // Execute action
        this.currentSession.status = 'executing';
        this.emit('status', 'executing');

        const result = await OpenClawAgent.run(thought.action);
        this.currentSession.commands.push(thought.action);
        this.currentSession.results.push(result);
        
        thought.result = result.message;
        this.emit('action:complete', { action: thought.action, result });

        if (!result.success) {
          // Try to recover
          const recovery = await this.attemptRecovery(goal, thought.action, result.message);
          if (recovery) {
            const recoveryResult = await OpenClawAgent.run(recovery);
            this.currentSession.commands.push(recovery);
            this.currentSession.results.push(recoveryResult);
            this.emit('action:recovery', { action: recovery, result: recoveryResult });
          }
        }

        // Check if goal seems completed
        const newSnapshot = OpenClawAgent.snapshot();
        completed = await this.checkGoalCompleted(goal, newSnapshot);
        
        await this.wait(200);
      }

      this.currentSession.status = completed ? 'completed' : 'failed';
      this.currentSession.endTime = Date.now();
      this.emit('session:end', this.currentSession);

      return this.currentSession;

    } catch (error) {
      this.currentSession.status = 'failed';
      this.currentSession.endTime = Date.now();
      this.emit('session:error', { error, session: this.currentSession });
      return this.currentSession;
    }
  }

  /**
   * Execute a single command (no AI loop)
   */
  async runCommand(command: string): Promise<CommandResult> {
    return await OpenClawAgent.run(command);
  }

  /**
   * Get current page snapshot
   */
  getSnapshot(): AISnapshot | null {
    return OpenClawAgent.getSnapshot();
  }

  /**
   * Take fresh snapshot
   */
  takeSnapshot(): AISnapshot {
    return OpenClawAgent.snapshot();
  }

  /**
   * Show element badges on page
   */
  showBadges() {
    OpenClawAgent.showBadges();
  }

  /**
   * Clear badges
   */
  clearBadges() {
    OpenClawAgent.clearBadges();
  }

  // =================== AI INTEGRATION ===================

  /**
   * Ask AI to decide next action
   */
  private async think(goal: string, snapshot: AISnapshot, step: number): Promise<AgentThought> {
    const prompt = this.buildThinkingPrompt(goal, snapshot, step);
    
    try {
      // Use Gemini for thinking
      const { data, error } = await supabase.functions.invoke('gemini-file-analysis', {
        body: {
          userPrompt: prompt,
          systemPrompt: `คุณเป็น OpenClaw AI Agent ที่เชี่ยวชาญในการควบคุม browser
ตอบด้วย JSON format เท่านั้น: {"thought": "คิดอะไร", "action": "คำสั่ง หรือ null ถ้าเสร็จแล้ว"}

คำสั่งที่ใช้ได้:
- click <n> = คลิก element หมายเลข n
- type <n> <text> = พิมพ์ใน input หมายเลข n
- scroll up/down = เลื่อนหน้าจอ
- scrollto <n> = เลื่อนไปที่ element
- press enter/tab/escape = กดปุ่ม
- snapshot = ดูหน้าจอใหม่

ตอบสั้นๆ กระชับ เป็น JSON เท่านั้น`
        }
      });

      if (error) throw error;

      const response = data?.analysis || '{"thought": "Error", "action": null}';
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          step,
          thought: parsed.thought || 'Thinking...',
          action: parsed.action || undefined
        };
      }

      return { step, thought: response, action: undefined };

    } catch (error) {
      console.error('OpenClaw think error:', error);
      return { 
        step, 
        thought: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
        action: undefined 
      };
    }
  }

  /**
   * Build prompt for AI thinking
   */
  private buildThinkingPrompt(goal: string, snapshot: AISnapshot, step: number): string {
    const recentCommands = this.currentSession?.commands.slice(-3).join('\n') || 'ยังไม่มี';
    const recentResults = this.currentSession?.results.slice(-3).map(r => r.message).join('\n') || 'ยังไม่มี';

    return `🎯 เป้าหมาย: ${goal}

📄 หน้าปัจจุบัน: ${snapshot.title}
🔗 URL: ${snapshot.url}

🎯 Elements ที่พบ (${snapshot.elements.length}):
${snapshot.textContent.split('\n').slice(0, 50).join('\n')}

📜 คำสั่งล่าสุด:
${recentCommands}

📊 ผลลัพธ์ล่าสุด:
${recentResults}

🔢 Step: ${step}/${this.maxIterations}

❓ คำถาม: ต้องทำอะไรต่อเพื่อให้บรรลุเป้าหมาย?
- ถ้าเสร็จแล้ว ให้ action เป็น null
- ถ้ายังไม่เสร็จ ให้ระบุคำสั่งถัดไป`;
  }

  /**
   * Attempt to recover from failed action
   */
  private async attemptRecovery(goal: string, failedAction: string, errorMessage: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('gemini-file-analysis', {
        body: {
          userPrompt: `คำสั่ง "${failedAction}" ล้มเหลว เพราะ: ${errorMessage}

เป้าหมาย: ${goal}

ช่วยแนะนำคำสั่งอื่นที่อาจใช้แทนได้ ตอบแค่คำสั่งเดียว หรือ "null" ถ้าไม่มีทางแก้`,
          systemPrompt: 'คุณเป็น OpenClaw recovery assistant ตอบแค่คำสั่งเดียว หรือ null'
        }
      });

      if (error) return null;
      
      const response = data?.analysis?.trim();
      if (response && response !== 'null' && response.length < 100) {
        return response;
      }
      return null;

    } catch {
      return null;
    }
  }

  /**
   * Check if goal seems completed
   */
  private async checkGoalCompleted(goal: string, snapshot: AISnapshot): Promise<boolean> {
    // Simple heuristics - can be enhanced with AI
    const successIndicators = ['success', 'สำเร็จ', 'เรียบร้อย', 'completed', 'done', 'saved', 'บันทึก'];
    const pageText = snapshot.textContent.toLowerCase();
    
    for (const indicator of successIndicators) {
      if (pageText.includes(indicator) && goal.toLowerCase().includes(indicator.substring(0, 4))) {
        return true;
      }
    }

    return false;
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =================== GETTERS ===================

  getSession(): AgentSession | null {
    return this.currentSession;
  }

  getThoughts(): AgentThought[] {
    return this.thoughts;
  }

  isRunning(): boolean {
    return this.currentSession?.status === 'thinking' || this.currentSession?.status === 'executing';
  }
}

export const OpenClawService = new OpenClawServiceClass();
