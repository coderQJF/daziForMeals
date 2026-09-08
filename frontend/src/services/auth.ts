import { apiRequest, setAuthToken } from './http'
import type { UserDashboard } from '@/types/experience'

export interface AuthSession {
  token: string
  expiresAt: string
  user: UserDashboard
}

export const authApi = {
  async login(code: string): Promise<AuthSession> {
    const session = await apiRequest<AuthSession>('POST', '/auth/wechat', { code })
    setAuthToken(session.token)
    return session
  },
}
