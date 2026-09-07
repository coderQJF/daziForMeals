import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildApp } from './app.js'

test('GET /health returns the service status', async () => {
  const app = buildApp({ logger: false })

  const response = await app.inject({ method: 'GET', url: '/health' })
  const payload = response.json()

  assert.equal(response.statusCode, 200)
  assert.equal(payload.status, 'ok')
  assert.equal(payload.service, 'fandazi-api')

  await app.close()
})

test('GET /api/v1 exposes the API identity', async () => {
  const app = buildApp({ logger: false })

  const response = await app.inject({ method: 'GET', url: '/api/v1' })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { name: '饭搭子 API', version: 'v1' })

  await app.close()
})
