import type { PlanMeal, PlanReminder, PlanSummary, TakeoutShop, UserProfile } from '../recipes/types.js'

export interface PlanDishSeed {
  id: number
  name: string
  amount: string
  imageKey: string
}

export interface PlanMealSeed extends Omit<PlanMeal, 'dishes'> {
  dishes: PlanDishSeed[]
}

export const defaultProfile: Omit<UserProfile, 'avatar'> = {
  nickname: '早睡早起吃饭饭 ☀️',
  bio: '享受每一餐，认真生活每一天～',
}

export const planMealSeeds: PlanMealSeed[] = [
  {
    id: 'breakfast', name: '早餐', time: '07:30', icon: '/static/images/plan/meal-sun.png', summary: '山药排骨汤、蒸蛋、番茄牛肉粥', calories: 480,
    dishes: [
      { id: 1001, name: '山药排骨汤', amount: '1碗', imageKey: 'images/category/cooking/soup-cover.jpg' },
      { id: 1002, name: '蒸蛋', amount: '1碗', imageKey: 'images/plan/meals/steamed-egg.jpg' },
      { id: 1003, name: '番茄牛肉粥', amount: '1碗', imageKey: 'images/plan/meals/tomato-beef-congee.jpg' },
    ],
  },
  {
    id: 'lunch', name: '午餐', time: '12:30', icon: '/static/images/plan/meal-sun.png', summary: '番茄牛肉汤、清蒸鱼、糙米饭', calories: 590,
    dishes: [
      { id: 1002, name: '番茄牛肉汤', amount: '1碗', imageKey: 'images/category/cooking/home-style-cover.jpg' },
      { id: 1005, name: '清蒸鱼', amount: '1份', imageKey: 'images/plan/meals/steamed-fish.jpg' },
      { id: 1006, name: '糙米饭', amount: '1小碗', imageKey: 'images/plan/meals/brown-rice.jpg' },
    ],
  },
  {
    id: 'dinner', name: '晚餐', time: '18:30', icon: '/static/images/plan/moon.png', summary: '山药排骨汤、蒸蛋、清炒时蔬', calories: 460,
    dishes: [
      { id: 1001, name: '山药排骨汤', amount: '1碗', imageKey: 'images/category/cooking/soup-cover.jpg' },
      { id: 1002, name: '蒸蛋', amount: '1碗', imageKey: 'images/plan/meals/steamed-egg.jpg' },
      { id: 1003, name: '清炒时蔬', amount: '1份', imageKey: 'images/category/cooking/light-cover.jpg' },
    ],
  },
  {
    id: 'snack', name: '加餐', time: '15:30', icon: '/static/images/plan/snack-bag.png', summary: '牛奶、水果拼盘、核桃', calories: 210,
    dishes: [
      { id: 1008, name: '牛奶', amount: '1杯', imageKey: 'images/plan/meals/milk.jpg' },
      { id: 1009, name: '水果拼盘', amount: '1份', imageKey: 'images/plan/meals/fruit-platter.jpg' },
      { id: 1010, name: '核桃', amount: '3颗', imageKey: 'images/plan/meals/walnuts.jpg' },
    ],
  },
]

export const planSummary: PlanSummary = {
  nutrients: [
    { name: '蛋白质', value: '78 / 100g', progress: 78, color: '#ff7656' },
    { name: '钙', value: '680 / 1000mg', progress: 68, color: '#ff9c26' },
    { name: '维生素D', value: '12 / 20μg', progress: 60, color: '#ffc13f' },
  ],
  reminders: [],
}

export const planReminders: PlanReminder[] = [
  { name: '多喝水', value: '1500~2000ml', icon: '/static/images/plan-detail/water-drop.png', tone: 'blue' },
  { name: '晒太阳', value: '20~30分钟', icon: '/static/images/plan-detail/sun-reminder.png', tone: 'yellow' },
  { name: '适度活动', value: '轻度拉伸', icon: '/static/images/plan-detail/activity.png', tone: 'orange' },
  { name: '按时吃饭', value: '定时定量', icon: '/static/images/plan-detail/meal-bowl.png', tone: 'pink' },
]

export const takeoutShops: TakeoutShop[] = [
  { id: 'xiaolongkan', categoryId: 'hot-pot', name: '小龙坎火锅（科技园店）', score: 4.8, distance: '1.2km', deliveryTime: '30分钟送达', promotion: '满100减20' },
  { id: 'haidilao', categoryId: 'hot-pot', name: '海底捞火锅（后海店）', score: 4.9, distance: '1.6km', deliveryTime: '30分钟送达', promotion: '会员配送费减免' },
  { id: 'xiabu', categoryId: 'hot-pot', name: '呷哺呷哺（南山店）', score: 4.6, distance: '2.0km', deliveryTime: '40分钟送达', promotion: '双人套餐立减15元' },
  { id: 'noodle-home', categoryId: 'noodles', name: '老街面馆', score: 4.7, distance: '0.8km', deliveryTime: '25分钟送达', promotion: '满30减5' },
  { id: 'salad-day', categoryId: 'light-meal', name: '每日轻食', score: 4.8, distance: '1.1km', deliveryTime: '28分钟送达', promotion: '低卡套餐9折' },
  { id: 'crispy-chicken', categoryId: 'fried-chicken', name: '酥脆炸鸡研究所', score: 4.7, distance: '1.4km', deliveryTime: '32分钟送达', promotion: '第二份半价' },
  { id: 'sushi-town', categoryId: 'japanese', name: '町上寿司', score: 4.8, distance: '1.9km', deliveryTime: '35分钟送达', promotion: '刺身拼盘立减12元' },
]
