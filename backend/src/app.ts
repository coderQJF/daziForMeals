import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import Fastify, { type FastifyInstance } from 'fastify'
import { createSessionToken, createWechatCodeExchange, createWechatSubject, verifySessionToken, WechatLoginError, type WechatCodeExchange } from './auth/wechat.js'
import { serverConfig } from './config.js'
import { createMemoryRecipeRepository } from './recipes/repository.js'
import type { RecipeQuery, RecipeRepository, UserDashboard, UserState, UserStateUpdate } from './recipes/types.js'

export interface BuildAppOptions {
  logger?: boolean
  repository?: RecipeRepository
  sessionSecret?: string
  wechatCodeExchange?: WechatCodeExchange
  avatarStorageDir?: string
  publicApiBaseUrl?: string
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
  const { clientId: _clientId, ...publicState } = state
  return {
    ...publicState,
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

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const repository = options.repository ?? createMemoryRecipeRepository(serverConfig.assetBaseUrl)
  const sessionSecret = options.sessionSecret ?? serverConfig.sessionSecret
  const wechatCodeExchange = options.wechatCodeExchange ?? (
    serverConfig.wechatAppId && serverConfig.wechatAppSecret
      ? createWechatCodeExchange(serverConfig.wechatAppId, serverConfig.wechatAppSecret)
      : undefined
  )
  const avatarStorageDir = options.avatarStorageDir ?? serverConfig.avatarStorageDir
  const publicApiBaseUrl = (options.publicApiBaseUrl ?? serverConfig.publicApiBaseUrl).replace(/\/+$/, '')
  const app = Fastify({
    logger: options.logger ?? serverConfig.isProduction,
    trustProxy: true,
  })

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
    request.log.error(error)
    return reply.send(error)
  })

  if (repository.close) {
    app.addHook('onClose', async () => repository.close?.())
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
      const state = await repository.claimUserState(resolveDeviceClientId(request.headers), userClientId)
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

  app.get('/api/v1/bootstrap', async (request) => {
    const query = request.query as Record<string, unknown>
    const status = typeof query.status === 'string' && query.status ? query.status : 'recover'
    return { data: await repository.bootstrap(resolveClientId(request.headers, sessionSecret), status) }
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
