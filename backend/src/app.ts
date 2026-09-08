import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { serverConfig } from './config.js'
import { createMemoryRecipeRepository } from './recipes/repository.js'
import type { RecipeQuery, RecipeRepository } from './recipes/types.js'

export interface BuildAppOptions {
  logger?: boolean
  repository?: RecipeRepository
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

  return app
}
