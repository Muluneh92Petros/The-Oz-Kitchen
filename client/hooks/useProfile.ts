import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi, notificationsApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Database } from '@shared/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

// Query keys
export const profileQueryKeys = {
  all: ['profile'] as const,
  detail: () => [...profileQueryKeys.all, 'detail'] as const,
  notifications: (limit?: number) => [...profileQueryKeys.all, 'notifications', limit] as const,
}

// Get user profile
export function useProfile() {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: profileQueryKeys.detail(),
    queryFn: () => profileApi.getProfile(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Update profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { refreshProfile } = useAuth()
  
  return useMutation({
    mutationFn: (updates: Partial<Profile>) => profileApi.updateProfile(updates),
    onSuccess: () => {
      // Invalidate profile query
      queryClient.invalidateQueries({
        queryKey: profileQueryKeys.detail()
      })
      // Refresh auth context profile
      refreshProfile()
    },
  })
}

// Get notifications
export function useNotifications(limit: number = 20) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: profileQueryKeys.notifications(limit),
    queryFn: () => notificationsApi.getNotifications(limit),
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Mark notification as read mutation
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      // Invalidate notifications query
      queryClient.invalidateQueries({
        queryKey: profileQueryKeys.notifications()
      })
    },
  })
}

// Mark all notifications as read mutation
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      // Invalidate notifications query
      queryClient.invalidateQueries({
        queryKey: profileQueryKeys.notifications()
      })
    },
  })
}
