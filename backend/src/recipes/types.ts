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
  categoryIds: string[]
  category: string
  tags: string[]
  tagIds: string[]
  taggings: RecipeTagging[]
  statusIds: string[]
  reason: string
  cookTime: number
  calories: number
  popularity: number
  servings: number
  difficulty: '简单' | '适中' | '进阶'
  ingredients: Ingredient[]
  steps: RecipeStep[]
  sortOrder: number
}

export interface RecipeInput {
  id?: number
  name: string
  cover: string
  hero: string
  thumbnail: string
  categoryId: string
  categoryIds: string[]
  category: string
  tags: string[]
  statusIds: string[]
  reason: string
  cookTime: number
  calories: number
  popularity: number
  servings: number
  difficulty: Recipe['difficulty']
  ingredients: Ingredient[]
  steps: RecipeStep[]
  sortOrder: number
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

export type RecipeTagType = 'status' | 'feature'
export type RecipeTagSource = 'manual' | 'ai'

export interface RecipeTag {
  id: string
  name: string
  type: RecipeTagType
}

export interface RecipeTagging {
  tagId: string
  weight: number
  source: RecipeTagSource
  confidence: number
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

export interface WechatPhone {
  phoneNumber: string
  purePhoneNumber: string
  countryCode: string
  boundAt: string
}

export interface WechatNotificationSubscription {
  mealId: string
  templateId: string
}

export interface WechatAccount {
  openid: string
  unionid?: string
  phone?: WechatPhone
  notificationSubscriptions: WechatNotificationSubscription[]
  /** Legacy unscoped grants are retained only for storage compatibility and are never consumed. */
  notificationTemplateIds?: string[]
}

export interface UserState {
  clientId: string
  selectedStatus: string
  favoriteRecipeIds: number[]
  likedRecipeIds: number[]
  cookedRecipeIds: number[]
  plannedRecipeIds: number[]
  profile: UserProfile
  wechat?: WechatAccount
}

export type UserStateUpdate = Partial<Pick<UserState,
  'selectedStatus' | 'favoriteRecipeIds' | 'likedRecipeIds' | 'cookedRecipeIds' | 'plannedRecipeIds' | 'profile'>>

export interface UserDashboard extends Omit<UserState, 'clientId'> {
  wechat?: never
  phoneBound: boolean
  phoneMasked: string
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
  tagIds: string[]
}

export interface OperationsSummary {
  service: 'fandazi'
  profiles: number
  wechatAccounts: number
  guestProfiles: number
  updatedAt: string
}

export interface OperationsUser {
  id: string
  accountType: 'wechat' | 'guest'
  nickname: string
  phoneMasked: string
  favorites: number
  likes: number
  cooked: number
  updatedAt: string | null
}

export interface RecipeRepository {
  bootstrap(clientId: string, status: string): Promise<BootstrapPayload>
  recommend(clientId: string, status: string, excludeIds?: number[]): Promise<Recipe>
  list(query: RecipeQuery): Promise<Recipe[]>
  findById(id: number): Promise<Recipe | undefined>
  upsertRecipe(input: RecipeInput): Promise<Recipe>
  deleteRecipe(id: number): Promise<boolean>
  getUserState(clientId: string): Promise<UserState>
  updateUserState(clientId: string, update: UserStateUpdate): Promise<UserState>
  claimUserState(sourceClientId: string, userClientId: string): Promise<UserState>
  setWechatIdentity(clientId: string, identity: Pick<WechatAccount, 'openid' | 'unionid'>): Promise<UserState>
  setWechatPhone(clientId: string, phone: Omit<WechatPhone, 'boundAt'>): Promise<UserState>
  setNotificationSubscription(clientId: string, mealId: string, templateId: string, subscribed: boolean): Promise<UserState>
  getNotificationRecipients(clientIds: string[], mealId: string, templateId: string): Promise<Array<{ clientId: string, openid: string }>>
  getPlan(clientId: string, date: string): Promise<PlanPayload>
  listTakeout(category?: string): Promise<TakeoutShop[]>
  operationsSummary(): Promise<OperationsSummary>
  operationsUsers(query?: string, limit?: number, offset?: number): Promise<{ items: OperationsUser[], total: number }>
  close?(): Promise<void>
}
