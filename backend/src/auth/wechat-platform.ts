interface WechatApiResponse {
  errcode?: number
  errmsg?: string
}

interface WechatAccessTokenResponse extends WechatApiResponse {
  access_token?: string
  expires_in?: number
}

interface WechatPhoneResponse extends WechatApiResponse {
  phone_info?: {
    phoneNumber?: string
    purePhoneNumber?: string
    countryCode?: string
  }
}

export interface WechatPhoneNumber {
  phoneNumber: string
  purePhoneNumber: string
  countryCode: string
}

export interface WechatSubscribeMessageInput {
  openid: string
  templateId: string
  page: string
  data: Record<string, { value: string }>
  miniProgramState: 'developer' | 'trial' | 'formal'
}

export interface WechatPlatformClient {
  getPhoneNumber(code: string): Promise<WechatPhoneNumber>
  sendSubscribeMessage(input: WechatSubscribeMessageInput): Promise<void>
}

export class WechatPlatformError extends Error {
  constructor(message: string, readonly code = 'WECHAT_PLATFORM_ERROR') {
    super(message)
    this.name = 'WechatPlatformError'
  }
}

export function createWechatPlatformClient(appId: string, appSecret: string): WechatPlatformClient {
  let cachedToken = ''
  let tokenExpiresAt = 0

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    let response: Response
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) })
    } catch {
      throw new WechatPlatformError('微信服务暂时不可用')
    }
    if (!response.ok) throw new WechatPlatformError('微信服务暂时不可用', String(response.status))
    return response.json() as Promise<T>
  }

  async function accessToken(force = false): Promise<string> {
    if (!force && cachedToken && tokenExpiresAt > Date.now() + 60_000) return cachedToken
    const query = new URLSearchParams({ grant_type: 'client_credential', appid: appId, secret: appSecret })
    const payload = await requestJson<WechatAccessTokenResponse>(`https://api.weixin.qq.com/cgi-bin/token?${query}`)
    if (payload.errcode || !payload.access_token) {
      throw new WechatPlatformError(payload.errmsg || '微信接口凭证获取失败', String(payload.errcode || 'WECHAT_TOKEN_FAILED'))
    }
    cachedToken = payload.access_token
    tokenExpiresAt = Date.now() + Math.max(300, (payload.expires_in ?? 7200) - 300) * 1000
    return cachedToken
  }

  async function callWithToken<T extends WechatApiResponse>(
    path: string,
    body: Record<string, unknown>,
    retry = true,
  ): Promise<T> {
    const token = await accessToken(!retry)
    const payload = await requestJson<T>(`https://api.weixin.qq.com${path}?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (retry && (payload.errcode === 40001 || payload.errcode === 40014 || payload.errcode === 42001)) {
      cachedToken = ''
      tokenExpiresAt = 0
      return callWithToken<T>(path, body, false)
    }
    return payload
  }

  return {
    async getPhoneNumber(code) {
      const payload = await callWithToken<WechatPhoneResponse>('/wxa/business/getuserphonenumber', { code })
      const phone = payload.phone_info
      if (payload.errcode || !phone?.phoneNumber || !phone.purePhoneNumber || !phone.countryCode) {
        throw new WechatPlatformError(payload.errmsg || '手机号授权失败', String(payload.errcode || 'WECHAT_PHONE_FAILED'))
      }
      return {
        phoneNumber: phone.phoneNumber,
        purePhoneNumber: phone.purePhoneNumber,
        countryCode: phone.countryCode,
      }
    },
    async sendSubscribeMessage(input) {
      const payload = await callWithToken<WechatApiResponse>('/cgi-bin/message/subscribe/send', {
        touser: input.openid,
        template_id: input.templateId,
        page: input.page,
        miniprogram_state: input.miniProgramState,
        lang: 'zh_CN',
        data: input.data,
      })
      if (payload.errcode) {
        throw new WechatPlatformError(payload.errmsg || '订阅消息发送失败', String(payload.errcode))
      }
    },
  }
}
