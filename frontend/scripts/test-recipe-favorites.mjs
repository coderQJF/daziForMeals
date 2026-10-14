import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

function recipeStore(updateUser) {
  const source = readFileSync(new URL('../src/stores/recipe.ts', import.meta.url), 'utf8')
    .replace(/^import .*\n/gm, '').replace(/^export /gm, '')
  const context = {
    Error,
    ref: value => ({ value }),
    computed: getter => ({ get value() { return getter() } }),
    watch: () => {},
    defineStore: (_name, setup) => setup,
    uni: { getStorageSync: () => '', setStorageSync: () => {} },
    experienceApi: { updateUser }, recipeApi: {},
  }
  runInNewContext(stripTypeScriptTypes(source) + '\nglobalThis.store = useRecipeStore()\n', context)
  const store = context.store
  store.recommendation.value = { ...store.recommendation.value, id: 28002, name: '红烧排骨' }
  store.recipes.value = [{ ...store.recommendation.value }]
  return store
}

function serverState(favoriteRecipeIds) {
  return {
    favoriteRecipeIds, selectedStatus: 'normal', likedRecipeIds: [], cookedRecipeIds: [],
    plannedRecipeIds: [], profile: { nickname: '回归测试', avatar: '', bio: '' },
  }
}

test('favorite saves a numeric recipe ID and synchronizes detail and list states', async () => {
  const requests = []
  const store = recipeStore(async input => { requests.push(input); return serverState(input.favoriteRecipeIds) })
  assert.equal(await store.toggleFavorite(28002), true)
  assert.deepEqual(Array.from(requests[0].favoriteRecipeIds), [28002])
  assert.equal(store.recommendation.value.isFavorite, true)
  assert.equal(store.recipes.value[0].isFavorite, true)
  assert.equal(store.userStats.value.favorites, 1)
  assert.equal(await store.toggleFavorite(28002), true)
  assert.equal(store.recommendation.value.isFavorite, false)
  assert.equal(store.userStats.value.favorites, 0)
})

test('a click event cannot become a favorite recipe ID', async () => {
  const store = recipeStore(() => assert.fail('Invalid IDs must not be sent'))
  assert.equal(await store.toggleFavorite({ type: 'tap' }), false)
  assert.equal(await store.toggleFavorite(0), false)
  assert.equal(await store.toggleFavorite(NaN), false)
  assert.equal(store.favoriteIds.value.length, 0)
})

test('favorite saving prevents rapid double writes', async () => {
  let resolveRequest, count = 0
  const store = recipeStore(input => {
    count += 1
    return new Promise(resolve => { resolveRequest = () => resolve(serverState(input.favoriteRecipeIds)) })
  })
  const pending = store.toggleFavorite(28002)
  assert.equal(store.favoriteSaving.value, true)
  assert.equal(store.recommendation.value.isFavorite, true)
  assert.equal(await store.toggleFavorite(28002), false)
  assert.equal(count, 1)
  resolveRequest()
  assert.equal(await pending, true)
  assert.equal(store.favoriteSaving.value, false)
})

test('failed save rolls back the displayed favorite and exposes an error', async () => {
  const store = recipeStore(async () => { throw new Error('网络连接失败') })
  assert.equal(await store.toggleFavorite(28002), false)
  assert.equal(store.isFavorite(28002), false)
  assert.equal(store.recommendation.value.isFavorite, false)
  assert.equal(store.recipes.value[0].isFavorite, false)
  assert.equal(store.favoriteSaving.value, false)
  assert.equal(store.userErrorMessage.value, '网络连接失败')
})

test('failed cancellation restores a previously saved favorite', async () => {
  const store = recipeStore(async () => { throw new Error('服务暂时不可用') })
  store.favoriteIds.value = [28002]
  store.recommendation.value.isFavorite = true
  assert.equal(await store.toggleFavorite(28002), false)
  assert.equal(store.isFavorite(28002), true)
  assert.equal(store.recommendation.value.isFavorite, true)
})

test('recipe detail uses capsule-aware navigation and two plain bottom actions', () => {
  const detail = readFileSync(new URL('../src/pages/recipe/detail.vue', import.meta.url), 'utf8')
  assert.match(detail, /<AppHeader[^>]+@back="goBack"/)
  assert.match(detail, /store\.toggleFavorite\(requestedRecipeId\.value\)/)
  assert.doesNotMatch(detail, /@click="store\.toggleFavorite"|hero-nav__actions|hero-nav__button/)
  assert.match(detail, /bottom-button--share" open-type="share">分享/)
  const actions = detail.match(/<view class="bottom-actions">([\s\S]*?)<\/view>/)[1]
  assert.equal((actions.match(/<button/g) ?? []).length, 2)
  assert.doesNotMatch(actions, /<image/)
})

test('selection buttons are icon-only and tutorial hints are absent', () => {
  const component = readFileSync(new URL('../src/components/DishSelectionButton.vue', import.meta.url), 'utf8')
  assert.match(component, /@click\.stop/)
  assert.match(component, /:aria-pressed="selected"/)
  assert.doesNotMatch(component, /<text>\{\{ selected \? '已选'/)
  for (const path of ['../src/pages/index/index.vue', '../src/pages/menu/menu.vue']) {
    assert.doesNotMatch(readFileSync(new URL(path, import.meta.url), 'utf8'), /查看做法|dish-card__tutorial/)
  }
})
