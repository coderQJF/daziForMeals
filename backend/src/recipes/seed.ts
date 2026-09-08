import type { Category, Ingredient, RecipeStep, StatusOption } from './types.js'

export interface SeedRecipe {
  id: number
  name: string
  coverKey: string
  heroKey: string
  thumbnailKey: string
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
  steps: Array<Omit<RecipeStep, 'image'> & { imageKey: string }>
  sortOrder: number
}

export const categorySeeds: Category[] = [
  { id: 'cook', source: 'quick', name: '自己做', description: '营养又安心', icon: '/static/images/home/action-cook.png' },
  { id: 'takeout', source: 'quick', name: '点外卖', description: '省时又方便', icon: '/static/images/home/action-takeout.png' },
  { id: 'recover', source: 'quick', name: '恢复期', description: '科学助恢复', icon: '/static/images/home/action-recover.png' },
  { id: 'quick', source: 'cooking', name: '快手菜', description: '15分钟上桌', icon: '/static/images/category/cooking/quick-icon.png', cover: 'images/category/cooking/quick-cover.jpg' },
  { id: 'home-style', source: 'cooking', name: '家常菜', description: '家的味道', icon: '/static/images/category/cooking/home-style-icon.png', cover: 'images/category/cooking/home-style-cover.jpg' },
  { id: 'soup', source: 'cooking', name: '汤羹', description: '温暖滋养', icon: '/static/images/category/cooking/soup-icon.png', cover: 'images/category/cooking/soup-cover.jpg' },
  { id: 'light', source: 'cooking', name: '清淡', description: '少油少盐', icon: '/static/images/category/cooking/light-icon.png', cover: 'images/category/cooking/light-cover.jpg' },
  { id: 'recovery', source: 'cooking', name: '恢复期', description: '营养修复', icon: '/static/images/category/cooking/recovery-icon.png', cover: 'images/category/cooking/recovery-cover.jpg' },
  { id: 'hot-pot', source: 'takeout', name: '火锅', description: '热辣过瘾', icon: '/static/images/category/takeout/hot-pot-icon.png', cover: 'images/category/takeout/hot-pot-cover.jpg' },
  { id: 'noodles', source: 'takeout', name: '面食', description: '面面俱到', icon: '/static/images/category/takeout/noodles-icon.png', cover: 'images/category/takeout/noodles-cover.jpg' },
  { id: 'light-meal', source: 'takeout', name: '轻食', description: '轻盈健康', icon: '/static/images/category/takeout/light-meal-icon.png', cover: 'images/category/takeout/light-meal-cover.jpg' },
  { id: 'fried-chicken', source: 'takeout', name: '炸鸡', description: '酥脆满足', icon: '/static/images/category/takeout/fried-chicken-icon.png', cover: 'images/category/takeout/fried-chicken-cover.jpg' },
  { id: 'japanese', source: 'takeout', name: '日料', description: '新鲜美味', icon: '/static/images/category/takeout/japanese-icon.png', cover: 'images/category/takeout/japanese-cover.jpg' },
]

export const statusSeeds: StatusOption[] = [
  { id: 'recover', name: '骨折恢复期', icon: '🦴' },
  { id: 'late', name: '熬夜', icon: '🌙' },
  { id: 'rainy', name: '下雨天', icon: '🌧️' },
  { id: 'lazy', name: '犯懒', icon: '😴' },
  { id: 'appetite', name: '没胃口', icon: '😟' },
  { id: 'cold', name: '感冒发烧', icon: '🤒' },
  { id: 'stress', name: '压力很大', icon: '😣' },
  { id: 'light', name: '清淡饮食', icon: '🥬' },
  { id: 'energy', name: '需要补能', icon: '⚡' },
  { id: 'normal', name: '状态不错', icon: '😊' },
]

