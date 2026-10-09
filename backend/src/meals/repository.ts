import { randomBytes, randomUUID } from 'node:crypto'
import type { Recipe, RecipeRepository } from '../recipes/types.js'
import {
  InvalidInviteError,
  MealAccessDeniedError,
  MealNotFoundError,
  MealValidationError,
  type MealAggregate,
  type MealCategory,
  type MealCategoryInput,
  type MealCreateInput,
  type MealMemberRole,
  type MealRepository,
} from './types.js'

interface StoredMember {
  userId: string
  role: MealMemberRole
  joinedAt: string
}

interface StoredDish {
  recipeId: number
  quantity: number
  addedBy: string
  updatedAt: string
}

interface StoredMeal {
  id: string
  ownerId: string
  title: string
  mealAt: string
  mealType: 'dinner'
  status: 'active' | 'confirmed' | 'closed'
  inviteCode: string
  inviteExpiresAt: string
  members: Map<string, StoredMember>
  dishes: Map<number, StoredDish>
  wishes: Map<number, Set<string>>
  createdAt: string
  updatedAt: string
}

const DEFAULT_CATEGORIES: ReadonlyArray<Omit<MealCategoryInput, 'recipeIds'>> = [
  { id: 'hot', name: '热门', sortOrder: 0, enabled: true },
  { id: 'meat', name: '荤菜', sortOrder: 10, enabled: true },
  { id: 'vegetable', name: '素菜', sortOrder: 20, enabled: true },
  { id: 'soup', name: '汤羹', sortOrder: 30, enabled: true },
  { id: 'staple', name: '主食', sortOrder: 40, enabled: true },
]

function isSoup(recipe: Recipe): boolean {
  return recipe.categoryId === 'soup' || /[汤羹]/.test(recipe.name)
}

function isStaple(recipe: Recipe): boolean {
  return /[饭粥面粉燕麦糕]/.test(`${recipe.name}${recipe.category}`)
}

function isVegetable(recipe: Recipe): boolean {
  const text = `${recipe.name}${recipe.category}${recipe.ingredients.map(item => item.name).join('')}`
  const containsMeat = /[肉鸡鸭鱼虾排骨牛腊肠]/.test(text)
  return !containsMeat && /[菜豆腐西兰花菌菇茄子冬瓜南瓜山药]/.test(text)
}

function defaultCategoryRecipeIds(categoryId: string, recipes: Recipe[]): number[] {
  if (categoryId === 'hot') {
    return [...recipes]
      .sort((left, right) => right.popularity - left.popularity)
      .slice(0, 20)
      .map(recipe => recipe.id)
  }
  if (categoryId === 'soup') return recipes.filter(isSoup).map(recipe => recipe.id)
  if (categoryId === 'staple') return recipes.filter(isStaple).map(recipe => recipe.id)
  if (categoryId === 'vegetable') return recipes.filter(recipe => !isSoup(recipe) && !isStaple(recipe) && isVegetable(recipe)).map(recipe => recipe.id)
  return recipes.filter(recipe => !isSoup(recipe) && !isStaple(recipe) && !isVegetable(recipe)).map(recipe => recipe.id)
}

function copyCategory(category: MealCategory): MealCategory {
  return { ...category, recipeIds: [...category.recipeIds] }
}

