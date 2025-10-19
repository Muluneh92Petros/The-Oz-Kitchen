-- Add role column to profiles table for admin functionality
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Create an index on the role column for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing users to have 'user' role (if not already set)
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Create a function to automatically set role for new users
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default role to 'user' for new profiles
  IF NEW.role IS NULL THEN
    NEW.role := 'user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set role for new users
DROP TRIGGER IF EXISTS on_auth_user_created_role ON profiles;
CREATE TRIGGER on_auth_user_created_role
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_role();

-- Insert a default admin user (you can change this email to your admin email)
-- Note: This user will need to sign up first, then you can update their role
INSERT INTO profiles (id, email, full_name, role) 
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Placeholder ID, will be updated when real user signs up
  'admin@ozkitchen.com', 
  'Admin User', 
  'admin'
) ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Add RLS policies for admin access
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update user roles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policies for admin access to orders (meal_plans)
CREATE POLICY "Admins can view all meal plans" ON meal_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update meal plan status" ON meal_plans
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policies for admin access to meals
CREATE POLICY "Admins can manage meals" ON meals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policies for admin access to subscription plans
CREATE POLICY "Admins can manage subscription plans" ON subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policies for admin access to user subscriptions
CREATE POLICY "Admins can view all user subscriptions" ON user_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON COLUMN profiles.role IS 'User role: user, admin, moderator, etc.';
COMMENT ON POLICY "Admins can view all profiles" ON profiles IS 'Allow admins to view all user profiles';
COMMENT ON POLICY "Admins can update user roles" ON profiles IS 'Allow admins to update user roles';
