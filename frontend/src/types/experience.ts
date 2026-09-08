export interface UserProfile {
  nickname: string
  bio: string
  avatar: string
}

export interface UserDashboard {
  selectedStatus: string
  favoriteRecipeIds: number[]
  likedRecipeIds: number[]
  cookedRecipeIds: number[]
  plannedRecipeIds: number[]
  profile: UserProfile
  stats: {
    favorites: number
    likes: number
    cooked: number
  }
}

export type UserStateUpdate = Partial<Pick<UserDashboard,
  'selectedStatus' | 'favoriteRecipeIds' | 'likedRecipeIds' | 'cookedRecipeIds' | 'plannedRecipeIds' | 'profile'>>

export interface PlanDish {
  id: number
  name: string
  amount: string
  image: string
}

export interface PlanMeal {
  id: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  time: string
  icon: string
  summary: string
  calories: number
  dishes: PlanDish[]
}

export interface PlanNutrient {
  name: string
  value: string
  progress: number
  color: string
}

export interface PlanReminder {
  name: string
  value: string
  icon: string
  tone: string
}

export interface PlanPayload {
  date: string
  meals: PlanMeal[]
  nutrients: PlanNutrient[]
  reminders: PlanReminder[]
}

export interface TakeoutShop {
  id: string
  categoryId: string
  name: string
  score: number
  distance: string
  deliveryTime: string
  promotion: string
}
