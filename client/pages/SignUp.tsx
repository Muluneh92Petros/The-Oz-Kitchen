import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SignUpForm from '@/components/auth/SignUpForm'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { supabase } from '@/lib/supabase'

export default function SignUp() {
  const [searchParams] = useSearchParams()
  const [referralToken, setReferralToken] = useState<string | null>(null)
  const [referralProcessed, setReferralProcessed] = useState(false)

  useEffect(() => {
    const refParam = searchParams.get('ref')
    
    if (refParam && !referralProcessed) {
      // Capture referral when user visits signup page
      captureReferral(refParam)
      setReferralToken(refParam)
      setReferralProcessed(true)
    }
  }, [searchParams, referralProcessed])

  const captureReferral = async (token: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-referral`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          referral_token: token,
          user_agent: navigator.userAgent,
          campaign_data: {
            source: 'signup_page',
            timestamp: new Date().toISOString()
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('Referral captured successfully:', result.referral_id)
        // Store referral ID in session storage for later use
        sessionStorage.setItem('referral_id', result.referral_id)
      } else {
        console.error('Failed to capture referral:', result.error)
      }
    } catch (error) {
      console.error('Error capturing referral:', error)
    }
  }

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="https://api.builder.io/api/v1/image/assets/TEMP/ca87422a8faf30fea1aaea80c57344f579cee4ef?width=258" 
              alt="OZ Kitchen" 
              className="w-20 h-20 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground">OZ Kitchen</h1>
            <p className="text-muted-foreground">Fresh, Affordable Lunchboxes</p>
          </div>
          
          <SignUpForm referralToken={referralToken} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
