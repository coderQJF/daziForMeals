<script setup lang="ts">
import { ref } from 'vue'
import ComingPage from '@/components/ComingPage.vue'
import AppTabBar from '@/components/AppTabBar.vue'
import RecipeCard from '@/components/RecipeCard.vue'
import { todayRecipe } from '@/mocks/recipe'
import { useTabBarSelection } from '@/composables/useTabBarSelection'

const active = ref<'favorite' | 'cooked'>('favorite')
useTabBarSelection(3)
</script>

<template>
  <ComingPage title="我的厨房" subtitle="喜欢的味道，都收在这里" icon="♥" accent="#fff0eb">
    <view class="tabs">
      <button :class="{ active: active === 'favorite' }" @click="active = 'favorite'">收藏</button>
      <button :class="{ active: active === 'cooked' }" @click="active = 'cooked'">我做过</button>
    </view>

    <view class="count">{{ active === 'favorite' ? '已收藏 3 道菜' : '已完成 1 道菜' }}</view>
    <view class="recipe-list">
      <RecipeCard :recipe="{ ...todayRecipe, isFavorite: true }" />
    </view>

    <button class="add-recipe surface-card">＋　录入我的菜</button>
    <view class="tip surface-card">💡　收藏常做的菜，计划时一键添加，搭配更省心！</view>
    <!-- #ifndef MP-WEIXIN -->
    <AppTabBar :selected="3" />
    <!-- #endif -->
  </ComingPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.tabs {
  display: flex;
  margin-top: 34rpx;
  gap: 44rpx;
  border-bottom: 1rpx solid $color-line;

  button {
    position: relative;
    padding: 0 8rpx 18rpx;
    color: $color-text-secondary;
    font-size: 27rpx;
  }

  .active {
    color: $color-primary;
    font-weight: 700;

    &::after {
      position: absolute;
      right: 8rpx;
      bottom: 0;
      left: 8rpx;
      height: 5rpx;
      border-radius: 3rpx;
      background: $color-primary;
      content: '';
    }
  }
}

.count {
  margin: 26rpx 4rpx 16rpx;
  color: $color-text-secondary;
  font-size: 23rpx;
}

.add-recipe {
  width: 100%;
  height: 94rpx;
  margin-top: 22rpx;
  color: $color-primary;
  border: 2rpx dashed $color-primary;
  font-size: 27rpx;
}

.tip {
  margin-top: 22rpx;
  padding: 24rpx;
  color: $color-text-secondary;
  background: #fff8e8;
  font-size: 22rpx;
}
</style>
