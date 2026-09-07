<script setup lang="ts">
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { assetUrl } from '@/config/assets'
import { recipeCatalog } from '@/mocks/recipe'
import { useRecipeStore } from '@/stores/recipe'

const store = useRecipeStore()
const { recommendation } = storeToRefs(store)

interface RecipeDetailPreset {
  ingredients: Array<{ name: string; amount: string; icon: string }>
  steps: Array<{ text: string; image: string }>
}

const detailPresets: Record<number, RecipeDetailPreset> = {
  1001: {
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
      { text: '排骨切块，冷水下锅焯水，去除血沫，捞出沥干。', image: assetUrl('images/category/cooking/home-style-cover.jpg') },
      { text: '山药去皮切块，红枣洗净，姜切片备用。', image: assetUrl('images/plan/meals/tomato-beef-congee.jpg') },
      { text: '锅中加清水，放入排骨和姜片炖煮，加入山药调味。', image: assetUrl('images/recipes/yam-pork-rib-soup-thumb.jpg') },
    ],
  },
  1002: {
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
      { text: '牛肉切块，冷水下锅焯水，去除血沫后捞出。', image: assetUrl('images/category/cooking/home-style-cover.jpg') },
      { text: '番茄切块，洋葱切丝，姜切片备用。', image: assetUrl('images/plan/meals/tomato-beef-congee.jpg') },
      { text: '锅中热油炒香配料，加水炖煮至牛肉软烂。', image: assetUrl('images/category/cooking/home-style-cover.jpg') },
    ],
  },
  1003: {
    ingredients: [
      { name: '鲜虾仁', amount: '250g', icon: '🦐' },
      { name: '西兰花', amount: '300g', icon: '🥦' },
      { name: '蒜瓣', amount: '2 瓣', icon: '🧄' },
      { name: '料酒', amount: '1 勺', icon: '🥄' },
      { name: '盐', amount: '适量', icon: '🧂' },
      { name: '食用油', amount: '适量', icon: '🫗' },
      { name: '清水', amount: '适量', icon: '💧' },
    ],
    steps: [
      { text: '虾仁洗净，用少量料酒和盐腌制十分钟。', image: assetUrl('images/category/cooking/light-cover.jpg') },
      { text: '西兰花切小朵焯水，蒜瓣切末备用。', image: assetUrl('images/category/cooking/light-cover.jpg') },
      { text: '热锅少油炒香蒜末，放入虾仁和西兰花翻炒。', image: assetUrl('images/category/cooking/light-cover.jpg') },
    ],
  },
}

const activeDetail = computed(() => detailPresets[recommendation.value.id] ?? detailPresets[1001])
const ingredients = computed(() => activeDetail.value.ingredients)
const steps = computed(() => activeDetail.value.steps)

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }
  uni.redirectTo({ url: '/pages/recipe/list' })
}

function addPlan() {
  store.addToPlan(recommendation.value.id)
  uni.showToast({ title: '已加入今天的计划', icon: 'success' })
}

onLoad((query) => {
  const recipeId = Number(query?.id)
  const recipe = recipeCatalog.find(item => item.id === recipeId)
  if (recipe && recommendation.value.id !== recipe.id) store.selectRecommendation(recipe)
})

onShareAppMessage(() => ({
  title: `${recommendation.value.name}｜饭搭子`,
  path: `/pages/recipe/detail?id=${recommendation.value.id}`,
}))
</script>

