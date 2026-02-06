// SkillsManager.ts - SuperClaw Skills System
// Create, execute, and manage AI-powered automation skills

import { supabase } from '@/integrations/supabase/client';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'automation' | 'analysis' | 'data' | 'communication' | 'trading';
  enabled: boolean;
  code: string;
  permissions: string[];
  schedule?: string;
  lastRun?: number;
  successRate?: number;
  runCount?: number;
  createdBy?: 'user' | 'ai' | 'system';
  version?: number;
}

export interface SkillContext {
  AgentService: any;
  CDPService: any;
  VisionService: any;
  GatewayService: any;
  supabase: typeof supabase;
  params?: any;
}

export interface SkillExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

class SkillsManagerClass {
  private skills: Map<string, Skill> = new Map();
  private scheduledJobs: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private skillsLoaded = false;
  private userId: string | null = null;

  /**
   * Initialize with user ID
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.loadSkills();
  }

  /**
   * Load all skills from database
   */
  async loadSkills(): Promise<void> {
    if (!this.userId) {
      console.log('⚠️ No user ID set, skipping skill load');
      return;
    }

    console.log('📚 Loading skills...');

    const { data, error } = await supabase
      .from('agent_skills')
      .select('*')
      .eq('user_id', this.userId)
      .order('name');

    if (error) {
      console.error('Failed to load skills:', error);
      return;
    }

    this.skills.clear();
    data?.forEach((skill: any) => {
      const loadedSkill: Skill = {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        enabled: skill.enabled,
        code: skill.code,
        permissions: skill.permissions || [],
        schedule: skill.schedule,
        lastRun: skill.last_run ? new Date(skill.last_run).getTime() : undefined,
        successRate: skill.success_rate || 0,
        runCount: skill.run_count || 0,
        createdBy: skill.created_by || 'system',
        version: skill.version || 1
      };

      this.skills.set(skill.id, loadedSkill);

      // Schedule if needed
      if (loadedSkill.enabled && loadedSkill.schedule) {
        this.scheduleSkill(skill.id, loadedSkill.schedule);
      }
    });

    this.skillsLoaded = true;
    console.log(`✅ Loaded ${this.skills.size} skills`);
  }

