import { useQuery } from 'react-query'
import api from '@/lib/api'
import type { FeatureKey } from '@/lib/planFeatures'

interface SubscriptionStatus {
  status: string
  plan: { name: string; features: string[] } | null
}

export function usePlanFeatures() {
  const { data, isLoading } = useQuery<SubscriptionStatus>(
    'subscription-status',
    () => api.get('/admin/subscription/status').then((r) => r.data),
    { staleTime: 5 * 60 * 1000 } // cache 5 min — doesn't change often
  )

  const features: string[] = data?.plan?.features ?? []

  return {
    isLoading,
    planName: data?.plan?.name ?? '',
    hasFeature: (key: FeatureKey) => features.includes(key),
  }
}
