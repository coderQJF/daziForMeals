import { assetUrl } from '@/config/assets'

export interface PlanDay {
  weekday: string
  date: number
  isToday?: boolean
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
  dishes: PlanDish[]
}

export const planDays: PlanDay[] = [
  { weekday: '周一', date: 27 },
  { weekday: '周二', date: 28 },
  { weekday: '周三', date: 29 },
  { weekday: '今天', date: 30, isToday: true },
  { weekday: '周五', date: 31 },
  { weekday: '周六', date: 1 },
  { weekday: '周日', date: 2 },
]

export const planMeals: PlanMeal[] = [
  {
    id: 'breakfast',
    name: '早餐',
    time: '07:30',
    icon: '/static/images/plan/meal-sun.png',
    summary: '山药排骨汤、蒸蛋、番茄牛肉粥',
    dishes: [
      { id: 1001, name: '山药排骨汤', amount: '1碗', image: assetUrl('images/category/cooking/soup-cover.jpg') },
      { id: 1002, name: '蒸蛋', amount: '1碗', image: assetUrl('images/plan/meals/steamed-egg.jpg') },
      { id: 1003, name: '番茄牛肉粥', amount: '1碗', image: assetUrl('images/plan/meals/tomato-beef-congee.jpg') },
    ],
  },
  {
    id: 'lunch',
    name: '午餐',
    time: '12:30',
    icon: '/static/images/plan/meal-sun.png',
    summary: '番茄牛肉汤、清蒸鱼、糙米饭',
    dishes: [
      { id: 1004, name: '番茄牛肉汤', amount: '1碗', image: assetUrl('images/category/cooking/home-style-cover.jpg') },
      { id: 1005, name: '清蒸鱼', amount: '1份', image: assetUrl('images/plan/meals/steamed-fish.jpg') },
      { id: 1006, name: '糙米饭', amount: '1小碗', image: assetUrl('images/plan/meals/brown-rice.jpg') },
    ],
  },
  {
    id: 'dinner',
    name: '晚餐',
    time: '18:30',
    icon: '/static/images/plan/moon.png',
    summary: '山药排骨汤、蒸蛋、清炒时蔬',
    dishes: [
      { id: 1001, name: '山药排骨汤', amount: '1碗', image: assetUrl('images/category/cooking/soup-cover.jpg') },
      { id: 1002, name: '蒸蛋', amount: '1碗', image: assetUrl('images/plan/meals/steamed-egg.jpg') },
      { id: 1007, name: '清炒时蔬', amount: '1份', image: assetUrl('images/category/cooking/light-cover.jpg') },
    ],
  },
  {
    id: 'snack',
    name: '加餐',
    time: '15:30',
    icon: '/static/images/plan/snack-bag.png',
    summary: '牛奶、水果拼盘、核桃',
    dishes: [
      { id: 1008, name: '牛奶', amount: '1杯', image: assetUrl('images/plan/meals/milk.jpg') },
      { id: 1009, name: '水果拼盘', amount: '1份', image: assetUrl('images/plan/meals/fruit-platter.jpg') },
      { id: 1010, name: '核桃', amount: '3颗', image: assetUrl('images/plan/meals/walnuts.jpg') },
    ],
  },
]
