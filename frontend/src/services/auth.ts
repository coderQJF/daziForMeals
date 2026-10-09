import { apiRequest, setAuthToken } from './http'
import type { UserDashboard } from '@/types/experience'

export interface AuthSession {
  token: string
  expiresAt: string
  user: UserDashboard
}

export interface WechatCapabilities {
  phoneNumberBinding: boolean
  mealNotification: null | {
    templateId: string
  }
}

export const authApi = {
  async login(code: string): Promise<AuthSession> {
    const session = await apiRequest<AuthSession>('POST', '/auth/wechat', { code })
    setAuthToken(session.token)
    return session
  },
  getCapabilities() {
    return apiRequest<WechatCapabilities>('GET', '/wechat/capabilities')
  },
  bindPhone(code: string) {
    return apiRequest<UserDashboard>('POST', '/me/wechat-phone', { code })
  },
  saveNotificationSubscription(mealId: string, templateId: string, subscribed: boolean) {
    return apiRequest<{ subscribed: boolean }>('POST', '/me/notification-subscriptions', { mealId, templateId, subscribed })
  },
}
