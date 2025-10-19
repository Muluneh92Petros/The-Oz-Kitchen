import { supabase } from './supabase'

// Simplified type definitions (we'll add proper types later)
type Meal = any
type MealCategory = any
type MealPlan = any
type MealPlanItem = any
type Order = any
type SubscriptionPlan = any
type UserSubscription = any
type Profile = any

export interface MealWithCategory extends Meal {
  category_name: string
}

export interface MealPlanSummary {
  meal_plan_id: string
  total_meals: number
  total_amount: number
  status: string
  meals: Array<{
    meal_id: string
    meal_name: string
    delivery_date: string
    quantity: number
    unit_price: number
    image_url: string
  }>
}

export interface OrderHistory {
  id: string
  order_number: string
  status: string
  total_amount: number
  payment_status: string
  delivery_date: string
  created_at: string
  meal_count: number
}

// ========================================
// MEALS API
// ========================================
export const mealsApi = {
  // Get all available meals
  async getAvailableMeals(categoryId?: string): Promise<MealWithCategory[]> {
    const { data, error } = await supabase.rpc('get_available_meals', {
      p_delivery_date: new Date().toISOString().split('T')[0],
      p_category_id: categoryId || null
    })

    if (error) throw error
    return data || []
  },

  // Get meal categories
  async getCategories(): Promise<MealCategory[]> {
    const { data, error } = await supabase
      .from('meal_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw error
    return data || []
  },

  // Get single meal details
  async getMealById(id: string): Promise<Meal | null> {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', id)
      .eq('is_available', true)
      .single()

    if (error) throw error
    return data
  }
}

// ========================================
// SUBSCRIPTION PLANS API
// ========================================
export const subscriptionApi = {
  // Get available subscription plans
  async getPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('base_price')

    if (error) throw error
    return data || []
  },

  // Create user subscription
  async createSubscription(planId: string, budgetLimit?: number): Promise<UserSubscription> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    // First check if user already has an active subscription
    const existingSubscription = await this.getCurrentSubscription()
    if (existingSubscription) {
      console.log('User already has active subscription:', existingSubscription)
      return existingSubscription
    }

    // Deactivate any existing subscriptions first (just in case)
    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', user.user.id)
      .eq('status', 'active')

    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.user.id,
        plan_id: planId,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        budget_limit: budgetLimit,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get current user subscription
  async getCurrentSubscription(): Promise<UserSubscription | null> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
    return data
  }
}

// ========================================
// MEAL PLANS API
// ========================================
export const mealPlansApi = {
  // Get user's meal plan for a specific week
  async getMealPlanSummary(weekStartDate: string): Promise<MealPlanSummary | null> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { data, error } = await supabase.rpc('get_user_meal_plan_summary', {
      p_user_id: user.user.id,
      p_week_start_date: weekStartDate
    })

    if (error) throw error
    return data?.[0] || null
  },

  // Create or update meal plan
  async createMealPlan(weekStartDate: string, subscriptionId?: string): Promise<MealPlan> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: user.user.id,
        subscription_id: subscriptionId,
        week_start_date: weekStartDate,
        status: 'draft',
        total_amount: 0
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Add meal to plan
  async addMealToPlan(
    mealPlanId: string, 
    mealId: string, 
    deliveryDate: string, 
    quantity: number = 1
  ): Promise<MealPlanItem> {
    // Get meal price
    const meal = await mealsApi.getMealById(mealId)
    if (!meal) throw new Error('Meal not found')

    const { data, error } = await supabase
      .from('meal_plan_items')
      .insert({
        meal_plan_id: mealPlanId,
        meal_id: mealId,
        delivery_date: deliveryDate,
        quantity,
        unit_price: meal.base_price
      })
      .select()
      .single()

    if (error) throw error

    // Update meal plan total
    await this.updateMealPlanTotal(mealPlanId)

    return data
  },

  // Update meal plan total
  async updateMealPlanTotal(mealPlanId: string): Promise<void> {
    const { data: items, error: itemsError } = await supabase
      .from('meal_plan_items')
      .select('quantity, unit_price')
      .eq('meal_plan_id', mealPlanId)

    if (itemsError) throw itemsError

    const total = items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0

    const { error } = await supabase
      .from('meal_plans')
      .update({ total_amount: total })
      .eq('id', mealPlanId)

    if (error) throw error
  },

  // Confirm meal plan
  async confirmMealPlan(mealPlanId: string): Promise<MealPlan> {
    const { data, error } = await supabase
      .from('meal_plans')
      .update({ status: 'confirmed' })
      .eq('id', mealPlanId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ========================================
// ORDERS API
// ========================================
export const ordersApi = {
  // Create order from meal plan
  async createOrderFromMealPlan(mealPlanId: string, deliveryAddress: any): Promise<Order> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    // Get meal plan details
    const { data: mealPlan, error: planError } = await supabase
      .from('meal_plans')
      .select('total_amount')
      .eq('id', mealPlanId)
      .single()

    if (planError) throw planError

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.user.id,
        meal_plan_id: mealPlanId,
        subtotal: mealPlan.total_amount,
        delivery_fee: 0, // Free delivery for now
        discount_amount: 0,
        total_amount: mealPlan.total_amount,
        delivery_address: deliveryAddress,
        delivery_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get user's order history
  async getOrderHistory(limit: number = 10, offset: number = 0): Promise<OrderHistory[]> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { data, error } = await supabase.rpc('get_user_order_history', {
      p_user_id: user.user.id,
      p_limit: limit,
      p_offset: offset
    })

    if (error) throw error
    return data || []
  },

  // Get order details
  async getOrderById(orderId: string): Promise<Order | null> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }
}

// ========================================
// PAYMENTS API
// ========================================
export const paymentsApi = {
  // Process payment
  async processPayment(
    orderId: string, 
    paymentMethod: 'telebirr' | 'chapa',
    customerInfo?: { phone?: string; email?: string; name?: string }
  ): Promise<{ success: boolean; checkout_url?: string; payment_id?: string; error?: string }> {
    const order = await ordersApi.getOrderById(orderId)
    if (!order) throw new Error('Order not found')

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        order_id: orderId,
        payment_method: paymentMethod,
        amount: order.total_amount,
        customer_info: customerInfo
      })
    })

    const result = await response.json()
    return result
  }
}

// ========================================
// PROFILE API
// ========================================
export const profileApi = {
  // Update user profile
  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.user.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get user profile
  async getProfile(): Promise<Profile | null> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }
}

// ========================================
// NOTIFICATIONS API
// ========================================
export const notificationsApi = {
  // Get user notifications
  async getNotifications(limit: number = 20): Promise<any[]> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) throw error
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.user.id)
      .eq('is_read', false)

    if (error) throw error
  }
}
