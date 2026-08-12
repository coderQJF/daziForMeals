<script setup lang="ts">
import type { Recipe } from '@/types/recipe'

defineProps<{
  recipe: Recipe
  badge?: string
}>()

const emit = defineEmits<{
  open: []
  favorite: []
}>()
</script>

<template>
  <view class="card surface-card" @click="emit('open')">
    <image class="cover" :src="recipe.cover" mode="aspectFill" />
    <view class="body">
      <view class="title-line">
        <text class="name">{{ recipe.name }}</text>
        <button class="heart" @click.stop="emit('favorite')">
          {{ recipe.isFavorite ? '♥' : '♡' }}
        </button>
      </view>
      <view v-if="badge" class="badge">{{ badge }}</view>
      <text class="reason">{{ recipe.reason }}</text>
      <view class="tags">
        <text v-for="tag in recipe.tags" :key="tag" class="tag">{{ tag }}</text>
      </view>
      <view class="meta">
        <text>◷ {{ recipe.cookTime }} 分钟</text>
        <text>♙ {{ recipe.servings }} 人份</text>
        <text>{{ recipe.calories }} kcal</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.card {
  overflow: hidden;
}

.cover {
  display: block;
  width: 100%;
  height: 340rpx;
  background: #f0ebe6;
}

.body {
  position: relative;
  padding: 26rpx 28rpx 28rpx;
}

.title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name {
  font-size: 36rpx;
  font-weight: 750;
}

.heart {
  color: $color-primary;
  font-size: 48rpx;
}

.badge {
  display: inline-flex;
  height: 42rpx;
  margin-top: 10rpx;
  padding: 0 16rpx;
  align-items: center;
  color: $color-primary;
  border-radius: 22rpx;
  background: $color-primary-soft;
  font-size: 21rpx;
}

.reason {
  display: block;
  margin-top: 14rpx;
  color: $color-text-secondary;
  font-size: 24rpx;
  line-height: 1.6;
}

.tags {
  display: flex;
  margin-top: 18rpx;
  gap: 12rpx;
}

.tag {
  padding: 8rpx 15rpx;
  color: $color-primary-deep;
  border-radius: 18rpx;
  background: #fff3e5;
  font-size: 21rpx;
}

.meta {
  display: flex;
  margin-top: 22rpx;
  justify-content: space-between;
  color: $color-text-secondary;
  font-size: 22rpx;
}
</style>
