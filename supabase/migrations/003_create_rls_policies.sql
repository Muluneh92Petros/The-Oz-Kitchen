-- ========================================
-- OZ Kitchen Row Level Security Policies
-- Version: 003
-- Description: Set up RLS policies for data security and privacy
-- ========================================

-- ========================================
-- ENABLE RLS ON ALL TABLES
-- ========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_settlements ENABLE ROW LEVEL SECURITY;

-- ========================================
-- HELPER FUNCTIONS FOR RLS
-- ========================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = user_id AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users 
        WHERE id = user_id AND role = 'super_admin' AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if request has valid partner API key
CREATE OR REPLACE FUNCTION is_valid_partner_api_key(api_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM partners 
        WHERE partners.api_key = is_valid_partner_api_key.api_key 
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get partner ID from API key
CREATE OR REPLACE FUNCTION get_partner_id_from_api_key(api_key TEXT)
RETURNS UUID AS $$
DECLARE
    partner_id UUID;
BEGIN
    SELECT id INTO partner_id 
    FROM partners 
    WHERE partners.api_key = get_partner_id_from_api_key.api_key 
    AND status = 'active';
    
    RETURN partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- PROFILES POLICIES
-- ========================================

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR ALL USING (is_admin(auth.uid()));

-- ========================================
-- MEAL CATEGORIES & MEALS POLICIES
-- ========================================

-- Everyone can view active meal categories and meals
CREATE POLICY "Anyone can view active meal categories" ON meal_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view available meals" ON meals
    FOR SELECT USING (is_available = true);

-- Admins can manage meal categories and meals
CREATE POLICY "Admins can manage meal categories" ON meal_categories
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage meals" ON meals
    FOR ALL USING (is_admin(auth.uid()));

-- ========================================
-- SUBSCRIPTION PLANS POLICIES
-- ========================================

-- Everyone can view active subscription plans
CREATE POLICY "Anyone can view active subscription plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- Admins can manage subscription plans
CREATE POLICY "Admins can manage subscription plans" ON subscription_plans
    FOR ALL USING (is_admin(auth.uid()));

-- ========================================
-- USER SUBSCRIPTIONS POLICIES
-- ========================================

-- Users can view and manage their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions" ON user_subscriptions
    FOR ALL USING (is_admin(auth.uid()));

-- ========================================
-- MEAL PLANS POLICIES
-- ========================================

-- Users can manage their own meal plans
CREATE POLICY "Users can view own meal plans" ON meal_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meal plans" ON meal_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans" ON meal_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans" ON meal_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all meal plans
CREATE POLICY "Admins can view all meal plans" ON meal_plans
    FOR ALL USING (is_admin(auth.uid()));

-- ========================================
-- MEAL PLAN ITEMS POLICIES
-- ========================================

-- Users can manage items in their own meal plans
CREATE POLICY "Users can view own meal plan items" ON meal_plan_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM meal_plans 
            WHERE meal_plans.id = meal_plan_items.meal_plan_id 
            AND meal_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own meal plan items" ON meal_plan_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM meal_plans 
            WHERE meal_plans.id = meal_plan_items.meal_plan_id 
            AND meal_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own meal plan items" ON meal_plan_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM meal_plans 
            WHERE meal_plans.id = meal_plan_items.meal_plan_id 
            AND meal_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own meal plan items" ON meal_plan_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM meal_plans 
            WHERE meal_plans.id = meal_plan_items.meal_plan_id 
            AND meal_plans.user_id = auth.uid()
        )
    );

-- Admins can view all meal plan items
CREATE POLICY "Admins can view all meal plan items" ON meal_plan_items
    FOR ALL USING (is_admin(auth.uid()));

-- ========================================
-- ORDERS POLICIES
-- ========================================

-- Users can view and create their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can manage all orders
CREATE POLICY "Admins can manage all orders" ON orders
    FOR ALL USING (is_admin(auth.uid()));

-- Kitchen staff can view and update orders
CREATE POLICY "Kitchen staff can manage orders" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('kitchen_staff', 'admin', 'super_admin') 
            AND is_active = true
        )
    );

-- ========================================
-- PAYMENTS POLICIES
-- ========================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = payments.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- System can create payments (via service role)
CREATE POLICY "System can create payments" ON payments
    FOR INSERT WITH CHECK (true);

-- Admins can view all payments
CREATE POLICY "Admins can view all payments" ON payments
    FOR ALL USING (is_admin(auth.uid()));

-- ========================================
-- DELIVERIES POLICIES
-- ========================================

-- Users can view deliveries for their orders
CREATE POLICY "Users can view own deliveries" ON deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = deliveries.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Users can update rating and feedback for their deliveries
CREATE POLICY "Users can rate own deliveries" ON deliveries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = deliveries.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- Delivery managers can manage deliveries
CREATE POLICY "Delivery managers can manage deliveries" ON deliveries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('delivery_manager', 'admin', 'super_admin') 
            AND is_active = true
        )
    );

-- ========================================
-- NOTIFICATIONS POLICIES
-- ========================================

-- Users can view and update their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- System can create notifications (via service role)
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications" ON notifications
    FOR ALL USING (is_admin(auth.uid()));

-- ========================================
-- ADMIN USERS POLICIES
-- ========================================

-- Only super admins can manage admin users
CREATE POLICY "Super admins can manage admin users" ON admin_users
    FOR ALL USING (is_super_admin(auth.uid()));

-- Admins can view their own record
CREATE POLICY "Admins can view own record" ON admin_users
    FOR SELECT USING (auth.uid() = id);

-- ========================================
-- PARTNER INTEGRATION POLICIES
-- ========================================

-- Only super admins can manage partners
CREATE POLICY "Super admins can manage partners" ON partners
    FOR ALL USING (is_super_admin(auth.uid()));

-- Partners can view their own data via API key (handled in Edge Functions)
-- No direct RLS policy needed as this will be handled via service role

-- ========================================
-- REFERRALS POLICIES
-- ========================================

-- No direct access to referrals table for users
-- All access handled via RPC functions and Edge Functions

-- Admins can view referrals (aggregated data only)
CREATE POLICY "Admins can view referrals" ON referrals
    FOR SELECT USING (is_admin(auth.uid()));

-- System can manage referrals (via service role)
CREATE POLICY "System can manage referrals" ON referrals
    FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- PARTNER COMMISSIONS POLICIES
-- ========================================

-- No direct access for users
-- Partners access via API (handled in Edge Functions)

-- Admins can view all commissions
CREATE POLICY "Admins can view all commissions" ON partner_commissions
    FOR SELECT USING (is_admin(auth.uid()));

-- System can manage commissions (via service role)
CREATE POLICY "System can manage commissions" ON partner_commissions
    FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- COMMISSION SETTLEMENTS POLICIES
-- ========================================

-- Only super admins can manage settlements
CREATE POLICY "Super admins can manage settlements" ON commission_settlements
    FOR ALL USING (is_super_admin(auth.uid()));

-- System can create settlements (via service role)
CREATE POLICY "System can create settlements" ON commission_settlements
    FOR INSERT WITH CHECK (auth.role() = 'service_role');
