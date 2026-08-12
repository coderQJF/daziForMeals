<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <view class="header">
    <view>
      <view class="title">{{ title }}</view>
      <view v-if="subtitle" class="subtitle">{{ subtitle }}</view>
    </view>
    <button class="notice" aria-label="消息通知">
      <text class="bell">♢</text>
      <view class="dot" />
    </button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.title {
  font-size: 48rpx;
  font-weight: 750;
  letter-spacing: 1rpx;
}

.subtitle {
  margin-top: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.notice {
  position: relative;
  display: flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.bell {
  color: $color-text;
  font-size: 44rpx;
  line-height: 1;
  transform: rotate(45deg);
}

.dot {
  position: absolute;
  top: 13rpx;
  right: 14rpx;
  width: 10rpx;
  height: 10rpx;
  background: $color-primary;
  border: 3rpx solid white;
  border-radius: 50%;
}
</style>
