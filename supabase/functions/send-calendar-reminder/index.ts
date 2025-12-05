import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { eventTitle, eventDate, eventLocation, userEmail, eventDescription } = await req.json()

    console.log('📧 Sending calendar reminder:', { eventTitle, eventDate, userEmail })

    if (!userEmail || !eventTitle) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userEmail and eventTitle' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.log('⚠️ RESEND_API_KEY not configured, returning mock success')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email notification simulated (RESEND_API_KEY not configured)',
          demo: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format date for display
    const formattedDate = new Date(eventDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ABLE Terminal <noreply@resend.dev>',
        to: userEmail,
        subject: `📅 Reminder: ${eventTitle}`,
        html: `
          <div style="font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; padding: 30px; border: 1px solid #00ff00;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #00ff00; margin: 0; font-size: 24px;">📅 ABLE TERMINAL</h1>
              <p style="color: #666; margin: 5px 0;">Calendar Reminder</p>
            </div>
            
            <div style="background: #111; padding: 20px; border: 1px solid #333; border-radius: 4px;">
              <h2 style="color: #00ff00; margin: 0 0 15px 0; font-size: 20px;">${eventTitle}</h2>
              
              <table style="width: 100%; color: #ccc;">
                <tr>
                  <td style="padding: 8px 0; color: #888;">📅 Date & Time:</td>
                  <td style="padding: 8px 0;">${formattedDate}</td>
                </tr>
                ${eventLocation ? `
                <tr>
                  <td style="padding: 8px 0; color: #888;">📍 Location:</td>
                  <td style="padding: 8px 0;">${eventLocation}</td>
                </tr>
                ` : ''}
                ${eventDescription ? `
                <tr>
                  <td style="padding: 8px 0; color: #888; vertical-align: top;">📝 Notes:</td>
                  <td style="padding: 8px 0;">${eventDescription}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                This reminder was sent from ABLE Terminal Calendar.
              </p>
            </div>
          </div>
        `
      })
    })

    const result = await emailResponse.json()

    if (!emailResponse.ok) {
      console.error('❌ Resend API error:', result)
      throw new Error(result.message || 'Failed to send email')
    }

    console.log('✅ Email sent successfully:', result.id)

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error sending reminder:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
