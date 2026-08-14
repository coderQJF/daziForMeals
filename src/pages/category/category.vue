<script setup lang="ts">
import ComingPage from '@/components/ComingPage.vue'
import AppTabBar from '@/components/AppTabBar.vue'
import RecipeCard from '@/components/RecipeCard.vue'
import { cookCategories, todayRecipe } from '@/mocks/recipe'
import { useTabBarSelection } from '@/composables/useTabBarSelection'

useTabBarSelection(1)

function openCategory(id: string) {
  uni.navigateTo({ url: `/pages/recipe/list?category=${id}` })
}
</script>

<template>
  <ComingPage title="分类" subtitle="快速找到适合你的美食与外卖" icon="⌕">
    <view class="search surface-card">⌕　搜索菜名、口味或场景</view>

    <view class="section surface-card">
      <view class="section__title">做饭分类</view>
      <scroll-view scroll-x class="category-scroll" :show-scrollbar="false">
        <view class="category-list">
          <button
            v-for="item in cookCategories"
            :key="item.id"
            class="category"
            @click="openCategory(item.id)"
          >
            <text class="category__emoji">{{ item.icon }}</text>
            <text class="category__name">{{ item.name }}</text>
            <text class="category__desc">{{ item.description }}</text>
          </button>
        </view>
      </scroll-view>
    </view>

    <view class="status-section surface-card">
      <view class="section__title">按状态找吃的</view>
      <view class="chips">
        <text class="chip chip--active">🦴 骨折恢复期</text>
        <text class="chip">🌙 熬夜</text>
        <text class="chip">🌧️ 没胃口</text>
        <text class="chip">😴 犯懒</text>
      </view>
    </view>

    <view class="recommend-heading">
      <text class="section-title">为你推荐</text>
      <text class="muted">换一换 ↻</text>
    </view>
    <RecipeCard :recipe="todayRecipe" badge="恢复期推荐" />
    <!-- #ifndef MP-WEIXIN -->
    <AppTabBar :selected="1" />
    <!-- #endif -->
  </ComingPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.search {
  height: 88rpx;
  margin-top: 32rpx;
  padding: 0 28rpx;
  color: $color-text-muted;
  font-size: 25rpx;
  line-height: 88rpx;
}

.section,
.status-section {
  margin-top: 24rpx;
  padding: 26rpx 22rpx;
}

.section__title {
  font-size: 29rpx;
  font-weight: 700;
}

.category-scroll {
  width: 100%;
  margin-top: 22rpx;
  white-space: nowrap;
}

.category-list {
  display: inline-flex;
  gap: 14rpx;
}

.category {
  display: inline-flex;
  width: 150rpx;
  height: 190rpx;
  padding: 14rpx 10rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background: #fff8ef;
}

.category__emoji {
  font-size: 56rpx;
}

.category__name {
  margin-top: 13rpx;
  font-size: 25rpx;
  font-weight: 700;
}

.category__desc {
  margin-top: 5rpx;
  color: $color-text-secondary;
  font-size: 19rpx;
}

.chips {
  display: flex;
  margin-top: 18rpx;
  flex-wrap: wrap;
  gap: 12rpx;
}

.chip {
  padding: 12rpx 20rpx;
  border-radius: 24rpx;
  background: #f8f5f2;
  color: $color-text-secondary;
  font-size: 22rpx;

  &--active {
    background: $color-success-soft;
    color: #5e854e;
  }
}

.recommend-heading {
  display: flex;
  margin: 34rpx 2rpx 18rpx;
  justify-content: space-between;
}

.muted {
  color: $color-text-secondary;
  font-size: 23rpx;
}
</style>
