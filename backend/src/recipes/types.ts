export interface Ingredient {
  name: string
  amount: string
  icon: string
}

export interface RecipeStep {
  text: string
  image: string
}

export interface Recipe {
  id: number
  name: string
  cover: string
  hero: string
  thumbnail: string
  categoryId: string
  category: string
  tags: string[]
  statusIds: string[]
  reason: string
  cookTime: number
  calories: number
  popularity: number
  servings: number
  difficulty: '简单' | '适中' | '进阶'
  ingredients: Ingredient[]
  steps: RecipeStep[]
}

export interface Category {
  id: string
  source: 'quick' | 'cooking' | 'takeout'
  name: string
  description: string
  icon: string
  cover?: string
}

export interface StatusOption {
  id: string
  name: string
  icon: string
}

export interface RecipeQuery {
  category?: string
  keyword?: string
  status?: string
  sort?: 'default' | 'latest' | 'popular'
  limit?: number
}

export interface BootstrapPayload {
  quickCategories: Category[]
  cookingCategories: Category[]
  takeoutCategories: Category[]
  statusOptions: StatusOption[]
  recommendation: Recipe
}

export interface UserProfile {
  nickname: string
  bio: string
  avatar: string
}

export interface UserState {
  clientId: string
  selectedStatus: string
  favoriteRecipeIds: number[]
  likedRecipeIds: number[]
  cookedRecipeIds: number[]
  plannedRecipeIds: number[]
  profile: UserProfile
}

export type UserStateUpdate = Partial<Omit<UserState, 'clientId'>>

export interface UserDashboard extends UserState {
  stats: {
    favorites: number
    likes: number
    cooked: number
  }
}

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

export interface PlanSummary {
  nutrients: PlanNutrient[]
  reminders: PlanReminder[]
}

export interface PlanPayload extends PlanSummary {
  date: string
  meals: PlanMeal[]
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

export interface RecipeRepository {
  bootstrap(status: string, offset: number): Promise<BootstrapPayload>
  list(query: RecipeQuery): Promise<Recipe[]>
  findById(id: number): Promise<Recipe | undefined>
  getUserState(clientId: string): Promise<UserState>
  updateUserState(clientId: string, update: UserStateUpdate): Promise<UserState>
  getPlan(clientId: string, date: string): Promise<PlanPayload>
  listTakeout(category?: string): Promise<TakeoutShop[]>
  close?(): Promise<void>
}
