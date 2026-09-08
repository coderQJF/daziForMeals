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

test('user state is isolated by client id and persists interactions', async () => {
  const app = buildApp({ logger: false })
  const headers = { 'x-client-id': 'test-client-001' }
  const initial = await app.inject({ method: 'GET', url: '/api/v1/me', headers })
  assert.equal(initial.statusCode, 200)
  assert.deepEqual(initial.json().data.favoriteRecipeIds, [2001, 2002, 2003])

  const updated = await app.inject({
    method: 'PUT',
    url: '/api/v1/me',
    headers,
    payload: { favoriteRecipeIds: [1001], cookedRecipeIds: [1001, 2001], selectedStatus: 'normal' },
  })
  assert.equal(updated.statusCode, 200)
  assert.equal(updated.json().data.stats.favorites, 1)
  assert.equal(updated.json().data.stats.cooked, 2)
  assert.equal(updated.json().data.selectedStatus, 'normal')

  const other = await app.inject({ method: 'GET', url: '/api/v1/me', headers: { 'x-client-id': 'test-client-002' } })
  assert.equal(other.json().data.selectedStatus, 'recover')
  await app.close()
})

test('plan and takeout pages receive API-backed data', async () => {
  const app = buildApp({ logger: false })
  const headers = { 'x-client-id': 'test-client-plan' }
  await app.inject({ method: 'PUT', url: '/api/v1/me', headers, payload: { plannedRecipeIds: [2003] } })

  const plan = await app.inject({ method: 'GET', url: '/api/v1/plan?date=2026-09-08', headers })
  assert.equal(plan.statusCode, 200)
  assert.equal(plan.json().data.date, '2026-09-08')
  assert.ok(plan.json().data.meals.find((meal: { id: string }) => meal.id === 'lunch').dishes.some((dish: { id: number }) => dish.id === 2003))

  const takeout = await app.inject({ method: 'GET', url: '/api/v1/takeout?category=hot-pot' })
  assert.equal(takeout.statusCode, 200)
  assert.ok(takeout.json().data.every((shop: { categoryId: string }) => shop.categoryId === 'hot-pot'))
  await app.close()
})
