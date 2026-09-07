<script setup lang="ts">
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import AppTabBar from '@/components/AppTabBar.vue'
import { cookingRecommendations } from '@/mocks/recipe'
import { useRecipeStore } from '@/stores/recipe'
import type { Recipe } from '@/types/recipe'

const filters = [
  { id: 'recover', label: '恢复期', icon: '/static/images/recommendation/filter-leaf.png' },
  { id: 'quick', label: '快手', icon: '/static/images/recommendation/filter-quick.png' },
  { id: 'light', label: '清淡', icon: '/static/images/recommendation/filter-leaf.png' },
  { id: 'warm', label: '暖胃', icon: '/static/images/recommendation/filter-warm.png' },
]

const recipeStore = useRecipeStore()
const selectedFilter = ref('recover')
const recommendationIndex = ref(0)
const liked = ref(false)

const mainRecipe = computed(() => cookingRecommendations[recommendationIndex.value % cookingRecommendations.length])
const secondaryRecipes = computed(() => [
  cookingRecommendations[(recommendationIndex.value + 1) % cookingRecommendations.length],
  cookingRecommendations[(recommendationIndex.value + 2) % cookingRecommendations.length],
])

function isFavorite(recipe: Recipe) {
  return recipeStore.isFavorite(recipe.id)
}

function toggleFavorite(recipe: Recipe) {
  recipeStore.toggleFavorite(recipe.id)
  uni.showToast({ title: isFavorite(recipe) ? '已加入收藏' : '已取消收藏', icon: 'none' })
}

function openRecipe(recipe: Recipe) {
  recipeStore.selectRecommendation({ ...recipe, isFavorite: isFavorite(recipe) })
  uni.navigateTo({ url: `/pages/recipe/detail?id=${recipe.id}` })
}

function refreshRecommendation() {
  recommendationIndex.value = (recommendationIndex.value + 1) % cookingRecommendations.length
  liked.value = false
  uni.showToast({ title: '已换一组推荐', icon: 'none' })
}

function likeRecommendation() {
  liked.value = !liked.value
  uni.showToast({ title: liked.value ? '已记录你的喜好' : '已取消喜欢', icon: 'none' })
}

onPullDownRefresh(() => {
  refreshRecommendation()
  setTimeout(() => uni.stopPullDownRefresh(), 300)
})
</script>

<template>
  <view class="recommend-page">
    <view class="recommend-page__glow" />

    <text class="page-title">适合今天的菜</text>

    <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
      <view class="filter-list">
        <button
          v-for="item in filters"
          :key="item.id"
          class="filter-chip"
          :class="{ 'filter-chip--active': selectedFilter === item.id }"
          @click="selectedFilter = item.id"
        >
          <image :src="item.icon" mode="aspectFit" />
          <text>{{ item.label }}</text>
        </button>
      </view>
    </scroll-view>

    <view class="main-card" @click="openRecipe(mainRecipe)">
      <view class="main-card__visual">
        <image class="main-card__image" :src="mainRecipe.hero" mode="aspectFill" />
        <image class="main-card__badge" src="/static/images/recommendation/badge-today.png" mode="aspectFit" />
        <button class="favorite-button favorite-button--main" aria-label="收藏菜谱" @click.stop="toggleFavorite(mainRecipe)">
          <image
            :src="isFavorite(mainRecipe)
              ? '/static/images/recommendation/action-like.png'
              : '/static/images/recommendation/favorite-outline.png'"
            mode="aspectFit"
          />
        </button>
      </view>

      <view class="main-card__body">
        <view class="main-card__title-row">
          <text class="main-card__name">{{ mainRecipe.name }}</text>
          <text class="main-card__recommend-tag">暖胃推荐</text>
        </view>
        <text class="main-card__reason"><text>推荐理由：</text>{{ mainRecipe.reason }}</text>
        <view class="tag-list">
          <text v-for="tag in mainRecipe.tags" :key="tag" class="recipe-tag">{{ tag }}</text>
        </view>
        <view class="main-card__meta">
          <view class="meta-item"><view class="meta-icon meta-icon--clock" />{{ mainRecipe.cookTime }} 分钟</view>
          <view class="meta-item"><view class="meta-icon meta-icon--person" />{{ mainRecipe.servings }} 人份</view>
        </view>
      </view>
    </view>

    <view class="secondary-grid">
      <view v-for="recipe in secondaryRecipes" :key="recipe.id" class="secondary-card" @click="openRecipe(recipe)">
        <view class="secondary-card__visual">
          <image class="secondary-card__image" :src="recipe.cover" mode="aspectFill" />
          <button class="favorite-button" aria-label="收藏菜谱" @click.stop="toggleFavorite(recipe)">
            <image
              :src="isFavorite(recipe)
                ? '/static/images/recommendation/action-like.png'
                : '/static/images/recommendation/favorite-outline.png'"
              mode="aspectFit"
            />
          </button>
        </view>
        <view class="secondary-card__body">
          <view class="secondary-card__title-row">
            <text class="secondary-card__name">{{ recipe.name }}</text>
            <text class="secondary-card__tag">{{ recipe.tags[0] }}</text>
          </view>
          <view class="secondary-card__meta">
            <view class="meta-item"><view class="meta-icon meta-icon--clock" />{{ recipe.cookTime }} 分钟</view>
            <view class="meta-item"><view class="meta-icon meta-icon--person" />{{ recipe.servings }} 人份</view>
          </view>
        </view>
      </view>
    </view>

    <view class="action-grid">
      <button class="action-button" @click="openRecipe(mainRecipe)">
        <image src="/static/images/recommendation/action-recipe.png" mode="aspectFit" />
        <text>查看做法</text>
      </button>
      <button class="action-button" :class="{ 'action-button--liked': liked }" @click="likeRecommendation">
        <image src="/static/images/recommendation/action-like.png" mode="aspectFit" />
        <text>{{ liked ? '已喜欢' : '喜欢' }}</text>
      </button>
      <button class="action-button" @click="refreshRecommendation">
        <image src="/static/images/recommendation/action-refresh.png" mode="aspectFit" />
        <text>换一个</text>
      </button>
    </view>

    <AppTabBar :selected="0" />
  </view>
