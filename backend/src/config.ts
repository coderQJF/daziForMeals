const DEFAULT_PORT = 3000

function parsePort(value: string | undefined): number {
  if (!value) return DEFAULT_PORT

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`)
  }

  return port
}

function parseCorsOrigins(value: string | undefined): true | string[] {
  if (!value || value.trim() === '*') return true

  return value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}

function parseMiniProgramState(value: string | undefined): 'developer' | 'trial' | 'formal' {
  return value === 'developer' || value === 'trial' ? value : 'formal'
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value.trim() === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

export const serverConfig = {
  host: process.env.HOST?.trim() || '0.0.0.0',
  port: parsePort(process.env.PORT),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL?.trim(),
  assetBaseUrl: process.env.ASSET_BASE_URL?.trim() || 'https://img.coder-f-nowork.cn/static',
  avatarStorageDir: process.env.AVATAR_STORAGE_DIR?.trim() || '/data/avatars',
  publicApiBaseUrl: process.env.PUBLIC_API_BASE_URL?.trim() || 'http://127.0.0.1:3000',
  wechatAppId: process.env.WECHAT_APP_ID?.trim(),
  wechatAppSecret: process.env.WECHAT_APP_SECRET?.trim(),
  wechatPhoneBindingEnabled: parseBoolean(process.env.WECHAT_PHONE_BINDING_ENABLED),
  wechatPhoneBindingUnavailableReason: process.env.WECHAT_PHONE_BINDING_UNAVAILABLE_REASON?.trim()
    || '当前小程序为个人主体，微信暂不开放手机号授权；不影响登录和点菜',
  wechatMealNotificationTemplateId: process.env.WECHAT_MEAL_NOTIFICATION_TEMPLATE_ID?.trim(),
  wechatMealNotificationTitleKey: process.env.WECHAT_MEAL_NOTIFICATION_TITLE_KEY?.trim(),
  wechatMealNotificationTimeKey: process.env.WECHAT_MEAL_NOTIFICATION_TIME_KEY?.trim(),
  wechatMealNotificationMenuKey: process.env.WECHAT_MEAL_NOTIFICATION_MENU_KEY?.trim(),
  wechatMealNotificationStatusKey: process.env.WECHAT_MEAL_NOTIFICATION_STATUS_KEY?.trim(),
  wechatMiniProgramState: parseMiniProgramState(process.env.WECHAT_MINIPROGRAM_STATE?.trim()),
  sessionSecret: process.env.SESSION_SECRET?.trim(),
  opsAdminToken: process.env.OPS_ADMIN_TOKEN?.trim(),
}
