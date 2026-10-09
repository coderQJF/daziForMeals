import type { Recipe } from '@/types/recipe'

const GENERATED_DISH_IMAGES: Record<string, string> = {
  番茄牛腩: '/static/images/recipes/tomato-beef-stew.jpg',
  山药排骨汤: '/static/images/recipes/yam-pork-rib-soup-menu.jpg',
  西兰花炒虾仁: '/static/images/recipes/broccoli-shrimp.jpg',
  麻婆豆腐: '/static/images/recipes/mapo-tofu.jpg',
  宫保鸡丁: '/static/images/recipes/kung-pao-chicken.jpg',
  清炒时蔬: '/static/images/recipes/stir-fried-greens.jpg',
}

const DISH_TAGS: Record<string, string> = {
  番茄牛腩: '酸甜开胃',
  山药排骨汤: '暖胃鲜香',
  西兰花炒虾仁: '清爽营养',
  麻婆豆腐: '香辣下饭',
  宫保鸡丁: '经典家常',
  清炒时蔬: '清淡爽口',
}

export type MealDishKind = 'meat' | 'vegetable' | 'soup' | 'staple'

export function dishImageFor(recipe: Pick<Recipe, 'name' | 'thumbnail' | 'cover'>): string {
  return GENERATED_DISH_IMAGES[recipe.name] || recipe.thumbnail || recipe.cover
}

export function dishTagFor(recipe: Pick<Recipe, 'name' | 'tags'>): string {
  return DISH_TAGS[recipe.name] || recipe.tags[0] || '家常好味'
}

export function mealDishKindFor(recipe: Pick<Recipe, 'name' | 'categoryId' | 'category'>): MealDishKind {
  if (recipe.name.includes('汤') || recipe.name.includes('羹') || recipe.categoryId === 'soup') return 'soup'
  if (recipe.name.includes('饭') || recipe.name.includes('粥') || recipe.category.includes('主食')) return 'staple'
  if (
    recipe.name.includes('时蔬')
    || recipe.name.includes('豆腐')
    || recipe.name.includes('西兰花')
    || recipe.name.includes('菠菜')
    || recipe.name.includes('冬瓜')
  ) return 'vegetable'
  return 'meat'
}
