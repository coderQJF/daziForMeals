import { apiGet, apiRequest, apiUpload } from './http'
import type { PlanPayload, TakeoutShop, UserDashboard, UserStateUpdate } from '@/types/experience'

export const experienceApi = {
  getUser() {
    return apiGet<UserDashboard>('/me')
  },
  updateUser(update: UserStateUpdate) {
    return apiRequest<UserDashboard>('PUT', '/me', update)
  },
  uploadAvatar(filePath: string) {
    return apiUpload<UserDashboard>('/me/avatar', filePath)
  },
  getPlan(date: string) {
    return apiGet<PlanPayload>('/plan', { date })
  },
  getTakeout(category?: string) {
    return apiGet<TakeoutShop[]>('/takeout', category ? { category } : undefined)
  },
}
