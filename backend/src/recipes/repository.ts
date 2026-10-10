import { categorySeeds, getSeedTaggings, recipeSeeds, statusSeeds, type SeedRecipe } from './seed.js'
import { planMealSeeds, planReminders, planSummary, takeoutShops } from '../experience/seed.js'
import type { BootstrapPayload, Category, PlanPayload, Recipe, RecipeInput, RecipeQuery, RecipeRepository, UserState, UserStateUpdate, WechatAccount, WechatNotificationSubscription } from './types.js'

function maskPhoneNumber(phoneNumber: string | undefined): string {
  if (!phoneNumber) return ''
  if (phoneNumber.length <= 7) return `${phoneNumber.slice(0, 2)}***${phoneNumber.slice(-2)}`
  return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-4)}`
}

export function normalizeNotificationSubscriptions(account: WechatAccount | undefined): WechatNotificationSubscription[] {
  const subscriptions = Array.isArray(account?.notificationSubscriptions)
    ? account.notificationSubscriptions
    : []
  const unique = new Map<string, WechatNotificationSubscription>()
  for (const value of subscriptions) {
    const subscription = value as Partial<WechatNotificationSubscription> | null
    const mealId = typeof subscription?.mealId === 'string' ? subscription.mealId.trim() : ''
    const templateId = typeof subscription?.templateId === 'string' ? subscription.templateId.trim() : ''
    if (mealId && templateId) unique.set(`${mealId}\u0000${templateId}`, { mealId, templateId })
  }
  return [...unique.values()]
}

export function createAssetUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

export function createDefaultUserState(clientId: string, _assetBaseUrl: string): UserState {
  return {
    clientId,
    selectedStatus: 'recover',
    favoriteRecipeIds: [],
    likedRecipeIds: [],
    cookedRecipeIds: [],
    plannedRecipeIds: [],
    profile: {
      nickname: '微信用户',
      bio: '',
      avatar: '',
    },
  }
}

export function isLegacyDemoUserState(state: UserState): boolean {
  return state.selectedStatus === 'recover'
    && state.favoriteRecipeIds.length === 3
    && [2001, 2002, 2003].every(id => state.favoriteRecipeIds.includes(id))
    && state.likedRecipeIds.length === 0
    && state.cookedRecipeIds.length === 1
    && state.cookedRecipeIds[0] === 2001
    && state.plannedRecipeIds.length === 0
    && state.profile.nickname === '早睡早起吃饭饭 ☀️'
    && state.profile.bio === '享受每一餐，认真生活每一天～'
    && state.profile.avatar.endsWith('/images/user/avatar-female.png')
}

export function mapPlanPayload(recipes: Recipe[], state: UserState, date: string): PlanPayload {
  const recipesById = new Map(recipes.map(recipe => [recipe.id, recipe]))
  const meals = planMealSeeds.map(meal => ({
    ...meal,
    dishes: meal.dishes.flatMap(({ recipeId, amount }) => {
      const recipe = recipesById.get(recipeId)
      return recipe ? [{ id: recipe.id, name: recipe.name, amount, image: recipe.thumbnail || recipe.cover }] : []
    }),
  }))
  const lunch = meals.find(meal => meal.id === 'lunch')
  if (lunch) {
    const existingIds = new Set(lunch.dishes.map(dish => dish.id))
    for (const recipeId of state.plannedRecipeIds) {
      const recipe = recipes.find(item => item.id === recipeId)
      if (recipe && !existingIds.has(recipe.id)) {
        lunch.dishes.push({ id: recipe.id, name: recipe.name, amount: '1份', image: recipe.thumbnail || recipe.cover })
      }
    }
  }
  for (const meal of meals) {
    meal.summary = meal.dishes.map(dish => dish.name).join('、')
    meal.calories = meal.dishes.reduce((total, dish) => total + (recipesById.get(dish.id)?.calories ?? 0), 0)
  }
  return {
    date,
    meals,
    nutrients: planSummary.nutrients.map(item => ({ ...item })),
    reminders: planReminders.map(item => ({ ...item })),
  }
}

export function mapSeedRecipe(seed: SeedRecipe, assetBaseUrl: string): Recipe {
  const taggings = getSeedTaggings(seed)
  return {
    id: seed.id,
    name: seed.name,
    cover: createAssetUrl(assetBaseUrl, seed.coverKey),
    hero: createAssetUrl(assetBaseUrl, seed.heroKey),
    thumbnail: createAssetUrl(assetBaseUrl, seed.thumbnailKey),
    categoryId: seed.categoryId,
    categoryIds: [...(seed.categoryIds ?? [seed.categoryId])],
    category: seed.category,
    tags: [...seed.tags],
    tagIds: taggings.map(tagging => tagging.tagId),
    taggings,
    statusIds: [...seed.statusIds],
    reason: seed.reason,
    cookTime: seed.cookTime,
    calories: seed.calories,
    popularity: seed.popularity,
    servings: seed.servings,
    difficulty: seed.difficulty,
    ingredients: seed.ingredients.map(item => ({ ...item })),
    steps: seed.steps.map(step => ({ text: step.text, image: createAssetUrl(assetBaseUrl, step.imageKey) })),
    sortOrder: seed.sortOrder,
  }
}

export function mapCategory(category: Category, assetBaseUrl: string): Category {
  return category.cover
    ? { ...category, cover: createAssetUrl(assetBaseUrl, category.cover) }
    : { ...category }
}

function matchesQuery(recipe: Recipe, query: RecipeQuery): boolean {
  const keyword = query.keyword?.trim().toLocaleLowerCase()
  return (!query.category || recipe.categoryIds.includes(query.category))
    && (!query.status || recipe.statusIds.includes(query.status))
    && (!keyword
      || recipe.name.toLocaleLowerCase().includes(keyword)
      || recipe.tags.some(tag => tag.toLocaleLowerCase().includes(keyword)))
}

export function createMemoryRecipeRepository(assetBaseUrl: string): RecipeRepository {
  const recipes = recipeSeeds.map(seed => mapSeedRecipe(seed, assetBaseUrl))
  const recipeIds = new Set(recipes.map(recipe => recipe.id))
  const categories = categorySeeds.map(category => mapCategory(category, assetBaseUrl))
  const userStates = new Map<string, UserState>()
  const recentRecommendations = new Map<string, number[]>()

  const getState = (clientId: string) => {
    const existing = userStates.get(clientId)
    if (existing) return existing
    const created = createDefaultUserState(clientId, assetBaseUrl)
    userStates.set(clientId, created)
    return created
  }

  return {
    async bootstrap(clientId, status) {
      const recommendation = selectRecommendation(recipes, status, recentRecommendations.get(clientId) ?? [])
      rememberRecommendation(recentRecommendations, clientId, recommendation.id)

      return {
        quickCategories: categories.filter(category => category.source === 'quick'),
        cookingCategories: categories.filter(category => category.source === 'cooking'),
        takeoutCategories: categories.filter(category => category.source === 'takeout'),
        statusOptions: statusSeeds.map(item => ({ ...item })),
        recommendation: { ...recommendation },
      }
    },
    async recommend(clientId, status, excludeIds = []) {
      const excluded = [...new Set([...(recentRecommendations.get(clientId) ?? []), ...excludeIds])]
      const recommendation = selectRecommendation(recipes, status, excluded)
      rememberRecommendation(recentRecommendations, clientId, recommendation.id)
      return { ...recommendation }
    },
    async list(query) {
      const result = recipes.filter(recipe => matchesQuery(recipe, query))
      if (query.sort === 'latest') result.sort((a, b) => b.id - a.id)
      if (query.sort === 'popular') result.sort((a, b) => b.popularity - a.popularity)
      return result.slice(0, query.limit ?? 50).map(recipe => ({ ...recipe }))
    },
    async findById(id) {
      const recipe = recipes.find(item => item.id === id)
      return recipe ? { ...recipe } : undefined
    },
    async upsertRecipe(input: RecipeInput) {
      const id = input.id ?? Math.max(1000, ...recipes.map(recipe => recipe.id)) + 1
      const recipe: Recipe = {
        ...input,
        id,
        categoryIds: [...input.categoryIds],
        tags: [...input.tags],
        tagIds: [...new Set([...input.statusIds, ...input.tags])],
        taggings: [
          ...input.statusIds.map(tagId => ({ tagId, weight: 100, source: 'manual' as const, confidence: 1 })),
          ...input.tags.map(tagId => ({ tagId, weight: 100, source: 'manual' as const, confidence: 1 })),
        ],
        statusIds: [...input.statusIds],
        ingredients: input.ingredients.map(item => ({ ...item })),
        steps: input.steps.map(item => ({ ...item })),
      }
      const index = recipes.findIndex(item => item.id === id)
      if (index >= 0) recipes[index] = recipe
      else recipes.push(recipe)
      recipeIds.add(id)
      return structuredClone(recipe)
    },
    async deleteRecipe(id: number) {
      const index = recipes.findIndex(item => item.id === id)
      if (index < 0) return false
      recipes.splice(index, 1)
      recipeIds.delete(id)
      return true
    },
    async getUserState(clientId) {
      return structuredClone(getState(clientId))
    },
    async updateUserState(clientId: string, update: UserStateUpdate) {
      const current = getState(clientId)
      const next = sanitizeUserRecipeIds({
        ...current,
        ...update,
        clientId,
        profile: update.profile ? { ...current.profile, ...update.profile } : current.profile,
      }, recipeIds)
      userStates.set(clientId, next)
      return structuredClone(next)
    },
    async claimUserState(sourceClientId, userClientId) {
      const existing = userStates.get(userClientId)
      if (existing && !isLegacyDemoUserState(existing)) return structuredClone(existing)
      const source = structuredClone(getState(sourceClientId))
      const claimed = isLegacyDemoUserState(source)
        ? createDefaultUserState(userClientId, assetBaseUrl)
        : { ...source, clientId: userClientId }
      userStates.set(userClientId, claimed)
      return structuredClone(claimed)
    },
    async setWechatIdentity(clientId, identity) {
      const current = getState(clientId)
      const next: UserState = {
        ...current,
        wechat: {
          ...current.wechat,
          openid: identity.openid,
          ...(identity.unionid ? { unionid: identity.unionid } : {}),
          notificationSubscriptions: normalizeNotificationSubscriptions(current.wechat),
        },
      }
      userStates.set(clientId, next)
      return structuredClone(next)
    },
    async setWechatPhone(clientId, phone) {
      const current = getState(clientId)
      if (!current.wechat?.openid) throw new Error('请重新完成微信登录后再绑定手机号')
      const next: UserState = {
        ...current,
        wechat: {
          ...current.wechat,
          phone: { ...phone, boundAt: new Date().toISOString() },
        },
      }
      userStates.set(clientId, next)
      return structuredClone(next)
    },
    async setNotificationSubscription(clientId, mealId, templateId, subscribed) {
      const current = getState(clientId)
      if (!current.wechat?.openid) throw new Error('请重新完成微信登录后再开启通知')
      const subscriptions = normalizeNotificationSubscriptions(current.wechat)
        .filter(item => item.mealId !== mealId || item.templateId !== templateId)
      if (subscribed) subscriptions.push({ mealId, templateId })
      const next: UserState = {
        ...current,
        wechat: { ...current.wechat, notificationSubscriptions: subscriptions },
      }
      userStates.set(clientId, next)
      return structuredClone(next)
    },
    async getNotificationRecipients(clientIds, mealId, templateId) {
      return [...new Set(clientIds)].flatMap((clientId) => {
        const account = userStates.get(clientId)?.wechat
        return account?.openid && normalizeNotificationSubscriptions(account)
          .some(item => item.mealId === mealId && item.templateId === templateId)
          ? [{ clientId, openid: account.openid }]
          : []
      })
    },
    async getPlan(clientId, date) {
      return mapPlanPayload(recipes, getState(clientId), date)
    },
    async listTakeout(category) {
      return takeoutShops.filter(shop => !category || shop.categoryId === category).map(shop => ({ ...shop }))
    },
    async operationsSummary() {
      const keys = [...userStates.keys()]
      const wechatAccounts = keys.filter(key => key.startsWith('wechat:')).length
      return { service: 'fandazi', profiles: keys.length, wechatAccounts, guestProfiles: keys.length - wechatAccounts, updatedAt: new Date().toISOString() }
    },
    async operationsUsers(query = '', limit = 50, offset = 0) {
      const keyword = query.trim().toLocaleLowerCase()
      const matches = [...userStates.values()].filter(state => !keyword || state.profile.nickname.toLocaleLowerCase().includes(keyword))
      return {
        items: matches.slice(offset, offset + limit).map(state => ({
          id: state.clientId,
          accountType: state.clientId.startsWith('wechat:') ? 'wechat' as const : 'guest' as const,
          nickname: state.profile.nickname,
          phoneMasked: maskPhoneNumber(state.wechat?.phone?.purePhoneNumber),
          favorites: state.favoriteRecipeIds.length,
          likes: state.likedRecipeIds.length,
          cooked: state.cookedRecipeIds.length,
          updatedAt: null,
        })),
        total: matches.length,
      }
    },
  }
}

export function selectRecommendation(recipes: Recipe[], status: string, excludeIds: number[], random = Math.random): Recipe {
  if (!recipes.length) throw new Error('Recipe database is empty')
  const statusMatches = recipes.filter(recipe => recipe.statusIds.includes(status))
  const taggedPool = statusMatches.length ? statusMatches : recipes
  const excluded = new Set(excludeIds)
  const freshPool = taggedPool.filter(recipe => !excluded.has(recipe.id))
  const pool = freshPool.length ? freshPool : taggedPool
  const weights = pool.map(recipe => recipe.taggings.find(tagging => tagging.tagId === status)?.weight ?? 80)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let target = Math.min(Math.max(random(), 0), 0.999999) * totalWeight
  for (let index = 0; index < pool.length; index += 1) {
    target -= weights[index] ?? 0
    if (target < 0) return pool[index] as Recipe
  }
  return pool[pool.length - 1] as Recipe
}

function rememberRecommendation(history: Map<string, number[]>, clientId: string, recipeId: number) {
  const recent = (history.get(clientId) ?? []).filter(id => id !== recipeId)
  history.set(clientId, [recipeId, ...recent].slice(0, 8))
}

export function sanitizeUserRecipeIds(state: UserState, recipeIds: Set<number>): UserState {
  return {
    ...state,
    favoriteRecipeIds: state.favoriteRecipeIds.filter(id => recipeIds.has(id)),
    likedRecipeIds: state.likedRecipeIds.filter(id => recipeIds.has(id)),
    cookedRecipeIds: state.cookedRecipeIds.filter(id => recipeIds.has(id)),
    plannedRecipeIds: state.plannedRecipeIds.filter(id => recipeIds.has(id)),
  }
}
