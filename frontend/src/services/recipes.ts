import { apiGet } from './http'
import type { RecipeBootstrap, RecipeDetail, RecipeListQuery } from '@/types/recipe'

function compactQuery(query: RecipeListQuery): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(query).filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== ''),
  )
}

export const recipeApi = {
  getBootstrap(status = 'recover', offset = 0) {
    return apiGet<RecipeBootstrap>('/bootstrap', { status, offset })
  },
  getRecipes(query: RecipeListQuery = {}) {
    return apiGet<RecipeDetail[]>('/recipes', compactQuery(query))
  },
  getRecipe(id: number) {
    return apiGet<RecipeDetail>(`/recipes/${id}`)
  },
}
