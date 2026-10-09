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

const mealSessionSecret = 'meal-test-session-secret-with-at-least-32-characters'

async function loginMealUser(
  app: ReturnType<typeof buildApp>,
  code: string,
  deviceId: string,
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/wechat',
    headers: { 'x-client-id': deviceId },
    payload: { code },
  })
  assert.equal(response.statusCode, 200, response.body)
  const token = response.json().data.token
  assert.equal(typeof token, 'string')
  assert.ok(token.length > 0)
  return token
}

function mealApp() {
  return buildApp({
    logger: false,
    sessionSecret: mealSessionSecret,
    wechatCodeExchange: async code => ({ openid: `meal-user-${code}` }),
  })
}

function chinaMealAt(dayOffset = 0, hour = 18): string {
  const chinaNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return new Date(Date.UTC(
    chinaNow.getUTCFullYear(),
    chinaNow.getUTCMonth(),
    chinaNow.getUTCDate() + dayOffset,
    hour - 8,
  )).toISOString()
}

async function createMealFor(
  app: ReturnType<typeof buildApp>,
  token: string,
  mealAt = chinaMealAt(),
  title = '家庭晚餐',
) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/meals',
    headers: { authorization: `Bearer ${token}` },
    payload: { title, mealAt, mealType: 'dinner' },
  })
  assert.equal(response.statusCode, 200, response.body)
  return response.json().data
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

test('operations endpoints protect and classify profile counts', async () => {
  const app = buildApp({ logger: false, opsAdminToken: 'operations-secret' })
  await app.inject({ method: 'GET', url: '/api/v1/me', headers: { 'x-client-id': 'guest-profile-001' } })

  const denied = await app.inject({ method: 'GET', url: '/api/v1/operations/summary' })
  assert.equal(denied.statusCode, 401)

  const headers = { authorization: 'Bearer operations-secret' }
  const summary = await app.inject({ method: 'GET', url: '/api/v1/operations/summary', headers })
  assert.equal(summary.statusCode, 200)
  assert.equal(summary.json().data.profiles, 1)
  assert.equal(summary.json().data.guestProfiles, 1)

  const users = await app.inject({ method: 'GET', url: '/api/v1/operations/users?q=%E5%BE%AE%E4%BF%A1%E7%94%A8%E6%88%B7', headers })
  assert.equal(users.statusCode, 200)
  assert.equal(users.json().meta.total, 1)
  assert.equal(users.json().data[0].accountType, 'guest')
  await app.close()
})

test('operations recipe catalog requires authorization and returns the complete catalog', async () => {
  const app = buildApp({ logger: false, opsAdminToken: 'operations-secret' })

  try {
    const denied = await app.inject({ method: 'GET', url: '/api/v1/operations/recipes?limit=200' })
    assert.equal(denied.statusCode, 401, denied.body)
    assert.equal(denied.json().error.code, 'OPERATIONS_UNAUTHORIZED')

    const publicCatalog = await app.inject({ method: 'GET', url: '/api/v1/recipes?limit=100' })
    assert.equal(publicCatalog.statusCode, 200, publicCatalog.body)
    const operationsCatalog = await app.inject({
      method: 'GET',
      url: '/api/v1/operations/recipes?limit=200',
      headers: { authorization: 'Bearer operations-secret' },
    })
    assert.equal(operationsCatalog.statusCode, 200, operationsCatalog.body)
    const payload = operationsCatalog.json()
    assert.ok(Array.isArray(payload.data))
    assert.equal(payload.meta.total, payload.data.length)
    assert.ok(payload.data.length >= publicCatalog.json().data.length)
    const operationsIds = new Set(payload.data.map((recipe: { id: number }) => recipe.id))
    assert.ok(publicCatalog.json().data.every((recipe: { id: number }) => operationsIds.has(recipe.id)))
  } finally {
    await app.close()
  }
})

test('GET /api/v1/bootstrap returns API-backed home content', async () => {
  const app = buildApp({ logger: false })
  const response = await app.inject({ method: 'GET', url: '/api/v1/bootstrap?status=recover' })
  const payload = response.json()

  assert.equal(response.statusCode, 200)
  assert.ok(payload.data.recommendation.statusIds.includes('recover'))
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
  assert.ok(listPayload.data.every((recipe: { categoryIds: string[] }) => recipe.categoryIds.includes('quick')))
  assert.ok(listPayload.data.length > 5)

  const detailResponse = await app.inject({ method: 'GET', url: '/api/v1/recipes/1001' })
  assert.equal(detailResponse.statusCode, 200)
  assert.equal(detailResponse.json().data.ingredients.length, 7)
  await app.close()
})

