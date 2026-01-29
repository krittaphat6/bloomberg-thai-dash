// supabase/functions/gemini-file-analysis/index.ts
// ✅ ABLE AI - File & Image Analysis with Gemini

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
    const { file, fileName, fileType, prompt } = await req.json();
    
    console.log(`📁 Analyzing file: ${fileName} (${fileType})`);
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('No AI API key configured');
    }

    let parts: any[] = [];
    const isImage = fileType.startsWith('image/');
    const isPDF = fileType === 'application/pdf';
    const isSpreadsheet = fileType.includes('spreadsheet') || 
                          fileType.includes('excel') || 
                          fileName.endsWith('.xlsx') || 
                          fileName.endsWith('.xls') ||
                          fileName.endsWith('.csv');
    
    // Build request parts based on file type
    if (isImage || isPDF) {
      // For images and PDFs, use multimodal input
      const base64Data = file.includes(',') ? file.split(',')[1] : file;
      parts = [
        { text: `${prompt}\n\nไฟล์: ${fileName}` },
        { 
          inline_data: { 
            mime_type: fileType, 
            data: base64Data 
          } 
        }
      ];
    } else {
      // For text-based files (CSV, etc.)
      let content = '';
      try {
        if (file.includes('base64,')) {
          const base64 = file.split(',')[1];
          content = atob(base64);
        } else if (file.startsWith('data:')) {
          const base64 = file.split(',')[1] || '';
          content = atob(base64);
        } else {
          content = file;
        }
      } catch (e) {
        content = file.substring(0, 10000);
      }
      
      // Truncate if too long
      if (content.length > 15000) {
        content = content.substring(0, 15000) + '\n\n... (truncated)';
      }
      
      parts = [{ 
        text: `${prompt}\n\n📁 ไฟล์: ${fileName}\n📊 ประเภท: ${fileType}\n\n--- เนื้อหาไฟล์ ---\n${content}` 
      }];
    }

    // Build system prompt based on file type
    let systemPrompt = 'คุณเป็น ABLE AI ผู้เชี่ยวชาญด้านการวิเคราะห์เอกสารและข้อมูลการเงิน ตอบเป็นภาษาไทย';
    
    if (isImage) {
      systemPrompt = 'คุณเป็น ABLE AI ผู้เชี่ยวชาญวิเคราะห์รูปภาพ Chart, กราฟ, และข้อมูลการเงิน อธิบายสิ่งที่เห็นในรูปอย่างละเอียด ตอบเป็นภาษาไทย';
    } else if (isSpreadsheet) {
      systemPrompt = 'คุณเป็น ABLE AI ผู้เชี่ยวชาญวิเคราะห์ข้อมูลตาราง, CSV, Excel สรุปสถิติ หา pattern และ insight สำคัญ ตอบเป็นภาษาไทย';
    } else if (isPDF) {
      systemPrompt = 'คุณเป็น ABLE AI ผู้เชี่ยวชาญอ่านและสรุปเอกสาร PDF รายงาน และบทความ สรุปประเด็นสำคัญ ตอบเป็นภาษาไทย';
    }

    // Use Gemini API directly if available
    if (GEMINI_API_KEY) {
      console.log('🔮 Using Gemini API directly');
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { 
              temperature: 0.2, 
              maxOutputTokens: 4000 
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        
        if (response.status === 429) {
          throw new Error('Rate limit exceeded - กรุณารอสักครู่แล้วลองใหม่');
        }
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ไม่สามารถวิเคราะห์ได้';
      
      console.log(`✅ Analysis complete for ${fileName}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          fileName,
          fileType,
          analysis: text,
          model: 'gemini-2.5-flash'
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fallback to Lovable Gateway
    console.log('🔮 Using Lovable Gateway');
    
    // For gateway, we can only send text (no multimodal)
    const textContent = parts[0]?.text || prompt;
    
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
          { role: 'user', content: textContent }
        ],
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        throw new Error('Rate limit exceeded - กรุณารอสักครู่แล้วลองใหม่');
      }
      if (status === 402) {
        throw new Error('Credits หมด - กรุณาเติม Credits');
      }
      throw new Error(`Gateway error: ${status}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || 'ไม่สามารถวิเคราะห์ได้';
    
    console.log(`✅ Analysis complete for ${fileName}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName,
        fileType,
        analysis: text,
        model: 'gemini-2.5-flash (gateway)'
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('File analysis error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
