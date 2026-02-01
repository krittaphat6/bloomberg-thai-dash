// supabase/functions/finbert-sentiment/index.ts
// FinBERT Sentiment Analysis Edge Function
// Based on: https://github.com/yukepenn/macro-news-sentiment-trading
// Model: ProsusAI/finbert (HuggingFace)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HF_API_URL = "https://api-inference.huggingface.co/models/ProsusAI/finbert";

interface NewsItem {
  id: string;
  title: string;
}

interface FinBERTResult {
  id: string;
  title: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

async function analyzeWithFinBERT(text: string, hfToken: string): Promise<any> {
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('FinBERT API error:', response.status, errorText);
    
    // Handle model loading (503)
    if (response.status === 503) {
      throw new Error('Model is loading. Please try again in a few seconds.');
    }
    throw new Error(`FinBERT API error: ${response.status}`);
  }
  
  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { news } = await req.json() as { news: NewsItem[] };
    const hfToken = Deno.env.get('HUGGINGFACE_TOKEN');
    
    if (!hfToken) {
      console.error('HUGGINGFACE_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'HUGGINGFACE_TOKEN not configured',
          message: 'กรุณาตั้งค่า HUGGINGFACE_TOKEN ใน Supabase Secrets' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!news || news.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No news to analyze' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🧠 Starting FinBERT analysis for ${news.length} news items...`);

    const results: FinBERTResult[] = [];
    const batchSize = 10;
    
    // Process in batches
    for (let i = 0; i < Math.min(news.length, 50); i += batchSize) {
      const batch = news.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const result = await analyzeWithFinBERT(item.title, hfToken);
            
            // FinBERT returns array of label/score pairs: [[{label, score}, ...]]
            const scores = {
              positive: 0,
              negative: 0,
              neutral: 0,
            };
            
            let maxScore = 0;
            let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
            
            // Handle nested array response [[{label, score}]]
            const labelScores = Array.isArray(result[0]) ? result[0] : result;
            
            for (const r of labelScores) {
              const label = r.label.toLowerCase() as keyof typeof scores;
              if (label in scores) {
                scores[label] = r.score;
                if (r.score > maxScore) {
                  maxScore = r.score;
                  sentiment = label;
                }
              }
            }
            
            return {
              id: item.id,
              title: item.title,
              sentiment,
              confidence: Math.round(maxScore * 100),
              scores,
            };
          } catch (error) {
            console.error(`Error analyzing: ${item.title}`, error);
            return {
              id: item.id,
              title: item.title,
              sentiment: 'neutral' as const,
              confidence: 50,
              scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
            };
          }
        })
      );
      
      results.push(...batchResults);
      
      // Rate limiting between batches
      if (i + batchSize < news.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Calculate aggregate stats
    const positiveCount = results.filter(r => r.sentiment === 'positive').length;
    const negativeCount = results.filter(r => r.sentiment === 'negative').length;
    const neutralCount = results.filter(r => r.sentiment === 'neutral').length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    console.log(`✅ FinBERT analysis complete: ${results.length} items`);
    console.log(`📊 Sentiment distribution: +${positiveCount} / =${neutralCount} / -${negativeCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        stats: {
          total: results.length,
          positive: positiveCount,
          negative: negativeCount,
          neutral: neutralCount,
          avgConfidence: Math.round(avgConfidence),
          sentiment_mean: (positiveCount - negativeCount) / results.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('FinBERT function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
