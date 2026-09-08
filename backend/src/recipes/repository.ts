import { categorySeeds, recipeSeeds, statusSeeds, type SeedRecipe } from './seed.js'
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

export function mapPlanPayload(recipes: Recipe[], state: UserState, date: string, assetBaseUrl: string): PlanPayload {
  const meals = planMealSeeds.map(meal => ({
    ...meal,
    dishes: meal.dishes.map(({ imageKey, ...dish }) => ({ ...dish, image: createAssetUrl(assetBaseUrl, imageKey) })),
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
  return {
    date,
    meals,
    nutrients: planSummary.nutrients.map(item => ({ ...item })),
    reminders: planReminders.map(item => ({ ...item })),
  }
}

export function mapSeedRecipe(seed: SeedRecipe, assetBaseUrl: string): Recipe {
  return {
    id: seed.id,
    name: seed.name,
    cover: createAssetUrl(assetBaseUrl, seed.coverKey),
    hero: createAssetUrl(assetBaseUrl, seed.heroKey),
    thumbnail: createAssetUrl(assetBaseUrl, seed.thumbnailKey),
    categoryId: seed.categoryId,
    category: seed.category,
    tags: [...seed.tags],
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
  return (!query.category || recipe.categoryId === query.category)
    && (!query.status || recipe.statusIds.includes(query.status))
    && (!keyword
      || recipe.name.toLocaleLowerCase().includes(keyword)
      || recipe.tags.some(tag => tag.toLocaleLowerCase().includes(keyword)))
}

export function createMemoryRecipeRepository(assetBaseUrl: string): RecipeRepository {
  const recipes = recipeSeeds.map(seed => mapSeedRecipe(seed, assetBaseUrl))
  const categories = categorySeeds.map(category => mapCategory(category, assetBaseUrl))
  const userStates = new Map<string, UserState>()

  const getState = (clientId: string) => {
    const existing = userStates.get(clientId)
    if (existing) return existing
    const created = createDefaultUserState(clientId, assetBaseUrl)
    userStates.set(clientId, created)
    return created
  }

  return {
    async bootstrap(status, offset) {
      const recommendations = recipes.filter(recipe => recipe.statusIds.includes(status))
      const candidates = recommendations.length ? recommendations : recipes
      const recommendation = candidates[offset % candidates.length]
      if (!recommendation) throw new Error('Recipe seed data is empty')

      return {
        quickCategories: categories.filter(category => category.source === 'quick'),
        cookingCategories: categories.filter(category => category.source === 'cooking'),
        takeoutCategories: categories.filter(category => category.source === 'takeout'),
        statusOptions: statusSeeds.map(item => ({ ...item })),
        recommendation: { ...recommendation },
      }
    },
    async list(query) {
      const result = recipes.filter(recipe => matchesQuery(recipe, query))
      if (query.sort === 'latest') result.sort((a, b) => b.id - a.id)
      if (query.sort === 'popular') result.sort((a, b) => a.cookTime - b.cookTime)
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
      const next = {
        ...current,
        ...update,
        clientId,
        profile: update.profile ? { ...current.profile, ...update.profile } : current.profile,
      }
      userStates.set(clientId, next)
      return structuredClone(next)
    },
    async getPlan(clientId, date) {
      return mapPlanPayload(recipes, getState(clientId), date, assetBaseUrl)
    },
    async listTakeout(category) {
      return takeoutShops.filter(shop => !category || shop.categoryId === category).map(shop => ({ ...shop }))
    },
  }
}
