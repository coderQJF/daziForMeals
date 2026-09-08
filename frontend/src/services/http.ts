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

export function apiGet<T>(path: string, data?: Record<string, string | number>): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path}`,
      method: 'GET',
      data,
      timeout: 10000,
      success(response: UniApp.RequestSuccessCallbackResult) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve((response.data as ApiEnvelope<T>).data)
          return
        }
        const payload = response.data as ApiEnvelope<T> & ApiErrorEnvelope
        reject(new ApiError(payload.error?.message || '服务暂时不可用', response.statusCode))
      },
      fail(error: UniApp.GeneralCallbackResult) {
        reject(new ApiError(error.errMsg || '网络连接失败'))
      },
    })
  })
}
