import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ProcessPaymentRequest {
  order_id: string
  payment_method: 'telebirr' | 'chapa'
  amount: number
  currency?: string
  customer_info?: {
    phone?: string
    email?: string
    name?: string
  }
}

interface PaymentResponse {
  success: boolean
  payment_id?: string
  checkout_url?: string
  transaction_id?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      order_id, 
      payment_method, 
      amount, 
      currency = 'ETB',
      customer_info 
    }: ProcessPaymentRequest = await req.json()

    // Validate required fields
    if (!order_id || !payment_method || !amount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: order_id, payment_method, amount' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          phone_number,
          referral_source
        )
      `)
      .eq('id', order_id)
      .eq('status', 'pending')
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Order not found or not in pending status' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify amount matches order total
    if (Math.abs(amount - parseFloat(order.total_amount)) > 0.01) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Payment amount does not match order total' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .insert({
        order_id,
        payment_method,
        amount,
        currency,
        status: 'pending',
        referral_id: order.profiles?.referral_source,
        commission_eligible: !!order.profiles?.referral_source
      })
      .select('id')
      .single()

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create payment record' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let paymentResult: any
    let checkoutUrl: string | undefined

    // Process payment based on method
    if (payment_method === 'telebirr') {
      paymentResult = await processTelebirrPayment({
        amount,
        currency,
        order_id,
        payment_id: payment.id,
        customer_info: {
          phone: customer_info?.phone || order.profiles?.phone_number,
          name: `${order.profiles?.first_name || ''} ${order.profiles?.last_name || ''}`.trim()
        }
      })
    } else if (payment_method === 'chapa') {
      paymentResult = await processChapaPayment({
        amount,
        currency,
        order_id,
        payment_id: payment.id,
        customer_info: {
          email: customer_info?.email,
          phone: customer_info?.phone || order.profiles?.phone_number,
          name: `${order.profiles?.first_name || ''} ${order.profiles?.last_name || ''}`.trim()
        }
      })
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unsupported payment method' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!paymentResult.success) {
      // Update payment status to failed
      await supabaseClient
        .from('payments')
        .update({ 
          status: 'failed',
          payment_gateway_response: paymentResult.error
        })
        .eq('id', payment.id)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: paymentResult.error 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update payment with gateway response
    await supabaseClient
      .from('payments')
      .update({
        external_transaction_id: paymentResult.transaction_id,
        payment_gateway_response: paymentResult.gateway_response
      })
      .eq('id', payment.id)

    const response: PaymentResponse = {
      success: true,
      payment_id: payment.id,
      checkout_url: paymentResult.checkout_url,
      transaction_id: paymentResult.transaction_id
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in process-payment function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Telebirr payment processing
async function processTelebirrPayment(params: any) {
  try {
    const telebirrApiKey = Deno.env.get('TELEBIRR_API_KEY')
    const telebirrSecret = Deno.env.get('TELEBIRR_API_SECRET')
    const telebirrBaseUrl = Deno.env.get('TELEBIRR_BASE_URL')

    if (!telebirrApiKey || !telebirrSecret || !telebirrBaseUrl) {
      throw new Error('Telebirr configuration missing')
    }

    // Prepare Telebirr payment request
    const paymentData = {
      amount: params.amount,
      currency: params.currency,
      reference: params.payment_id,
      description: `OZ Kitchen Order ${params.order_id}`,
      customer: {
        phone: params.customer_info.phone,
        name: params.customer_info.name
      },
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
      return_url: `${Deno.env.get('VITE_APP_URL')}/payment-success`
    }

    const response = await fetch(`${telebirrBaseUrl}/api/payment/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${telebirrApiKey}`,
        'X-API-Secret': telebirrSecret
      },
      body: JSON.stringify(paymentData)
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Telebirr payment initialization failed'
      }
    }

    return {
      success: true,
      transaction_id: result.transaction_id,
      checkout_url: result.checkout_url,
      gateway_response: result
    }

  } catch (error) {
    return {
      success: false,
      error: `Telebirr payment error: ${error.message}`
    }
  }
}

// Chapa payment processing
async function processChapaPayment(params: any) {
  try {
    const chapaApiKey = Deno.env.get('CHAPA_API_KEY')
    const chapaBaseUrl = Deno.env.get('CHAPA_BASE_URL')

    if (!chapaApiKey || !chapaBaseUrl) {
      throw new Error('Chapa configuration missing')
    }

    // Prepare Chapa payment request
    const paymentData = {
      amount: params.amount,
      currency: params.currency,
      tx_ref: params.payment_id,
      description: `OZ Kitchen Order ${params.order_id}`,
      customer: {
        email: params.customer_info.email || `${params.payment_id}@ozkitchen.com`,
        phone_number: params.customer_info.phone,
        name: params.customer_info.name
      },
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
      return_url: `${Deno.env.get('VITE_APP_URL')}/payment-success`
    }

    const response = await fetch(`${chapaBaseUrl}/v1/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chapaApiKey}`
      },
      body: JSON.stringify(paymentData)
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Chapa payment initialization failed'
      }
    }

    return {
      success: true,
      transaction_id: result.data.tx_ref,
      checkout_url: result.data.checkout_url,
      gateway_response: result
    }

  } catch (error) {
    return {
      success: false,
      error: `Chapa payment error: ${error.message}`
    }
  }
}
