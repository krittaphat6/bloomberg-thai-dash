import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SocialProfile {
  platform: string;
  username: string;
  url: string;
  followers?: string;
  bio?: string;
  verified?: boolean;
}

interface PersonInfo {
  name: string;
  confidence: number;
  occupation?: string;
  bio?: string;
  nationality?: string;
  age?: string;
  socialProfiles: SocialProfile[];
  relatedImages?: string[];
  sources: string[];
}

interface SearchRequest {
  image: string;
  options?: {
    searchSocialMedia?: boolean;
    includeRelatedImages?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, options }: SearchRequest = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image is required', persons: [] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key - prefer GEMINI_API_KEY, fallback to LOVABLE_API_KEY
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let apiKey = GEMINI_API_KEY || LOVABLE_API_KEY;
    const useDirectGemini = !!GEMINI_API_KEY;

    if (!apiKey) {
      console.error('No API key configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured', persons: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using ${useDirectGemini ? 'Direct Gemini API' : 'Lovable AI Gateway'}`);

    // Extract base64 image data
    let imageData = image;
    let mimeType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageData = matches[2];
      }
    }

    // Create the prompt for face analysis
    const systemPrompt = `คุณเป็น AI ผู้เชี่ยวชาญด้านการวิเคราะห์ใบหน้าและค้นหาข้อมูลบุคคล
คุณสามารถวิเคราะห์ใบหน้าในรูปภาพและระบุว่าน่าจะเป็นใคร

หน้าที่ของคุณ:
1. วิเคราะห์ใบหน้าในรูปภาพ
2. ระบุว่าน่าจะเป็นบุคคลใด (ถ้าเป็นคนมีชื่อเสียง)
3. ให้ข้อมูล Social Media profiles ที่เป็นไปได้
4. ให้ข้อมูลประวัติโดยย่อ

ตอบเป็น JSON format เท่านั้น ห้ามใส่ markdown หรือ text อื่น`;

    const userPrompt = `วิเคราะห์ใบหน้าในรูปภาพนี้และค้นหาข้อมูลบุคคล

ตอบเป็น JSON ในรูปแบบนี้เท่านั้น (ไม่ต้องมี markdown):
{
  "success": true,
  "persons": [
    {
      "name": "ชื่อบุคคล",
      "confidence": 85,
      "occupation": "อาชีพ",
      "bio": "ประวัติโดยย่อ",
      "nationality": "สัญชาติ",
      "age": "อายุหรือช่วงอายุ",
      "socialProfiles": [
        {
          "platform": "Instagram",
          "username": "username",
          "url": "https://instagram.com/username",
          "followers": "1.2M",
          "verified": true
        }
      ],
      "sources": ["https://example.com"]
    }
  ]
}

ถ้าไม่พบข้อมูลหรือไม่ใช่คนมีชื่อเสียง ให้ตอบ:
{
  "success": true,
  "persons": [],
  "message": "ไม่พบข้อมูลบุคคลที่ตรงกับใบหน้านี้ในฐานข้อมูล"
}`;

    let response;
    
    if (useDirectGemini) {
      // Direct Gemini API call
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: systemPrompt + "\n\n" + userPrompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageData
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4096
            }
          })
        }
      );
    } else {
      // Lovable AI Gateway
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.3
        })
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. กรุณารอสักครู่', persons: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Credits หมด - กรุณาเติม Credits ที่ Settings', persons: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('API response received');

    // Extract content based on API type
    let content = '';
    if (useDirectGemini) {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      content = data.choices?.[0]?.message?.content || '';
    }

    if (!content) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No response from AI', 
          persons: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean and parse JSON
    let cleanedContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // Try to find JSON in the response
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }

    let result;
    try {
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Raw content:', content);
      
      // Return a default response
      return new Response(
        JSON.stringify({
          success: true,
          persons: [],
          message: 'ไม่พบข้อมูลบุคคลที่ตรงกับใบหน้านี้',
          rawAnalysis: content
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and enhance result
    if (!result.persons) {
      result.persons = [];
    }

    // Ensure all persons have required fields
    result.persons = result.persons.map((person: any) => ({
      name: person.name || 'Unknown',
      confidence: person.confidence || 50,
      occupation: person.occupation || null,
      bio: person.bio || null,
      nationality: person.nationality || null,
      age: person.age || null,
      socialProfiles: (person.socialProfiles || []).map((profile: any) => ({
        platform: profile.platform || 'Unknown',
        username: profile.username || '',
        url: profile.url || '#',
        followers: profile.followers || null,
        bio: profile.bio || null,
        verified: profile.verified || false
      })),
      sources: person.sources || []
    }));

    result.success = true;

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Face search error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        persons: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