</template>

<style scoped lang="scss">
.recommend-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  padding: calc(var(--status-bar-height) + 28rpx) 30rpx calc(env(safe-area-inset-bottom) + 172rpx);
  background: #fdf9f4;
  box-sizing: border-box;
}

.recommend-page__glow {
  position: absolute;
  top: -130rpx;
  right: -110rpx;
  width: 460rpx;
  height: 390rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 229, 198, 0.6), rgba(255, 247, 237, 0.12) 63%, transparent 74%);
  pointer-events: none;
}

.page-title,
.filter-scroll,
.main-card,
.secondary-grid,
.action-grid {
  position: relative;
  z-index: 1;
}

.page-title {
  display: block;
  color: #352319;
  font-size: 43rpx;
  font-weight: 800;
  line-height: 1.2;
}

.filter-scroll {
  width: 100%;
  margin-top: 24rpx;
  white-space: nowrap;
}

.filter-list {
  display: inline-flex;
  padding: 2rpx 0 4rpx;
  gap: 13rpx;
}

.filter-chip {
  display: inline-flex;
  height: 61rpx;
  padding: 0 21rpx;
  align-items: center;
  color: #5e5a56;
  border: 1rpx solid rgba(105, 73, 49, 0.04);
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 6rpx 18rpx rgba(84, 53, 31, 0.035);
  font-size: 24rpx;
  white-space: nowrap;
}

.filter-chip image {
  width: 36rpx;
  height: 36rpx;
  margin-right: 9rpx;
}

.filter-chip--active {
  color: #5b814a;
  border: 2rpx solid #83bb6c;
  background: #f6fbf0;
  font-weight: 700;
}

.main-card {
  margin-top: 20rpx;
  overflow: hidden;
  border: 1rpx solid rgba(99, 66, 41, 0.035);
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 10rpx 30rpx rgba(85, 53, 30, 0.055);
}

.main-card__visual {
  position: relative;
  width: 100%;
  height: 364rpx;
  overflow: hidden;
}

.main-card__image {
  width: 100%;
  height: 100%;
}

.main-card__badge {
  position: absolute;
  top: 20rpx;
  left: 21rpx;
  width: 139rpx;
  height: 54rpx;
}

.favorite-button {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  display: flex;
  width: 63rpx;
  height: 63rpx;
  align-items: center;
  justify-content: center;
}

.favorite-button image {
  width: 55rpx;
  height: 55rpx;
}

.favorite-button--main {
  top: 17rpx;
  right: 17rpx;
  width: 70rpx;
  height: 70rpx;
}

