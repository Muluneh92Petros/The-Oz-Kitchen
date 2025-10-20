import { supabase } from './supabase'

// Types for admin operations
export interface AdminOrder {
  id: string
  user_id: string
  total_amount: number
  status: 'pending' | 'paid' | 'preparing' | 'delivered' | 'cancelled'
  created_at: string
  updated_at: string
  customer_name?: string
  customer_email?: string
  meal_plan_items?: any[]
}

export interface AdminMenuItem {
  id: string
  name: string
  description: string
  base_price: number
  category_id: string
  category_name: string
  image_url?: string
  is_available: boolean
  dietary_tags: string[]
  created_at: string
  updated_at: string
}

export interface AdminSubscriptionPlan {
  id: string
  name: string
  description: string
  base_price: number
  duration_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AdminStats {
  totalOrders: number
  totalRevenue: number
  activeSubscriptions: number
  totalMenuItems: number
}

// ========================================
// ADMIN API
// ========================================
export const adminApi = {
  // ========================================
  // ORDERS MANAGEMENT
  // ========================================
  
  // Get all orders with customer information
  async getOrders(): Promise<AdminOrder[]> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        id,
        user_id,
        total_amount,
        status,
        created_at,
        updated_at,
        profiles!inner(
          full_name,
          email
        ),
        meal_plan_items(
          id,
          meal_id,
          quantity,
          unit_price,
          delivery_date,
          meals(name)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to match AdminOrder interface
    return (data || []).map((order: any) => ({
      id: order.id,
      user_id: order.user_id,
      total_amount: order.total_amount || 0,
      status: order.status as AdminOrder['status'],
      created_at: order.created_at,
      updated_at: order.updated_at,
      customer_name: order.profiles?.full_name || 'Unknown',
      customer_email: order.profiles?.email || '',
      meal_plan_items: order.meal_plan_items || []
    }))
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('meal_plans')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) throw error
  },

  // Get order details by ID
  async getOrderById(orderId: string): Promise<AdminOrder | null> {
    const { data, error } = await supabase
      .from('meal_plans')
      .select(`
        id,
        user_id,
        total_amount,
        status,
        created_at,
        updated_at,
        profiles!inner(
          full_name,
          email
        ),
        meal_plan_items(
          id,
          meal_id,
          quantity,
          unit_price,
          delivery_date,
          meals(name, description, base_price)
        )
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return {
      id: data.id,
      user_id: data.user_id,
      total_amount: data.total_amount || 0,
      status: data.status as AdminOrder['status'],
      created_at: data.created_at,
      updated_at: data.updated_at,
      customer_name: (data.profiles as any)?.full_name || 'Unknown',
      customer_email: (data.profiles as any)?.email || '',
      meal_plan_items: data.meal_plan_items || []
    }
  },

  // ========================================
  // MENU ITEMS MANAGEMENT
  // ========================================
  
  // Get all menu items with categories
  async getMenuItems(): Promise<AdminMenuItem[]> {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        id,
        name,
        description,
        base_price,
        category_id,
        image_url,
        is_available,
        dietary_tags,
        created_at,
        updated_at,
        meal_categories(name)
      `)
      .order('name')

    if (error) throw error

    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      base_price: item.base_price,
      category_id: item.category_id,
      category_name: item.meal_categories?.name || 'Uncategorized',
      image_url: item.image_url,
      is_available: item.is_available,
      dietary_tags: item.dietary_tags || [],
      created_at: item.created_at,
      updated_at: item.updated_at
    }))
  },

  // Update meal availability
  async updateMealAvailability(mealId: string, available: boolean): Promise<void> {
    const { error } = await supabase
      .from('meals')
      .update({ 
        is_available: available,
        updated_at: new Date().toISOString()
      })
      .eq('id', mealId)

    if (error) throw error
  },

  // Create new menu item
  async createMenuItem(item: Omit<AdminMenuItem, 'id' | 'created_at' | 'updated_at' | 'category_name'>): Promise<AdminMenuItem> {
    const { data, error } = await supabase
      .from('meals')
      .insert({
        name: item.name,
        description: item.description,
        base_price: item.base_price,
        category_id: item.category_id,
        image_url: item.image_url,
        is_available: item.is_available,
        dietary_tags: item.dietary_tags
      })
      .select(`
        id,
        name,
        description,
        base_price,
        category_id,
        image_url,
        is_available,
        dietary_tags,
        created_at,
        updated_at,
        meal_categories(name)
      `)
      .single()

    if (error) throw error

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      base_price: data.base_price,
      category_id: data.category_id,
      category_name: (data.meal_categories as any)?.name || 'Uncategorized',
      image_url: data.image_url,
      is_available: data.is_available,
      dietary_tags: data.dietary_tags || [],
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  },

  // Update menu item
  async updateMenuItem(mealId: string, updates: Partial<Omit<AdminMenuItem, 'id' | 'created_at' | 'updated_at' | 'category_name'>>): Promise<void> {
    const { error } = await supabase
      .from('meals')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', mealId)

    if (error) throw error
  },

  // Delete menu item
  async deleteMenuItem(mealId: string): Promise<void> {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId)

    if (error) throw error
  },

  // ========================================
  // SUBSCRIPTION PLANS MANAGEMENT
  // ========================================
  
  // Get all subscription plans
  async getSubscriptionPlans(): Promise<AdminSubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('base_price')

    if (error) throw error
    return data || []
  },

  // Update plan status
  async updatePlanStatus(planId: string, active: boolean): Promise<void> {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ 
        is_active: active,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)

    if (error) throw error
  },

  // Create new subscription plan
  async createSubscriptionPlan(plan: Omit<AdminSubscriptionPlan, 'id' | 'created_at' | 'updated_at'>): Promise<AdminSubscriptionPlan> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(plan)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update subscription plan
  async updateSubscriptionPlan(planId: string, updates: Partial<Omit<AdminSubscriptionPlan, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const { error } = await supabase
      .from('subscription_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)

    if (error) throw error
  },

  // Delete subscription plan
  async deleteSubscriptionPlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', planId)

    if (error) throw error
  },

  // ========================================
  // ANALYTICS & STATS
  // ========================================
  
  // Get admin dashboard stats
  async getAdminStats(): Promise<AdminStats> {
    // Get total orders
    const { count: totalOrders } = await supabase
      .from('meal_plans')
      .select('*', { count: 'exact', head: true })

    // Get total revenue
    const { data: revenueData } = await supabase
      .from('meal_plans')
      .select('total_amount')
      .eq('status', 'paid')

    const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

    // Get active subscriptions
    const { count: activeSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Get total menu items
    const { count: totalMenuItems } = await supabase
      .from('meals')
      .select('*', { count: 'exact', head: true })

    return {
      totalOrders: totalOrders || 0,
      totalRevenue,
      activeSubscriptions: activeSubscriptions || 0,
      totalMenuItems: totalMenuItems || 0
    }
  },

  // ========================================
  // ADMIN USER MANAGEMENT
  // ========================================
  
  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) return false
    return data?.role === 'admin'
  },

  // Get all users
  async getUsers(): Promise<any[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  // Update user role
  async updateUserRole(userId: string, role: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) throw error
  }
}
