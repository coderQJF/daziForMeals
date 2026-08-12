<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
  icon: string
  accent?: string
}>()
</script>

<template>
  <view class="page-shell">
    <view class="top">
      <view>
        <view class="page-title">{{ title }}</view>
        <view class="page-subtitle">{{ subtitle }}</view>
      </view>
      <view class="top__icon" :style="{ background: accent || '#fff1e5' }">{{ icon }}</view>
    </view>
    <slot />
  </view>
</template>

<style scoped lang="scss">
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.top__icon {
  display: flex;
  width: 88rpx;
  height: 88rpx;
  align-items: center;
  justify-content: center;
  border-radius: 30rpx;
  font-size: 48rpx;
}
</style>
