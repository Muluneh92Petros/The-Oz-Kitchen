-- ========================================
-- OZ Kitchen RPC Functions
-- Version: 005
-- Description: Create RPC functions for business logic and partner APIs
-- ========================================

-- ========================================
-- PARTNER REFERRAL METRICS FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION get_partner_referral_metrics(
    p_partner_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_referrals BIGINT,
    converted_referrals BIGINT,
    pending_referrals BIGINT,
    expired_referrals BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE status = 'converted') as converted_referrals,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_referrals,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_referrals
    FROM referrals
    WHERE partner_id = p_partner_id
    AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- PARTNER COMMISSION METRICS FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION get_partner_commission_metrics(
    p_partner_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    total_payments BIGINT,
    total_payment_amount NUMERIC,
    total_commission_amount NUMERIC,
    pending_commission NUMERIC,
    approved_commission NUMERIC,
    paid_commission NUMERIC,
    reversed_commission NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(payment_amount), 0) as total_payment_amount,
        COALESCE(SUM(commission_amount), 0) as total_commission_amount,
        COALESCE(SUM(commission_amount) FILTER (WHERE status = 'pending'), 0) as pending_commission,
        COALESCE(SUM(commission_amount) FILTER (WHERE status = 'approved'), 0) as approved_commission,
        COALESCE(SUM(commission_amount) FILTER (WHERE status = 'paid'), 0) as paid_commission,
        COALESCE(SUM(commission_amount) FILTER (WHERE status = 'reversed'), 0) as reversed_commission
    FROM partner_commissions
    WHERE partner_id = p_partner_id
    AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- PARTNER COMMISSION LEDGER FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION get_partner_commission_ledger(
    p_partner_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_amount NUMERIC,
    commission_rate NUMERIC,
    commission_amount NUMERIC,
    status TEXT,
    settlement_date DATE,
    settlement_reference TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id,
        pc.created_at as payment_date,
        pc.payment_amount,
        pc.commission_rate,
        pc.commission_amount,
        pc.status,
        pc.settlement_date,
        pc.settlement_reference
    FROM partner_commissions pc
    WHERE pc.partner_id = p_partner_id
    AND DATE(pc.created_at) BETWEEN p_start_date AND p_end_date
    ORDER BY pc.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- USER MEAL PLAN SUMMARY FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION get_user_meal_plan_summary(
    p_user_id UUID,
    p_week_start_date DATE
)
RETURNS TABLE(
    meal_plan_id UUID,
    total_meals INTEGER,
    total_amount NUMERIC,
    status TEXT,
    meals JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.id as meal_plan_id,
        COUNT(mpi.id)::INTEGER as total_meals,
        mp.total_amount,
        mp.status,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'meal_id', m.id,
                    'meal_name', m.name,
                    'delivery_date', mpi.delivery_date,
                    'quantity', mpi.quantity,
                    'unit_price', mpi.unit_price,
                    'image_url', m.image_url
                )
                ORDER BY mpi.delivery_date
            ) FILTER (WHERE m.id IS NOT NULL),
            '[]'::jsonb
        ) as meals
    FROM meal_plans mp
    LEFT JOIN meal_plan_items mpi ON mp.id = mpi.meal_plan_id
    LEFT JOIN meals m ON mpi.meal_id = m.id
    WHERE mp.user_id = p_user_id
    AND mp.week_start_date = p_week_start_date
    GROUP BY mp.id, mp.total_amount, mp.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- AVAILABLE MEALS FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION get_available_meals(
    p_delivery_date DATE DEFAULT CURRENT_DATE,
    p_category_id UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    category_name TEXT,
    base_price NUMERIC,
    image_url TEXT,
    ingredients TEXT[],
    nutritional_info JSONB,
    dietary_tags TEXT[],
    preparation_time INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.name,
        m.description,
        mc.name as category_name,
        m.base_price,
        m.image_url,
        m.ingredients,
        m.nutritional_info,
        m.dietary_tags,
        m.preparation_time
    FROM meals m
    JOIN meal_categories mc ON m.category_id = mc.id
    WHERE m.is_available = true
    AND mc.is_active = true
    AND (p_category_id IS NULL OR m.category_id = p_category_id)
    -- Add availability schedule check here if needed
    ORDER BY mc.sort_order, m.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- USER ORDER HISTORY FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION get_user_order_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    order_number TEXT,
    status TEXT,
    total_amount NUMERIC,
    payment_status TEXT,
    delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    meal_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.order_number,
        o.status,
        o.total_amount,
        o.payment_status,
        o.delivery_date,
        o.created_at,
        COALESCE(
            (SELECT COUNT(*)::INTEGER 
             FROM meal_plan_items mpi 
             JOIN meal_plans mp ON mpi.meal_plan_id = mp.id 
             WHERE mp.id = o.meal_plan_id), 
            0
        ) as meal_count
    FROM orders o
    WHERE o.user_id = p_user_id
    ORDER BY o.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- LINK REFERRAL TO USER FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION link_referral_to_user(
    p_referral_token TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    referral_id UUID;
    partner_id UUID;
BEGIN
    -- Find the referral by token
    SELECT r.id, r.partner_id INTO referral_id, partner_id
    FROM referrals r
    WHERE r.referral_token = p_referral_token
    AND r.status = 'pending'
    AND r.expires_at > NOW()
    LIMIT 1;
    
    IF referral_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update referral with user ID and mark as converted
    UPDATE referrals 
    SET 
        user_id = p_user_id,
        status = 'converted',
        converted_at = NOW()
    WHERE id = referral_id;
    
    -- Update user profile with referral information
    UPDATE profiles 
    SET 
        referral_source = referral_id,
        referral_partner_id = partner_id
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GENERATE MONTHLY SETTLEMENT FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION generate_monthly_settlement(
    p_partner_id UUID,
    p_settlement_month DATE
)
RETURNS UUID AS $$
DECLARE
    settlement_id UUID;
    settlement_data RECORD;
    period_start DATE;
    period_end DATE;
BEGIN
    -- Calculate period boundaries
    period_start := DATE_TRUNC('month', p_settlement_month)::DATE;
    period_end := (DATE_TRUNC('month', p_settlement_month) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Check if settlement already exists for this period
    SELECT id INTO settlement_id
    FROM commission_settlements
    WHERE partner_id = p_partner_id
    AND settlement_period_start = period_start
    AND settlement_period_end = period_end;
    
    IF settlement_id IS NOT NULL THEN
        RETURN settlement_id;
    END IF;
    
    -- Calculate monthly totals
    SELECT 
        COUNT(*) as total_payments,
        COUNT(DISTINCT user_id) as total_users,
        SUM(commission_amount) as total_commission
    INTO settlement_data
    FROM partner_commissions
    WHERE partner_id = p_partner_id
    AND status = 'approved'
    AND DATE(created_at) BETWEEN period_start AND period_end;
    
    -- Create settlement record
    INSERT INTO commission_settlements (
        partner_id, 
        settlement_period_start, 
        settlement_period_end,
        total_commissions, 
        total_payments_count, 
        total_referred_users
    ) VALUES (
        p_partner_id, 
        period_start, 
        period_end,
        COALESCE(settlement_data.total_commission, 0), 
        COALESCE(settlement_data.total_payments, 0), 
        COALESCE(settlement_data.total_users, 0)
    ) RETURNING id INTO settlement_id;
    
    RETURN settlement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ========================================
GRANT EXECUTE ON FUNCTION get_available_meals TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_meal_plan_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_order_history TO authenticated;
GRANT EXECUTE ON FUNCTION link_referral_to_user TO authenticated;

-- Grant permissions to service role for partner functions
GRANT EXECUTE ON FUNCTION get_partner_referral_metrics TO service_role;
GRANT EXECUTE ON FUNCTION get_partner_commission_metrics TO service_role;
GRANT EXECUTE ON FUNCTION get_partner_commission_ledger TO service_role;
GRANT EXECUTE ON FUNCTION generate_monthly_settlement TO service_role;
