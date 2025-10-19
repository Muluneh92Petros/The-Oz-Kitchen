import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mealsApi, MealWithCategory } from '@/lib/api'

// Query keys
export const mealQueryKeys = {
  all: ['meals'] as const,
  categories: () => [...mealQueryKeys.all, 'categories'] as const,
  available: (categoryId?: string) => [...mealQueryKeys.all, 'available', categoryId] as const,
  detail: (id: string) => [...mealQueryKeys.all, 'detail', id] as const,
}

// Get available meals
export function useAvailableMeals(categoryId?: string) {
  return useQuery({
    queryKey: mealQueryKeys.available(categoryId),
    queryFn: () => mealsApi.getAvailableMeals(categoryId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get meal categories
export function useMealCategories() {
  return useQuery({
    queryKey: mealQueryKeys.categories(),
    queryFn: () => mealsApi.getCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}

// Get single meal
export function useMeal(id: string) {
  return useQuery({
    queryKey: mealQueryKeys.detail(id),
    queryFn: () => mealsApi.getMealById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}
