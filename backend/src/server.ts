import { buildApp } from './app.js'
import { serverConfig } from './config.js'

const app = buildApp({ logger: true })

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
