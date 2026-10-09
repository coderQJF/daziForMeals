import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { createHash, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import Fastify, { LogController, type FastifyInstance } from 'fastify'
import { createSessionToken, createWechatCodeExchange, createWechatSubject, verifySessionToken, WechatLoginError, type WechatCodeExchange } from './auth/wechat.js'
import { createWechatPlatformClient, WechatPlatformError, type WechatPlatformClient } from './auth/wechat-platform.js'
import { serverConfig } from './config.js'
import { createMemoryMealRepository } from './meals/repository.js'
import { mealTitle, resolveMealSlot } from './meals/schedule.js'
import {
  InvalidInviteError,
  MealAccessDeniedError,
  MealNotFoundError,
  MealValidationError,
  type MealCategoryInput,
  type MealAggregate,
  type MealCreateInput,
  type MealRepository,
  type MealType,
} from './meals/types.js'
import { createMemoryRecipeRepository } from './recipes/repository.js'
import type { RecipeQuery, RecipeRepository, UserDashboard, UserState, UserStateUpdate } from './recipes/types.js'

export interface BuildAppOptions {
  logger?: boolean
  repository?: RecipeRepository
  mealRepository?: MealRepository
  sessionSecret?: string
  wechatCodeExchange?: WechatCodeExchange
  wechatPlatformClient?: WechatPlatformClient
  phoneNumberBindingEnabled?: boolean
  phoneNumberBindingUnavailableReason?: string
  mealNotificationConfig?: MealNotificationConfig | null
  avatarStorageDir?: string
  publicApiBaseUrl?: string
  opsAdminToken?: string
}

export interface MealNotificationConfig {
  templateId: string
  titleKey: string
  timeKey: string
  menuKey?: string
  statusKey?: string
  miniProgramState: 'developer' | 'trial' | 'formal'
}

class InvalidSessionError extends Error {}

function resolveDeviceClientId(headers: Record<string, unknown>): string {
  const value = headers['x-client-id']
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(value) ? value : 'anonymous-default'
}

function resolveClientId(headers: Record<string, unknown>, sessionSecret: string | undefined): string {
  const authorization = headers.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    return resolveDeviceClientId(headers)
  }
  if (!sessionSecret) throw new InvalidSessionError()
  const subject = verifySessionToken(authorization.slice('Bearer '.length), sessionSecret)
  if (!subject) throw new InvalidSessionError()
  return subject
}

function resolveAuthenticatedClientId(headers: Record<string, unknown>, sessionSecret: string | undefined): string {
  const authorization = headers.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ') || !sessionSecret) {
    throw new InvalidSessionError()
  }
  const subject = verifySessionToken(authorization.slice('Bearer '.length), sessionSecret)
  if (!subject) throw new InvalidSessionError()
  return subject
}

function resolveOptionalAuthenticatedClientId(headers: Record<string, unknown>, sessionSecret: string | undefined): string | undefined {
  const authorization = headers.authorization
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return undefined
  if (!sessionSecret) throw new InvalidSessionError()
  const subject = verifySessionToken(authorization.slice('Bearer '.length), sessionSecret)
  if (!subject) throw new InvalidSessionError()
  return subject
}

function detectAvatarType(buffer: Uint8Array<ArrayBuffer>): { extension: 'jpg' | 'png', contentType: string } | undefined {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', contentType: 'image/jpeg' }
  }
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (buffer.length >= 8 && pngSignature.every((byte, index) => buffer[index] === byte)) {
    return { extension: 'png', contentType: 'image/png' }
  }
  return undefined
}

function toDashboard(state: UserState): UserDashboard {
  const { clientId: _clientId, wechat, ...publicState } = state
  const phoneNumber = wechat?.phone?.purePhoneNumber ?? ''
  return {
    ...publicState,
    phoneBound: Boolean(phoneNumber),
    phoneMasked: phoneNumber
      ? `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`
      : '',
    stats: {
      favorites: state.favoriteRecipeIds.length,
      likes: state.likedRecipeIds.length,
      cooked: state.cookedRecipeIds.length,
    },
  }
}

