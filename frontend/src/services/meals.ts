import { apiGet, apiRequest } from './http'
import type { Meal, MealCategory, MealType } from '@/types/meal'

export const mealApi = {
  getCategories() {
    return apiGet<MealCategory[]>('/meal-categories')
  },
  getCurrent() {
    return apiGet<Meal | null>('/meals/current')
  },
  create(input?: { title?: string; mealAt?: string; mealType?: MealType }) {
    return apiRequest<Meal>('POST', '/meals', input)
  },
  get(mealId: string, inviteCode?: string) {
    return apiGet<Meal>(`/meals/${encodeURIComponent(mealId)}`, inviteCode ? { invite: inviteCode } : undefined)
  },
  join(mealId: string, inviteCode: string) {
    return apiRequest<Meal>('POST', `/meals/${encodeURIComponent(mealId)}/join`, { inviteCode })
  },
  setWish(mealId: string, recipeId: number) {
    return apiRequest<Meal>('PUT', `/meals/${encodeURIComponent(mealId)}/wishes/${recipeId}`)
  },
  removeWish(mealId: string, recipeId: number) {
    return apiRequest<Meal>('DELETE', `/meals/${encodeURIComponent(mealId)}/wishes/${recipeId}`)
  },
  setDish(mealId: string, recipeId: number, quantity: number) {
    return apiRequest<Meal>('PUT', `/meals/${encodeURIComponent(mealId)}/dishes/${recipeId}`, { quantity })
  },
  adjustDishQuantity(mealId: string, recipeId: number, delta: 1 | -1) {
    return apiRequest<Meal>('POST', `/meals/${encodeURIComponent(mealId)}/dishes/${recipeId}/quantity`, { delta })
  },
  removeDish(mealId: string, recipeId: number) {
    return apiRequest<Meal>('DELETE', `/meals/${encodeURIComponent(mealId)}/dishes/${recipeId}`)
  },
  confirm(mealId: string) {
    return apiRequest<Meal>('PUT', `/meals/${encodeURIComponent(mealId)}/confirm`)
  },
  reopen(mealId: string) {
    return apiRequest<Meal>('PUT', `/meals/${encodeURIComponent(mealId)}/reopen`)
  },
}
