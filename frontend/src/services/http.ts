import { API_BASE_URL } from '@/config/api'

interface ApiEnvelope<T> {
  data: T
}

interface ApiErrorEnvelope {
  error?: {
    message?: string
  }
}

export class ApiError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message)
    this.name = 'ApiError'
  }
}

const CLIENT_ID_STORAGE_KEY = 'fandaziClientId'
const AUTH_TOKEN_STORAGE_KEY = 'fandaziAuthToken'

function getClientId(): string {
  const existing = uni.getStorageSync(CLIENT_ID_STORAGE_KEY)
  if (typeof existing === 'string' && existing.length >= 8) return existing
  const created = `wx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
  uni.setStorageSync(CLIENT_ID_STORAGE_KEY, created)
  return created
}

export function setAuthToken(token: string): void {
  uni.setStorageSync(AUTH_TOKEN_STORAGE_KEY, token)
  uni.removeStorageSync('isLoggedIn')
}

export function clearAuthToken(): void {
  uni.removeStorageSync(AUTH_TOKEN_STORAGE_KEY)
  uni.removeStorageSync('isLoggedIn')
}

export function hasAuthToken(): boolean {
  return Boolean(uni.getStorageSync(AUTH_TOKEN_STORAGE_KEY))
}

export function apiRequest<T>(method: 'GET' | 'POST' | 'PUT', path: string, data?: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync(AUTH_TOKEN_STORAGE_KEY)
    const header: Record<string, string> = { 'x-client-id': getClientId() }
    if (typeof token === 'string' && token) header.Authorization = `Bearer ${token}`
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method,
      data,
      header,
      timeout: 10000,
      success(response: UniApp.RequestSuccessCallbackResult) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve((response.data as ApiEnvelope<T>).data)
          return
        }
        const payload = response.data as ApiEnvelope<T> & ApiErrorEnvelope
        if (response.statusCode === 401 && typeof token === 'string' && token) clearAuthToken()
        reject(new ApiError(payload.error?.message || '服务暂时不可用', response.statusCode))
      },
      fail(error: UniApp.GeneralCallbackResult) {
        reject(new ApiError(error.errMsg || '网络连接失败'))
      },
    })
  })
}

export function apiGet<T>(path: string, data?: Record<string, string | number>): Promise<T> {
  return apiRequest<T>('GET', path, data)
}
