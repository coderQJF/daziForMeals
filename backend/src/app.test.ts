import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { buildApp } from './app.js'

function concatBytes(...parts: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

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
  assert.match(payload.data.recommendation.cover, /^https:\/\/img\.coder-f-nowork\.cn\/static\/images\//)
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

test('WeChat login claims device state and authorizes later requests', async () => {
  const app = buildApp({
    logger: false,
    sessionSecret: 'test-session-secret-with-at-least-32-characters',
    wechatCodeExchange: async (code) => {
      assert.equal(code, 'temporary-wechat-code')
      return { openid: 'openid-for-test-user' }
    },
  })
  const deviceHeaders = { 'x-client-id': 'login-device-001' }
  await app.inject({
    method: 'PUT',
    url: '/api/v1/me',
    headers: deviceHeaders,
    payload: { favoriteRecipeIds: [1001], plannedRecipeIds: [2003] },
  })

  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/wechat',
    headers: deviceHeaders,
    payload: { code: 'temporary-wechat-code' },
  })
  assert.equal(login.statusCode, 200)
  const session = login.json().data
  assert.ok(session.token)
  assert.ok(session.expiresAt)
  assert.deepEqual(session.user.favoriteRecipeIds, [1001])
  assert.deepEqual(session.user.plannedRecipeIds, [2003])
  assert.equal(session.user.clientId, undefined)

  const authenticated = await app.inject({
    method: 'GET',
    url: '/api/v1/me',
    headers: { authorization: `Bearer ${session.token}`, 'x-client-id': 'other-device-002' },
  })
  assert.equal(authenticated.statusCode, 200)
  assert.deepEqual(authenticated.json().data.favoriteRecipeIds, [1001])

  const invalid = await app.inject({
    method: 'GET',
    url: '/api/v1/me',
    headers: { authorization: 'Bearer invalid-token', 'x-client-id': 'other-device-002' },
  })
  assert.equal(invalid.statusCode, 401)
  assert.equal(invalid.json().error.code, 'INVALID_SESSION')
  await app.close()
})

test('WeChat login reports missing server configuration', async () => {
  const app = buildApp({ logger: false })
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/wechat',
    payload: { code: 'temporary-wechat-code' },
  })
  assert.equal(response.statusCode, 503)
  assert.equal(response.json().error.code, 'WECHAT_LOGIN_NOT_CONFIGURED')
  await app.close()
})

test('authenticated users can upload and retrieve a persistent avatar', async () => {
  const avatarStorageDir = await mkdtemp(join(tmpdir(), 'fandazi-avatar-test-'))
  const app = buildApp({
    logger: false,
    avatarStorageDir,
    publicApiBaseUrl: 'https://api.example.test',
    sessionSecret: 'test-session-secret-with-at-least-32-characters',
    wechatCodeExchange: async () => ({ openid: 'avatar-test-user' }),
  })

  try {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/wechat',
      headers: { 'x-client-id': 'avatar-device-001' },
      payload: { code: 'avatar-code' },
    })
    const token = login.json().data.token as string
    const boundary = 'fandazi-avatar-boundary'
    const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    const payload = concatBytes(
      new TextEncoder().encode(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="avatar.png"\r\nContent-Type: image/png\r\n\r\n`),
      image,
      new TextEncoder().encode(`\r\n--${boundary}--\r\n`),
    )
    const upload = await app.inject({
      method: 'POST',
      url: '/api/v1/me/avatar',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: Buffer.from(payload) as unknown as string,
    })

    assert.equal(upload.statusCode, 200, upload.body)
    const avatarUrl = upload.json().data.profile.avatar as string
    assert.match(avatarUrl, /^https:\/\/api\.example\.test\/api\/v1\/avatars\/[a-f0-9]{64}\.png$/)

    const avatarPath = new URL(avatarUrl).pathname
    const downloaded = await app.inject({ method: 'GET', url: avatarPath })
    assert.equal(downloaded.statusCode, 200)
    assert.equal(downloaded.headers['content-type'], 'image/png')
    assert.deepEqual([...downloaded.rawPayload], [...image])

    const unauthenticated = await app.inject({
      method: 'POST',
      url: '/api/v1/me/avatar',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: Buffer.from(payload) as unknown as string,
    })
    assert.equal(unauthenticated.statusCode, 401)
  } finally {
    await app.close()
    await rm(avatarStorageDir, { recursive: true, force: true })
  }
})
