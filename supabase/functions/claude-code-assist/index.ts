import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, message, history } = await req.json();

    // Try Claude first, fallback to Lovable AI
    const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (ANTHROPIC_KEY) {
      // Use Claude API
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          stream: true,
          system: `You are an expert Python and Pine Script coding assistant in the ABLE Terminal IDE. 
You help with code writing, debugging, optimization, and financial analysis.
Be concise and practical. When suggesting code, use code blocks.
Respond in the same language as the user (Thai or English).`,
          messages: [
            ...(history || []).map((m: any) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
            {
              role: 'user',
              content: `Current code:\n\`\`\`\n${code || 'No code'}\n\`\`\`\n\n${message}`,
            },
          ],
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('Claude API error:', resp.status, errText);
        // Fallback to Lovable AI below
        if (!LOVABLE_KEY) throw new Error(`Claude API error: ${resp.status}`);
      } else {
        // Transform Claude SSE to OpenAI-compatible SSE format
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                break;
              }
              buffer += decoder.decode(value, { stream: true });

              let idx;
              while ((idx = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);

                if (!line.startsWith('data: ')) continue;
                const json = line.slice(6);
                if (json === '[DONE]') continue;

                try {
                  const evt = JSON.parse(json);
                  if (evt.type === 'content_block_delta' && evt.delta?.text) {
                    // Convert to OpenAI format
                    const openaiChunk = {
                      choices: [{ delta: { content: evt.delta.text } }],
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                  }
                } catch { /* partial */ }
              }
            }
          },
        });

        return new Response(stream, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });
      }
    }

    // Fallback: Lovable AI
    if (!LOVABLE_KEY) throw new Error('No AI API key configured');

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        stream: true,
        messages: [
          {
            role: 'system',
            content: `You are an expert Python and Pine Script coding assistant in the ABLE Terminal IDE.
You help with code writing, debugging, optimization, and financial analysis.
Be concise and practical. When suggesting code, use code blocks.
Respond in the same language as the user (Thai or English).`,
          },
          ...(history || []),
          {
            role: 'user',
            content: `Current code:\n\`\`\`\n${code || 'No code'}\n\`\`\`\n\n${message}`,
          },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${resp.status}`);
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (e) {
    console.error('Claude code assist error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});