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
  facialFeatures?: string[];
}

interface FaceAnalysis {
  detected: boolean;
  gender?: string;
  estimatedAge?: string;
  ethnicity?: string;
  facialFeatures?: {
    faceShape: string;
    eyeShape: string;
    noseShape: string;
    lipShape: string;
    skinTone: string;
    hairStyle: string;
    hairColor: string;
    distinguishingFeatures: string[];
  };
  possibleIdentity?: {
    name: string;
    confidence: number;
    reasoning: string[];
  }[];
}

interface SearchRequest {
  image: string;
  options?: {
    searchSocialMedia?: boolean;
    includeRelatedImages?: boolean;
    searchLookalikes?: boolean;
    deepAnalysis?: boolean;
  };
}

// Stage 1: Deep Face Analysis
async function analyzeFace(imageData: string, mimeType: string, apiKey: string): Promise<FaceAnalysis> {
  const prompt = `คุณคือผู้เชี่ยวชาญด้านการวิเคราะห์ใบหน้าระดับโลก ทำการวิเคราะห์ใบหน้าในรูปอย่างละเอียดที่สุด

ขั้นตอนการวิเคราะห์:
1. ตรวจจับใบหน้า - มีใบหน้าหรือไม่?
2. วิเคราะห์ลักษณะทางกายภาพ
   - เพศ
   - อายุโดยประมาณ  
   - เชื้อชาติ/ภูมิภาค
3. วิเคราะห์ลักษณะใบหน้าละเอียด
   - รูปหน้า (oval, round, square, heart, oblong)
   - รูปตา (almond, round, hooded, monolid, downturned)
   - รูปจมูก (straight, button, aquiline, wide, narrow)
   - รูปปาก (full, thin, heart-shaped, wide)
   - สีผิว (fair, light, medium, tan, olive, brown, dark)
   - ทรงผม (short, medium, long, curly, straight, wavy, bald)
   - สีผม (black, brown, blonde, red, gray, white, colored)
   - จุดเด่น/ลักษณะพิเศษ (ไฝ, รอยแผลเป็น, หนวด, เครา, แว่น, etc.)
4. ถ้าคุ้นหน้า - ระบุว่าอาจเป็นใคร พร้อมเหตุผล

ตอบเป็น JSON เท่านั้น:
{
  "detected": true/false,
  "gender": "male/female",
  "estimatedAge": "25-30",
  "ethnicity": "Thai/Asian/etc",
  "facialFeatures": {
    "faceShape": "oval",
    "eyeShape": "almond",
    "noseShape": "straight",
    "lipShape": "full",
    "skinTone": "light",
    "hairStyle": "short",
    "hairColor": "black",
    "distinguishingFeatures": ["dimples", "mole on cheek"]
  },
  "possibleIdentity": [
    {
      "name": "ชื่อบุคคล (ถ้าคุ้นหน้า)",
      "confidence": 75,
      "reasoning": ["เหตุผลว่าทำไมถึงคิดว่าเป็นคนนี้", "หลักฐานสนับสนุน"]
    }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageData } }
          ]
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
      })
    }
  );

  if (!response.ok) throw new Error('Face analysis failed');
  
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Parse error in analyzeFace:', e);
  }
  
  return { detected: false };
}

// Stage 2: Identity Search with Chain-of-Thought
async function searchIdentity(
  faceAnalysis: FaceAnalysis, 
  imageData: string, 
  mimeType: string, 
  apiKey: string
): Promise<{ persons: PersonInfo[], lookalikes: PersonInfo[] }> {
  
  const featureDescription = faceAnalysis.facialFeatures 
    ? `
ลักษณะใบหน้าที่วิเคราะห์ได้:
- รูปหน้า: ${faceAnalysis.facialFeatures.faceShape}
- รูปตา: ${faceAnalysis.facialFeatures.eyeShape}  
- รูปจมูก: ${faceAnalysis.facialFeatures.noseShape}
- รูปปาก: ${faceAnalysis.facialFeatures.lipShape}
- สีผิว: ${faceAnalysis.facialFeatures.skinTone}
- ทรงผม: ${faceAnalysis.facialFeatures.hairStyle}
- สีผม: ${faceAnalysis.facialFeatures.hairColor}
- จุดเด่น: ${faceAnalysis.facialFeatures.distinguishingFeatures.join(', ')}
` : '';

  const possibleNames = faceAnalysis.possibleIdentity?.map(p => p.name).join(', ') || 'ไม่ทราบ';

  const prompt = `คุณคือระบบค้นหาใบหน้าขั้นสูงที่เหนือกว่า Google Lens และ PimEyes

## ข้อมูลจากการวิเคราะห์ใบหน้า:
- เพศ: ${faceAnalysis.gender || 'ไม่ทราบ'}
- อายุ: ${faceAnalysis.estimatedAge || 'ไม่ทราบ'}
- เชื้อชาติ: ${faceAnalysis.ethnicity || 'ไม่ทราบ'}
${featureDescription}
- ผู้ที่อาจเป็น: ${possibleNames}

## คำสั่ง:
คุณต้องใช้ความรู้ทั้งหมดที่มีในการ:

1. **ระบุตัวตน (Identity Match)**: 
   - ถ้าเป็นบุคคลที่มีชื่อเสียง ให้ระบุชื่อ และหา Social Media ทั้งหมด
   - ตรวจสอบทุก platform: Instagram, TikTok, X/Twitter, YouTube, Facebook, Threads, LinkedIn
   - ให้ข้อมูลครบถ้วน: username, followers, verified status
   - ถ้าเป็นคนไทย ให้ค้นหาใน platform ไทยด้วย

2. **คนหน้าคล้าย (Lookalikes)**:
   - หาคนดัง/คนที่มีชื่อเสียงที่มีใบหน้าคล้ายกัน
   - อธิบายว่าคล้ายกันตรงไหน
   - ให้ Social Media ของคนหน้าคล้ายด้วย

3. **Chain-of-Thought Reasoning**:
   - อธิบายกระบวนการคิดของคุณ
   - ทำไมถึงคิดว่าเป็นคนนี้
   - หลักฐานอะไรที่สนับสนุน

## ตอบเป็น JSON เท่านั้น (ห้ามมี markdown):
{
  "reasoning": [
    "ขั้นตอนที่ 1: สังเกตลักษณะใบหน้า...",
    "ขั้นตอนที่ 2: เปรียบเทียบกับบุคคลที่รู้จัก...",
    "ขั้นตอนที่ 3: ยืนยันตัวตน..."
  ],
  "persons": [
    {
      "name": "ชื่อจริง (ถ้าระบุได้)",
      "confidence": 85,
      "occupation": "อาชีพ",
      "bio": "ประวัติโดยย่อ 3-5 ประโยค",
      "nationality": "สัญชาติ",
      "age": "อายุจริง",
      "socialProfiles": [
        {"platform": "Instagram", "username": "username", "url": "https://instagram.com/username", "followers": "1.2M", "verified": true},
        {"platform": "TikTok", "username": "username", "url": "https://tiktok.com/@username", "followers": "500K", "verified": false},
        {"platform": "X", "username": "username", "url": "https://x.com/username", "followers": "200K", "verified": true},
        {"platform": "YouTube", "username": "username", "url": "https://youtube.com/@username", "followers": "100K", "verified": true},
        {"platform": "Threads", "username": "username", "url": "https://threads.net/@username", "followers": "50K", "verified": false}
      ],
      "sources": ["https://example.com"],
      "facialFeatures": ["ลักษณะเด่นที่ทำให้ระบุได้"]
    }
  ],
  "lookalikes": [
    {
      "name": "ชื่อคนที่หน้าคล้าย",
      "confidence": 70,
      "occupation": "อาชีพ",
      "bio": "หน้าคล้ายเพราะ: [อธิบายความคล้าย]",
      "nationality": "สัญชาติ",
      "socialProfiles": [
        {"platform": "Instagram", "username": "lookalike_user", "url": "https://instagram.com/lookalike_user", "followers": "50K", "verified": false}
      ],
      "sources": [],
      "facialFeatures": ["ลักษณะที่คล้ายกัน"]
    }
  ]
}

## กฎสำคัญ:
- persons: คนที่คุณคิดว่าเป็นคนในรูป (อาจว่างเปล่าถ้าไม่รู้จัก)
- lookalikes: คนดังที่หน้าคล้าย (ต้องมีอย่างน้อย 2-3 คน)
- confidence: 50-95% ตามความมั่นใจจริง
- พยายามหา Social Media ให้ครบทุก platform
- ถ้าเป็นคนไทย ให้หา influencer ไทย/คนดังไทย
- ถ้าเป็นคนต่างชาติ ให้หา celebrity/influencer ต่างชาติ`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageData } }
          ]
        }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 8192 }
      })
    }
  );

  if (!response.ok) throw new Error('Identity search failed');
  
  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  console.log('Identity search response length:', content.length);
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        persons: result.persons || [],
        lookalikes: result.lookalikes || []
      };
    }
  } catch (e) {
    console.error('Parse error in searchIdentity:', e);
  }
  
  return { persons: [], lookalikes: [] };
}

// Stage 3: Enhance with additional verification
async function enhanceResults(
  persons: PersonInfo[],
  lookalikes: PersonInfo[],
  apiKey: string
): Promise<{ persons: PersonInfo[], lookalikes: PersonInfo[] }> {
  
  // Fix and validate social profile URLs
  const fixProfiles = (profileList: PersonInfo[]): PersonInfo[] => {
    return profileList.map(person => ({
      ...person,
      confidence: Math.min(Math.max(person.confidence || 50, 10), 95),
      socialProfiles: (person.socialProfiles || []).map(profile => {
        let url = profile.url || '#';
        const platform = (profile.platform || '').toLowerCase();
        const username = (profile.username || '').replace('@', '');
        
        if (username && platform) {
          switch (platform) {
            case 'instagram':
              url = `https://instagram.com/${username}`;
              break;
            case 'twitter':
            case 'x':
              url = `https://x.com/${username}`;
              break;
            case 'tiktok':
              url = `https://tiktok.com/@${username}`;
              break;
            case 'threads':
              url = `https://threads.net/@${username}`;
              break;
            case 'facebook':
              url = `https://facebook.com/${username}`;
              break;
            case 'youtube':
              url = `https://youtube.com/@${username}`;
              break;
            case 'linkedin':
              url = `https://linkedin.com/in/${username}`;
              break;
          }
        }
        
        return {
          platform: profile.platform || 'Unknown',
          username: username,
          url: url,
          followers: profile.followers || null,
          bio: profile.bio || null,
          verified: profile.verified || false
        };
      })
    }));
  };

  return {
    persons: fixProfiles(persons),
    lookalikes: fixProfiles(lookalikes)
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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured', persons: [], lookalikes: [] }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log('Starting multi-stage face analysis...');

    // Stage 1: Deep Face Analysis
    console.log('Stage 1: Analyzing face...');
    const faceAnalysis = await analyzeFace(imageData, mimeType, GEMINI_API_KEY);
    
    if (!faceAnalysis.detected) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          error: 'ไม่พบใบหน้าในรูปภาพ', 
          persons: [],
          lookalikes: [],
          faceAnalysis
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Face detected:', faceAnalysis.gender, faceAnalysis.estimatedAge);

    // Stage 2: Identity Search with Chain-of-Thought
    console.log('Stage 2: Searching identity...');
    const identityResult = await searchIdentity(faceAnalysis, imageData, mimeType, GEMINI_API_KEY);
    
    console.log('Identity search results:', {
      persons: identityResult.persons.length,
      lookalikes: identityResult.lookalikes.length
    });

    // Stage 3: Enhance and validate results
    console.log('Stage 3: Enhancing results...');
    const enhancedResults = await enhanceResults(
      identityResult.persons, 
      identityResult.lookalikes,
      GEMINI_API_KEY
    );

    const result = {
      success: true,
      faceAnalysis: {
        detected: true,
        gender: faceAnalysis.gender,
        estimatedAge: faceAnalysis.estimatedAge,
        ethnicity: faceAnalysis.ethnicity,
        facialFeatures: faceAnalysis.facialFeatures
      },
      persons: enhancedResults.persons,
      lookalikes: enhancedResults.lookalikes,
      possibleIdentity: faceAnalysis.possibleIdentity
    };

    console.log('Final results:', {
      persons: result.persons.length,
      lookalikes: result.lookalikes.length
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Face search error:', error);
    
    if (error instanceof Error && error.message.includes('429')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. กรุณารอสักครู่', persons: [], lookalikes: [] }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
