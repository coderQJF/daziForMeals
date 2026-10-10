import type { Meal } from '@/types/meal'

export function mealEditingDeadline(meal: Pick<Meal, 'mealAt' | 'mealType'>): number {
  const china = new Date(Date.parse(meal.mealAt) + 8 * 60 * 60 * 1000)
  return Date.UTC(china.getUTCFullYear(), china.getUTCMonth(), china.getUTCDate(), meal.mealType === 'lunch' ? 4 : 11)
}