<template>
  <view class="detail-page">
    <view class="hero-panel">
      <image class="hero-panel__image" :src="recommendation.hero" mode="aspectFill" />
      <view class="hero-panel__shade" />

      <view class="hero-nav">
        <button class="hero-nav__button" aria-label="返回" @click="goBack">
          <image src="/static/images/plan-detail/back.png" mode="aspectFit" />
        </button>
        <view class="hero-nav__actions">
          <button class="hero-nav__button hero-nav__button--favorite" aria-label="收藏" @click="store.toggleFavorite">
            <image
              :src="recommendation.isFavorite
                ? '/static/images/recipe-detail/favorite-filled-orange.png'
                : '/static/images/recipe-detail/favorite-outline-white.png'"
              mode="aspectFit"
            />
          </button>
          <button class="hero-nav__button" aria-label="分享" open-type="share">
            <image src="/static/images/plan-detail/share.png" mode="aspectFit" />
          </button>
        </view>
      </view>
    </view>

    <view class="detail-content">
      <view class="recipe-heading">
        <text class="recipe-heading__name">{{ recommendation.name }}</text>
        <text class="recipe-heading__badge">骨骼恢复推荐</text>
      </view>

      <view class="recipe-meta">
        <view class="recipe-meta__item"><view class="meta-icon meta-icon--clock" />{{ recommendation.cookTime }} 分钟</view>
        <view class="recipe-meta__item"><view class="meta-icon meta-icon--person" />{{ recommendation.servings }} 人份</view>
        <view class="recipe-meta__item"><text class="meta-flame">♨</text>约 {{ recommendation.calories }} kcal</view>
      </view>

      <text class="recipe-description">{{ recommendation.reason }}富含优质蛋白和钙，有助于增强体力，促进骨骼恢复。</text>

      <view class="section-heading">
        <text class="section-heading__title">食材清单</text>
        <text class="section-heading__count">共 {{ ingredients.length }} 种食材</text>
      </view>

      <view class="ingredient-list">
        <view v-for="item in ingredients" :key="item.name" class="ingredient-row">
          <view class="ingredient-row__name">
            <view class="ingredient-row__icon">{{ item.icon }}</view>
            <text>{{ item.name }}</text>
          </view>
          <text class="ingredient-row__amount">{{ item.amount }}</text>
        </view>
      </view>

      <view class="section-heading section-heading--steps">
        <text class="section-heading__title">步骤</text>
      </view>

      <view class="step-list">
        <view v-for="(step, index) in steps" :key="step.text" class="step-card">
          <view class="step-card__number">{{ index + 1 }}</view>
          <image class="step-card__image" :src="step.image" mode="aspectFill" />
          <text class="step-card__text">{{ step.text }}</text>
        </view>
      </view>
    </view>

    <view class="bottom-actions">
      <button class="bottom-button bottom-button--favorite" @click="store.toggleFavorite">
        <image :src="recommendation.isFavorite ? '/static/tabbar/favorite-active.png' : '/static/tabbar/favorite.png'" mode="aspectFit" />
        <text>{{ recommendation.isFavorite ? '已收藏' : '收藏' }}</text>
      </button>
      <button class="bottom-button bottom-button--plan" @click="addPlan">
        <view class="bottom-button__calendar" />
        <text>加入计划</text>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  min-height: 100vh;
  overflow-x: hidden;
  padding-bottom: calc(132rpx + env(safe-area-inset-bottom));
  background: #fdf9f4;
  box-sizing: border-box;
}

.hero-panel {
  position: relative;
  width: 100%;
  height: 520rpx;
  overflow: hidden;
  background: #eee3d9;
}

.hero-panel__image,
.hero-panel__shade {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.hero-panel__shade {
  background: linear-gradient(180deg, rgba(54, 34, 20, 0.06) 0%, transparent 30%, rgba(52, 30, 15, 0.04) 100%);
  pointer-events: none;
}

.hero-nav {
  position: absolute;
  z-index: 2;
  top: calc(var(--status-bar-height) + 66rpx);
  right: 24rpx;
  left: 24rpx;
  display: flex;
  height: 72rpx;
  align-items: center;
  justify-content: space-between;
}

.hero-nav__actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.hero-nav__button {
  display: flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 250, 244, 0.86);
  box-shadow: 0 6rpx 18rpx rgba(52, 31, 17, 0.1);
  backdrop-filter: blur(8rpx);
}

.hero-nav__button image {
  width: 49rpx;
  height: 49rpx;
}

.hero-nav__button--favorite {
  background: rgba(48, 31, 20, 0.2);
}

.detail-content {
  position: relative;
  z-index: 3;
  margin-top: -34rpx;
  padding: 27rpx 30rpx 34rpx;
  border-radius: 35rpx 35rpx 0 0;
  background: #fdf9f4;
}

.recipe-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 14rpx;
}

.recipe-heading__name {
  color: #2c2019;
  font-size: 40rpx;
  font-weight: 800;
  line-height: 1.2;
}

.recipe-heading__badge {
  padding: 5rpx 12rpx;
  color: #ef7b2e;
  border: 1rpx solid #ffd8bd;
  border-radius: 16rpx;
  background: #fff1e7;
  font-size: 24rpx;
  white-space: nowrap;
}

.recipe-meta {
  display: flex;
  margin-top: 14rpx;
  align-items: center;
  color: #807a75;
  font-size: 24rpx;
  gap: 24rpx;
}

