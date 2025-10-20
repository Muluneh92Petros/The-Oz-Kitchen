import { supabase } from './supabase'

export interface ReferralData {
  partner_id: string
  campaign_id?: string
  timestamp: number
  expires: number
}

export interface ReferralTokenData {
  referral_token: string
  referral_id?: string
  partner_name?: string
  campaign_name?: string
}

// Generate referral URL for partners
export function generateReferralUrl(partnerCode: string, campaignId?: string): string {
  const payload: ReferralData = {
    partner_id: partnerCode,
    campaign_id: campaignId,
    timestamp: Date.now(),
    expires: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
  }

  // In production, this would be a properly signed JWT
  const token = btoa(JSON.stringify(payload))
  const baseUrl = import.meta.env.VITE_APP_URL || 'http://localhost:8080'
  
  return `${baseUrl}/signup?ref=${partnerCode}-${token}`
}

// Extract referral data from URL
export function extractReferralFromUrl(url: string): ReferralTokenData | null {
  try {
    const urlObj = new URL(url)
    const refParam = urlObj.searchParams.get('ref')
    
    if (!refParam) return null

    const parts = refParam.split('-')
    if (parts.length !== 2) return null

    const [partnerCode, encodedPayload] = parts
    
    try {
      const payload: ReferralData = JSON.parse(atob(encodedPayload))
      
      // Check if token is expired
      if (payload.expires < Date.now()) {
        return null
      }

      return {
        referral_token: refParam,
        partner_name: getPartnerName(partnerCode),
        campaign_name: payload.campaign_id
      }
    } catch {
      return null
    }
  } catch {
    return null
  }
}

// Get partner display name
function getPartnerName(partnerCode: string): string {
  const partnerNames: Record<string, string> = {
    'SUPAPP': 'Student Super App',
    'CAMPUS': 'Campus Connect'
  }
  
  return partnerNames[partnerCode] || 'Partner App'
}

// Capture referral (called when user visits with referral link)
export async function captureReferral(referralToken: string): Promise<{ success: boolean; referral_id?: string; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-referral`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        referral_token: referralToken,
        user_agent: navigator.userAgent,
        campaign_data: {
          source: 'web',
          timestamp: new Date().toISOString(),
          page: window.location.pathname
        }
      })
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error capturing referral:', error)
    return { success: false, error: 'Failed to capture referral' }
  }
}

// Link referral to user after signup
export async function linkReferralToUser(referralToken: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('link_referral_to_user', {
      p_referral_token: referralToken,
      p_user_id: userId
    })

    if (error) {
      console.error('Error linking referral:', error)
      return false
    }

    return data === true
  } catch (error) {
    console.error('Error linking referral:', error)
    return false
  }
}

// Get user's referral status
export async function getUserReferralStatus(): Promise<{
  isReferred: boolean
  partnerName?: string
  referralDate?: string
  commissionEarned?: number
} | null> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return null

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        referral_source,
        referral_partner_id,
        created_at,
        partners:referral_partner_id (
          name
        ),
        referrals:referral_source (
          created_at,
          status
        )
      `)
      .eq('id', user.user.id)
      .single()

    if (error || !profile) return null

    if (!profile.referral_source) {
      return { isReferred: false }
    }

    // Get commission earned for this user (if any)
    const { data: commissions } = await supabase
      .from('partner_commissions')
      .select('commission_amount')
      .eq('user_id', user.user.id)
      .eq('status', 'paid')

    const totalCommission = commissions?.reduce((sum, c) => sum + parseFloat(c.commission_amount.toString()), 0) || 0

    return {
      isReferred: true,
      partnerName: profile.partners?.name,
      referralDate: profile.referrals?.created_at,
      commissionEarned: totalCommission
    }
  } catch (error) {
    console.error('Error getting referral status:', error)
    return null
  }
}

// Validate referral token
export function validateReferralToken(token: string): boolean {
  try {
    const parts = token.split('-')
    if (parts.length !== 2) return false

    const [partnerCode, encodedPayload] = parts
    const payload: ReferralData = JSON.parse(atob(encodedPayload))

    // Check if token is expired
    if (payload.expires < Date.now()) return false

    // Check if partner code is valid
    const validPartners = ['SUPAPP', 'CAMPUS']
    if (!validPartners.includes(partnerCode)) return false

    return true
  } catch {
    return false
  }
}

// Store referral in session for later use
export function storeReferralInSession(referralData: ReferralTokenData): void {
  try {
    sessionStorage.setItem('oz_referral_data', JSON.stringify(referralData))
  } catch (error) {
    console.error('Error storing referral data:', error)
  }
}

// Get referral from session
export function getReferralFromSession(): ReferralTokenData | null {
  try {
    const stored = sessionStorage.getItem('oz_referral_data')
    if (!stored) return null
    
    return JSON.parse(stored)
  } catch (error) {
    console.error('Error getting referral data:', error)
    return null
  }
}

// Clear referral from session
export function clearReferralFromSession(): void {
  try {
    sessionStorage.removeItem('oz_referral_data')
  } catch (error) {
    console.error('Error clearing referral data:', error)
  }
}
