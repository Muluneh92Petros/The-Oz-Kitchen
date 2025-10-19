-- ========================================
-- OZ Kitchen Sample Data
-- Version: 004
-- Description: Insert sample data for development and testing
-- ========================================

-- ========================================
-- MEAL CATEGORIES
-- ========================================
INSERT INTO meal_categories (id, name, description, image_url, is_active, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Fasting', 'Traditional Ethiopian fasting meals', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop', true, 1),
('550e8400-e29b-41d4-a716-446655440002', 'Regular', 'Regular Ethiopian meals with meat', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop', true, 2),
('550e8400-e29b-41d4-a716-446655440003', 'Vegetarian', 'Vegetarian Ethiopian dishes', 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=200&h=200&fit=crop', true, 3);

-- ========================================
-- MEALS
-- ========================================
INSERT INTO meals (id, name, description, category_id, base_price, image_url, ingredients, nutritional_info, dietary_tags, preparation_time, is_available, availability_schedule) VALUES
('550e8400-e29b-41d4-a716-446655440011', 'Shiro Ena Gomen', 'Traditional chickpea stew with collard greens', '550e8400-e29b-41d4-a716-446655440001', 170.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop', 
 ARRAY['chickpeas', 'collard greens', 'onions', 'garlic', 'berbere'], 
 '{"calories": 320, "protein": 15, "carbs": 45, "fat": 8, "fiber": 12}',
 ARRAY['vegan', 'fasting', 'gluten-free'], 
 25, true, 
 '{"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "time_slots": ["lunch"]}'),

('550e8400-e29b-41d4-a716-446655440012', 'Misir Ena Shiro', 'Red lentils with chickpea stew', '550e8400-e29b-41d4-a716-446655440001', 170.00, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=200&h=200&fit=crop',
 ARRAY['red lentils', 'chickpeas', 'onions', 'garlic', 'berbere', 'turmeric'],
 '{"calories": 340, "protein": 18, "carbs": 50, "fat": 6, "fiber": 15}',
 ARRAY['vegan', 'fasting', 'gluten-free'],
 30, true,
 '{"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "time_slots": ["lunch"]}'),

('550e8400-e29b-41d4-a716-446655440013', 'Dinech Ena Gomen', 'Potato and collard greens stew', '550e8400-e29b-41d4-a716-446655440002', 170.00, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=200&h=200&fit=crop',
 ARRAY['potatoes', 'collard greens', 'onions', 'garlic', 'turmeric', 'oil'],
 '{"calories": 280, "protein": 8, "carbs": 55, "fat": 5, "fiber": 8}',
 ARRAY['vegetarian', 'gluten-free'],
 20, true,
 '{"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "time_slots": ["lunch"]}'),

('550e8400-e29b-41d4-a716-446655440014', 'Tibs', 'Sautéed beef with vegetables', '550e8400-e29b-41d4-a716-446655440002', 170.00, 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=200&h=200&fit=crop',
 ARRAY['beef', 'onions', 'tomatoes', 'green peppers', 'berbere', 'oil'],
 '{"calories": 420, "protein": 35, "carbs": 15, "fat": 25, "fiber": 3}',
 ARRAY['high-protein'],
 35, true,
 '{"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "time_slots": ["lunch"]}'),

('550e8400-e29b-41d4-a716-446655440015', 'Firfir', 'Shredded injera with berbere sauce', '550e8400-e29b-41d4-a716-446655440001', 170.00, 'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=200&h=200&fit=crop',
 ARRAY['injera', 'berbere', 'onions', 'oil', 'tomatoes'],
 '{"calories": 250, "protein": 8, "carbs": 45, "fat": 6, "fiber": 5}',
 ARRAY['vegan', 'fasting'],
 15, true,
 '{"days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "time_slots": ["lunch"]}');

-- ========================================
-- SUBSCRIPTION PLANS
-- ========================================
INSERT INTO subscription_plans (id, name, duration_days, meals_per_week, base_price, discount_percentage, is_active, features) VALUES
('550e8400-e29b-41d4-a716-446655440021', 'Weekly Plan', 7, 5, 850.00, 0, true, '{"free_delivery": true, "priority_support": false, "meal_customization": true}'),
('550e8400-e29b-41d4-a716-446655440022', 'Monthly Plan', 30, 20, 3200.00, 10, true, '{"free_delivery": true, "priority_support": true, "meal_customization": true, "nutrition_tracking": true}');

-- ========================================
-- PARTNERS (for testing referral system)
-- ========================================
INSERT INTO partners (id, name, partner_code, api_key, commission_rate, status, contact_email, webhook_url, settings) VALUES
('550e8400-e29b-41d4-a716-446655440031', 'Student Super App', 'SUPAPP', 'pk_test_superapp_abcd1234567890ef', 15.00, 'active', 'partnership@superapp.com', 'https://superapp.com/webhooks/oz-kitchen', 
 '{"campaign_tracking": true, "real_time_updates": true, "dashboard_access": true}'),
('550e8400-e29b-41d4-a716-446655440032', 'Campus Connect', 'CAMPUS', 'pk_test_campus_1234567890abcdef', 12.00, 'active', 'partners@campusconnect.com', 'https://campusconnect.com/webhooks/oz-kitchen',
 '{"campaign_tracking": false, "real_time_updates": false, "dashboard_access": true}');

-- ========================================
-- SAMPLE ADMIN USER (for testing)
-- Note: This assumes you have a user in auth.users with this ID
-- You'll need to create this user through Supabase Auth first
-- ========================================
-- INSERT INTO admin_users (id, role, permissions, is_active) VALUES
-- ('550e8400-e29b-41d4-a716-446655440041', 'super_admin', '{"all": true}', true);

-- ========================================
-- SAMPLE REFERRALS (for testing)
-- ========================================
INSERT INTO referrals (id, partner_id, referral_token, anon_user_id, campaign_id, status, created_at, expires_at) VALUES
('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440031', 'test_token_1', 'anon_user_123', 'lunchbox-campaign', 'pending', NOW(), NOW() + INTERVAL '30 days'),
('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440031', 'test_token_2', 'anon_user_456', 'lunchbox-campaign', 'pending', NOW(), NOW() + INTERVAL '30 days');

-- ========================================
-- SAMPLE NOTIFICATIONS TEMPLATES
-- These can be used as templates for system notifications
-- ========================================
-- Note: These will be inserted when users are created and orders are placed

-- ========================================
-- FUNCTIONS FOR SAMPLE DATA MANAGEMENT
-- ========================================

-- Function to reset sample data (useful for testing)
CREATE OR REPLACE FUNCTION reset_sample_data()
RETURNS void AS $$
BEGIN
    -- Delete in reverse order of dependencies
    DELETE FROM partner_commissions;
    DELETE FROM commission_settlements;
    DELETE FROM referrals WHERE partner_id IN (
        SELECT id FROM partners WHERE partner_code IN ('SUPAPP', 'CAMPUS')
    );
    DELETE FROM partners WHERE partner_code IN ('SUPAPP', 'CAMPUS');
    DELETE FROM notifications;
    DELETE FROM deliveries;
    DELETE FROM payments;
    DELETE FROM orders;
    DELETE FROM meal_plan_items;
    DELETE FROM meal_plans;
    DELETE FROM user_subscriptions;
    DELETE FROM meals;
    DELETE FROM meal_categories;
    DELETE FROM subscription_plans;
    
    -- Reset sequences
    ALTER SEQUENCE order_sequence RESTART WITH 1;
    
    RAISE NOTICE 'Sample data reset completed';
END;
$$ LANGUAGE plpgsql;

-- Function to create sample user data (call after user signup)
CREATE OR REPLACE FUNCTION create_sample_user_data(user_id UUID)
RETURNS void AS $$
DECLARE
    weekly_plan_id UUID;
    meal_plan_id UUID;
BEGIN
    -- Create user profile if not exists
    INSERT INTO profiles (id, first_name, last_name, phone_number, delivery_address, preferences)
    VALUES (
        user_id,
        'Sample',
        'User',
        '+251911123456',
        '{"street": "Bole Road", "city": "Addis Ababa", "zone": "Bole", "building_number": "123", "floor": "2nd Floor", "special_instructions": "Call when you arrive"}',
        '{"dietary_restrictions": [], "spice_level": "medium", "allergies": []}'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create sample subscription
    INSERT INTO user_subscriptions (user_id, plan_id, start_date, end_date, budget_limit)
    SELECT 
        user_id,
        id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '7 days',
        1000.00
    FROM subscription_plans 
    WHERE name = 'Weekly Plan'
    LIMIT 1
    RETURNING id INTO weekly_plan_id;
    
    -- Create sample meal plan for current week
    INSERT INTO meal_plans (user_id, subscription_id, week_start_date, status, total_amount)
    VALUES (
        user_id,
        weekly_plan_id,
        DATE_TRUNC('week', CURRENT_DATE),
        'draft',
        850.00
    )
    RETURNING id INTO meal_plan_id;
    
    -- Add sample meal plan items
    INSERT INTO meal_plan_items (meal_plan_id, meal_id, delivery_date, quantity, unit_price)
    SELECT 
        meal_plan_id,
        m.id,
        CURRENT_DATE + (ROW_NUMBER() OVER () - 1),
        1,
        m.base_price
    FROM meals m
    WHERE m.is_available = true
    LIMIT 5;
    
    -- Create welcome notification
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
        user_id,
        'Welcome to OZ Kitchen!',
        'Thank you for joining OZ Kitchen. Your fresh, delicious meals are just a few clicks away!',
        'system',
        '{"action": "welcome", "show_tutorial": true}'
    );
    
    RAISE NOTICE 'Sample user data created for user %', user_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SAMPLE DATA VALIDATION
-- ========================================

-- Function to validate sample data integrity
CREATE OR REPLACE FUNCTION validate_sample_data()
RETURNS TABLE(
    table_name TEXT,
    record_count BIGINT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'meal_categories'::TEXT, COUNT(*), 'OK'::TEXT FROM meal_categories WHERE is_active = true
    UNION ALL
    SELECT 'meals'::TEXT, COUNT(*), 'OK'::TEXT FROM meals WHERE is_available = true
    UNION ALL
    SELECT 'subscription_plans'::TEXT, COUNT(*), 'OK'::TEXT FROM subscription_plans WHERE is_active = true
    UNION ALL
    SELECT 'partners'::TEXT, COUNT(*), 'OK'::TEXT FROM partners WHERE status = 'active'
    UNION ALL
    SELECT 'referrals'::TEXT, COUNT(*), 'OK'::TEXT FROM referrals WHERE status = 'pending';
END;
$$ LANGUAGE plpgsql;
