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

export const serverConfig = {
  host: process.env.HOST?.trim() || '0.0.0.0',
  port: parsePort(process.env.PORT),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  isProduction: process.env.NODE_ENV === 'production',
}
