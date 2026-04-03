/**
 * ClaudeService - Claude AI via claude-code-assist edge function with streaming
 */

import { supabase } from '@/integrations/supabase/client';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  text: string;
  model: string;
}

class ClaudeServiceClass {
  async isAvailable(): Promise<boolean> {
    return true; // Always available via edge function fallback
  }

  async chat(
    message: string,
    history: ClaudeMessage[] = [],
    code?: string
  ): Promise<ClaudeResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('claude-code-assist', {
        body: {
          message,
          code: code || '',
          history: history.slice(-16),
        }
      });

      if (error) {
        if (error.message?.includes('429')) throw new Error('⚠️ Rate limit — ลองใหม่ในอีกสักครู่');
        if (error.message?.includes('402')) throw new Error('⚠️ Credits หมด');
        throw error;
      }

      // Handle streaming response — collect all chunks
      if (data instanceof ReadableStream || (data && typeof data === 'object' && data.body)) {
        return { text: '(Streaming not supported in non-streaming mode)', model: 'Claude' };
      }

      // Non-streaming fallback
      if (typeof data === 'string') {
        return { text: data, model: 'Claude Sonnet' };
      }

      if (data?.error) throw new Error(data.error);

      return { text: JSON.stringify(data), model: 'Claude Sonnet' };
    } catch (err: any) {
      console.error('Claude error:', err);
      throw err;
    }
  }

  /**
   * Stream chat with Claude - returns text progressively
   */
  async streamChat(
    message: string,
    history: ClaudeMessage[] = [],
    onDelta: (text: string) => void,
    onDone: () => void,
    code?: string
  ): Promise<string> {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-code-assist`;
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        message,
        code: code || '',
        history: history.slice(-16),
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) throw new Error('Rate limit exceeded');
      if (resp.status === 402) throw new Error('Credits exhausted');
      throw new Error(`Claude API error: ${resp.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);

        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onDelta(content);
          }
        } catch {
          // partial JSON, skip
        }
      }
    }

    onDone();
    return fullText;
  }

  detectToolCall(input: string): { tool: string; params: Record<string, any> } | null {
    // Reuse same detection logic as Gemini
    const lower = input.toLowerCase();
    if (lower.includes('แผ่นดินไหว') || lower.includes('earthquake')) {
      return { tool: 'get_earthquake_data', params: {} };
    }
    if (lower.includes('cot') && (lower.includes('gold') || lower.includes('ทอง'))) {
      return { tool: 'get_cot_data', params: { symbol: 'gold' } };
    }
    return null;
  }

  formatToolResult(tool: string, result: any): string {
    return `📊 Tool: ${tool}\n${JSON.stringify(result, null, 2).slice(0, 2000)}`;
  }
}

export const ClaudeService = new ClaudeServiceClass();
