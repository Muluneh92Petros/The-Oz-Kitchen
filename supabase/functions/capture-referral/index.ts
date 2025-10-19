import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CaptureReferralRequest {
  referral_token: string
  user_agent?: string
  campaign_data?: Record<string, any>
}

interface CaptureReferralResponse {
  success: boolean
  referral_id?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { referral_token, user_agent, campaign_data }: CaptureReferralRequest = await req.json()

    if (!referral_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Referral token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract client IP address
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'

    // Decode and validate referral token
    const tokenParts = referral_token.split('-')
    if (tokenParts.length !== 2 || tokenParts[0] !== 'SUPAPP') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid referral token format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const encodedPayload = tokenParts[1]
    
    // For now, we'll use a simple validation. In production, you'd verify JWT signature
    try {
      // Decode the token payload (this would be JWT verification in production)
      const payload = JSON.parse(atob(encodedPayload))
      
      // Verify token hasn't expired
      if (payload.expires && payload.expires < Date.now()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Referral token has expired' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Get partner information
      const { data: partner, error: partnerError } = await supabaseClient
        .from('partners')
        .select('id, status')
        .eq('partner_code', 'SUPAPP')
        .eq('status', 'active')
        .single()

      if (partnerError || !partner) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or inactive partner' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Generate anonymous user ID
      const anonUserId = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`${clientIP}:${user_agent}:${Date.now()}`)
      ).then(hash => Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 16))

      // Check if referral already exists for this token
      const { data: existingReferral } = await supabaseClient
        .from('referrals')
        .select('id')
        .eq('referral_token', referral_token)
        .eq('status', 'pending')
        .single()

      if (existingReferral) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            referral_id: existingReferral.id,
            message: 'Referral already captured'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create new referral record
      const { data: referral, error: referralError } = await supabaseClient
        .from('referrals')
        .insert({
          partner_id: partner.id,
          referral_token,
          anon_user_id: anonUserId,
          campaign_id: payload.campaign_id || campaign_data?.campaign_id,
          ip_address: clientIP,
          user_agent: user_agent || req.headers.get('user-agent'),
          status: 'pending',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select('id')
        .single()

      if (referralError) {
        console.error('Error creating referral:', referralError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to capture referral' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const response: CaptureReferralResponse = {
        success: true,
        referral_id: referral.id
      }

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (decodeError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid referral token' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in capture-referral function:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
