import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface WebhookPayload {
  // Common fields
  status: string
  transaction_id: string
  reference: string
  amount: number
  currency: string
  
  // Telebirr specific
  telebirr_transaction_id?: string
  
  // Chapa specific
  tx_ref?: string
  charge_response_code?: string
  charge_response_message?: string
  
  // Additional data
  customer?: any
  meta?: any
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

    const payload: WebhookPayload = await req.json()
    console.log('Payment webhook received:', payload)

    // Determine payment gateway
    const isChapa = payload.tx_ref !== undefined
    const isTelebirr = payload.telebirr_transaction_id !== undefined

    if (!isChapa && !isTelebirr) {
      return new Response(
        JSON.stringify({ error: 'Unknown payment gateway' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify webhook signature (implement based on gateway requirements)
    if (isChapa) {
      const isValid = await verifyChapaSig(req, payload)
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid Chapa signature' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    if (isTelebirr) {
      const isValid = await verifyTelebirrSig(req, payload)
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid Telebirr signature' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Find payment record
    const paymentId = payload.reference || payload.tx_ref
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select(`
        *,
        orders (
          id,
          user_id,
          status,
          total_amount
        )
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentId, paymentError)
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine payment status
    let paymentStatus: 'completed' | 'failed' | 'pending' = 'pending'
    let orderStatus: string = payment.orders.status

    if (isChapa) {
      paymentStatus = payload.status === 'success' ? 'completed' : 'failed'
    } else if (isTelebirr) {
      paymentStatus = payload.status === 'COMPLETED' ? 'completed' : 'failed'
    }

    // Update payment record
    const { error: updatePaymentError } = await supabaseClient
      .from('payments')
      .update({
        status: paymentStatus,
        external_transaction_id: payload.transaction_id || payload.telebirr_transaction_id,
        payment_gateway_response: payload,
        processed_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (updatePaymentError) {
      console.error('Error updating payment:', updatePaymentError)
      return new Response(
        JSON.stringify({ error: 'Failed to update payment' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update order status if payment successful
    if (paymentStatus === 'completed') {
      orderStatus = 'paid'
      
      const { error: updateOrderError } = await supabaseClient
        .from('orders')
        .update({
          status: orderStatus,
          payment_status: 'paid'
        })
        .eq('id', payment.orders.id)

      if (updateOrderError) {
        console.error('Error updating order:', updateOrderError)
      }

      // Create success notification
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: payment.orders.user_id,
          title: 'Payment Successful! 🎉',
          message: `Your payment of ${payment.amount} ETB has been processed successfully. Your order is now confirmed.`,
          type: 'payment',
          data: {
            payment_id: paymentId,
            order_id: payment.orders.id,
            amount: payment.amount,
            transaction_id: payload.transaction_id || payload.telebirr_transaction_id
          }
        })

      // Update meal plan status to confirmed
      if (payment.orders.meal_plan_id) {
        await supabaseClient
          .from('meal_plans')
          .update({ status: 'confirmed' })
          .eq('id', payment.orders.meal_plan_id)
      }

    } else if (paymentStatus === 'failed') {
      // Create failure notification
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: payment.orders.user_id,
          title: 'Payment Failed ❌',
          message: `Your payment of ${payment.amount} ETB could not be processed. Please try again or contact support.`,
          type: 'payment',
          data: {
            payment_id: paymentId,
            order_id: payment.orders.id,
            amount: payment.amount,
            error: payload.charge_response_message || 'Payment processing failed'
          }
        })
    }

    // Send webhook response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        payment_status: paymentStatus,
        order_status: orderStatus
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing payment webhook:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Verify Chapa webhook signature
async function verifyChapaSig(req: Request, payload: any): Promise<boolean> {
  try {
    const signature = req.headers.get('chapa-signature')
    const secret = Deno.env.get('CHAPA_WEBHOOK_SECRET')
    
    if (!signature || !secret) {
      return false
    }

    // Create expected signature
    const payloadString = JSON.stringify(payload)
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadString))
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return signature === expectedSignature
  } catch (error) {
    console.error('Error verifying Chapa signature:', error)
    return false
  }
}

// Verify Telebirr webhook signature
async function verifyTelebirrSig(req: Request, payload: any): Promise<boolean> {
  try {
    const signature = req.headers.get('x-telebirr-signature')
    const secret = Deno.env.get('TELEBIRR_API_SECRET')
    
    if (!signature || !secret) {
      return false
    }

    // Implement Telebirr signature verification logic
    // This depends on Telebirr's specific signature algorithm
    const payloadString = JSON.stringify(payload)
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadString))
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return signature === expectedSignature
  } catch (error) {
    console.error('Error verifying Telebirr signature:', error)
    return false
  }
}
