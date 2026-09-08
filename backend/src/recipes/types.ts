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

export interface RecipeRepository {
  bootstrap(status: string, offset: number): Promise<BootstrapPayload>
  list(query: RecipeQuery): Promise<Recipe[]>
  findById(id: number): Promise<Recipe | undefined>
  close?(): Promise<void>
}
