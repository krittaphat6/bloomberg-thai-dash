// supabase/functions/agent-execute/index.ts
// ✅ OpenClaw Agent - AI Execution with Gemini (no file required)

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
    const { userPrompt, systemPrompt } = await req.json();
    
    console.log('🦞 Agent Execute:', userPrompt?.substring(0, 100));
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('No AI API key configured');
    }

    const finalSystemPrompt = systemPrompt || 'คุณเป็น ABLE AI Agent ผู้เชี่ยวชาญในการช่วยเหลือ ตอบเป็นภาษาไทย';

    // Use Gemini API directly if available
    if (GEMINI_API_KEY) {
      console.log('🔮 Using Gemini API');
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: finalSystemPrompt }] },
            generationConfig: { 
              temperature: 0.2, 
              maxOutputTokens: 2000 
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถวิเคราะห์ได้';
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          analysis: text,
          model: 'gemini-2.5-flash'
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fallback to Lovable Gateway
    console.log('🔮 Using Lovable Gateway');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${LOVABLE_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) throw new Error('Rate limit exceeded');
      if (status === 402) throw new Error('Credits หมด');
      throw new Error(`Gateway error: ${status}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || 'ไม่สามารถวิเคราะห์ได้';
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: text,
        model: 'gemini-2.5-flash (gateway)'
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Agent Execute error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
