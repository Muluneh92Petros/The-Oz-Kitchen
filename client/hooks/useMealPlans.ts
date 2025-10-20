import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mealPlansApi, MealPlanSummary } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

// Query keys
export const mealPlanQueryKeys = {
  all: ['mealPlans'] as const,
  summary: (weekStartDate: string) => [...mealPlanQueryKeys.all, 'summary', weekStartDate] as const,
}

// Get meal plan summary for a week
export function useMealPlanSummary(weekStartDate: string) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: mealPlanQueryKeys.summary(weekStartDate),
    queryFn: () => mealPlansApi.getMealPlanSummary(weekStartDate),
    enabled: !!user && !!weekStartDate,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Create meal plan mutation
export function useCreateMealPlan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ weekStartDate, subscriptionId }: { weekStartDate: string; subscriptionId?: string }) =>
      mealPlansApi.createMealPlan(weekStartDate, subscriptionId),
    onSuccess: (data, variables) => {
      // Invalidate and refetch meal plan summary
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.summary(variables.weekStartDate)
      })
    },
  })
}

// Add meal to plan mutation
export function useAddMealToPlan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ 
      mealPlanId, 
      mealId, 
      deliveryDate, 
      quantity = 1 
    }: { 
      mealPlanId: string
      mealId: string
      deliveryDate: string
      quantity?: number 
    }) => mealPlansApi.addMealToPlan(mealPlanId, mealId, deliveryDate, quantity),
    onSuccess: (data, variables) => {
      // Invalidate meal plan summaries
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.all
      })
    },
  })
}

// Confirm meal plan mutation
export function useConfirmMealPlan() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (mealPlanId: string) => mealPlansApi.confirmMealPlan(mealPlanId),
    onSuccess: () => {
      // Invalidate all meal plan queries
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.all
      })
    },
  })
}
