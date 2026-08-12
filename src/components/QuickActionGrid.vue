<script setup lang="ts">
import type { CategoryItem } from '@/types/recipe'

defineProps<{
  items: CategoryItem[]
}>()

const emit = defineEmits<{
  select: [item: CategoryItem]
}>()
</script>

<template>
  <view class="grid">
    <button
      v-for="(item, index) in items"
      :key="item.id"
      class="action"
      :class="`action--${index}`"
      @click="emit('select', item)"
    >
      <text class="emoji">{{ item.icon }}</text>
      <text class="name">{{ item.name }}</text>
      <text class="description">{{ item.description }}</text>
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.grid {
  display: grid;
  margin-top: 26rpx;
  grid-template-columns: repeat(3, 1fr);
  gap: 18rpx;
}

.action {
  display: flex;
  min-width: 0;
  height: 220rpx;
  padding: 26rpx 10rpx 22rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 34rpx;
  background: #fff0e6;

  &--1 {
    background: #fff7df;
  }

  &--2 {
    background: #eff6e7;
  }
}

.emoji {
  font-size: 70rpx;
  line-height: 1;
}

.name {
  margin-top: 18rpx;
  color: $color-text;
  font-size: 29rpx;
  font-weight: 700;
}

.description {
  margin-top: 6rpx;
  color: $color-text-secondary;
  font-size: 22rpx;
}
</style>
