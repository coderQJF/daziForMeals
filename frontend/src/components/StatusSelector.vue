<script setup lang="ts">
import type { StatusOption } from '@/types/recipe'

defineProps<{
  modelValue: string
  options: StatusOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [id: string]
}>()
</script>

<template>
  <view class="status surface-card">
    <view class="status__header">
      <text class="section-title">我的状态</text>
      <text class="edit">✎</text>
    </view>
    <scroll-view class="status__scroll" scroll-x :show-scrollbar="false">
      <view class="status__items">
        <button
          v-for="item in options"
          :key="item.id"
          class="chip"
          :class="{ 'chip--active': item.id === modelValue }"
          @click="emit('update:modelValue', item.id)"
        >
          {{ item.name }}
        </button>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.status {
  margin-top: 24rpx;
  padding: 26rpx 26rpx 22rpx;
}

.status__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit {
  color: $color-text-secondary;
  font-size: 34rpx;
}

.status__scroll {
  width: 100%;
  margin-top: 18rpx;
  white-space: nowrap;
}

.status__items {
  display: inline-flex;
  gap: 14rpx;
}

.chip {
  height: 58rpx;
  padding: 0 24rpx;
  color: $color-text-secondary;
  border: 2rpx solid transparent;
  border-radius: 30rpx;
  background: #f7f5f3;
  font-size: 24rpx;

  &--active {
    color: $color-primary;
    border-color: $color-primary;
    background: $color-primary-soft;
    font-weight: 600;
  }
}
</style>