.recipe-meta__item {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.meta-icon {
  position: relative;
  display: block;
  width: 24rpx;
  height: 24rpx;
  margin-right: 7rpx;
  flex: 0 0 24rpx;
}

.meta-icon--clock {
  border: 2rpx solid #8f9294;
  border-radius: 50%;
}

.meta-icon--clock::before,
.meta-icon--clock::after {
  position: absolute;
  top: 10rpx;
  left: 10rpx;
  width: 7rpx;
  height: 2rpx;
  transform-origin: left center;
  border-radius: 2rpx;
  background: #8f9294;
  content: '';
}

.meta-icon--clock::before { transform: rotate(-90deg); }
.meta-icon--clock::after { transform: rotate(30deg); }

.meta-icon--person::before {
  position: absolute;
  top: 1rpx;
  left: 7rpx;
  width: 9rpx;
  height: 9rpx;
  border: 2rpx solid #8f9294;
  border-radius: 50%;
  content: '';
}

.meta-icon--person::after {
  position: absolute;
  right: 2rpx;
  bottom: 0;
  left: 2rpx;
  height: 10rpx;
  border: 2rpx solid #8f9294;
  border-radius: 12rpx 12rpx 3rpx 3rpx;
  content: '';
}

.meta-flame {
  margin-right: 6rpx;
  color: #97918c;
  font-size: 25rpx;
}

.recipe-description {
  display: block;
  margin-top: 16rpx;
  color: #655f5a;
  font-size: 24rpx;
  line-height: 1.55;
}

.section-heading {
  display: flex;
  height: 69rpx;
  margin-top: 12rpx;
  align-items: center;
  justify-content: space-between;
}

.section-heading--steps {
  height: 58rpx;
  margin-top: 11rpx;
}

.section-heading__title {
  color: #2e241e;
  font-size: 29rpx;
  font-weight: 800;
}

.section-heading__count {
  padding: 6rpx 14rpx;
  color: #8b8580;
  border: 1rpx solid #e9e3de;
  border-radius: 18rpx;
  background: #fff;
  font-size: 24rpx;
}

.ingredient-list {
  overflow: hidden;
  border-top: 1rpx solid #eee9e5;
}

.ingredient-row {
  display: flex;
  height: 51rpx;
  padding: 0 3rpx;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid #eee9e5;
  color: #514943;
  font-size: 24rpx;
}

.ingredient-row__name {
  display: flex;
  align-items: center;
}

.ingredient-row__icon {
  display: flex;
  width: 42rpx;
  height: 42rpx;
  margin-right: 15rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff;
  font-size: 25rpx;
  box-shadow: 0 3rpx 10rpx rgba(88, 59, 39, 0.05);
}

.ingredient-row__amount {
  color: #4b4540;
  font-weight: 550;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.step-card {
  display: grid;
  min-height: 88rpx;
  padding: 8rpx 15rpx 8rpx 8rpx;
  align-items: center;
  grid-template-columns: 38rpx 142rpx minmax(0, 1fr);
  border: 1rpx solid rgba(105, 73, 49, 0.035);
  border-radius: 23rpx;
  background: #fff;
  box-shadow: 0 7rpx 22rpx rgba(96, 63, 37, 0.045);
}

.step-card__number {
  display: flex;
  width: 32rpx;
  height: 32rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffa32a, #ff6c09);
  color: #fff;
  font-size: 24rpx;
  font-weight: 800;
}

.step-card__image {
  width: 132rpx;
  height: 72rpx;
  border-radius: 17rpx;
  background: #f0e8e1;
}

.step-card__text {
  color: #514a44;
  font-size: 24rpx;
  line-height: 1.42;
}

.bottom-actions {
  position: fixed;
  z-index: 999;
  right: 22rpx;
  bottom: calc(env(safe-area-inset-bottom) + 10rpx);
  left: 22rpx;
  display: grid;
  min-height: 101rpx;
  padding: 9rpx;
  grid-template-columns: 1fr 1.35fr;
  gap: 15rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 -8rpx 30rpx rgba(68, 43, 25, 0.08);
}

.bottom-button {
  display: flex;
  height: 83rpx;
  align-items: center;
  justify-content: center;
  border-radius: 25rpx;
  font-size: 27rpx;
  font-weight: 700;
}

.bottom-button image {
  width: 43rpx;
  height: 43rpx;
  margin-right: 10rpx;
}

.bottom-button--favorite {
  color: #5d5854;
  border: 2rpx solid #f28a38;
  background: #fff;
}

.bottom-button--plan {
  color: #fff;
  background: linear-gradient(135deg, #ffa52b, #ff6900);
  box-shadow: 0 9rpx 22rpx rgba(255, 108, 7, 0.2);
}

.bottom-button__calendar {
  position: relative;
  width: 38rpx;
  height: 36rpx;
  margin-right: 11rpx;
  border: 3rpx solid #fff;
  border-radius: 8rpx;
}

.bottom-button__calendar::before {
  position: absolute;
  top: 8rpx;
  right: 0;
  left: 0;
  height: 3rpx;
  background: #fff;
  content: '';
}

.bottom-button__calendar::after {
  position: absolute;
  top: -7rpx;
  left: 7rpx;
  width: 18rpx;
  height: 8rpx;
  border-right: 3rpx solid #fff;
  border-left: 3rpx solid #fff;
  content: '';
}

@media (min-width: 500px) {
  .detail-page {
    max-width: 750rpx;
    margin: 0 auto;
  }

  .bottom-actions {
    width: 706rpx;
    right: auto;
    left: 50%;
    transform: translateX(-50%);
  }
}
</style>
