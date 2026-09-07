import cors from '@fastify/cors'
import Fastify, { type FastifyInstance } from 'fastify'
import { serverConfig } from './config.js'

export interface BuildAppOptions {
  logger?: boolean
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? serverConfig.isProduction,
    trustProxy: true,
  })

  void app.register(cors, {
    origin: serverConfig.corsOrigins,
  })

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

  return app
}
