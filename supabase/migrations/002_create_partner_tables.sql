-- ========================================
-- OZ Kitchen Partner Integration Tables
-- Version: 002
-- Description: Create partner referral and commission system tables
-- ========================================

-- ========================================
-- PARTNERS TABLE
-- ========================================
CREATE TABLE public.partners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- 'Student Super App'
    partner_code TEXT UNIQUE NOT NULL, -- 'SUPAPP'
    api_key TEXT UNIQUE NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00, -- 15%
    status TEXT CHECK (status IN ('active', 'suspended', 'inactive')) DEFAULT 'active',
    contact_email TEXT,
    webhook_url TEXT,
    settings JSONB DEFAULT '{}', -- partner-specific settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- REFERRALS TABLE (anonymous tracking)
-- ========================================
CREATE TABLE public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
    referral_token TEXT NOT NULL, -- signed JWT/HMAC token
    anon_user_id TEXT, -- encrypted anonymous identifier
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- linked after signup
    campaign_id TEXT, -- optional campaign tracking
    ip_address INET,
    user_agent TEXT,
    converted_at TIMESTAMP WITH TIME ZONE, -- when user signed up
    first_payment_at TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('pending', 'converted', 'expired')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- ========================================
-- PARTNER COMMISSIONS TABLE
-- ========================================
CREATE TABLE public.partner_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
    referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'paid', 'reversed')) DEFAULT 'pending',
    settlement_date DATE,
    settlement_reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- COMMISSION SETTLEMENTS TABLE (monthly payouts)
-- ========================================
CREATE TABLE public.commission_settlements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
    settlement_period_start DATE NOT NULL,
    settlement_period_end DATE NOT NULL,
    total_commissions DECIMAL(12,2) NOT NULL,
    total_payments_count INTEGER NOT NULL,
    total_referred_users INTEGER NOT NULL,
    status TEXT CHECK (status IN ('draft', 'pending', 'paid', 'disputed')) DEFAULT 'draft',
    payment_method TEXT,
    payment_reference TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ADD FOREIGN KEY CONSTRAINTS TO EXISTING TABLES
-- ========================================

-- Add referral tracking to profiles table
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_referral_source 
FOREIGN KEY (referral_source) REFERENCES referrals(id) ON DELETE SET NULL;

ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_referral_partner 
FOREIGN KEY (referral_partner_id) REFERENCES partners(id) ON DELETE SET NULL;

-- Add referral tracking to payments table
ALTER TABLE public.payments 
ADD CONSTRAINT fk_payments_referral 
FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL;

-- ========================================
-- PERFORMANCE INDEXES FOR PARTNER TABLES
-- ========================================
CREATE INDEX idx_partners_code ON partners(partner_code);
CREATE INDEX idx_partners_api_key ON partners(api_key);
CREATE INDEX idx_partners_status ON partners(status);

CREATE INDEX idx_referrals_partner ON referrals(partner_id);
CREATE INDEX idx_referrals_token ON referrals(referral_token);
CREATE INDEX idx_referrals_user ON referrals(user_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_expires ON referrals(expires_at);

CREATE INDEX idx_commissions_partner ON partner_commissions(partner_id);
CREATE INDEX idx_commissions_referral ON partner_commissions(referral_id);
CREATE INDEX idx_commissions_payment ON partner_commissions(payment_id);
CREATE INDEX idx_commissions_user ON partner_commissions(user_id);
CREATE INDEX idx_commissions_status ON partner_commissions(status);
CREATE INDEX idx_commissions_date ON partner_commissions(created_at);

CREATE INDEX idx_settlements_partner ON commission_settlements(partner_id);
CREATE INDEX idx_settlements_period ON commission_settlements(settlement_period_start, settlement_period_end);
CREATE INDEX idx_settlements_status ON commission_settlements(status);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE TRIGGER update_partners_updated_at 
    BEFORE UPDATE ON partners 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_commissions_updated_at 
    BEFORE UPDATE ON partner_commissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMMISSION CALCULATION TRIGGER
-- ========================================
CREATE OR REPLACE FUNCTION calculate_partner_commission()
RETURNS TRIGGER AS $$
DECLARE
    referral_record RECORD;
    commission_amount DECIMAL(10,2);
BEGIN
    -- Only process successful payments that haven't been processed yet
    IF NEW.status = 'completed' AND 
       (OLD.status IS NULL OR OLD.status != 'completed') AND 
       NEW.commission_eligible = true AND 
       NEW.commission_calculated = false THEN
        
        -- Get referral information
        SELECT r.*, p.commission_rate 
        INTO referral_record
        FROM referrals r
        JOIN partners p ON p.id = r.partner_id
        WHERE r.id = NEW.referral_id 
        AND r.status = 'converted'
        AND p.status = 'active'
        LIMIT 1;
        
        IF FOUND THEN
            -- Calculate commission
            commission_amount := NEW.amount * (referral_record.commission_rate / 100);
            
            -- Create commission record
            INSERT INTO partner_commissions (
                partner_id, referral_id, payment_id, user_id,
                payment_amount, commission_rate, commission_amount
            ) VALUES (
                referral_record.partner_id, 
                referral_record.id, 
                NEW.id, 
                (SELECT user_id FROM orders WHERE id = NEW.order_id),
                NEW.amount, 
                referral_record.commission_rate, 
                commission_amount
            );
            
            -- Mark payment as commission calculated
            NEW.commission_calculated = true;
            
            -- Update referral with first payment info if this is the first
            IF referral_record.first_payment_at IS NULL THEN
                UPDATE referrals 
                SET first_payment_at = NOW() 
                WHERE id = referral_record.id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for commission calculation
CREATE TRIGGER calculate_commission_trigger
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION calculate_partner_commission();

-- ========================================
-- REFERRAL EXPIRATION FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION expire_old_referrals()
RETURNS void AS $$
BEGIN
    UPDATE referrals 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ language 'plpgsql';

-- ========================================
-- PARTNER API KEY GENERATION FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION generate_partner_api_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.api_key IS NULL OR NEW.api_key = '' THEN
        NEW.api_key = 'pk_' || encode(gen_random_bytes(32), 'hex');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for API key generation
CREATE TRIGGER generate_api_key_trigger
    BEFORE INSERT ON partners
    FOR EACH ROW
    EXECUTE FUNCTION generate_partner_api_key();
