# Admin Setup Instructions

## 1. Run Database Migrations

First, apply the admin roles migration:

```bash
# If using Supabase CLI
supabase db reset

# Or apply the specific migration
supabase migration up
```

## 2. Create Admin User

### Option A: Sign up normally then promote to admin

1. **Sign up** at your app with the email you want to be admin (e.g., `admin@ozkitchen.com`)
2. **Run this SQL** in your Supabase SQL Editor:

```sql
-- Replace 'admin@ozkitchen.com' with your actual admin email
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@ozkitchen.com';
```

### Option B: Direct database insert (if user already exists in auth.users)

```sql
-- Get the user ID from auth.users
SELECT id, email FROM auth.users WHERE email = 'admin@ozkitchen.com';

-- Update or insert the profile with admin role
INSERT INTO profiles (id, email, full_name, role) 
VALUES (
  'USER_ID_FROM_ABOVE', -- Replace with actual user ID
  'admin@ozkitchen.com', 
  'Admin User', 
  'admin'
) ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

## 3. Access Admin Dashboard

1. **Sign in** with your admin account
2. **Navigate to** `/admin` in your browser
3. **You should see** the admin dashboard with:
   - Orders management
   - Menu items management  
   - Subscription plans management

## 4. Admin Features

### Orders Management
- View all customer orders
- Update order status (pending → paid → preparing → delivered)
- Search orders by ID or customer name
- Filter by order status

### Menu Items Management
- View all menu items with categories
- Toggle meal availability
- Search menu items
- Edit/delete meals (buttons ready for implementation)

### Subscription Plans Management
- View all subscription plans
- Toggle plan active/inactive status
- Edit plan details (button ready for implementation)

## 5. Security Notes

- Admin access is protected by role-based authentication
- Only users with `role = 'admin'` can access `/admin`
- All admin operations are logged and secured with RLS policies
- Non-admin users will see "Access Denied" if they try to access admin routes

## 6. Troubleshooting

### "Access Denied" Error
- Check that your user has `role = 'admin'` in the profiles table
- Verify you're signed in with the correct account
- Check browser console for any authentication errors

### Admin Dashboard Not Loading
- Verify the migration ran successfully
- Check that RLS policies are applied correctly
- Ensure Supabase connection is working

### Data Not Showing
- Check that you have orders, meals, and subscription plans in your database
- Verify the API calls are working in browser network tab
- Check Supabase logs for any query errors

## 7. Next Steps

To extend admin functionality:

1. **Add Create/Edit Forms** for meals and subscription plans
2. **Implement Order Details View** with full meal plan information
3. **Add User Management** to view/manage all customers
4. **Add Analytics Dashboard** with revenue, popular meals, etc.
5. **Add Bulk Operations** for managing multiple items at once