export const recipeSeeds: SeedRecipe[] = [
  {
    id: 1001,
    name: '山药排骨汤',
    coverKey: 'images/recipes/yam-pork-rib-soup-card.jpg',
    heroKey: 'images/recipes/yam-pork-rib-soup-hero.jpg',
    thumbnailKey: 'images/recipes/yam-pork-rib-soup-thumb.jpg',
    categoryId: 'soup',
    category: '汤羹',
    tags: ['高钙', '低脂', '易消化'],
    statusIds: ['recover', 'appetite', 'rainy'],
    reason: '富含钙与胶原蛋白，温润清淡，适合恢复期补充营养。',
    cookTime: 40,
    calories: 320,
    popularity: 9386,
    servings: 2,
    difficulty: '简单',
    ingredients: [
      { name: '猪排骨', amount: '500g', icon: '🥩' },
      { name: '山药', amount: '300g', icon: '🥔' },
      { name: '红枣', amount: '5 颗', icon: '🔴' },
      { name: '姜片', amount: '3 片', icon: '🫚' },
      { name: '枸杞', amount: '1 小把', icon: '🫐' },
      { name: '盐', amount: '适量', icon: '🧂' },
      { name: '清水', amount: '适量', icon: '💧' },
    ],
    steps: [
      { text: '排骨切块，冷水下锅焯水，去除血沫，捞出沥干。', imageKey: 'images/category/cooking/home-style-cover.jpg' },
      { text: '山药去皮切块，红枣洗净，姜切片备用。', imageKey: 'images/plan/meals/tomato-beef-congee.jpg' },
      { text: '锅中加清水，放入排骨和姜片炖煮，加入山药调味。', imageKey: 'images/recipes/yam-pork-rib-soup-thumb.jpg' },
    ],
    sortOrder: 10,
  },
  {
    id: 1002,
    name: '番茄牛肉汤',
    coverKey: 'images/category/cooking/home-style-cover.jpg',
    heroKey: 'images/category/cooking/home-style-cover.jpg',
    thumbnailKey: 'images/category/cooking/home-style-cover.jpg',
    categoryId: 'home-style',
    category: '暖胃汤羹',
    tags: ['高蛋白', '易消化', '暖胃'],
    statusIds: ['recover', 'late', 'rainy'],
    reason: '番茄富含维生素 C，牛肉补充优质蛋白，暖胃又补能量。',
    cookTime: 35,
    calories: 280,
    popularity: 8724,
    servings: 2,
    difficulty: '简单',
    ingredients: [
      { name: '牛肉', amount: '300g', icon: '🥩' },
      { name: '番茄', amount: '2 个', icon: '🍅' },
      { name: '洋葱', amount: '半个', icon: '🧅' },
      { name: '姜片', amount: '3 片', icon: '🫚' },
      { name: '盐', amount: '适量', icon: '🧂' },
      { name: '食用油', amount: '适量', icon: '🫗' },
      { name: '清水', amount: '适量', icon: '💧' },
    ],
    steps: [
      { text: '牛肉切块，冷水下锅焯水，去除血沫后捞出。', imageKey: 'images/category/cooking/home-style-cover.jpg' },
      { text: '番茄切块，洋葱切丝，姜切片备用。', imageKey: 'images/plan/meals/tomato-beef-congee.jpg' },
      { text: '锅中热油炒香配料，加水炖煮至牛肉软烂。', imageKey: 'images/category/cooking/home-style-cover.jpg' },
    ],
    sortOrder: 20,
  },
  {
    id: 1003,
    name: '西兰花炒虾仁',
    coverKey: 'images/category/cooking/light-cover.jpg',
    heroKey: 'images/category/cooking/light-cover.jpg',
    thumbnailKey: 'images/category/cooking/light-cover.jpg',
    categoryId: 'light',
    category: '清淡快手菜',
    tags: ['清淡', '低脂', '高蛋白'],
    statusIds: ['late', 'lazy', 'appetite'],
    reason: '虾仁鲜嫩高蛋白，搭配西兰花清爽少油，营养均衡。',
    cookTime: 20,
    calories: 220,
    popularity: 8163,
    servings: 2,
    difficulty: '简单',
    ingredients: [
      { name: '鲜虾仁', amount: '250g', icon: '🦐' },
      { name: '西兰花', amount: '300g', icon: '🥦' },
      { name: '蒜瓣', amount: '2 瓣', icon: '🧄' },
      { name: '料酒', amount: '1 勺', icon: '🥄' },
      { name: '盐', amount: '适量', icon: '🧂' },
      { name: '食用油', amount: '适量', icon: '🫗' },
    ],
    steps: [
      { text: '虾仁洗净，用少量料酒和盐腌制十分钟。', imageKey: 'images/category/cooking/light-cover.jpg' },
      { text: '西兰花切小朵焯水，蒜瓣切末备用。', imageKey: 'images/category/cooking/light-cover.jpg' },
      { text: '热锅少油炒香蒜末，放入虾仁和西兰花翻炒。', imageKey: 'images/category/cooking/light-cover.jpg' },
    ],
    sortOrder: 30,
  },
  {
    id: 2001,
    name: '妈妈的红烧肉',
    coverKey: 'images/category/takeout/hot-pot-cover.jpg',
    heroKey: 'images/category/takeout/hot-pot-cover.jpg',
    thumbnailKey: 'images/category/takeout/hot-pot-cover.jpg',
    categoryId: 'home-style',
    category: '家常菜',
    tags: ['家常', '下饭', '经典'],
    statusIds: ['lazy'],
    reason: '软糯入味，经典下饭菜，是记忆中的家的味道。',
    cookTime: 60,
    calories: 520,
    popularity: 7651,
    servings: 2,
    difficulty: '适中',
    ingredients: [{ name: '五花肉', amount: '500g', icon: '🥩' }, { name: '冰糖', amount: '30g', icon: '🧊' }],
    steps: [{ text: '五花肉切块焯水，炒糖色后小火炖至软糯。', imageKey: 'images/category/takeout/hot-pot-cover.jpg' }],
    sortOrder: 40,
  },
  {
    id: 2002,
    name: '番茄牛肉汤',
    coverKey: 'images/category/cooking/home-style-cover.jpg',
    heroKey: 'images/category/cooking/home-style-cover.jpg',
    thumbnailKey: 'images/category/cooking/home-style-cover.jpg',
    categoryId: 'soup',
    category: '汤羹',
    tags: ['开胃', '暖胃'],
    statusIds: ['appetite', 'rainy'],
    reason: '酸甜开胃，汤鲜味美，营养又暖心。',
    cookTime: 40,
    calories: 280,
    popularity: 7028,
    servings: 2,
    difficulty: '简单',
    ingredients: [{ name: '牛肉', amount: '300g', icon: '🥩' }, { name: '番茄', amount: '2 个', icon: '🍅' }],
    steps: [{ text: '牛肉焯水后与番茄一同炖煮至软烂。', imageKey: 'images/category/cooking/home-style-cover.jpg' }],
    sortOrder: 50,
  },
  {
    id: 2003,
    name: '青椒炒牛肉',
    coverKey: 'images/category/cooking/quick-cover.jpg',
    heroKey: 'images/category/cooking/quick-cover.jpg',
    thumbnailKey: 'images/category/cooking/quick-cover.jpg',
    categoryId: 'quick',
    category: '快手菜',
    tags: ['快手', '高蛋白', '下饭'],
    statusIds: ['late', 'lazy'],
    reason: '牛肉鲜嫩、青椒爽脆，简单快手又适合日常搭配。',
    cookTime: 20,
    calories: 360,
    popularity: 6894,
    servings: 2,
    difficulty: '简单',
    ingredients: [{ name: '牛肉', amount: '250g', icon: '🥩' }, { name: '青椒', amount: '2 个', icon: '🫑' }],
    steps: [{ text: '牛肉腌制后大火滑炒，再加入青椒快速翻炒。', imageKey: 'images/category/cooking/quick-cover.jpg' }],
    sortOrder: 60,
  },
]
