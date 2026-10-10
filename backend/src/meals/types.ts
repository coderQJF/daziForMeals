import type { Recipe, RecipeRepository } from '../recipes/types.js'

export type MealType = 'lunch' | 'dinner'
export type MealStatus = 'active' | 'confirmed' | 'closed'
export type MealMemberRole = 'owner' | 'member'

export interface MealMember {
  userId: string
  nickname: string
  avatar: string
  role: MealMemberRole
  joinedAt: string
}

export interface MealWisher {
  userId: string
  nickname: string
  avatar: string
}

export interface MealDish {
  recipe: Recipe
  quantity: number
  addedBy: string
  wishCount: number
  wishers: MealWisher[]
  updatedAt: string
}

export interface MealAggregate {
  id: string
  ownerId: string
  title: string
  mealAt: string
  mealType: MealType
  status: MealStatus
  inviteCode: string
  inviteExpiresAt: string
  members: MealMember[]
  dishes: MealDish[]
  currentUserId: string | null
  isMember: boolean
  createdAt: string
  updatedAt: string
}

export interface MealCreateInput {
  title: string
  mealAt: string
  mealType: MealType
}

export interface MealCategory {
  id: string
  name: string
  sortOrder: number
  enabled: boolean
  recipeIds: number[]
  updatedAt: string
}

export interface MealCategoryInput {
  id: string
  name: string
  sortOrder: number
  enabled: boolean
  recipeIds: number[]
}

export interface MealRepository {
  getCurrent(userId: string): Promise<MealAggregate | undefined>
  createMeal(userId: string, input: MealCreateInput): Promise<MealAggregate>
  getMeal(mealId: string, currentUserId?: string, inviteCode?: string): Promise<MealAggregate>
  joinMeal(mealId: string, userId: string, inviteCode: string): Promise<MealAggregate>
  setWish(mealId: string, userId: string, recipeId: number): Promise<MealAggregate>
  removeWish(mealId: string, userId: string, recipeId: number): Promise<MealAggregate>
  setDish(mealId: string, userId: string, recipeId: number, quantity: number): Promise<MealAggregate>
  removeDish(mealId: string, userId: string, recipeId: number): Promise<MealAggregate>
  addDishQuantity(mealId: string, userId: string, recipeId: number, delta: 1 | -1): Promise<MealAggregate>
  confirmMeal(mealId: string, userId: string): Promise<MealAggregate>
  reopenMeal(mealId: string, userId: string): Promise<MealAggregate>
  listCategories(includeDisabled?: boolean): Promise<MealCategory[]>
  upsertCategory(input: MealCategoryInput): Promise<MealCategory>
  deleteCategory(id: string): Promise<boolean>
  close?(): Promise<void>
}

export interface MealRepositoryDependencies {
  recipes: RecipeRepository
}

export class MealNotFoundError extends Error {
  constructor(message = '饭局不存在') {
    super(message)
    this.name = 'MealNotFoundError'
  }
}

export class MealAccessDeniedError extends Error {
  constructor(message = '你暂无权限访问这个饭局') {
    super(message)
    this.name = 'MealAccessDeniedError'
  }
}

export class InvalidInviteError extends Error {
  constructor(message = '邀请已失效') {
    super(message)
    this.name = 'InvalidInviteError'
  }
}

export class MealValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MealValidationError'
  }
}
