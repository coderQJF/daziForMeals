<script setup lang="ts">
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import AppHeader from '@/components/AppHeader.vue'
import QuickActionGrid from '@/components/QuickActionGrid.vue'
import RecipeCard from '@/components/RecipeCard.vue'
import SearchBar from '@/components/SearchBar.vue'
import StatusSelector from '@/components/StatusSelector.vue'
import { quickCategories, statusOptions } from '@/mocks/recipe'
import { useRecipeStore } from '@/stores/recipe'
import type { CategoryItem } from '@/types/recipe'

const recipeStore = useRecipeStore()
const { recommendation, selectedStatus, statusLabel } = storeToRefs(recipeStore)

function handleQuickAction(item: CategoryItem) {
  if (item.id === 'takeout') {
    uni.navigateTo({ url: '/pages/takeout/takeout' })
    return
  }

  if (item.id === 'recover') recipeStore.selectStatus('recover')
  uni.navigateTo({ url: `/pages/recipe/list?type=${item.id}` })
}

function openRecipe() {
  uni.navigateTo({ url: `/pages/recipe/detail?id=${recommendation.value.id}` })
}

function openMore() {
  uni.navigateTo({ url: '/pages/recipe/list' })
}

onPullDownRefresh(() => {
  recipeStore.refreshRecommendation()
  setTimeout(() => uni.stopPullDownRefresh(), 350)
})
</script>

<template>
  <view class="home page-shell">
    <AppHeader title="饭搭子" subtitle="早上好，今天也要好好吃饭呀 ☀️" />
    <SearchBar />
    <QuickActionGrid :items="quickCategories" @select="handleQuickAction" />

    <button class="blind-box surface-card" @click="recipeStore.refreshRecommendation">
      <view class="blind-box__icon">◇</view>
      <view class="blind-box__copy">
        <text class="blind-box__title">随机盲盒</text>
        <text class="blind-box__subtitle">不知道吃什么？点我试试吧</text>
      </view>
      <view class="blind-box__go">GO</view>
    </button>

    <StatusSelector
      :model-value="selectedStatus"
      :options="statusOptions"
      @update:model-value="recipeStore.selectStatus"
    />

    <view class="recommend-title">
      <text class="section-title">为你推荐</text>
      <button class="more" @click="openMore">查看更多 ›</button>
    </view>

    <RecipeCard
      :recipe="recommendation"
      :badge="`${statusLabel}推荐`"
      @open="openRecipe"
      @favorite="recipeStore.toggleFavorite"
    />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.home {
  padding-bottom: 48rpx;
}

.blind-box {
  display: flex;
  width: 100%;
  min-height: 116rpx;
  margin-top: 24rpx;
  padding: 20rpx 18rpx 20rpx 22rpx;
  align-items: center;
  background: linear-gradient(100deg, #fffdf9 0%, #fff8ee 100%);
  text-align: left;
}

.blind-box__icon {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
  color: white;
  border-radius: 18rpx;
  background: linear-gradient(145deg, #ffb13f, $color-primary);
  font-size: 42rpx;
}

.blind-box__copy {
  display: flex;
  min-width: 0;
  margin-left: 20rpx;
  flex: 1;
  flex-direction: column;
}

.blind-box__title {
  font-size: 28rpx;
  font-weight: 700;
}

.blind-box__subtitle {
  margin-top: 6rpx;
  color: $color-text-secondary;
  font-size: 22rpx;
}

.blind-box__go {
  display: flex;
  width: 70rpx;
  height: 70rpx;
  align-items: center;
  justify-content: center;
  color: white;
  border-radius: 50%;
  background: linear-gradient(145deg, #ff9b28, #f06800);
  box-shadow: 0 8rpx 18rpx rgba(240, 104, 0, 0.2);
  font-size: 24rpx;
  font-weight: 700;
}

.recommend-title {
  display: flex;
  margin: 34rpx 2rpx 18rpx;
  align-items: center;
  justify-content: space-between;
}

.more {
  color: $color-text-secondary;
  font-size: 24rpx;
}
</style>
