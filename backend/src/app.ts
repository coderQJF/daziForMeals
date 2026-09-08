import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { serverConfig } from './config.js'
import { createMemoryRecipeRepository } from './recipes/repository.js'
import type { RecipeQuery, RecipeRepository, UserDashboard, UserState, UserStateUpdate } from './recipes/types.js'

export interface BuildAppOptions {
  logger?: boolean
  repository?: RecipeRepository
}

function resolveClientId(headers: Record<string, unknown>): string {
  const value = headers['x-client-id']
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(value) ? value : 'anonymous-default'
}

function toDashboard(state: UserState): UserDashboard {
  return {
    ...state,
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
  const app = Fastify({
    logger: options.logger ?? serverConfig.isProduction,
    trustProxy: true,
  })

  void app.register(cors, {
    origin: serverConfig.corsOrigins,
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

  app.get('/api/v1/bootstrap', async (request) => {
    const query = request.query as Record<string, unknown>
    const status = typeof query.status === 'string' && query.status ? query.status : 'recover'
    const parsedOffset = Number(query.offset)
    const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0
    return { data: await repository.bootstrap(status, offset) }
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

  app.get('/api/v1/me', async (request) => {
    const state = await repository.getUserState(resolveClientId(request.headers))
    return { data: toDashboard(state) }
  })

  app.put('/api/v1/me', async (request, reply) => {
    try {
      const state = await repository.updateUserState(
        resolveClientId(request.headers),
        parseUserStateUpdate(request.body),
      )
      return { data: toDashboard(state) }
    } catch (error) {
      const message = error instanceof Error ? error.message : '用户数据格式无效'
      return reply.code(400).send({ error: { code: 'INVALID_USER_STATE', message } })
    }
  })

  app.get('/api/v1/plan', async (request) => {
    const query = request.query as Record<string, unknown>
    const date = typeof query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
      ? query.date
      : new Date().toISOString().slice(0, 10)
    return { data: await repository.getPlan(resolveClientId(request.headers), date) }
  })

  app.get('/api/v1/takeout', async (request) => {
    const query = request.query as Record<string, unknown>
    const category = typeof query.category === 'string' && query.category ? query.category : undefined
    const items = await repository.listTakeout(category)
    return { data: items, meta: { total: items.length } }
  })

  return app
}
