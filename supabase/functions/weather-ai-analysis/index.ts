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
    const { type, data, prompt } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'weather_analysis') {
      systemPrompt = `You are an expert meteorologist and weather trading analyst for the WeatherBot Polymarket Trading Terminal. You analyze weather data to find profitable trading edges on prediction markets.

RULES:
- Be concise and data-driven
- Always mention specific probabilities and temperatures
- Give a clear VERDICT: TRADE or SKIP for each opportunity
- Use Kelly criterion for position sizing recommendations
- Reference ensemble model agreement/disagreement
- Format numbers with appropriate precision
- Respond in the user's language (Thai or English)`;

      userPrompt = prompt || `Analyze this weather data and provide trading insights:\n${JSON.stringify(data, null, 2)}`;
    } else if (type === 'market_scan') {
      systemPrompt = `You are a quantitative weather market analyst. Analyze Polymarket weather markets and identify mispriced opportunities using ensemble weather model data.

For each market:
1. Compare model probability vs market price
2. Calculate edge and confidence
3. Recommend: TRADE (edge > 5%) or SKIP
4. Suggest position size using fractional Kelly

Be structured and precise. Use tables when helpful.`;

      userPrompt = prompt || `Analyze these weather markets:\n${JSON.stringify(data, null, 2)}`;
    } else if (type === 'backtest_analysis') {
      systemPrompt = `You are a quantitative strategy analyst. Analyze backtest results and provide insights on strategy performance, risk metrics, and recommendations for improvement.`;
      userPrompt = prompt || `Analyze this backtest result:\n${JSON.stringify(data, null, 2)}`;
    } else if (type === 'code_assist') {
      systemPrompt = `You are an expert Python/Pine Script programmer and financial analyst. Help the user with code, debugging, analysis, and strategy development. Be concise and provide working code.`;
      userPrompt = prompt;
    } else {
      systemPrompt = `You are a helpful AI assistant for the ABLE Terminal platform. Be concise and accurate.`;
      userPrompt = prompt;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (e) {
    console.error('Weather AI analysis error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
