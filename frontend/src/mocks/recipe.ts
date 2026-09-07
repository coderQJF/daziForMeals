import type { CategoryItem, Recipe, StatusOption } from '@/types/recipe'
import { assetUrl } from '@/config/assets'

const yamSoupImage = assetUrl('images/recipes/yam-pork-rib-soup-card.jpg')

export const todayRecipe: Recipe = {
  id: 1001,
  name: '山药排骨汤',
  cover: yamSoupImage,
  hero: assetUrl('images/recipes/yam-pork-rib-soup-hero.jpg'),
  thumbnail: assetUrl('images/recipes/yam-pork-rib-soup-thumb.jpg'),
  category: '汤羹',
  tags: ['高钙', '低脂', '易消化'],
  reason: '富含钙与胶原蛋白，温润清淡，适合恢复期补充营养。',
  cookTime: 40,
  calories: 320,
  servings: 2,
  difficulty: '简单',
  isFavorite: false,
}

export const tomatoBeefSoupRecipe: Recipe = {
  id: 1002,
  name: '番茄牛肉汤',
  cover: assetUrl('images/category/cooking/home-style-cover.jpg'),
  hero: assetUrl('images/category/cooking/home-style-cover.jpg'),
  thumbnail: assetUrl('images/category/cooking/home-style-cover.jpg'),
  category: '暖胃汤羹',
  tags: ['高蛋白', '易消化', '暖胃'],
  reason: '番茄富含维生素 C，牛肉补充优质蛋白，暖胃又补能量，适合恢复期食用。',
  cookTime: 35,
  calories: 280,
  servings: 2,
  difficulty: '简单',
  isFavorite: false,
}

export const shrimpBroccoliRecipe: Recipe = {
  id: 1003,
  name: '西兰花炒虾仁',
  cover: assetUrl('images/category/cooking/light-cover.jpg'),
  hero: assetUrl('images/category/cooking/light-cover.jpg'),
  thumbnail: assetUrl('images/category/cooking/light-cover.jpg'),
  category: '清淡快手菜',
  tags: ['清淡', '低脂', '高蛋白'],
  reason: '虾仁鲜嫩高蛋白，搭配西兰花清爽少油，营养均衡。',
  cookTime: 20,
  calories: 220,
  servings: 2,
  difficulty: '简单',
  isFavorite: false,
}

export const braisedPorkRecipe: Recipe = {
  id: 2001,
  name: '妈妈的红烧肉',
  cover: assetUrl('images/category/takeout/hot-pot-cover.jpg'),
  hero: assetUrl('images/category/takeout/hot-pot-cover.jpg'),
  thumbnail: assetUrl('images/category/takeout/hot-pot-cover.jpg'),
  category: '家常菜',
  tags: ['家常', '下饭', '经典'],
  reason: '软糯入味，经典下饭菜，是记忆中的家的味道。',
  cookTime: 60,
  calories: 520,
  servings: 2,
  difficulty: '适中',
  isFavorite: true,
}

export const greenPepperBeefRecipe: Recipe = {
  id: 2003,
  name: '青椒炒牛肉',
  cover: assetUrl('images/category/cooking/quick-cover.jpg'),
  hero: assetUrl('images/category/cooking/quick-cover.jpg'),
  thumbnail: assetUrl('images/category/cooking/quick-cover.jpg'),
  category: '快手菜',
  tags: ['快手', '高蛋白', '下饭'],
  reason: '牛肉鲜嫩、青椒爽脆，简单快手又适合日常搭配。',
  cookTime: 20,
  calories: 360,
  servings: 2,
  difficulty: '简单',
  isFavorite: true,
}

export const cookingRecommendations: Recipe[] = [
  tomatoBeefSoupRecipe,
  todayRecipe,
  shrimpBroccoliRecipe,
]

export const recipeCatalog: Recipe[] = [
  ...cookingRecommendations,
  braisedPorkRecipe,
  { ...tomatoBeefSoupRecipe, id: 2002, isFavorite: true },
  greenPepperBeefRecipe,
]

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
