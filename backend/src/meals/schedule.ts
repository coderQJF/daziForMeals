import type { MealType } from './types.js'

const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000

export interface MealSlot {
  mealAt: Date
  mealType: MealType
}

export function chinaDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  const china = new Date(date.getTime() + CHINA_OFFSET_MS)
  const year = china.getUTCFullYear()
  const month = String(china.getUTCMonth() + 1).padStart(2, '0')
  const day = String(china.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function resolveMealSlot(now = new Date()): MealSlot {
  const chinaNow = new Date(now.getTime() + CHINA_OFFSET_MS)
  const year = chinaNow.getUTCFullYear()
  const month = chinaNow.getUTCMonth()
  const day = chinaNow.getUTCDate()
  const hour = chinaNow.getUTCHours()

  if (hour < 12) {
    return { mealAt: new Date(Date.UTC(year, month, day, 4)), mealType: 'lunch' }
  }
  if (hour < 19) {
    return { mealAt: new Date(Date.UTC(year, month, day, 11)), mealType: 'dinner' }
  }
  return { mealAt: new Date(Date.UTC(year, month, day + 1, 4)), mealType: 'lunch' }
}

export function mealTitle(mealAt: Date, mealType: MealType): string {
  const weekday = new Intl.DateTimeFormat('zh-CN', {
    weekday: 'short',
    timeZone: 'Asia/Shanghai',
  }).format(mealAt)
  return `${weekday}${mealType === 'lunch' ? '午餐' : '晚餐'}`
}

export function isMealInSlot(mealAt: string | Date, mealType: MealType, slot: MealSlot): boolean {
  return mealType === slot.mealType && chinaDateKey(mealAt) === chinaDateKey(slot.mealAt)
}