export function createMemoryMealRepository(recipes: RecipeRepository): MealRepository {
  const meals = new Map<string, StoredMeal>()
  const currentMealByUser = new Map<string, string>()
  const createTails = new Map<string, Promise<void>>()
  const categories = new Map<string, MealCategory>()
  let categoriesReady: Promise<void> | undefined

  async function ensureDefaultCategories(): Promise<void> {
    categoriesReady ??= (async () => {
      const catalog = await recipes.list({ limit: 100, sort: 'default' })
      const updatedAt = new Date().toISOString()
      for (const seed of DEFAULT_CATEGORIES) {
        categories.set(seed.id, {
          ...seed,
          recipeIds: defaultCategoryRecipeIds(seed.id, catalog),
          updatedAt,
        })
      }
    })()
    await categoriesReady
  }

  function storedMeal(mealId: string): StoredMeal {
    const meal = meals.get(mealId)
    if (!meal) throw new MealNotFoundError()
    return meal
  }

  function ensureMember(meal: StoredMeal, userId: string): void {
    if (!meal.members.has(userId)) throw new MealAccessDeniedError('加入饭局后才能操作')
  }

  function ensureActive(meal: StoredMeal): void {
    if (meal.status !== 'active') throw new MealValidationError('饭局已确认，不能再修改')
  }

  function chinaDate(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value)
    const china = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    const year = china.getUTCFullYear()
    const month = String(china.getUTCMonth() + 1).padStart(2, '0')
    const day = String(china.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  function inviteIsExpired(meal: StoredMeal): boolean {
    return new Date(meal.inviteExpiresAt).getTime() <= Date.now()
  }

  async function withCreateLock<T>(userId: string, action: () => Promise<T>): Promise<T> {
    const previous = createTails.get(userId) ?? Promise.resolve()
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => { release = resolve })
    const tail = previous.then(() => gate)
    createTails.set(userId, tail)
    await previous
    try {
      return await action()
    } finally {
      release?.()
      if (createTails.get(userId) === tail) createTails.delete(userId)
    }
  }

  async function ensureRecipe(recipeId: number): Promise<Recipe> {
    const recipe = await recipes.findById(recipeId)
    if (!recipe) throw new MealValidationError('菜谱不存在')
    return recipe
  }

  async function aggregate(meal: StoredMeal, currentUserId?: string): Promise<MealAggregate> {
    const profileCache = new Map<string, Awaited<ReturnType<RecipeRepository['getUserState']>>['profile']>()
    const profileFor = async (userId: string) => {
      const cached = profileCache.get(userId)
      if (cached) return cached
      const profile = (await recipes.getUserState(userId)).profile
      profileCache.set(userId, profile)
      return profile
    }

    const members = await Promise.all([...meal.members.values()]
      .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt))
      .map(async member => ({
        userId: member.userId,
        ...(await profileFor(member.userId)),
        role: member.role,
        joinedAt: member.joinedAt,
      })))

    const dishes = (await Promise.all([...meal.dishes.values()]
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
      .map(async (dish) => {
        const recipe = await recipes.findById(dish.recipeId)
        if (!recipe) return undefined
        const wisherIds = [...(meal.wishes.get(dish.recipeId) ?? [])]
        const wishers = await Promise.all(wisherIds.map(async userId => ({
          userId,
          ...(await profileFor(userId)),
        })))
        return {
          recipe,
          quantity: dish.quantity,
          addedBy: dish.addedBy,
          wishCount: wishers.length,
          wishers,
          updatedAt: dish.updatedAt,
        }
      }))).filter((dish): dish is NonNullable<typeof dish> => Boolean(dish))

    return {
      id: meal.id,
      ownerId: meal.ownerId,
      title: meal.title,
      mealAt: meal.mealAt,
      mealType: meal.mealType,
      status: meal.status,
      inviteCode: currentUserId && meal.members.has(currentUserId) ? meal.inviteCode : '',
      inviteExpiresAt: meal.inviteExpiresAt,
      members,
      dishes,
      currentUserId: currentUserId ?? null,
      isMember: Boolean(currentUserId && meal.members.has(currentUserId)),
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    }
  }

  return {
    async getCurrent(userId) {
      const mealId = currentMealByUser.get(userId)
      const current = mealId ? meals.get(mealId) : undefined
      if (!current || !current.members.has(userId) || !['active', 'confirmed'].includes(current.status)) return undefined
      if (chinaDate(current.mealAt) < chinaDate(new Date())) return undefined
      return aggregate(current, userId)
    },

    async createMeal(userId, input: MealCreateInput) {
      return withCreateLock(userId, async () => {
        await recipes.getUserState(userId)
        const targetDate = chinaDate(input.mealAt)
        const existing = [...meals.values()].find(meal => (
          meal.ownerId === userId
          && meal.status === 'active'
          && chinaDate(meal.mealAt) === targetDate
        ))
        if (existing) {
          currentMealByUser.set(userId, existing.id)
          return aggregate(existing, userId)
        }

        const now = new Date().toISOString()
        const mealAtMs = new Date(input.mealAt).getTime()
        const meal: StoredMeal = {
          id: randomUUID(),
          ownerId: userId,
          title: input.title,
          mealAt: input.mealAt,
          mealType: input.mealType,
          status: 'active',
          inviteCode: randomBytes(9).toString('base64url'),
          inviteExpiresAt: new Date(mealAtMs + 12 * 60 * 60 * 1000).toISOString(),
          members: new Map([[userId, { userId, role: 'owner', joinedAt: now }]]),
          dishes: new Map(),
          wishes: new Map(),
          createdAt: now,
          updatedAt: now,
        }
        meals.set(meal.id, meal)
        currentMealByUser.set(userId, meal.id)
        return aggregate(meal, userId)
      })
    },

    async getMeal(mealId, currentUserId, inviteCode) {
      const meal = storedMeal(mealId)
      const isMember = Boolean(currentUserId && meal.members.has(currentUserId))
      if (!isMember) {
        if (inviteCode !== meal.inviteCode) throw new MealAccessDeniedError()
        if (inviteIsExpired(meal)) throw new InvalidInviteError('邀请已过期')
      }
      return aggregate(meal, currentUserId)
    },

    async joinMeal(mealId, userId, inviteCode) {
      const meal = storedMeal(mealId)
      ensureActive(meal)
      if (inviteCode !== meal.inviteCode) throw new InvalidInviteError()
      if (inviteIsExpired(meal)) throw new InvalidInviteError('邀请已过期')
      if (!meal.members.has(userId)) {
        await recipes.getUserState(userId)
        meal.members.set(userId, { userId, role: 'member', joinedAt: new Date().toISOString() })
        meal.updatedAt = new Date().toISOString()
      }
      currentMealByUser.set(userId, meal.id)
      return aggregate(meal, userId)
    },

    async setWish(mealId, userId, recipeId) {
      const meal = storedMeal(mealId)
      ensureMember(meal, userId)
      ensureActive(meal)
      await ensureRecipe(recipeId)
      const now = new Date().toISOString()
      if (!meal.dishes.has(recipeId)) {
        meal.dishes.set(recipeId, { recipeId, quantity: 1, addedBy: userId, updatedAt: now })
      }
      const wishes = meal.wishes.get(recipeId) ?? new Set<string>()
      wishes.add(userId)
      meal.wishes.set(recipeId, wishes)
      meal.updatedAt = now
      return aggregate(meal, userId)
    },

    async removeWish(mealId, userId, recipeId) {
      const meal = storedMeal(mealId)
      ensureMember(meal, userId)
      ensureActive(meal)
      const wishes = meal.wishes.get(recipeId)
      wishes?.delete(userId)
      if (wishes && wishes.size === 0) {
        meal.wishes.delete(recipeId)
        if (meal.dishes.get(recipeId)?.quantity === 1) meal.dishes.delete(recipeId)
      }
      meal.updatedAt = new Date().toISOString()
      return aggregate(meal, userId)
    },

    async setDish(mealId, userId, recipeId, quantity) {
      const meal = storedMeal(mealId)
      ensureMember(meal, userId)
      ensureActive(meal)
      await ensureRecipe(recipeId)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw new MealValidationError('菜品数量需在 1 到 20 之间')
      }
      const now = new Date().toISOString()
      const existing = meal.dishes.get(recipeId)
      meal.dishes.set(recipeId, {
        recipeId,
        quantity,
        addedBy: existing?.addedBy ?? userId,
        updatedAt: now,
      })
      meal.updatedAt = now
      return aggregate(meal, userId)
    },

    async removeDish(mealId, userId, recipeId) {
      const meal = storedMeal(mealId)
      ensureMember(meal, userId)
      ensureActive(meal)
      meal.dishes.delete(recipeId)
      meal.wishes.delete(recipeId)
      meal.updatedAt = new Date().toISOString()
      return aggregate(meal, userId)
    },

    async addDishQuantity(mealId, userId, recipeId, delta) {
      const meal = storedMeal(mealId)
      ensureMember(meal, userId)
      ensureActive(meal)
      if (delta !== 1 && delta !== -1) throw new MealValidationError('菜品数量变化值无效')
      await ensureRecipe(recipeId)
      const existing = meal.dishes.get(recipeId)
      if (!existing && delta === -1) throw new MealValidationError('菜品尚未加入菜单')
      const now = new Date().toISOString()
      const quantity = (existing?.quantity ?? 0) + delta
      if (quantity <= 0) {
        meal.dishes.delete(recipeId)
        meal.wishes.delete(recipeId)
      } else if (quantity <= 20) {
        meal.dishes.set(recipeId, {
          recipeId,
          quantity,
          addedBy: existing?.addedBy ?? userId,
          updatedAt: now,
        })
      } else {
        throw new MealValidationError('菜品数量需在 1 到 20 之间')
      }
      meal.updatedAt = now
      return aggregate(meal, userId)
    },

    async confirmMeal(mealId, userId) {
      const meal = storedMeal(mealId)
      ensureMember(meal, userId)
      if (meal.status === 'closed') throw new MealValidationError('饭局已关闭')
      if (meal.status === 'active') {
        meal.status = 'confirmed'
        meal.updatedAt = new Date().toISOString()
      }
      currentMealByUser.set(userId, meal.id)
      return aggregate(meal, userId)
    },

    async listCategories(includeDisabled = false) {
      await ensureDefaultCategories()
      return [...categories.values()]
        .filter(category => includeDisabled || category.enabled)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
        .map(copyCategory)
    },

    async upsertCategory(input: MealCategoryInput) {
      await ensureDefaultCategories()
      for (const recipeId of input.recipeIds) await ensureRecipe(recipeId)
      const category: MealCategory = {
        ...input,
        recipeIds: [...new Set(input.recipeIds)],
        updatedAt: new Date().toISOString(),
      }
      categories.set(category.id, category)
      return copyCategory(category)
    },

    async deleteCategory(id: string) {
      await ensureDefaultCategories()
      return categories.delete(id)
    },
  }
}

export { DEFAULT_CATEGORIES, defaultCategoryRecipeIds }
