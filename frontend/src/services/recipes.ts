import { apiGet } from './http'
import type { RecipeBootstrap, RecipeDetail, RecipeListQuery } from '@/types/recipe'

function compactQuery(query: RecipeListQuery): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(query).filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== ''),
  )
}

export const recipeApi = {
  getBootstrap(status = 'recover') {
    return apiGet<RecipeBootstrap>('/bootstrap', { status })
  },
  getRandomRecipe(status = 'normal', excludeIds: number[] = []) {
    const query: Record<string, string | number> = { status }
    if (excludeIds.length) query.exclude = excludeIds.join(',')
    return apiGet<RecipeDetail>('/recipes/random', query)
  },
  getRecipes(query: RecipeListQuery = {}) {
    return apiGet<RecipeDetail[]>('/recipes', compactQuery(query))
  },
  getRecipe(id: number) {
    return apiGet<RecipeDetail>(`/recipes/${id}`)
  },
}
