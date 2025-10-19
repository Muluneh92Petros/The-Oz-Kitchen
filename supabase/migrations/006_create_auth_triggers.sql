-- ========================================
-- OZ Kitchen Authentication Triggers
-- Version: 006
-- Description: Create triggers for user management and profile creation
-- ========================================

-- ========================================
-- FUNCTION TO CREATE PROFILE ON USER SIGNUP
-- ========================================
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, phone_number, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
        NOW(),
        NOW()
    );
    
    -- Create welcome notification
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
        NEW.id,
        'Welcome to OZ Kitchen! 🍱',
        'Thank you for joining OZ Kitchen. Your fresh, delicious meals are just a few clicks away!',
        'system',
        jsonb_build_object(
            'action', 'welcome',
            'show_tutorial', true,
            'created_at', NOW()
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGER FOR PROFILE CREATION
-- ========================================
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_new_user();

-- ========================================
-- FUNCTION TO HANDLE PROFILE DELETION
-- ========================================
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Cancel any active subscriptions
    UPDATE user_subscriptions 
    SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = OLD.id AND status = 'active';
    
    -- Cancel any pending orders
    UPDATE orders 
    SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = OLD.id AND status IN ('pending', 'confirmed');
    
    -- Mark referrals as expired if user was referred
    UPDATE referrals 
    SET status = 'expired'
    WHERE user_id = OLD.id AND status IN ('pending', 'converted');
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGER FOR USER DELETION CLEANUP
-- ========================================
DROP TRIGGER IF EXISTS handle_user_deletion_trigger ON auth.users;
CREATE TRIGGER handle_user_deletion_trigger
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();

-- ========================================
-- FUNCTION TO LINK REFERRAL ON PROFILE UPDATE
-- ========================================
CREATE OR REPLACE FUNCTION handle_referral_linking()
RETURNS TRIGGER AS $$
DECLARE
    referral_record RECORD;
BEGIN
    -- Check if referral_token is provided in metadata and not already processed
    IF NEW.raw_user_meta_data ? 'referral_token' AND 
       (OLD.raw_user_meta_data IS NULL OR NOT OLD.raw_user_meta_data ? 'referral_token') THEN
        
        -- Find matching referral
        SELECT r.*, p.id as partner_id
        INTO referral_record
        FROM referrals r
        JOIN partners p ON r.partner_id = p.id
        WHERE r.referral_token = NEW.raw_user_meta_data->>'referral_token'
        AND r.status = 'pending'
        AND r.expires_at > NOW()
        AND p.status = 'active'
        LIMIT 1;
        
        IF FOUND THEN
            -- Update referral with user information
            UPDATE referrals 
            SET 
                user_id = NEW.id,
                status = 'converted',
                converted_at = NOW()
            WHERE id = referral_record.id;
            
            -- Update profile with referral information
            UPDATE profiles 
            SET 
                referral_source = referral_record.id,
                referral_partner_id = referral_record.partner_id,
                updated_at = NOW()
            WHERE id = NEW.id;
            
            -- Create referral success notification
            INSERT INTO notifications (user_id, title, message, type, data)
            VALUES (
                NEW.id,
                'Referral Bonus Applied! 🎉',
                'You''ve successfully joined through a referral. Enjoy your meals!',
                'promotion',
                jsonb_build_object(
                    'referral_id', referral_record.id,
                    'partner_name', 'Student Super App',
                    'bonus_applied', true
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGER FOR REFERRAL LINKING
-- ========================================
DROP TRIGGER IF EXISTS handle_referral_linking_trigger ON auth.users;
CREATE TRIGGER handle_referral_linking_trigger
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_referral_linking();

-- ========================================
-- FUNCTION TO CREATE SAMPLE DATA FOR NEW USERS
-- ========================================
CREATE OR REPLACE FUNCTION create_sample_user_data_trigger()
RETURNS TRIGGER AS $$
DECLARE
    weekly_plan_id UUID;
    meal_plan_id UUID;
BEGIN
    -- Only create sample data in development environment
    IF current_setting('app.environment', true) = 'development' THEN
        
        -- Create sample subscription
        INSERT INTO user_subscriptions (user_id, plan_id, start_date, end_date, budget_limit)
        SELECT 
            NEW.id,
            sp.id,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '7 days',
            1000.00
        FROM subscription_plans sp
        WHERE sp.name = 'Weekly Plan' AND sp.is_active = true
        LIMIT 1
        RETURNING id INTO weekly_plan_id;
        
        -- Create sample meal plan for current week if subscription was created
        IF weekly_plan_id IS NOT NULL THEN
            INSERT INTO meal_plans (user_id, subscription_id, week_start_date, status, total_amount)
            VALUES (
                NEW.id,
                weekly_plan_id,
                DATE_TRUNC('week', CURRENT_DATE)::DATE,
                'draft',
                850.00
            )
            RETURNING id INTO meal_plan_id;
            
            -- Add sample meal plan items
            INSERT INTO meal_plan_items (meal_plan_id, meal_id, delivery_date, quantity, unit_price)
            SELECT 
                meal_plan_id,
                m.id,
                CURRENT_DATE + (ROW_NUMBER() OVER () - 1)::INTEGER,
                1,
                m.base_price
            FROM meals m
            WHERE m.is_available = true
            ORDER BY m.name
            LIMIT 5;
        END IF;
        
        -- Create onboarding notification
        INSERT INTO notifications (user_id, title, message, type, data)
        VALUES (
            NEW.id,
            'Complete Your Profile 📝',
            'Add your delivery address and preferences to get started with your meal planning.',
            'system',
            jsonb_build_object(
                'action', 'complete_profile',
                'priority', 'high',
                'show_modal', true
            )
        );
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGER FOR SAMPLE DATA CREATION (DEVELOPMENT ONLY)
-- ========================================
DROP TRIGGER IF EXISTS create_sample_data_trigger ON public.profiles;
CREATE TRIGGER create_sample_data_trigger
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_sample_user_data_trigger();

-- ========================================
-- FUNCTION TO EXPIRE OLD REFERRALS (SCHEDULED)
-- ========================================
CREATE OR REPLACE FUNCTION expire_old_referrals_scheduled()
RETURNS void AS $$
BEGIN
    UPDATE referrals 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    -- Log the number of expired referrals
    RAISE NOTICE 'Expired % old referrals', ROW_COUNT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- FUNCTION TO CLEAN UP OLD NOTIFICATIONS
-- ========================================
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Delete read notifications older than 30 days
    DELETE FROM notifications 
    WHERE is_read = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
    -- Delete unread notifications older than 90 days
    DELETE FROM notifications 
    WHERE is_read = false 
    AND created_at < NOW() - INTERVAL '90 days';
    
    RAISE NOTICE 'Cleaned up % old notifications', ROW_COUNT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================
GRANT EXECUTE ON FUNCTION expire_old_referrals_scheduled TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications TO service_role;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================
COMMENT ON FUNCTION create_profile_for_new_user() IS 'Creates a profile and welcome notification when a new user signs up';
COMMENT ON FUNCTION handle_user_deletion() IS 'Cleans up user data when a user account is deleted';
COMMENT ON FUNCTION handle_referral_linking() IS 'Links referral tokens to users when they sign up';
COMMENT ON FUNCTION create_sample_user_data_trigger() IS 'Creates sample data for new users in development environment';
COMMENT ON FUNCTION expire_old_referrals_scheduled() IS 'Scheduled function to expire old referral tokens';
COMMENT ON FUNCTION cleanup_old_notifications() IS 'Scheduled function to clean up old notifications';