  /**
   * Execute a skill by ID
   */
  async executeSkill(skillId: string, params?: any): Promise<SkillExecutionResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return { success: false, error: `Skill not found: ${skillId}`, executionTime: 0 };
    }
    if (!skill.enabled) {
      return { success: false, error: `Skill disabled: ${skill.name}`, executionTime: 0 };
    }

    console.log(`⚡ Executing skill: ${skill.name}`);
    const startTime = Date.now();
    let success = false;
    let result: any = null;
    let errorMessage: string | undefined;

    try {
      // Create skill context
      const context = await this.createSkillContext(params);

      // Execute skill code
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction(...Object.keys(context), skill.code);
      result = await fn(...Object.values(context));

      success = true;
      console.log(`✅ Skill completed: ${skill.name}`, result);
    } catch (error) {
      console.error(`❌ Skill failed: ${skill.name}`, error);
      errorMessage = error instanceof Error ? error.message : String(error);
      result = { error: errorMessage };
    }

    const executionTime = Date.now() - startTime;

    // Update statistics
    await this.updateSkillStats(skillId, success, executionTime);

    return { success, data: result, error: errorMessage, executionTime };
  }

  /**
   * Create new skill from AI
   */
  async createSkillFromAI(
    description: string,
    category: Skill['category'] = 'automation'
  ): Promise<Skill> {
    console.log(`🤖 AI creating skill: ${description}`);

    const { GeminiService } = await import('../GeminiService');
    
    const prompt = `Create a JavaScript async function for this skill: "${description}"

Context available:
- AgentService: Browser automation (click, type, navigate, snapshot)
- CDPService: Low-level browser control
- VisionService: Screenshot and vision analysis
- GatewayService: Multi-channel messaging
- supabase: Database access
- params: Input parameters

Requirements:
1. Must be an async function body (no function declaration)
2. Return meaningful result object
3. Handle errors gracefully
4. Use try-catch blocks
5. Add console.log for debugging

Example structure:
\`\`\`javascript
try {
  const result = await AgentService.executeAction({ type: 'analyze', description: 'current state' });
  return { success: true, data: result };
} catch (error) {
  console.error('Error:', error);
  return { success: false, error: error.message };
}
\`\`\`

Return ONLY the function body code, no markdown, no explanation.`;

    const response = await GeminiService.chat(prompt, [], 'You are an expert JavaScript code generator. Create clean, working code.');
    
    // Extract code from response
    const code = response.text
      .replace(/```javascript|```js|```/g, '')
      .trim();

    const skill: Skill = {
      id: crypto.randomUUID(),
      name: description.substring(0, 50),
      description,
      category,
      enabled: true,
      code,
      permissions: ['agent_execute'],
      createdBy: 'ai',
      version: 1,
      successRate: 0,
      runCount: 0
    };

    // Save to database
    if (this.userId) {
      const { error } = await supabase.from('agent_skills').insert({
        id: skill.id,
        user_id: this.userId,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        enabled: skill.enabled,
        code: skill.code,
        permissions: skill.permissions,
        created_by: skill.createdBy,
        version: skill.version
      });

      if (error) {
        console.error('Failed to save skill:', error);
        throw error;
      }
    }

    this.skills.set(skill.id, skill);
    console.log(`✅ AI created skill: ${skill.name}`);
    return skill;
  }

  /**
   * Create skill manually
   */
  async createSkill(skillData: Omit<Skill, 'id' | 'runCount' | 'successRate' | 'lastRun'>): Promise<Skill> {
    const skill: Skill = {
      ...skillData,
      id: crypto.randomUUID(),
      runCount: 0,
      successRate: 0
    };

    if (this.userId) {
      const { error } = await supabase.from('agent_skills').insert({
        id: skill.id,
        user_id: this.userId,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        enabled: skill.enabled,
        code: skill.code,
        permissions: skill.permissions,
        schedule: skill.schedule,
        created_by: skill.createdBy || 'user',
        version: skill.version || 1
      });

      if (error) throw error;
    }

    this.skills.set(skill.id, skill);
    return skill;
  }

  /**
   * List all skills
   */
  listSkills(category?: Skill['category']): Skill[] {
    let skills = Array.from(this.skills.values());
    if (category) {
      skills = skills.filter(s => s.category === category);
    }
    return skills.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get skill by ID
   */
  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  /**
   * Enable/disable skill
   */
  async toggleSkill(skillId: string, enabled: boolean): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    skill.enabled = enabled;

    await supabase
      .from('agent_skills')
      .update({ enabled })
      .eq('id', skillId);

    if (enabled && skill.schedule) {
      this.scheduleSkill(skillId, skill.schedule);
    } else {
      this.unscheduleSkill(skillId);
    }
  }

  /**
   * Update skill
   */
  async updateSkill(skillId: string, updates: Partial<Skill>): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    Object.assign(skill, updates);
    skill.version = (skill.version || 1) + 1;

    await supabase
      .from('agent_skills')
      .update({
        name: skill.name,
        description: skill.description,
        category: skill.category,
        code: skill.code,
        permissions: skill.permissions,
        schedule: skill.schedule,
        version: skill.version
      })
      .eq('id', skillId);
  }

  /**
   * Delete skill
   */
  async deleteSkill(skillId: string): Promise<void> {
    this.unscheduleSkill(skillId);
    this.skills.delete(skillId);

    await supabase
      .from('agent_skills')
      .delete()
      .eq('id', skillId);
  }

  /**
   * Get statistics for all skills
   */
  getStatistics(): {
    totalSkills: number;
    enabledSkills: number;
    byCategory: Record<string, number>;
    topSkills: Skill[];
  } {
    const skills = Array.from(this.skills.values());
    const byCategory: Record<string, number> = {};

    for (const skill of skills) {
      byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
    }

    return {
      totalSkills: skills.length,
      enabledSkills: skills.filter(s => s.enabled).length,
      byCategory,
      topSkills: skills
        .filter(s => s.runCount && s.runCount > 0)
        .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))
        .slice(0, 5)
    };
  }

  // =================== Private Methods ===================

  private async createSkillContext(params?: any): Promise<SkillContext> {
    const { AgentService } = await import('../AgentService');
    const { CDPService } = await import('../browser/CDPService');
    const { VisionService } = await import('../vision/VisionService');
    const { GatewayService } = await import('../gateway/GatewayService');

    return {
      AgentService,
      CDPService,
      VisionService,
      GatewayService,
      supabase,
      params
    };
  }

  private async updateSkillStats(skillId: string, success: boolean, executionTime: number): Promise<void> {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    skill.runCount = (skill.runCount || 0) + 1;
    skill.lastRun = Date.now();

    // Update success rate (exponential moving average)
    const alpha = 0.2;
    const newRate = success ? 100 : 0;
    skill.successRate = skill.successRate
      ? skill.successRate * (1 - alpha) + newRate * alpha
      : newRate;

    await supabase
      .from('agent_skills')
      .update({
        last_run: new Date(skill.lastRun).toISOString(),
        success_rate: skill.successRate,
        run_count: skill.runCount
      })
      .eq('id', skillId);
  }

  private scheduleSkill(skillId: string, cronSchedule: string): void {
    // Simple interval-based scheduling
    // Parse simple cron patterns (e.g., "*/5 * * * *" = every 5 minutes)
    const intervalMatch = cronSchedule.match(/^\*\/(\d+)/);
    if (intervalMatch) {
      const minutes = parseInt(intervalMatch[1]);
      const intervalMs = minutes * 60 * 1000;
      
      const job = setInterval(async () => {
        console.log(`⏰ Running scheduled skill: ${skillId}`);
        await this.executeSkill(skillId);
      }, intervalMs);

      this.scheduledJobs.set(skillId, job as unknown as ReturnType<typeof setTimeout>);
      console.log(`⏰ Scheduled skill ${skillId}: every ${minutes} minutes`);
    }
  }

  private unscheduleSkill(skillId: string): void {
    const job = this.scheduledJobs.get(skillId);
    if (job) {
      clearInterval(job);
      this.scheduledJobs.delete(skillId);
    }
  }
}

export const SkillsManager = new SkillsManagerClass();
