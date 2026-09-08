import { categorySeeds, recipeSeeds, statusSeeds, type SeedRecipe } from './seed.js'
import type { BootstrapPayload, Category, Recipe, RecipeQuery, RecipeRepository } from './types.js'

function createAssetUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
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
  }
}