test('random recipes use status tags and avoid recent repeats', async () => {
  const app = buildApp({ logger: false })
  const headers = { 'x-client-id': 'random-client-001' }
  const ids: number[] = []

  for (let index = 0; index < 4; index += 1) {
    const response = await app.inject({ method: 'GET', url: '/api/v1/recipes/random?status=fitness', headers })
    assert.equal(response.statusCode, 200)
    const recipe = response.json().data
    assert.ok(recipe.statusIds.includes('fitness'))
    ids.push(recipe.id)
  }

  assert.equal(new Set(ids).size, ids.length)
  await app.close()
})

test('user state is isolated by client id and persists interactions', async () => {
  const app = buildApp({ logger: false })
  const headers = { 'x-client-id': 'test-client-001' }
  const initial = await app.inject({ method: 'GET', url: '/api/v1/me', headers })
  assert.equal(initial.statusCode, 200)
  assert.deepEqual(initial.json().data.favoriteRecipeIds, [])

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
  const catalog = await app.inject({ method: 'GET', url: '/api/v1/recipes?limit=100' })
  const recipeIds = new Set(catalog.json().data.map((recipe: { id: number }) => recipe.id))
  const plannedDishes = plan.json().data.meals.flatMap((meal: { dishes: Array<{ id: number }> }) => meal.dishes)
  assert.ok(plannedDishes.every((dish: { id: number }) => recipeIds.has(dish.id)))

  const takeout = await app.inject({ method: 'GET', url: '/api/v1/takeout?category=hot-pot' })
  assert.equal(takeout.statusCode, 200)
  assert.ok(takeout.json().data.every((shop: { categoryId: string }) => shop.categoryId === 'hot-pot'))
  assert.ok(takeout.json().data.every((shop: { tagIds: string[] }) => shop.tagIds.length > 0))
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
    payload: {
      favoriteRecipeIds: [1001],
      likedRecipeIds: [1002],
      cookedRecipeIds: [2001],
      plannedRecipeIds: [2003],
      profile: {
        nickname: '已绑定访客',
        bio: '访客资料应在登录后保留',
        avatar: 'https://example.test/guest-avatar.png',
      },
    },
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
  assert.deepEqual(session.user.likedRecipeIds, [1002])
  assert.deepEqual(session.user.cookedRecipeIds, [2001])
  assert.deepEqual(session.user.plannedRecipeIds, [2003])
  assert.deepEqual(session.user.profile, {
    nickname: '已绑定访客',
    bio: '访客资料应在登录后保留',
    avatar: 'https://example.test/guest-avatar.png',
  })
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

test('new WeChat users start with a neutral profile and no demo interactions', async () => {
  const app = buildApp({
    logger: false,
    sessionSecret: mealSessionSecret,
    wechatCodeExchange: async () => ({ openid: 'brand-new-wechat-user' }),
  })

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/wechat',
      headers: { 'x-client-id': 'brand-new-device' },
      payload: { code: 'brand-new-code' },
    })
    assert.equal(response.statusCode, 200, response.body)
    const user = response.json().data.user
    assert.deepEqual(user.profile, { nickname: '微信用户', bio: '', avatar: '' })
    assert.deepEqual(user.favoriteRecipeIds, [])
    assert.deepEqual(user.likedRecipeIds, [])
    assert.deepEqual(user.cookedRecipeIds, [])
    assert.deepEqual(user.plannedRecipeIds, [])
    assert.deepEqual(user.stats, { favorites: 0, likes: 0, cooked: 0 })

    const token = response.json().data.token as string
    const legacyProfile = {
      nickname: '早睡早起吃饭饭 ☀️',
      bio: '享受每一餐，认真生活每一天～',
      avatar: 'https://img.example.test/static/images/user/avatar-female.png',
    }
    const legacyUpdate = await app.inject({
      method: 'PUT',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        favoriteRecipeIds: [2001, 2002, 2003],
        likedRecipeIds: [],
        cookedRecipeIds: [2001],
        plannedRecipeIds: [],
        selectedStatus: 'recover',
        profile: legacyProfile,
      },
    })
    assert.equal(legacyUpdate.statusCode, 200, legacyUpdate.body)

    const relogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/wechat',
      headers: { 'x-client-id': 'brand-new-second-device' },
      payload: { code: 'brand-new-code' },
    })
    assert.equal(relogin.statusCode, 200, relogin.body)
    assert.deepEqual(relogin.json().data.user.profile, { nickname: '微信用户', bio: '', avatar: '' })
    assert.deepEqual(relogin.json().data.user.favoriteRecipeIds, [])
    assert.deepEqual(relogin.json().data.user.cookedRecipeIds, [])

    const reloginToken = relogin.json().data.token as string
    const restoreLegacy = await app.inject({
      method: 'PUT',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${reloginToken}` },
      payload: {
        favoriteRecipeIds: [2001, 2002, 2003],
        likedRecipeIds: [],
        cookedRecipeIds: [2001],
        plannedRecipeIds: [],
        selectedStatus: 'recover',
        profile: legacyProfile,
      },
    })
    assert.equal(restoreLegacy.statusCode, 200, restoreLegacy.body)

    const realGuestProfile = { nickname: '真实访客', bio: '保留我的数据', avatar: 'https://example.test/real-guest.png' }
    const guestState = await app.inject({
      method: 'PUT',
      url: '/api/v1/me',
      headers: { 'x-client-id': 'brand-new-third-device' },
      payload: { favoriteRecipeIds: [1001], profile: realGuestProfile },
    })
    assert.equal(guestState.statusCode, 200, guestState.body)
    const migratedRelogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/wechat',
      headers: { 'x-client-id': 'brand-new-third-device' },
      payload: { code: 'brand-new-code' },
    })
    assert.equal(migratedRelogin.statusCode, 200, migratedRelogin.body)
    assert.deepEqual(migratedRelogin.json().data.user.profile, realGuestProfile)
    assert.deepEqual(migratedRelogin.json().data.user.favoriteRecipeIds, [1001])
  } finally {
    await app.close()
  }
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

test('meal invitations authorize unlimited members and aggregate real dishes and wishes', async () => {
  const app = mealApp()

  try {
    const unauthenticatedWrites = await Promise.all([
      app.inject({ method: 'POST', url: '/api/v1/meals', payload: {} }),
      app.inject({ method: 'POST', url: '/api/v1/meals/not-a-meal/join', payload: { inviteCode: 'invite' } }),
      app.inject({ method: 'PUT', url: '/api/v1/meals/not-a-meal/wishes/1001' }),
      app.inject({ method: 'PUT', url: '/api/v1/meals/not-a-meal/dishes/1001', payload: { quantity: 1 } }),
    ])
    assert.ok(unauthenticatedWrites.every(response => response.statusCode === 401))

    const ownerToken = await loginMealUser(app, 'owner-code', 'meal-owner-device')
    const ownerHeaders = { authorization: `Bearer ${ownerToken}` }
    const initialCurrent = await app.inject({ method: 'GET', url: '/api/v1/meals/current', headers: ownerHeaders })
    assert.equal(initialCurrent.statusCode, 200)
    assert.equal(initialCurrent.json().data, null)

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/meals',
      headers: ownerHeaders,
      payload: {
        title: '周五晚餐',
        mealAt: chinaMealAt(),
        mealType: 'dinner',
      },
    })
    assert.equal(created.statusCode, 200, created.body)
    const meal = created.json().data
    assert.equal(meal.title, '周五晚餐')
    assert.equal(meal.mealType, 'dinner')
    assert.equal(meal.members.length, 1)
    assert.equal(meal.members[0].role, 'owner')
    assert.equal(meal.isMember, true)
    assert.equal(typeof meal.inviteCode, 'string')
    assert.ok(meal.inviteCode.length > 0)

    const current = await app.inject({ method: 'GET', url: '/api/v1/meals/current', headers: ownerHeaders })
    assert.equal(current.statusCode, 200)
    assert.equal(current.json().data.id, meal.id)

    const anonymousDenied = await app.inject({ method: 'GET', url: `/api/v1/meals/${meal.id}` })
    assert.equal(anonymousDenied.statusCode, 403)
    const anonymousInviteView = await app.inject({
      method: 'GET',
      url: `/api/v1/meals/${meal.id}?invite=${encodeURIComponent(meal.inviteCode)}`,
    })
    assert.equal(anonymousInviteView.statusCode, 200, anonymousInviteView.body)
    assert.equal(anonymousInviteView.json().data.currentUserId, null)
    assert.equal(anonymousInviteView.json().data.isMember, false)

    const memberToken = await loginMealUser(app, 'member-code', 'meal-member-device')
    const memberHeaders = { authorization: `Bearer ${memberToken}` }
    const joined = await app.inject({
      method: 'POST',
      url: `/api/v1/meals/${meal.id}/join`,
      headers: memberHeaders,
      payload: { inviteCode: meal.inviteCode },
    })
    assert.equal(joined.statusCode, 200, joined.body)
    assert.equal(joined.json().data.members.length, 2)
    assert.equal(joined.json().data.members.filter((member: { role: string }) => member.role === 'member').length, 1)
    assert.equal(joined.json().data.isMember, true)

    // A meal has no participant cap: another invitee can join through the same invite.
    const additionalToken = await loginMealUser(app, 'additional-code', 'meal-additional-device')
    const additionalJoin = await app.inject({
      method: 'POST',
      url: `/api/v1/meals/${meal.id}/join`,
      headers: { authorization: `Bearer ${additionalToken}` },
      payload: { inviteCode: meal.inviteCode },
    })
    assert.equal(additionalJoin.statusCode, 200, additionalJoin.body)
    assert.equal(additionalJoin.json().data.members.length, 3)

    const outsiderToken = await loginMealUser(app, 'outsider-code', 'meal-outsider-device')
    const outsiderWrite = await app.inject({
      method: 'PUT',
      url: `/api/v1/meals/${meal.id}/dishes/1001`,
      headers: { authorization: `Bearer ${outsiderToken}` },
      payload: { quantity: 1 },
    })
    assert.equal(outsiderWrite.statusCode, 403)
    assert.equal(outsiderWrite.json().error.code, 'MEAL_ACCESS_DENIED')

    const selected = await app.inject({
      method: 'PUT',
      url: `/api/v1/meals/${meal.id}/dishes/1001`,
      headers: memberHeaders,
      payload: { quantity: 2 },
    })
    assert.equal(selected.statusCode, 200, selected.body)
    assert.equal(selected.json().data.dishes[0].recipe.id, 1001)
    assert.equal(selected.json().data.dishes[0].quantity, 2)

    const memberWish = await app.inject({
      method: 'PUT',
      url: `/api/v1/meals/${meal.id}/wishes/1001`,
      headers: memberHeaders,
    })
    assert.equal(memberWish.statusCode, 200, memberWish.body)
    assert.equal(memberWish.json().data.dishes[0].wishCount, 1)

    const ownerWish = await app.inject({
      method: 'PUT',
      url: `/api/v1/meals/${meal.id}/wishes/1001`,
      headers: ownerHeaders,
    })
    assert.equal(ownerWish.statusCode, 200, ownerWish.body)
    const aggregatedDish = ownerWish.json().data.dishes[0]
    assert.equal(aggregatedDish.quantity, 2)
    assert.equal(aggregatedDish.wishCount, 2)
    assert.equal(aggregatedDish.wishers.length, 2)

    const removedWish = await app.inject({
      method: 'DELETE',
      url: `/api/v1/meals/${meal.id}/wishes/1001`,
      headers: memberHeaders,
    })
    assert.equal(removedWish.statusCode, 200, removedWish.body)
    assert.equal(removedWish.json().data.dishes[0].wishCount, 1)

    const removedDish = await app.inject({
      method: 'DELETE',
      url: `/api/v1/meals/${meal.id}/dishes/1001`,
      headers: ownerHeaders,
    })
    assert.equal(removedDish.statusCode, 200, removedDish.body)
    assert.deepEqual(removedDish.json().data.dishes, [])
  } finally {
    await app.close()
  }
})

test('meal creation is idempotent for the same owner and China calendar date', async () => {
  const app = mealApp()

  try {
    const token = await loginMealUser(app, 'idempotent-owner', 'idempotent-device')
    const first = await createMealFor(app, token, chinaMealAt(), '第一次创建')
    const second = await createMealFor(app, token, chinaMealAt(0, 20), '重复创建')

    assert.equal(second.id, first.id)
    assert.equal(second.title, '第一次创建')
    assert.equal(second.status, 'active')

    const concurrent = await Promise.all([
      createMealFor(app, token, chinaMealAt(0, 19), '并发创建 A'),
      createMealFor(app, token, chinaMealAt(0, 21), '并发创建 B'),
    ])
    assert.ok(concurrent.every(item => item.id === first.id))

    const hostToken = await loginMealUser(app, 'idempotent-host', 'idempotent-host-device')
    const hostMeal = await createMealFor(app, hostToken)
    const joinerToken = await loginMealUser(app, 'idempotent-joiner', 'idempotent-joiner-device')
    const joined = await app.inject({
      method: 'POST',
      url: `/api/v1/meals/${hostMeal.id}/join`,
      headers: { authorization: `Bearer ${joinerToken}` },
      payload: { inviteCode: hostMeal.inviteCode },
    })
    assert.equal(joined.statusCode, 200, joined.body)
    const joinerCreated = await createMealFor(app, joinerToken, chinaMealAt(), '我创建的饭局')
    assert.notEqual(joinerCreated.id, hostMeal.id)
    assert.equal(joinerCreated.ownerId, joinerCreated.currentUserId)
  } finally {
    await app.close()
  }
})

test('current meal exposes today or future selected meals and rolls past meals off in China', async () => {
  const app = mealApp()

  try {
    const activeToken = await loginMealUser(app, 'current-active', 'current-active-device')
    const activeMeal = await createMealFor(app, activeToken)
    const activeCurrent = await app.inject({
      method: 'GET',
      url: '/api/v1/meals/current',
      headers: { authorization: `Bearer ${activeToken}` },
    })
    assert.equal(activeCurrent.statusCode, 200, activeCurrent.body)
    assert.equal(activeCurrent.json().data.id, activeMeal.id)
    assert.equal(activeCurrent.json().data.status, 'active')

    const confirmedToken = await loginMealUser(app, 'current-confirmed', 'current-confirmed-device')
    const confirmedMeal = await createMealFor(app, confirmedToken)
    const confirmed = await app.inject({
      method: 'PUT',
      url: `/api/v1/meals/${confirmedMeal.id}/confirm`,
      headers: { authorization: `Bearer ${confirmedToken}` },
    })
    assert.equal(confirmed.statusCode, 200, confirmed.body)
    const confirmedCurrent = await app.inject({
      method: 'GET',
      url: '/api/v1/meals/current',
      headers: { authorization: `Bearer ${confirmedToken}` },
    })
    assert.equal(confirmedCurrent.statusCode, 200, confirmedCurrent.body)
    assert.equal(confirmedCurrent.json().data.id, confirmedMeal.id)
    assert.equal(confirmedCurrent.json().data.status, 'confirmed')

    const expiredToken = await loginMealUser(app, 'current-expired', 'current-expired-device')
    await createMealFor(app, expiredToken, chinaMealAt(-1), 'expired meal')
    const expiredCurrent = await app.inject({
      method: 'GET',
      url: '/api/v1/meals/current',
      headers: { authorization: `Bearer ${expiredToken}` },
    })
    assert.equal(expiredCurrent.statusCode, 200, expiredCurrent.body)
    assert.equal(expiredCurrent.json().data, null)

    const futureToken = await loginMealUser(app, 'current-future', 'current-future-device')
    const futureMeal = await createMealFor(app, futureToken, chinaMealAt(1), 'next dinner')
    const futureCurrent = await app.inject({
      method: 'GET',
      url: '/api/v1/meals/current',
      headers: { authorization: `Bearer ${futureToken}` },
    })
    assert.equal(futureCurrent.statusCode, 200, futureCurrent.body)
    assert.equal(futureCurrent.json().data.id, futureMeal.id)
  } finally {
    await app.close()
  }
})

test('expired invitations are rejected while valid previews conceal the invite code', async () => {
  const app = mealApp()

  try {
    const expiredOwnerToken = await loginMealUser(app, 'expired-owner', 'expired-owner-device')
    const expiredMeal = await createMealFor(app, expiredOwnerToken, chinaMealAt(-1))
    const expiredPreview = await app.inject({
      method: 'GET',
      url: `/api/v1/meals/${expiredMeal.id}?invite=${encodeURIComponent(expiredMeal.inviteCode)}`,
    })
    assert.equal(expiredPreview.statusCode, 403, expiredPreview.body)
    assert.equal(expiredPreview.json().error.code, 'INVALID_INVITE')

    const inviteeToken = await loginMealUser(app, 'expired-invitee', 'expired-invitee-device')
    const expiredJoin = await app.inject({
      method: 'POST',
      url: `/api/v1/meals/${expiredMeal.id}/join`,
      headers: { authorization: `Bearer ${inviteeToken}` },
      payload: { inviteCode: expiredMeal.inviteCode },
    })
    assert.equal(expiredJoin.statusCode, 403, expiredJoin.body)
    assert.equal(expiredJoin.json().error.code, 'INVALID_INVITE')

    const validOwnerToken = await loginMealUser(app, 'valid-owner', 'valid-owner-device')
    const validMeal = await createMealFor(app, validOwnerToken)
    const validPreview = await app.inject({
      method: 'GET',
      url: `/api/v1/meals/${validMeal.id}?invite=${encodeURIComponent(validMeal.inviteCode)}`,
      headers: { authorization: `Bearer ${inviteeToken}` },
    })
    assert.equal(validPreview.statusCode, 200, validPreview.body)
    const preview = validPreview.json().data
    assert.equal(preview.isMember, false)
    assert.equal(preview.inviteCode, '')
    assert.equal(typeof preview.inviteExpiresAt, 'string')
    assert.ok(Date.parse(preview.inviteExpiresAt) > Date.now())
  } finally {
    await app.close()
  }
})

test('confirmed meals reject joins and all dish or wish writes', async () => {
  const app = mealApp()

  try {
    const ownerToken = await loginMealUser(app, 'confirm-owner', 'confirm-owner-device')
    const ownerHeaders = { authorization: `Bearer ${ownerToken}` }
    const meal = await createMealFor(app, ownerToken)
    const initialDish = await app.inject({
      method: 'PUT',
      url: `/api/v1/meals/${meal.id}/dishes/1001`,
      headers: ownerHeaders,
      payload: { quantity: 1 },
    })
    assert.equal(initialDish.statusCode, 200, initialDish.body)
    const initialWish = await app.inject({
      method: 'PUT',
      url: `/api/v1/meals/${meal.id}/wishes/1001`,
      headers: ownerHeaders,
    })
    assert.equal(initialWish.statusCode, 200, initialWish.body)

    const confirmed = await app.inject({
      method: 'PUT',
      url: `/api/v1/meals/${meal.id}/confirm`,
      headers: ownerHeaders,
    })
    assert.equal(confirmed.statusCode, 200, confirmed.body)
    assert.equal(confirmed.json().data.status, 'confirmed')

    const blockedWrites = await Promise.all([
      app.inject({ method: 'PUT', url: `/api/v1/meals/${meal.id}/wishes/1002`, headers: ownerHeaders }),
      app.inject({ method: 'DELETE', url: `/api/v1/meals/${meal.id}/wishes/1001`, headers: ownerHeaders }),
      app.inject({ method: 'PUT', url: `/api/v1/meals/${meal.id}/dishes/1002`, headers: ownerHeaders, payload: { quantity: 1 } }),
      app.inject({ method: 'DELETE', url: `/api/v1/meals/${meal.id}/dishes/1001`, headers: ownerHeaders }),
      app.inject({ method: 'POST', url: `/api/v1/meals/${meal.id}/dishes/1001/quantity`, headers: ownerHeaders, payload: { delta: 1 } }),
    ])
    for (const response of blockedWrites) {
      assert.equal(response.statusCode, 400, response.body)
      assert.equal(response.json().error.code, 'INVALID_MEAL_DATA')
    }

    const inviteeToken = await loginMealUser(app, 'confirm-invitee', 'confirm-invitee-device')
    const blockedJoin = await app.inject({
      method: 'POST',
      url: `/api/v1/meals/${meal.id}/join`,
      headers: { authorization: `Bearer ${inviteeToken}` },
      payload: { inviteCode: meal.inviteCode },
    })
    assert.equal(blockedJoin.statusCode, 400, blockedJoin.body)
    assert.equal(blockedJoin.json().error.code, 'INVALID_MEAL_DATA')
  } finally {
    await app.close()
  }
})

test('dish quantity deltas increment and decrement without lost updates', async () => {
  const app = mealApp()

  try {
    const ownerToken = await loginMealUser(app, 'quantity-owner', 'quantity-owner-device')
    const headers = { authorization: `Bearer ${ownerToken}` }
    const meal = await createMealFor(app, ownerToken)
    const quantityUrl = `/api/v1/meals/${meal.id}/dishes/1001/quantity`

    const increments = await Promise.all([
      app.inject({ method: 'POST', url: quantityUrl, headers, payload: { delta: 1 } }),
      app.inject({ method: 'POST', url: quantityUrl, headers, payload: { delta: 1 } }),
    ])
    assert.ok(increments.every(response => response.statusCode === 200), increments.map(response => response.body).join('\n'))
    const afterIncrement = await app.inject({ method: 'GET', url: `/api/v1/meals/${meal.id}`, headers })
    assert.equal(afterIncrement.statusCode, 200, afterIncrement.body)
    assert.equal(afterIncrement.json().data.dishes[0].quantity, 2)

    const decrement = await app.inject({ method: 'POST', url: quantityUrl, headers, payload: { delta: -1 } })
    assert.equal(decrement.statusCode, 200, decrement.body)
    assert.equal(decrement.json().data.dishes[0].quantity, 1)

    const removeLast = await app.inject({ method: 'POST', url: quantityUrl, headers, payload: { delta: -1 } })
    assert.equal(removeLast.statusCode, 200, removeLast.body)
    assert.deepEqual(removeLast.json().data.dishes, [])
  } finally {
    await app.close()
  }
})

test('removing wishes preserves other users and removes the final wish-only dish', async () => {
  const app = mealApp()

  try {
    const ownerToken = await loginMealUser(app, 'wish-owner', 'wish-owner-device')
    const memberToken = await loginMealUser(app, 'wish-member', 'wish-member-device')
    const ownerHeaders = { authorization: `Bearer ${ownerToken}` }
    const memberHeaders = { authorization: `Bearer ${memberToken}` }
    const meal = await createMealFor(app, ownerToken)
    const joined = await app.inject({
      method: 'POST',
      url: `/api/v1/meals/${meal.id}/join`,
      headers: memberHeaders,
      payload: { inviteCode: meal.inviteCode },
    })
    assert.equal(joined.statusCode, 200, joined.body)

    const ownerWish = await app.inject({ method: 'PUT', url: `/api/v1/meals/${meal.id}/wishes/1001`, headers: ownerHeaders })
    assert.equal(ownerWish.statusCode, 200, ownerWish.body)
    const memberWish = await app.inject({ method: 'PUT', url: `/api/v1/meals/${meal.id}/wishes/1001`, headers: memberHeaders })
    assert.equal(memberWish.statusCode, 200, memberWish.body)
    assert.equal(memberWish.json().data.dishes[0].quantity, 1)
    assert.equal(memberWish.json().data.dishes[0].wishCount, 2)

    const ownerRemoved = await app.inject({ method: 'DELETE', url: `/api/v1/meals/${meal.id}/wishes/1001`, headers: ownerHeaders })
    assert.equal(ownerRemoved.statusCode, 200, ownerRemoved.body)
    assert.equal(ownerRemoved.json().data.dishes[0].wishCount, 1)
    assert.equal(ownerRemoved.json().data.dishes[0].wishers.length, 1)
    assert.equal(ownerRemoved.json().data.dishes[0].wishers[0].userId, memberWish.json().data.currentUserId)

    const memberRemoved = await app.inject({ method: 'DELETE', url: `/api/v1/meals/${meal.id}/wishes/1001`, headers: memberHeaders })
    assert.equal(memberRemoved.statusCode, 200, memberRemoved.body)
    assert.deepEqual(memberRemoved.json().data.dishes, [])

    const explicitDish = await app.inject({
      method: 'PUT',
      url: `/api/v1/meals/${meal.id}/dishes/1002`,
      headers: ownerHeaders,
      payload: { quantity: 1 },
    })
    assert.equal(explicitDish.statusCode, 200, explicitDish.body)
    const noOpRemoval = await app.inject({
      method: 'DELETE',
      url: `/api/v1/meals/${meal.id}/wishes/1002`,
      headers: memberHeaders,
    })
    assert.equal(noOpRemoval.statusCode, 200, noOpRemoval.body)
    assert.equal(noOpRemoval.json().data.dishes[0].recipe.id, 1002)
    assert.equal(noOpRemoval.json().data.dishes[0].quantity, 1)
  } finally {
    await app.close()
  }
})

test('meal categories are public while operations writes are protected and immediately visible', async () => {
  const app = buildApp({ logger: false, opsAdminToken: 'operations-secret' })
  const operationsHeaders = { authorization: 'Bearer operations-secret' }

  try {
    const publicCategories = await app.inject({ method: 'GET', url: '/api/v1/meal-categories' })
    assert.equal(publicCategories.statusCode, 200)
    assert.ok(publicCategories.json().data.length > 0)
    assert.ok(publicCategories.json().data.every((category: { enabled: boolean }) => category.enabled))

    const deniedList = await app.inject({ method: 'GET', url: '/api/v1/operations/meal-categories' })
    assert.equal(deniedList.statusCode, 401)
    const deniedWrite = await app.inject({
      method: 'PUT',
      url: '/api/v1/operations/meal-categories',
      payload: { id: 'family-favorites', name: '家庭最爱', sortOrder: 5, enabled: true, recipeIds: [1001, 1002] },
    })
    assert.equal(deniedWrite.statusCode, 401)
    const deniedDelete = await app.inject({ method: 'DELETE', url: '/api/v1/operations/meal-categories?id=family-favorites' })
    assert.equal(deniedDelete.statusCode, 401)

    for (const recipeIds of ['1001,1002', [1001, '1002'], [1001, 1.5]]) {
      const invalid = await app.inject({
        method: 'PUT',
        url: '/api/v1/operations/meal-categories',
        headers: operationsHeaders,
        payload: { id: 'invalid-recipes', name: '无效菜类', sortOrder: 5, enabled: true, recipeIds },
      })
      assert.equal(invalid.statusCode, 400, invalid.body)
      assert.equal(invalid.json().error.code, 'INVALID_MEAL_DATA')
    }

    const upserted = await app.inject({
      method: 'PUT',
      url: '/api/v1/operations/meal-categories',
      headers: operationsHeaders,
      payload: { id: 'family-favorites', name: '家庭最爱', sortOrder: 5, enabled: true, recipeIds: [1001, 1002] },
    })
    assert.equal(upserted.statusCode, 200, upserted.body)
    assert.deepEqual(upserted.json().data.recipeIds, [1001, 1002])

    const immediatelyPublic = await app.inject({ method: 'GET', url: '/api/v1/meal-categories' })
    const publicCategory = immediatelyPublic.json().data.find((category: { id: string }) => category.id === 'family-favorites')
    assert.equal(publicCategory.name, '家庭最爱')
    assert.deepEqual(publicCategory.recipeIds, [1001, 1002])

    const operationsList = await app.inject({
      method: 'GET',
      url: '/api/v1/operations/meal-categories',
      headers: operationsHeaders,
    })
    assert.equal(operationsList.statusCode, 200)
    assert.ok(operationsList.json().data.some((category: { id: string }) => category.id === 'family-favorites'))

    const disabled = await app.inject({
      method: 'PUT',
      url: '/api/v1/operations/meal-categories',
      headers: operationsHeaders,
      payload: { id: 'family-favorites', name: '家庭最爱', sortOrder: 5, enabled: false, recipeIds: [1002] },
    })
    assert.equal(disabled.statusCode, 200, disabled.body)
    const publicAfterDisable = await app.inject({ method: 'GET', url: '/api/v1/meal-categories' })
    assert.ok(!publicAfterDisable.json().data.some((category: { id: string }) => category.id === 'family-favorites'))

    const deleted = await app.inject({
      method: 'DELETE',
      url: '/api/v1/operations/meal-categories?id=family-favorites',
      headers: operationsHeaders,
    })
    assert.equal(deleted.statusCode, 200, deleted.body)
    assert.deepEqual(deleted.json().data, { id: 'family-favorites', deleted: true })

    const afterDelete = await app.inject({
      method: 'GET',
      url: '/api/v1/operations/meal-categories',
      headers: operationsHeaders,
    })
    assert.ok(!afterDelete.json().data.some((category: { id: string }) => category.id === 'family-favorites'))
  } finally {
    await app.close()
  }
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

    const base64Upload = await app.inject({
      method: 'POST',
      url: '/api/v1/me/avatar/base64',
      headers: { authorization: `Bearer ${token}` },
      payload: { content: Buffer.from(image).toString('base64') },
    })
    assert.equal(base64Upload.statusCode, 200, base64Upload.body)
    assert.equal(base64Upload.json().data.profile.avatar, avatarUrl)

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
