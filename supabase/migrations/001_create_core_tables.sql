-- ========================================
-- OZ Kitchen Core Tables Migration
-- Version: 001
-- Description: Create core tables for meal delivery system
-- ========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- PROFILES TABLE (extends auth.users)
-- ========================================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT UNIQUE,
    telegram_id BIGINT UNIQUE,
    delivery_address JSONB, -- {street, city, zone, building_number, floor, special_instructions}
    preferences JSONB, -- {dietary_restrictions, spice_level, allergies}
    referral_source UUID, -- Will reference referrals table (added later)
    referral_partner_id UUID, -- Will reference partners table (added later)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MEAL CATEGORIES
-- ========================================
CREATE TABLE public.meal_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MEALS
-- ========================================
CREATE TABLE public.meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES meal_categories(id) ON DELETE SET NULL,
    base_price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    ingredients TEXT[],
    nutritional_info JSONB, -- {calories, protein, carbs, fat, fiber}
    dietary_tags TEXT[], -- ['vegetarian', 'vegan', 'gluten-free', 'fasting']
    preparation_time INTEGER, -- in minutes
    is_available BOOLEAN DEFAULT true,
    availability_schedule JSONB, -- {days: ['monday', 'tuesday'], time_slots: ['lunch', 'dinner']}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- SUBSCRIPTION PLANS
-- ========================================
CREATE TABLE public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- 'weekly', 'monthly'
    duration_days INTEGER NOT NULL,
    meals_per_week INTEGER NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    features JSONB, -- {free_delivery: true, priority_support: false}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- USER SUBSCRIPTIONS
-- ========================================
CREATE TABLE public.user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
    status TEXT CHECK (status IN ('active', 'paused', 'cancelled', 'expired')) DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget_limit DECIMAL(10,2),
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MEAL PLANS (weekly meal selections)
-- ========================================
CREATE TABLE public.meal_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    week_start_date DATE NOT NULL,
    status TEXT CHECK (status IN ('draft', 'confirmed', 'in_preparation', 'delivered', 'cancelled')) DEFAULT 'draft',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

-- ========================================
-- MEAL PLAN ITEMS
-- ========================================
CREATE TABLE public.meal_plan_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
    meal_id UUID REFERENCES meals(id) NOT NULL,
    delivery_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ORDERS (for payment and delivery tracking)
-- ========================================
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
    order_number TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'paid', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')) DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('telebirr', 'chapa', 'cash')),
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
    delivery_address JSONB NOT NULL,
    delivery_date DATE,
    delivery_time_slot TEXT, -- 'morning', 'afternoon', 'evening'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PAYMENT TRANSACTIONS
-- ========================================
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    payment_method TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'ETB',
    status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')) DEFAULT 'pending',
    external_transaction_id TEXT,
    payment_gateway_response JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    referral_id UUID, -- Will reference referrals table (added later)
    commission_eligible BOOLEAN DEFAULT false,
    commission_calculated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- DELIVERY TRACKING
-- ========================================
CREATE TABLE public.deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    delivery_person_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('assigned', 'picked_up', 'in_transit', 'delivered', 'failed')) DEFAULT 'assigned',
    pickup_time TIMESTAMP WITH TIME ZONE,
    delivery_time TIMESTAMP WITH TIME ZONE,
    delivery_notes TEXT,
    delivery_proof_url TEXT, -- photo of delivery
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- NOTIFICATIONS
-- ========================================
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('order_update', 'delivery', 'payment', 'promotion', 'system')) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB, -- additional context data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ADMIN USERS
-- ========================================
CREATE TABLE public.admin_users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT CHECK (role IN ('super_admin', 'admin', 'kitchen_staff', 'delivery_manager')) NOT NULL,
    permissions JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PERFORMANCE INDEXES
-- ========================================
CREATE INDEX idx_profiles_telegram_id ON profiles(telegram_id);
CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_meals_category ON meals(category_id);
CREATE INDEX idx_meals_available ON meals(is_available);
CREATE INDEX idx_meal_plans_user_week ON meal_plans(user_id, week_start_date);
CREATE INDEX idx_meal_plan_items_plan ON meal_plan_items(meal_plan_id);
CREATE INDEX idx_meal_plan_items_date ON meal_plan_items(delivery_date);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_deliveries_order ON deliveries(order_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- GENERATE ORDER NUMBER FUNCTION
-- ========================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'OZ' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('order_sequence')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for order numbers
CREATE SEQUENCE order_sequence START 1;

-- Create trigger for order number generation
CREATE TRIGGER generate_order_number_trigger 
    BEFORE INSERT ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION generate_order_number();
