<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRecipeStore } from '@/stores/recipe'

const store = useRecipeStore()
const { recommendation } = storeToRefs(store)

function addPlan() {
  uni.showToast({ title: '已加入今天的计划', icon: 'success' })
}
</script>

<template>
  <view class="detail">
    <image class="hero" :src="recommendation.hero" mode="aspectFill" />
    <view class="content">
      <view class="title-row">
        <text class="name">{{ recommendation.name }}</text>
        <button class="favorite" @click="store.toggleFavorite">
          {{ recommendation.isFavorite ? '♥' : '♡' }}
        </button>
      </view>
      <view class="meta">◷ {{ recommendation.cookTime }} 分钟　·　♙ {{ recommendation.servings }} 人份　·　{{ recommendation.calories }} kcal</view>
      <text class="reason">{{ recommendation.reason }}</text>

      <view class="section surface-card">
        <text class="section-title">食材清单</text>
        <view class="ingredient"><text>猪排骨</text><text>500g</text></view>
        <view class="ingredient"><text>山药</text><text>300g</text></view>
        <view class="ingredient"><text>红枣</text><text>5 颗</text></view>
        <view class="ingredient"><text>盐</text><text>适量</text></view>
      </view>

      <view class="section surface-card">
        <text class="section-title">步骤</text>
        <view class="step"><text class="step__number">1</text><text>排骨冷水下锅焯水，洗净浮沫。</text></view>
        <view class="step"><text class="step__number">2</text><text>加入清水与红枣，小火炖煮。</text></view>
        <view class="step"><text class="step__number">3</text><text>放入山药继续炖熟，适量调味。</text></view>
      </view>
    </view>
    <view class="actions">
      <button class="secondary" @click="store.toggleFavorite">{{ recommendation.isFavorite ? '已收藏' : '收藏' }}</button>
      <button class="primary" @click="addPlan">加入计划</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.detail {
  min-height: 100vh;
  padding-bottom: calc(130rpx + env(safe-area-inset-bottom));
  background: $color-page;
}

.hero { width: 100%; height: 500rpx; }
.content { margin-top: -30rpx; padding: 32rpx; border-radius: 36rpx 36rpx 0 0; background: $color-page; }
.title-row { display: flex; align-items: center; justify-content: space-between; }
.name { font-size: 42rpx; font-weight: 750; }
.favorite { color: $color-primary; font-size: 48rpx; }
.meta { margin-top: 14rpx; color: $color-text-secondary; font-size: 23rpx; }
.reason { display: block; margin-top: 22rpx; color: $color-text-secondary; font-size: 25rpx; line-height: 1.7; }
.section { margin-top: 24rpx; padding: 28rpx; }
.ingredient { display: flex; padding: 20rpx 0; justify-content: space-between; border-bottom: 1rpx solid $color-line; color: $color-text-secondary; font-size: 25rpx; }
.step { display: flex; padding: 22rpx 0 8rpx; align-items: flex-start; gap: 18rpx; color: $color-text-secondary; font-size: 25rpx; line-height: 1.6; }
.step__number { display: flex; width: 40rpx; height: 40rpx; flex: 0 0 auto; align-items: center; justify-content: center; color: white; border-radius: 50%; background: $color-primary; }
.actions { position: fixed; z-index: 2; right: 0; bottom: 0; left: 0; display: grid; padding: 18rpx 32rpx calc(18rpx + env(safe-area-inset-bottom)); grid-template-columns: 1fr 1.4fr; gap: 18rpx; background: white; box-shadow: 0 -8rpx 26rpx rgba(60, 40, 25, 0.06); }
.secondary, .primary { height: 84rpx; border-radius: 44rpx; font-size: 27rpx; }
.secondary { color: $color-primary; border: 2rpx solid $color-primary; }
.primary { color: white; background: $color-primary; }
</style>