.favorite-button--main image {
  width: 62rpx;
  height: 62rpx;
}

.main-card__body {
  padding: 21rpx 25rpx 23rpx;
}

.main-card__title-row,
.secondary-card__title-row {
  display: flex;
  min-width: 0;
  align-items: center;
}

.main-card__name {
  color: #2b211b;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.25;
}

.main-card__recommend-tag,
.secondary-card__tag {
  margin-left: 12rpx;
  padding: 5rpx 10rpx;
  color: #ef7d31;
  border-radius: 13rpx;
  background: #fff0e6;
  font-size: 24rpx;
  white-space: nowrap;
}

.main-card__reason {
  display: block;
  margin-top: 12rpx;
  color: #655f5a;
  font-size: 24rpx;
  line-height: 1.52;
}

.main-card__reason text {
  color: #413a35;
  font-weight: 700;
}

.tag-list {
  display: flex;
  margin-top: 13rpx;
  gap: 9rpx;
}

.recipe-tag {
  padding: 5rpx 11rpx;
  color: #f07a24;
  border-radius: 13rpx;
  background: #fff2e8;
  font-size: 24rpx;
}

.main-card__meta,
.secondary-card__meta {
  display: flex;
  margin-top: 15rpx;
  align-items: center;
  color: #898580;
  font-size: 24rpx;
  gap: 23rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.meta-icon {
  position: relative;
  width: 23rpx;
  height: 23rpx;
  margin-right: 7rpx;
  flex: 0 0 23rpx;
}

.meta-icon--clock {
  border: 2rpx solid #97999b;
  border-radius: 50%;
}

.meta-icon--clock::before,
.meta-icon--clock::after {
  position: absolute;
  top: 9rpx;
  left: 9rpx;
  width: 7rpx;
  height: 2rpx;
  transform-origin: left center;
  border-radius: 2rpx;
  background: #97999b;
  content: '';
}

.meta-icon--clock::before { transform: rotate(-90deg); }
.meta-icon--clock::after { transform: rotate(28deg); }

.meta-icon--person::before {
  position: absolute;
  top: 1rpx;
  left: 7rpx;
  width: 8rpx;
  height: 8rpx;
  border: 2rpx solid #97999b;
  border-radius: 50%;
  content: '';
}

.meta-icon--person::after {
  position: absolute;
  right: 2rpx;
  bottom: 0;
  left: 2rpx;
  height: 9rpx;
  border: 2rpx solid #97999b;
  border-radius: 10rpx 10rpx 3rpx 3rpx;
  content: '';
}

.secondary-grid {
  display: grid;
  margin-top: 25rpx;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.secondary-card {
  min-width: 0;
  overflow: hidden;
  border: 1rpx solid rgba(99, 66, 41, 0.035);
  border-radius: 24rpx;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(85, 53, 30, 0.045);
}

.secondary-card__visual {
  position: relative;
  width: 100%;
  height: 207rpx;
  overflow: hidden;
}

.secondary-card__image {
  width: 100%;
  height: 100%;
}

.secondary-card__body {
  padding: 15rpx 15rpx 17rpx;
}

.secondary-card__name {
  min-width: 0;
  overflow: hidden;
  color: #322720;
  flex: 1;
  font-size: 27rpx;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.secondary-card__tag {
  margin-left: 7rpx;
  padding: 4rpx 7rpx;
  color: #5d9852;
  background: #eff8e9;
  font-size: 24rpx;
}

.secondary-card__meta {
  margin-top: 13rpx;
  justify-content: space-between;
  font-size: 24rpx;
  gap: 6rpx;
}

.action-grid {
  display: grid;
  margin-top: 23rpx;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 15rpx;
}

.action-button {
  display: flex;
  height: 105rpx;
  min-width: 0;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(99, 66, 41, 0.035);
  border-radius: 27rpx;
  background: #fff;
  box-shadow: 0 8rpx 23rpx rgba(85, 53, 30, 0.045);
  color: #4d4641;
  font-size: 24rpx;
  font-weight: 650;
}

.action-button image {
  width: 48rpx;
  height: 48rpx;
  margin-right: 10rpx;
}

.action-button--liked {
  color: #f16f20;
  background: #fff8f2;
}

@media (min-width: 500px) {
  .recommend-page {
    max-width: 750rpx;
    margin: 0 auto;
  }
}
</style>