function parseIdList(value: unknown): number[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error('菜谱编号列表格式无效')
  const ids = value.map(Number)
  if (ids.length > 200 || ids.some(id => !Number.isInteger(id) || id < 1)) throw new Error('菜谱编号列表格式无效')
  return [...new Set(ids)]
}

function parseUserStateUpdate(body: unknown): UserStateUpdate {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('用户数据格式无效')
  const payload = body as Record<string, unknown>
  const update: UserStateUpdate = {}
  if (payload.selectedStatus !== undefined) {
    if (typeof payload.selectedStatus !== 'string' || !payload.selectedStatus.trim()) throw new Error('身体状态格式无效')
    update.selectedStatus = payload.selectedStatus.trim().slice(0, 40)
  }
  const favoriteRecipeIds = parseIdList(payload.favoriteRecipeIds)
  const likedRecipeIds = parseIdList(payload.likedRecipeIds)
  const cookedRecipeIds = parseIdList(payload.cookedRecipeIds)
  const plannedRecipeIds = parseIdList(payload.plannedRecipeIds)
  if (favoriteRecipeIds) update.favoriteRecipeIds = favoriteRecipeIds
  if (likedRecipeIds) update.likedRecipeIds = likedRecipeIds
  if (cookedRecipeIds) update.cookedRecipeIds = cookedRecipeIds
  if (plannedRecipeIds) update.plannedRecipeIds = plannedRecipeIds
  if (payload.profile !== undefined) {
    if (!payload.profile || typeof payload.profile !== 'object' || Array.isArray(payload.profile)) throw new Error('用户资料格式无效')
    const profile = payload.profile as Record<string, unknown>
    if (typeof profile.nickname !== 'string' || typeof profile.bio !== 'string' || typeof profile.avatar !== 'string') throw new Error('用户资料格式无效')
    update.profile = {
      nickname: profile.nickname.trim().slice(0, 40),
      bio: profile.bio.trim().slice(0, 120),
      avatar: profile.avatar.trim().slice(0, 500),
    }
  }
  return update
}

function parseMealCreateInput(body: unknown): MealCreateInput {
  const payload = body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {}
  const defaultSlot = resolveMealSlot()
  const mealAt = payload.mealAt === undefined ? defaultSlot.mealAt : new Date(String(payload.mealAt))
  if (Number.isNaN(mealAt.getTime())) throw new MealValidationError('用餐时间格式无效')
  const requestedMealType = payload.mealType
  if (requestedMealType !== undefined && requestedMealType !== 'lunch' && requestedMealType !== 'dinner') {
    throw new MealValidationError('餐次类型仅支持午餐或晚餐')
  }
  const chinaHour = new Date(mealAt.getTime() + 8 * 60 * 60 * 1000).getUTCHours()
  const inferredMealType: MealType = chinaHour < 16 ? 'lunch' : 'dinner'
  const mealType: MealType = requestedMealType ?? (payload.mealAt === undefined ? defaultSlot.mealType : inferredMealType)
  const requestedTitle = typeof payload.title === 'string' ? payload.title.trim() : ''
  if (requestedTitle.length > 40) throw new MealValidationError('饭局名称不能超过 40 个字')
  return {
    title: requestedTitle || mealTitle(mealAt, mealType),
    mealAt: mealAt.toISOString(),
    mealType,
  }
}

function parseRecipeId(value: unknown): number {
  const recipeId = Number(value)
  if (!Number.isInteger(recipeId) || recipeId < 1) throw new MealValidationError('菜谱编号无效')
  return recipeId
}

