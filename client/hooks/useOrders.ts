import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi, paymentsApi, OrderHistory } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

// Query keys
export const orderQueryKeys = {
  all: ['orders'] as const,
  history: (limit?: number, offset?: number) => [...orderQueryKeys.all, 'history', limit, offset] as const,
  detail: (id: string) => [...orderQueryKeys.all, 'detail', id] as const,
}

// Get order history
export function useOrderHistory(limit: number = 10, offset: number = 0) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: orderQueryKeys.history(limit, offset),
    queryFn: () => ordersApi.getOrderHistory(limit, offset),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get order details
export function useOrder(orderId: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: orderQueryKeys.detail(orderId),
    queryFn: () => ordersApi.getOrderById(orderId),
    enabled: !!user && !!orderId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Create order from meal plan mutation
export function useCreateOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ mealPlanId, deliveryAddress }: { mealPlanId: string; deliveryAddress: any }) =>
      ordersApi.createOrderFromMealPlan(mealPlanId, deliveryAddress),
    onSuccess: () => {
      // Invalidate order history
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.all
      })
    },
  })
}

// Process payment mutation
export function useProcessPayment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      orderId, 
      paymentMethod, 
      customerInfo 
    }: { 
      orderId: string
      paymentMethod: 'telebirr' | 'chapa'
      customerInfo?: { phone?: string; email?: string; name?: string }
    }) => paymentsApi.processPayment(orderId, paymentMethod, customerInfo),
    onSuccess: (data, variables) => {
      // Invalidate order details
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.detail(variables.orderId)
      })
      // Invalidate order history
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.history()
      })
    },
  })
}
