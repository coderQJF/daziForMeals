import { categorySeeds, getSeedTaggings, recipeSeeds, statusSeeds, type SeedRecipe } from './seed.js'
import { defaultProfile, planMealSeeds, planReminders, planSummary, takeoutShops } from '../experience/seed.js'
import type { BootstrapPayload, Category, PlanPayload, Recipe, RecipeQuery, RecipeRepository, UserState, UserStateUpdate } from './types.js'

export function createAssetUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

export function createDefaultUserState(clientId: string, assetBaseUrl: string): UserState {
  return {
    clientId,
    selectedStatus: 'recover',
    favoriteRecipeIds: [2001, 2002, 2003],
    likedRecipeIds: [],
    cookedRecipeIds: [2001],
    plannedRecipeIds: [],
    profile: {
      ...defaultProfile,
      avatar: createAssetUrl(assetBaseUrl, 'images/user/avatar-female.png'),
    },
  }
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
      if (existing) return structuredClone(existing)
      const claimed = { ...structuredClone(getState(sourceClientId)), clientId: userClientId }
      userStates.set(userClientId, claimed)
      return structuredClone(claimed)
    },
    async getPlan(clientId, date) {
      return mapPlanPayload(recipes, getState(clientId), date)
    },
    async listTakeout(category) {
      return takeoutShops.filter(shop => !category || shop.categoryId === category).map(shop => ({ ...shop }))
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
