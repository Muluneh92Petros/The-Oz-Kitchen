import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

// Query keys
export const subscriptionQueryKeys = {
  all: ['subscriptions'] as const,
  plans: () => [...subscriptionQueryKeys.all, 'plans'] as const,
  current: () => [...subscriptionQueryKeys.all, 'current'] as const,
}

// Get subscription plans
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionQueryKeys.plans(),
    queryFn: () => subscriptionApi.getPlans(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}

// Get current user subscription
export function useCurrentSubscription() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: subscriptionQueryKeys.current(),
    queryFn: () => subscriptionApi.getCurrentSubscription(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create subscription mutation
export function useCreateSubscription() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ planId, budgetLimit }: { planId: string; budgetLimit?: number }) =>
      subscriptionApi.createSubscription(planId, budgetLimit),
    onSuccess: () => {
      // Invalidate current subscription query
      queryClient.invalidateQueries({
        queryKey: subscriptionQueryKeys.current()
      })
    },
  })
}
