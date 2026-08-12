<script setup lang="ts">
import RecipeCard from '@/components/RecipeCard.vue'
import { todayRecipe } from '@/mocks/recipe'

function openRecipe() {
  uni.navigateTo({ url: `/pages/recipe/detail?id=${todayRecipe.id}` })
}
</script>

<template>
  <view class="list-page">
    <view class="filter-row">
      <text class="filter active">恢复期</text>
      <text class="filter">快手</text>
      <text class="filter">清淡</text>
      <text class="filter">暖胃</text>
    </view>
    <RecipeCard
      :recipe="todayRecipe"
      badge="今日推荐"
      @open="openRecipe"
    />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.list-page {
  min-height: 100vh;
  padding: 28rpx 32rpx 48rpx;
  background: $color-page;
}

.filter-row {
  display: flex;
  margin-bottom: 24rpx;
  gap: 14rpx;
}

.filter {
  padding: 12rpx 24rpx;
  color: $color-text-secondary;
  border-radius: 28rpx;
  background: white;
  font-size: 23rpx;

  &.active {
    color: white;
    background: $color-primary;
  }
}
</style>
