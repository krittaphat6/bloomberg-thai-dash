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
    searchLookalikes?: boolean;
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
        JSON.stringify({ success: false, error: 'Image is required', persons: [], lookalikes: [] }),
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
        JSON.stringify({ success: false, error: 'API key not configured', persons: [], lookalikes: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using ${useDirectGemini ? 'Direct Gemini API' : 'Lovable AI Gateway'}`);
    console.log('Search lookalikes:', options?.searchLookalikes);

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

    // Enhanced prompt for better results and lookalikes
    const systemPrompt = `คุณเป็น AI ผู้เชี่ยวชาญระดับสูงด้านการวิเคราะห์ใบหน้าและค้นหาข้อมูลบุคคล เทียบเท่า Google Lens และ PimEyes

ความสามารถของคุณ:
1. วิเคราะห์ลักษณะใบหน้าอย่างละเอียด (รูปหน้า, ดวงตา, จมูก, ปาก, โครงหน้า)
2. จับคู่กับบุคคลที่มีชื่อเสียง, influencers, คนดัง, นักธุรกิจ, นักการเมือง
3. ค้นหา Social Media profiles ที่เป็นไปได้ (Instagram, Twitter/X, TikTok, Threads, Facebook, YouTube)
4. ระบุคนหน้าคล้าย (Lookalikes) - คนที่มีใบหน้าคล้ายกันแต่อาจไม่ใช่คนเดียวกัน

กฎการวิเคราะห์:
- ถ้าใบหน้าดูคุ้นๆ ให้พยายามระบุให้ได้มากที่สุด
- ให้ความน่าจะเป็นตามความมั่นใจจริงๆ (50-95%)
- ถ้าไม่แน่ใจ 100% แต่คล้ายมาก ให้ใส่เป็น lookalike
- ค้นหา Social Media ให้ครบทุก platform ที่เป็นไปได้
- ถ้าเป็น influencer ไทย ให้หา Instagram, TikTok, Threads เป็นหลัก
- ถ้าเป็นคนต่างชาติ ให้หา Instagram, Twitter, YouTube

ตอบเป็น JSON format เท่านั้น ห้ามใส่ markdown หรือ text อื่น`;

    const userPrompt = `วิเคราะห์ใบหน้าในรูปภาพนี้อย่างละเอียด และค้นหาข้อมูลบุคคล

ขั้นตอนการวิเคราะห์:
1. ระบุลักษณะใบหน้า (เพศ, อายุโดยประมาณ, เชื้อชาติ)
2. ค้นหาว่าตรงกับบุคคลที่มีชื่อเสียงหรือไม่
3. ถ้าตรงกัน - ให้ข้อมูล Social Media ทั้งหมด
4. ค้นหาคนหน้าคล้าย (lookalikes) - คนดังที่มีใบหน้าคล้ายกัน

ตอบเป็น JSON ในรูปแบบนี้เท่านั้น (ไม่ต้องมี markdown):
{
  "success": true,
  "faceAnalysis": {
    "detected": true,
    "gender": "male/female",
    "estimatedAge": "25-30",
    "ethnicity": "Asian/Thai/etc"
  },
  "persons": [
    {
      "name": "ชื่อบุคคล (ถ้าระบุได้)",
      "confidence": 85,
      "occupation": "อาชีพ",
      "bio": "ประวัติโดยย่อ 2-3 ประโยค",
      "nationality": "สัญชาติ",
      "age": "อายุจริง (ถ้าทราบ)",
      "socialProfiles": [
        {
          "platform": "Instagram",
          "username": "username",
          "url": "https://instagram.com/username",
          "followers": "1.2M",
          "verified": true
        },
        {
          "platform": "TikTok",
          "username": "username",
          "url": "https://tiktok.com/@username",
          "followers": "500K",
          "verified": false
        },
        {
          "platform": "X",
          "username": "username",
          "url": "https://x.com/username",
          "followers": "200K",
          "verified": true
        },
        {
          "platform": "Threads",
          "username": "username",
          "url": "https://threads.net/@username",
          "followers": "100K",
          "verified": false
        }
      ],
      "sources": ["https://example.com"]
    }
  ],
  "lookalikes": [
    {
      "name": "ชื่อคนที่หน้าคล้าย",
      "confidence": 70,
      "occupation": "อาชีพ",
      "bio": "ทำไมถึงหน้าคล้าย / ลักษณะที่คล้าย",
      "nationality": "สัญชาติ",
      "socialProfiles": [
        {
          "platform": "Instagram",
          "username": "lookalike_username",
          "url": "https://instagram.com/lookalike_username",
          "followers": "50K"
        }
      ],
      "sources": []
    }
  ]
}

กฎสำคัญ:
- ต้องมี persons array เสมอ (อาจว่างเปล่าได้)
- ต้องมี lookalikes array เสมอ (อาจว่างเปล่าได้)
- ถ้าไม่พบคนที่ตรงกัน persons = []
- ถ้าพบคนหน้าคล้าย ใส่ใน lookalikes
- confidence ของ lookalikes ควรอยู่ระหว่าง 50-80%
- พยายามหา Social Media ให้ได้มากที่สุด`;

    let response;
    
    if (useDirectGemini) {
      // Direct Gemini API call with better model
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
              temperature: 0.4, // Slightly higher for creativity in finding lookalikes
              maxOutputTokens: 8192
            }
          })
        }
      );
    } else {
      // Lovable AI Gateway with better model
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash', // Better model for image analysis
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
          max_tokens: 8192,
          temperature: 0.4
        })
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. กรุณารอสักครู่', persons: [], lookalikes: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Credits หมด - กรุณาเติม Credits ที่ Settings', persons: [], lookalikes: [] }),
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

    console.log('Raw content length:', content.length);

    if (!content) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No response from AI', 
          persons: [],
          lookalikes: []
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
      console.log('Cleaned content:', cleanedContent.substring(0, 500));
      
      // Return a default response with the raw analysis
      return new Response(
        JSON.stringify({
          success: true,
          persons: [],
          lookalikes: [],
          message: 'ไม่สามารถวิเคราะห์ผลลัพธ์ได้ กรุณาลองใหม่',
          rawAnalysis: content.substring(0, 500)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and enhance result
    if (!result.persons) {
      result.persons = [];
    }
    if (!result.lookalikes) {
      result.lookalikes = [];
    }

    // Ensure all persons have required fields
    const processPersons = (persons: any[]) => persons.map((person: any) => ({
      name: person.name || 'Unknown',
      confidence: Math.min(Math.max(person.confidence || 50, 10), 99),
      occupation: person.occupation || null,
      bio: person.bio || null,
      nationality: person.nationality || null,
      age: person.age || null,
      socialProfiles: (person.socialProfiles || []).map((profile: any) => {
        // Fix URLs based on platform
        let url = profile.url || '#';
        const platform = (profile.platform || '').toLowerCase();
        const username = profile.username || '';
        
        if (username && platform) {
          switch (platform) {
            case 'instagram':
              url = `https://instagram.com/${username.replace('@', '')}`;
              break;
            case 'twitter':
            case 'x':
              url = `https://x.com/${username.replace('@', '')}`;
              break;
            case 'tiktok':
              url = `https://tiktok.com/@${username.replace('@', '')}`;
              break;
            case 'threads':
              url = `https://threads.net/@${username.replace('@', '')}`;
              break;
            case 'facebook':
              url = `https://facebook.com/${username.replace('@', '')}`;
              break;
            case 'youtube':
              url = `https://youtube.com/@${username.replace('@', '')}`;
              break;
          }
        }
        
        return {
          platform: profile.platform || 'Unknown',
          username: username.replace('@', ''),
          url: url,
          followers: profile.followers || null,
          bio: profile.bio || null,
          verified: profile.verified || false
        };
      }),
      sources: person.sources || []
    }));

    result.persons = processPersons(result.persons);
    result.lookalikes = processPersons(result.lookalikes);
    result.success = true;

    console.log('Processed results:', {
      persons: result.persons.length,
      lookalikes: result.lookalikes.length
    });

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
        persons: [],
        lookalikes: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
