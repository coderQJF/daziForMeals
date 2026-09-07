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
  servings: number
  difficulty: '简单' | '适中' | '进阶'
  isFavorite: boolean
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
}
