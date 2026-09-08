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

test('GET /api/v1/bootstrap returns API-backed home content', async () => {
  const app = buildApp({ logger: false })
  const response = await app.inject({ method: 'GET', url: '/api/v1/bootstrap?status=recover' })
  const payload = response.json()

  assert.equal(response.statusCode, 200)
  assert.equal(payload.data.recommendation.id, 1001)
  assert.ok(payload.data.cookingCategories.length > 0)
  assert.ok(payload.data.statusOptions.length > 0)
  await app.close()
})

test('GET /api/v1/recipes supports category filters and detail lookup', async () => {
  const app = buildApp({ logger: false })
  const listResponse = await app.inject({ method: 'GET', url: '/api/v1/recipes?category=quick' })
  const listPayload = listResponse.json()
  assert.equal(listResponse.statusCode, 200)
  assert.ok(listPayload.data.every((recipe: { categoryId: string }) => recipe.categoryId === 'quick'))

  const detailResponse = await app.inject({ method: 'GET', url: '/api/v1/recipes/1001' })
  assert.equal(detailResponse.statusCode, 200)
  assert.equal(detailResponse.json().data.ingredients.length, 7)
  await app.close()
})
