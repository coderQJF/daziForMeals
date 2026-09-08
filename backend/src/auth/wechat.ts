import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

interface WechatCodeSessionResponse {
  openid?: string
  unionid?: string
  session_key?: string
  errcode?: number
  errmsg?: string
}

interface SessionPayload {
  sub: string
  exp: number
}

export interface WechatIdentity {
  openid: string
  unionid?: string
}

export type WechatCodeExchange = (code: string) => Promise<WechatIdentity>

export class WechatLoginError extends Error {
  constructor(message: string, readonly code = 'WECHAT_LOGIN_FAILED') {
    super(message)
    this.name = 'WechatLoginError'
  }
}

export function createWechatSubject(openid: string): string {
  return `wechat:${createHash('sha256').update(openid).digest('hex')}`
}

export function createWechatCodeExchange(appId: string, appSecret: string): WechatCodeExchange {
  return async (code) => {
    const query = new URLSearchParams({
      appid: appId,
      secret: appSecret,
      js_code: code,
      grant_type: 'authorization_code',
    })
    const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${query}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new WechatLoginError('微信登录服务暂时不可用')

    const payload = await response.json() as WechatCodeSessionResponse
    if (payload.errcode || !payload.openid) {
      throw new WechatLoginError(payload.errmsg || '微信登录凭证无效', String(payload.errcode || 'WECHAT_LOGIN_FAILED'))
    }

    return payload.unionid
      ? { openid: payload.openid, unionid: payload.unionid }
      : { openid: payload.openid }
  }
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

export function createSessionToken(subject: string, secret: string, now = Date.now()): { token: string; expiresAt: string } {
  const expiresAtMs = now + SESSION_TTL_SECONDS * 1000
  const payload: SessionPayload = { sub: subject, exp: Math.floor(expiresAtMs / 1000) }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return {
    token: `${encodedPayload}.${sign(encodedPayload, secret)}`,
    expiresAt: new Date(expiresAtMs).toISOString(),
  }
}

export function verifySessionToken(token: string, secret: string, now = Date.now()): string | undefined {
  const [encodedPayload, providedSignature, extra] = token.split('.')
  if (!encodedPayload || !providedSignature || extra) return undefined

  const expectedSignature = sign(encodedPayload, secret)
  const actual = Uint8Array.from(Buffer.from(providedSignature))
  const expected = Uint8Array.from(Buffer.from(expectedSignature))
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return undefined

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<SessionPayload>
    if (typeof payload.sub !== 'string' || !payload.sub.startsWith('wechat:')) return undefined
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(now / 1000)) return undefined
    return payload.sub
  } catch {
    return undefined
  }
}
