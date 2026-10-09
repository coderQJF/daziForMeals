import type { RecipeDetail } from './recipe'

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
  recipe: RecipeDetail
  quantity: number
  addedBy: string
  wishCount: number
  wishers: MealWisher[]
  updatedAt: string
}

export interface Meal {
  id: string
  ownerId: string
  title: string
  mealAt: string
  mealType: 'dinner'
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

export interface MealCategory {
  id: string
  name: string
  sortOrder: number
  enabled: boolean
  recipeIds: number[]
  updatedAt: string
}

export interface MealInvitation {
  mealId: string
  inviteCode: string
}
