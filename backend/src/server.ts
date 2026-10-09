import { buildApp } from './app.js'
import { serverConfig } from './config.js'
import { createMemoryMealRepository } from './meals/repository.js'
import { createPostgresMealRepository } from './meals/postgres-repository.js'
import { createMemoryRecipeRepository } from './recipes/repository.js'
import { createPostgresRecipeRepository } from './recipes/postgres-repository.js'

const repository = serverConfig.databaseUrl
  ? await createPostgresRecipeRepository(serverConfig.databaseUrl, serverConfig.assetBaseUrl)
  : createMemoryRecipeRepository(serverConfig.assetBaseUrl)
const mealRepository = serverConfig.databaseUrl
  ? await createPostgresMealRepository(serverConfig.databaseUrl, repository)
  : createMemoryMealRepository(repository)
const app = buildApp({ logger: true, repository, mealRepository })

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'shutting down')
  await app.close()
  process.exit(0)
}

process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await app.listen({ host: serverConfig.host, port: serverConfig.port })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
