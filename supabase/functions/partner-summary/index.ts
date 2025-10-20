import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface PartnerSummaryRequest {
  partner_id: string
  start_date?: string
  end_date?: string
}

interface PartnerSummary {
  partner_id: string
  partner_name: string
  period: {
    start_date: string
    end_date: string
  }
  metrics: {
    total_referrals: number
    converted_referrals: number
    conversion_rate: number
    total_payments: number
    total_payment_amount: number
    total_commission_amount: number
    pending_commission: number
    paid_commission: number
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify API key from headers
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify partner API key
    const { data: partner, error: partnerError } = await supabaseClient
      .from('partners')
      .select('id, name, status')
      .eq('api_key', apiKey)
      .eq('status', 'active')
      .single()

    if (partnerError || !partner) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body for date range
    let startDate: string
    let endDate: string

    if (req.method === 'GET') {
      const url = new URL(req.url)
      startDate = url.searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      endDate = url.searchParams.get('end_date') || new Date().toISOString().split('T')[0]
    } else {
      const body: PartnerSummaryRequest = await req.json()
      startDate = body.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      endDate = body.end_date || new Date().toISOString().split('T')[0]
    }

    // Get referral metrics
    const { data: referralMetrics, error: referralError } = await supabaseClient
      .rpc('get_partner_referral_metrics', {
        p_partner_id: partner.id,
        p_start_date: startDate,
        p_end_date: endDate
      })

    if (referralError) {
      console.error('Error getting referral metrics:', referralError)
      return new Response(
        JSON.stringify({ error: 'Failed to get referral metrics' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get commission metrics
    const { data: commissionMetrics, error: commissionError } = await supabaseClient
      .rpc('get_partner_commission_metrics', {
        p_partner_id: partner.id,
        p_start_date: startDate,
        p_end_date: endDate
      })

    if (commissionError) {
      console.error('Error getting commission metrics:', commissionError)
      return new Response(
        JSON.stringify({ error: 'Failed to get commission metrics' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build response
    const summary: PartnerSummary = {
      partner_id: partner.id,
      partner_name: partner.name,
      period: {
        start_date: startDate,
        end_date: endDate
      },
      metrics: {
        total_referrals: referralMetrics?.total_referrals || 0,
        converted_referrals: referralMetrics?.converted_referrals || 0,
        conversion_rate: referralMetrics?.total_referrals > 0 
          ? (referralMetrics?.converted_referrals || 0) / referralMetrics.total_referrals * 100 
          : 0,
        total_payments: commissionMetrics?.total_payments || 0,
        total_payment_amount: parseFloat(commissionMetrics?.total_payment_amount || '0'),
        total_commission_amount: parseFloat(commissionMetrics?.total_commission_amount || '0'),
        pending_commission: parseFloat(commissionMetrics?.pending_commission || '0'),
        paid_commission: parseFloat(commissionMetrics?.paid_commission || '0')
      }
    }

    return new Response(
      JSON.stringify(summary),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in partner-summary function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