function parseMealCategoryInput(body: unknown): MealCategoryInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MealValidationError('菜类数据格式无效')
  const payload = body as Record<string, unknown>
  const id = typeof payload.id === 'string' ? payload.id.trim() : ''
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  const sortOrder = Number(payload.sortOrder)
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(id)) throw new MealValidationError('菜类编号格式无效')
  if (!name || name.length > 20) throw new MealValidationError('菜类名称格式无效')
  if (!Number.isInteger(sortOrder) || sortOrder < -10000 || sortOrder > 10000) throw new MealValidationError('菜类排序值无效')
  if (typeof payload.enabled !== 'boolean') throw new MealValidationError('菜类启用状态无效')
  if (!Array.isArray(payload.recipeIds) || payload.recipeIds.some(value => typeof value !== 'number')) {
    throw new MealValidationError('菜谱编号列表格式无效')
  }
  let recipeIds: number[] | undefined
  try {
    recipeIds = parseIdList(payload.recipeIds)
  } catch {
    throw new MealValidationError('菜谱编号列表格式无效')
  }
  if (!recipeIds) throw new MealValidationError('请提供菜类关联的菜谱')
  return { id, name, sortOrder, enabled: payload.enabled, recipeIds }
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const repository = options.repository ?? createMemoryRecipeRepository(serverConfig.assetBaseUrl)
  const mealRepository = options.mealRepository ?? createMemoryMealRepository(repository)
  const sessionSecret = options.sessionSecret ?? serverConfig.sessionSecret
  const wechatCodeExchange = options.wechatCodeExchange ?? (
    serverConfig.wechatAppId && serverConfig.wechatAppSecret
      ? createWechatCodeExchange(serverConfig.wechatAppId, serverConfig.wechatAppSecret)
      : undefined
  )
  const wechatPlatformClient = options.wechatPlatformClient ?? (
    serverConfig.wechatAppId && serverConfig.wechatAppSecret
      ? createWechatPlatformClient(serverConfig.wechatAppId, serverConfig.wechatAppSecret)
      : undefined
  )
  const phoneNumberBindingEnabled = Boolean(wechatPlatformClient) && (
    options.phoneNumberBindingEnabled
      ?? (options.wechatPlatformClient !== undefined || serverConfig.wechatPhoneBindingEnabled)
  )
  const phoneNumberBindingUnavailableReason = options.phoneNumberBindingUnavailableReason
    ?? serverConfig.wechatPhoneBindingUnavailableReason
  const configuredMealNotification = (
    serverConfig.wechatMealNotificationTemplateId
    && serverConfig.wechatMealNotificationTitleKey
    && serverConfig.wechatMealNotificationTimeKey
  ) ? {
      templateId: serverConfig.wechatMealNotificationTemplateId,
      titleKey: serverConfig.wechatMealNotificationTitleKey,
      timeKey: serverConfig.wechatMealNotificationTimeKey,
      ...(serverConfig.wechatMealNotificationMenuKey ? { menuKey: serverConfig.wechatMealNotificationMenuKey } : {}),
      ...(serverConfig.wechatMealNotificationStatusKey ? { statusKey: serverConfig.wechatMealNotificationStatusKey } : {}),
      miniProgramState: serverConfig.wechatMiniProgramState,
    } satisfies MealNotificationConfig : null
  const mealNotificationConfig = options.mealNotificationConfig === undefined
    ? configuredMealNotification
    : options.mealNotificationConfig
  const avatarStorageDir = options.avatarStorageDir ?? serverConfig.avatarStorageDir
  const publicApiBaseUrl = (options.publicApiBaseUrl ?? serverConfig.publicApiBaseUrl).replace(/\/+$/, '')
  const operationsToken = (options.opsAdminToken ?? serverConfig.opsAdminToken ?? '').trim()
  const app = Fastify({
    logger: options.logger ?? serverConfig.isProduction,
    trustProxy: true,
    logController: new LogController({
      disableRequestLogging: request => (
        serverConfig.isProduction
        && /[?&]invite(?:Code)?=/.test(request.url)
      ),
    }),
  })

  async function notifyMealConfirmed(meal: MealAggregate): Promise<void> {
    if (!wechatPlatformClient || !mealNotificationConfig) return
    const recipients = await repository.getNotificationRecipients(
      meal.members.map(member => member.userId),
      meal.id,
      mealNotificationConfig.templateId,
    )
    if (!recipients.length) return

    const mealAt = new Date(meal.mealAt)
    const chinaTime = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(mealAt).replace(/\//g, '-').replace(/\s+/g, ' ')
    const mealType = meal.mealType === 'lunch' ? '午餐菜单' : '晚餐菜单'
    const menu = meal.dishes.map(item => item.recipe.name).join('、').slice(0, 20) || '菜单已确定'
    const data: Record<string, { value: string }> = {
      [mealNotificationConfig.titleKey]: { value: mealType },
      [mealNotificationConfig.timeKey]: { value: chinaTime },
    }
    if (mealNotificationConfig.menuKey) data[mealNotificationConfig.menuKey] = { value: menu }
    if (mealNotificationConfig.statusKey) data[mealNotificationConfig.statusKey] = { value: '菜单已定' }

    await Promise.all(recipients.map(async (recipient) => {
      try {
        await wechatPlatformClient.sendSubscribeMessage({
          openid: recipient.openid,
          templateId: mealNotificationConfig.templateId,
          page: `pages/menu/confirmed?mealId=${encodeURIComponent(meal.id)}`,
          data,
          miniProgramState: mealNotificationConfig.miniProgramState,
        })
        await repository.setNotificationSubscription(recipient.clientId, meal.id, mealNotificationConfig.templateId, false)
      } catch (error) {
        if (error instanceof WechatPlatformError && error.code === '43101') {
          await repository.setNotificationSubscription(recipient.clientId, meal.id, mealNotificationConfig.templateId, false)
        }
        app.log.warn({ err: error, clientId: recipient.clientId }, 'meal confirmation notification failed')
      }
    }))
  }

  async function persistAvatar(clientId: string, buffer: Uint8Array<ArrayBuffer>, extension: 'jpg' | 'png') {
    const filename = `${createHash('sha256').update(buffer).digest('hex')}.${extension}`
    await mkdir(avatarStorageDir, { recursive: true })
    await writeFile(join(avatarStorageDir, filename), buffer, { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error
    })
    const state = await repository.updateUserState(clientId, {
      profile: {
        ...(await repository.getUserState(clientId)).profile,
        avatar: `${publicApiBaseUrl}/api/v1/avatars/${filename}`,
      },
    })
    return toDashboard(state)
  }

  void app.register(cors, {
    origin: serverConfig.corsOrigins,
  })
  void app.register(multipart, {
    limits: { files: 1, fileSize: 2 * 1024 * 1024 },
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof InvalidSessionError) {
      return reply.code(401).send({ error: { code: 'INVALID_SESSION', message: '登录已过期，请重新登录' } })
    }
    if (error instanceof MealNotFoundError) {
      return reply.code(404).send({ error: { code: 'MEAL_NOT_FOUND', message: error.message } })
    }
    if (error instanceof InvalidInviteError) {
      return reply.code(403).send({ error: { code: 'INVALID_INVITE', message: error.message } })
    }
    if (error instanceof MealAccessDeniedError) {
      return reply.code(403).send({ error: { code: 'MEAL_ACCESS_DENIED', message: error.message } })
    }
    if (error instanceof MealValidationError) {
      return reply.code(400).send({ error: { code: 'INVALID_MEAL_DATA', message: error.message } })
    }
    request.log.error(error)
    return reply.send(error)
  })

  if (repository.close) {
    app.addHook('onClose', async () => repository.close?.())
  }
  if (mealRepository.close) {
    app.addHook('onClose', async () => mealRepository.close?.())
  }

  const healthPayload = () => ({
    status: 'ok' as const,
    service: 'fandazi-api',
    timestamp: new Date().toISOString(),
  })

  app.get('/health', async () => healthPayload())
  app.get('/api/v1/health', async () => healthPayload())

  app.get('/api/v1', async () => ({
    name: '饭搭子 API',
    version: 'v1',
  }))

  app.get('/api/v1/wechat/capabilities', async () => ({
    data: {
      phoneNumberBinding: phoneNumberBindingEnabled,
      ...(!phoneNumberBindingEnabled ? { phoneNumberUnavailableReason: phoneNumberBindingUnavailableReason } : {}),
      mealNotification: mealNotificationConfig
        ? { templateId: mealNotificationConfig.templateId }
        : null,
    },
  }))

  function operationsError(authorization: string | undefined): { status: 401 | 503, message: string } | undefined {
    if (!operationsToken) return { status: 503, message: '运营后台联动尚未配置' }
    const actual = (authorization || '').replace(/^Bearer\s+/i, '')
    const expectedDigest = Uint8Array.from(createHash('sha256').update(operationsToken).digest())
    const actualDigest = Uint8Array.from(createHash('sha256').update(actual).digest())
    if (!timingSafeEqual(actualDigest, expectedDigest)) return { status: 401, message: '运营凭证无效' }
    return undefined
  }

  app.get('/api/v1/operations/summary', async (request, reply) => {
    const error = operationsError(request.headers.authorization)
    if (error) return reply.code(error.status).send({ error: { code: 'OPERATIONS_UNAUTHORIZED', message: error.message } })
    return { data: await repository.operationsSummary() }
  })

  app.get('/api/v1/operations/users', async (request, reply) => {
    const error = operationsError(request.headers.authorization)
    if (error) return reply.code(error.status).send({ error: { code: 'OPERATIONS_UNAUTHORIZED', message: error.message } })
    const query = request.query as Record<string, unknown>
    const keyword = typeof query.q === 'string' ? query.q.slice(0, 80) : ''
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50))
    const offset = Math.max(0, Number(query.offset) || 0)
    const result = await repository.operationsUsers(keyword, limit, offset)
    return { data: result.items, meta: { total: result.total } }
  })

  app.get('/api/v1/operations/meal-categories', async (request, reply) => {
    const error = operationsError(request.headers.authorization)
    if (error) return reply.code(error.status).send({ error: { code: 'OPERATIONS_UNAUTHORIZED', message: error.message } })
    const items = await mealRepository.listCategories(true)
    return { data: items, meta: { total: items.length } }
  })

  app.get('/api/v1/operations/recipes', async (request, reply) => {
    const error = operationsError(request.headers.authorization)
    if (error) return reply.code(error.status).send({ error: { code: 'OPERATIONS_UNAUTHORIZED', message: error.message } })
    const query = request.query as Record<string, unknown>
    const requestedLimit = Number(query.limit)
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 500)
      : 200
    const items = await repository.list({ sort: 'default', limit })
    return { data: items, meta: { total: items.length } }
  })

  app.put('/api/v1/operations/meal-categories', async (request, reply) => {
    const operationsFailure = operationsError(request.headers.authorization)
    if (operationsFailure) return reply.code(operationsFailure.status).send({ error: { code: 'OPERATIONS_UNAUTHORIZED', message: operationsFailure.message } })
    const input = parseMealCategoryInput(request.body)
    return { data: await mealRepository.upsertCategory(input) }
  })

  app.delete('/api/v1/operations/meal-categories', async (request, reply) => {
    const operationsFailure = operationsError(request.headers.authorization)
    if (operationsFailure) return reply.code(operationsFailure.status).send({ error: { code: 'OPERATIONS_UNAUTHORIZED', message: operationsFailure.message } })
    const query = request.query as Record<string, unknown>
    const id = typeof query.id === 'string' ? query.id.trim() : ''
    if (!/^[a-z][a-z0-9-]{0,39}$/.test(id)) throw new MealValidationError('菜类编号格式无效')
    const deleted = await mealRepository.deleteCategory(id)
    if (!deleted) return reply.code(404).send({ error: { code: 'MEAL_CATEGORY_NOT_FOUND', message: '菜类不存在' } })
    return { data: { id, deleted: true } }
  })

  app.post('/api/v1/auth/wechat', async (request, reply) => {
    if (!wechatCodeExchange || !sessionSecret) {
      return reply.code(503).send({ error: { code: 'WECHAT_LOGIN_NOT_CONFIGURED', message: '微信登录尚未配置' } })
    }

    const body = request.body as Record<string, unknown> | undefined
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    if (!code || code.length > 256) {
      return reply.code(400).send({ error: { code: 'INVALID_WECHAT_CODE', message: '微信登录凭证无效' } })
    }

    try {
      const identity = await wechatCodeExchange(code)
      const userClientId = createWechatSubject(identity.openid)
      await repository.claimUserState(resolveDeviceClientId(request.headers), userClientId)
      const state = await repository.setWechatIdentity(userClientId, identity)
      const session = createSessionToken(userClientId, sessionSecret)
      return {
        data: {
          ...session,
          user: toDashboard(state),
        },
      }
    } catch (error) {
      if (error instanceof WechatLoginError) {
        return reply.code(401).send({ error: { code: error.code, message: error.message } })
      }
      request.log.error(error)
      return reply.code(502).send({ error: { code: 'WECHAT_SERVICE_UNAVAILABLE', message: '微信登录服务暂时不可用' } })
    }
  })

  app.post('/api/v1/me/wechat-phone', async (request, reply) => {
    const clientId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    if (!wechatPlatformClient || !phoneNumberBindingEnabled) {
      return reply.code(503).send({ error: { code: 'WECHAT_PHONE_NOT_CONFIGURED', message: phoneNumberBindingUnavailableReason } })
    }
    const body = request.body as Record<string, unknown> | undefined
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    if (!code || code.length > 256) {
      return reply.code(400).send({ error: { code: 'INVALID_PHONE_CODE', message: '手机号授权凭证无效' } })
    }
    try {
      const phone = await wechatPlatformClient.getPhoneNumber(code)
      const state = await repository.setWechatPhone(clientId, phone)
      return { data: toDashboard(state) }
    } catch (error) {
      if (error instanceof WechatPlatformError) {
        request.log.warn({ code: error.code }, 'wechat phone binding failed')
        return reply.code(400).send({ error: { code: error.code, message: '手机号授权未完成，请重试' } })
      }
      if (error instanceof Error && error.message.startsWith('请重新完成微信登录')) {
        return reply.code(409).send({ error: { code: 'WECHAT_RELOGIN_REQUIRED', message: error.message } })
      }
      throw error
    }
  })

  app.post('/api/v1/me/notification-subscriptions', async (request, reply) => {
    const clientId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    if (!mealNotificationConfig) {
      return reply.code(503).send({ error: { code: 'MEAL_NOTIFICATION_NOT_CONFIGURED', message: '菜单通知尚未配置' } })
    }
    const body = request.body as Record<string, unknown> | undefined
    const mealId = typeof body?.mealId === 'string' ? body.mealId.trim() : ''
    const templateId = typeof body?.templateId === 'string' ? body.templateId.trim() : ''
    const validMealId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(mealId)
    if (!validMealId || templateId !== mealNotificationConfig.templateId || typeof body?.subscribed !== 'boolean') {
      return reply.code(400).send({ error: { code: 'INVALID_NOTIFICATION_SUBSCRIPTION', message: '通知授权结果无效' } })
    }
    try {
      const meal = await mealRepository.getMeal(mealId, clientId)
      if (!meal.isMember) throw new MealAccessDeniedError('加入饭局后才能开启通知')
      await repository.setNotificationSubscription(clientId, mealId, templateId, body.subscribed)
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('请重新完成微信登录')) {
        return reply.code(409).send({ error: { code: 'WECHAT_RELOGIN_REQUIRED', message: error.message } })
      }
      throw error
    }
    return { data: { subscribed: body.subscribed } }
  })

  app.get('/api/v1/bootstrap', async (request) => {
    const query = request.query as Record<string, unknown>
    const status = typeof query.status === 'string' && query.status ? query.status : 'recover'
    return { data: await repository.bootstrap(resolveClientId(request.headers, sessionSecret), status) }
  })

  app.get('/api/v1/meal-categories', async () => {
    const items = await mealRepository.listCategories(false)
    return { data: items, meta: { total: items.length } }
  })

  app.get('/api/v1/meals/current', async (request) => {
    const userId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    return { data: (await mealRepository.getCurrent(userId)) ?? null }
  })

  app.post('/api/v1/meals', async (request) => {
    const userId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    return { data: await mealRepository.createMeal(userId, parseMealCreateInput(request.body)) }
  })

  app.get('/api/v1/meals/:id', async (request) => {
    const { id } = request.params as { id: string }
    const query = request.query as Record<string, unknown>
    const inviteCode = typeof query.invite === 'string'
      ? query.invite
      : typeof query.inviteCode === 'string' ? query.inviteCode : undefined
    const currentUserId = resolveOptionalAuthenticatedClientId(request.headers, sessionSecret)
    return { data: await mealRepository.getMeal(id, currentUserId, inviteCode) }
  })

  app.post('/api/v1/meals/:id/join', async (request) => {
    const userId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    const { id } = request.params as { id: string }
    const body = request.body as Record<string, unknown> | undefined
    const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : ''
    if (!inviteCode) throw new InvalidInviteError()
    return { data: await mealRepository.joinMeal(id, userId, inviteCode) }
  })

  app.put('/api/v1/meals/:id/confirm', async (request) => {
    const userId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    const { id } = request.params as { id: string }
    const confirmed = await mealRepository.confirmMeal(id, userId)
    void notifyMealConfirmed(confirmed).catch((error) => {
      request.log.warn({ err: error, mealId: confirmed.id }, 'meal confirmation notification dispatch failed')
    })
    return { data: confirmed }
  })

  app.put('/api/v1/meals/:id/wishes/:recipeId', async (request) => {
    const userId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    const { id, recipeId } = request.params as { id: string, recipeId: string }
    return { data: await mealRepository.setWish(id, userId, parseRecipeId(recipeId)) }
  })

  app.delete('/api/v1/meals/:id/wishes/:recipeId', async (request) => {
    const userId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    const { id, recipeId } = request.params as { id: string, recipeId: string }
    return { data: await mealRepository.removeWish(id, userId, parseRecipeId(recipeId)) }
  })

  app.put('/api/v1/meals/:id/dishes/:recipeId', async (request) => {
    const userId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    const { id, recipeId } = request.params as { id: string, recipeId: string }
    const body = request.body as Record<string, unknown> | undefined
    const quantity = Number(body?.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw new MealValidationError('菜品数量需在 1 到 20 之间')
    }
    return { data: await mealRepository.setDish(id, userId, parseRecipeId(recipeId), quantity) }
  })

  app.delete('/api/v1/meals/:id/dishes/:recipeId', async (request) => {
    const userId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    const { id, recipeId } = request.params as { id: string, recipeId: string }
    return { data: await mealRepository.removeDish(id, userId, parseRecipeId(recipeId)) }
  })

  app.post('/api/v1/meals/:id/dishes/:recipeId/quantity', async (request) => {
    const userId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    const { id, recipeId } = request.params as { id: string, recipeId: string }
    const body = request.body as Record<string, unknown> | undefined
    const delta = Number(body?.delta)
    if (delta !== 1 && delta !== -1) throw new MealValidationError('菜品数量变化值无效')
    return {
      data: await mealRepository.addDishQuantity(
        id,
        userId,
        parseRecipeId(recipeId),
        delta as 1 | -1,
      ),
    }
  })

  app.get('/api/v1/recipes', async (request) => {
    const query = request.query as Record<string, unknown>
    const parsedLimit = Number(query.limit)
    const sort = query.sort === 'latest' || query.sort === 'popular' ? query.sort : 'default'
    const recipeQuery: RecipeQuery = { sort }
    if (typeof query.category === 'string' && query.category) recipeQuery.category = query.category
    if (typeof query.q === 'string' && query.q) recipeQuery.keyword = query.q
    if (typeof query.status === 'string' && query.status) recipeQuery.status = query.status
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) recipeQuery.limit = Math.min(parsedLimit, 100)
    const items = await repository.list(recipeQuery)
    return { data: items, meta: { total: items.length } }
  })

  app.get('/api/v1/recipes/random', async (request) => {
    const query = request.query as Record<string, unknown>
    const status = typeof query.status === 'string' && query.status ? query.status : 'normal'
    const excludeIds = typeof query.exclude === 'string'
      ? query.exclude.split(',').slice(0, 20).map(Number).filter(id => Number.isInteger(id) && id > 0)
      : []
    return {
      data: await repository.recommend(
        resolveClientId(request.headers, sessionSecret),
        status,
        excludeIds,
      ),
    }
  })

  app.get('/api/v1/recipes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const recipeId = Number(id)
    if (!Number.isInteger(recipeId) || recipeId < 1) {
      return reply.code(400).send({ error: { code: 'INVALID_RECIPE_ID', message: '菜谱编号无效' } })
    }
    const recipe = await repository.findById(recipeId)
    if (!recipe) {
      return reply.code(404).send({ error: { code: 'RECIPE_NOT_FOUND', message: '菜谱不存在' } })
    }
    return { data: recipe }
  })

  app.get('/api/v1/avatars/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string }
    if (!/^[a-f0-9]{64}\.(?:jpg|png)$/.test(filename)) {
      return reply.code(404).send({ error: { code: 'AVATAR_NOT_FOUND', message: '头像不存在' } })
    }
    try {
      const buffer = await readFile(join(avatarStorageDir, filename))
      return reply.type(filename.endsWith('.png') ? 'image/png' : 'image/jpeg').send(buffer)
    } catch {
      return reply.code(404).send({ error: { code: 'AVATAR_NOT_FOUND', message: '头像不存在' } })
    }
  })

  app.post('/api/v1/me/avatar', async (request, reply) => {
    const clientId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    const part = await request.file()
    if (!part) {
      return reply.code(400).send({ error: { code: 'AVATAR_REQUIRED', message: '请选择头像图片' } })
    }
    const buffer = new Uint8Array(await part.toBuffer())
    const imageType = detectAvatarType(buffer)
    if (!imageType) {
      return reply.code(415).send({ error: { code: 'INVALID_AVATAR_TYPE', message: '头像仅支持 JPG 或 PNG 格式' } })
    }
    return { data: await persistAvatar(clientId, buffer, imageType.extension) }
  })

  app.post('/api/v1/me/avatar/base64', { bodyLimit: 3 * 1024 * 1024 }, async (request, reply) => {
    const clientId = resolveAuthenticatedClientId(request.headers, sessionSecret)
    const body = request.body as { content?: unknown } | undefined
    const content = body?.content
    const maximumBase64Length = Math.ceil((2 * 1024 * 1024) * 4 / 3) + 4
    if (typeof content !== 'string' || !content || content.length > maximumBase64Length || !/^[A-Za-z0-9+/]+={0,2}$/.test(content)) {
      return reply.code(400).send({ error: { code: 'INVALID_AVATAR_DATA', message: '头像数据无效' } })
    }
    const buffer = new Uint8Array(Buffer.from(content, 'base64'))
    if (buffer.byteLength > 2 * 1024 * 1024) {
      return reply.code(413).send({ error: { code: 'AVATAR_TOO_LARGE', message: '头像大小不能超过 2MB' } })
    }
    const imageType = detectAvatarType(buffer)
    if (!imageType) {
      return reply.code(415).send({ error: { code: 'INVALID_AVATAR_TYPE', message: '头像仅支持 JPG 或 PNG 格式' } })
    }
    return { data: await persistAvatar(clientId, buffer, imageType.extension) }
  })

  app.get('/api/v1/me', async (request) => {
    const state = await repository.getUserState(resolveClientId(request.headers, sessionSecret))
    return { data: toDashboard(state) }
  })

  app.put('/api/v1/me', async (request, reply) => {
    try {
      const state = await repository.updateUserState(
        resolveClientId(request.headers, sessionSecret),
        parseUserStateUpdate(request.body),
      )
      return { data: toDashboard(state) }
    } catch (error) {
      if (error instanceof InvalidSessionError) throw error
      const message = error instanceof Error ? error.message : '用户数据格式无效'
      return reply.code(400).send({ error: { code: 'INVALID_USER_STATE', message } })
    }
  })

  app.get('/api/v1/plan', async (request) => {
    const query = request.query as Record<string, unknown>
    const date = typeof query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
      ? query.date
      : new Date().toISOString().slice(0, 10)
    return { data: await repository.getPlan(resolveClientId(request.headers, sessionSecret), date) }
  })

  app.get('/api/v1/takeout', async (request) => {
    const query = request.query as Record<string, unknown>
    const category = typeof query.category === 'string' && query.category ? query.category : undefined
    const items = await repository.listTakeout(category)
    return { data: items, meta: { total: items.length } }
  })

  return app
}
