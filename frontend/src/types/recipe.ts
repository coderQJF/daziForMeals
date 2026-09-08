export interface Recipe {
  id: number
  name: string
  cover: string
  hero: string
  thumbnail: string
  category: string
  tags: string[]
  reason: string
  cookTime: number
  calories: number
  popularity: number
  servings: number
  difficulty: '简单' | '适中' | '进阶'
  isFavorite: boolean
  categoryId?: string
  statusIds?: string[]
}

export interface Ingredient {
  name: string
  amount: string
  icon: string
}

export interface RecipeStep {
  text: string
  image: string
}

export interface RecipeDetail extends Recipe {
  ingredients: Ingredient[]
  steps: RecipeStep[]
}

export interface StatusOption {
  id: string
  name: string
  icon: string
}

export interface CategoryItem {
  id: string
  name: string
  icon: string
  description: string
  source?: 'quick' | 'cooking' | 'takeout'
  cover?: string
}

export interface RecipeBootstrap {
  quickCategories: CategoryItem[]
  cookingCategories: CategoryItem[]
  takeoutCategories: CategoryItem[]
  statusOptions: StatusOption[]
  recommendation: RecipeDetail
}

export interface RecipeListQuery {
  category?: string
  q?: string
  status?: string
  sort?: 'default' | 'latest' | 'popular'
  limit?: number
}
