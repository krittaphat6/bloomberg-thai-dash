// supabase/functions/agent-web-search/index.ts
// ✅ OpenClaw Agent - Web Search with Perplexity API

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
    const { query, searchType = 'web' } = await req.json();
    
    console.log('🔍 Web Search:', query);
    
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    // If Perplexity is available, use it for real web search
    if (PERPLEXITY_API_KEY) {
      console.log('🌐 Using Perplexity API');
      
      const model = searchType === 'deep' ? 'sonar-pro' : 'sonar';
      
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a helpful research assistant. Provide accurate and current information with sources. Respond in Thai when the query is in Thai.' },
            { role: 'user', content: query }
          ],
          search_recency_filter: 'week',
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || 'ไม่พบข้อมูล';
      const citations = data.citations || [];
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          result: content,
          citations,
          source: 'perplexity'
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fallback: Use Gemini with knowledge cutoff note
    console.log('💡 Falling back to Gemini (no real-time web search)');
    
    const apiKey = GEMINI_API_KEY || LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error('No API key configured for web search');
    }
    
    const systemPrompt = `คุณเป็น AI Assistant ที่มีความรู้กว้างขวาง 
ตอบคำถามตามความรู้ที่มี แต่แจ้งให้ผู้ใช้ทราบว่าข้อมูลอาจไม่ใช่ข้อมูลล่าสุด
ตอบเป็นภาษาไทยถ้าคำถามเป็นภาษาไทย`;

    if (GEMINI_API_KEY) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: query }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่พบข้อมูล';
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          result: text,
          citations: [],
          source: 'gemini',
          note: 'ข้อมูลจาก AI knowledge base (ไม่ใช่การค้นหาเว็บแบบ real-time)'
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Use Lovable Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${LOVABLE_API_KEY}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || 'ไม่พบข้อมูล';
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        result: text,
        citations: [],
        source: 'gateway',
        note: 'ข้อมูลจาก AI knowledge base'
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Web Search error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
