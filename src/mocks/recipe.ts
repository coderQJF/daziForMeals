import type { CategoryItem, Recipe, StatusOption } from '@/types/recipe'

const yamSoupImage = '/static/images/recipes/yam-pork-rib-soup-card.webp'

export const todayRecipe: Recipe = {
  id: 1001,
  name: '山药排骨汤',
  cover: yamSoupImage,
  hero: '/static/images/recipes/yam-pork-rib-soup-hero.webp',
  thumbnail: '/static/images/recipes/yam-pork-rib-soup-thumb.webp',
  category: '汤羹',
  tags: ['高钙', '低脂', '易消化'],
  reason: '富含钙与胶原蛋白，温润清淡，适合恢复期补充营养。',
  cookTime: 40,
  calories: 320,
  servings: 2,
  difficulty: '简单',
  isFavorite: false,
}

export const statusOptions: StatusOption[] = [
  { id: 'recover', name: '骨折恢复期', icon: '🦴' },
  { id: 'late', name: '熬夜', icon: '🌙' },
  { id: 'appetite', name: '没胃口', icon: '🌧️' },
  { id: 'lazy', name: '犯懒', icon: '😴' },
]

export const quickCategories: CategoryItem[] = [
  { id: 'cook', name: '自己做', icon: '🍲', description: '营养又安心' },
  { id: 'takeout', name: '点外卖', icon: '🛵', description: '省时又方便' },
  { id: 'recover', name: '恢复期', icon: '💚', description: '科学助恢复' },
]

export const cookCategories: CategoryItem[] = [
  { id: 'fast', name: '快手菜', icon: '⚡', description: '15分钟上桌' },
  { id: 'home', name: '家常菜', icon: '🏠', description: '家的味道' },
  { id: 'soup', name: '汤羹', icon: '🍲', description: '温暖滋养' },
  { id: 'light', name: '清淡', icon: '🍃', description: '少油少盐' },
  { id: 'recover', name: '恢复期', icon: '💚', description: '营养修复' },
]
