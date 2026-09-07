<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  actionIcon?: string
  actionLabel?: string
  actionBackground?: string
  pagePadding?: number
}>(), {
  subtitle: '',
  actionIcon: '',
  actionLabel: '页面操作',
  actionBackground: 'transparent',
  pagePadding: 32,
})

const emit = defineEmits<{ action: [] }>()
const capsuleStyle = ref<Record<string, string>>({})
const actionStyle = computed(() => ({ background: props.actionBackground }))

onMounted(() => {
  // #ifdef MP-WEIXIN
  const api = uni as any
  const capsule = api.getMenuButtonBoundingClientRect?.()
  const system = uni.getSystemInfoSync()
  if (!capsule?.top || !capsule?.left || !system.windowWidth) return

  const pagePaddingPx = props.pagePadding * system.windowWidth / 750
  const reserveRight = Math.max(0, system.windowWidth - capsule.left + 8 - pagePaddingPx)
  capsuleStyle.value = {
    paddingTop: `${capsule.top}px`,
    paddingRight: `${reserveRight}px`,
  }
  // #endif
})
</script>

<template>
  <view class="app-header" :style="capsuleStyle">
    <view class="app-header__row">
      <view class="app-header__copy">
        <text class="app-header__title">{{ title }}</text>
        <slot name="subtitle">
          <text v-if="subtitle" class="app-header__subtitle">{{ subtitle }}</text>
        </slot>
      </view>

      <button
        v-if="actionIcon || $slots.action"
        class="app-header__action"
        :style="actionStyle"
        :aria-label="actionLabel"
        @click="emit('action')"
      >
        <slot name="action">
          <image class="app-header__action-icon" :src="actionIcon" mode="aspectFit" />
        </slot>
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.app-header {
  position: relative;
  z-index: 2;
  padding-top: calc(var(--status-bar-height) + 26rpx);
}

.app-header__row {
  display: flex;
  min-height: 72rpx;
  align-items: center;
  justify-content: space-between;
}

.app-header__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.app-header__title {
  color: $color-text;
  font-size: 44rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
  line-height: 1.15;
}

.app-header__subtitle {
  margin-top: 10rpx;
  color: $color-text-secondary;
  font-size: 24rpx;
  line-height: 1.35;
}

.app-header__action {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  margin-left: 20rpx;
  flex: 0 0 64rpx;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
}

.app-header__action-icon {
  display: block;
  width: 44rpx;
  height: 44rpx;
}
</style>
