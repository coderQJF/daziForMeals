<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useRecipeStore } from '@/stores/recipe'

const store = useRecipeStore()
const { statusOptions, loading, errorMessage } = storeToRefs(store)
const selected = ref(store.selectedStatus)

async function loadStatuses() {
  await store.loadUserState(true)
  selected.value = store.selectedStatus
  try {
    await store.loadBootstrap()
  } catch {
    // The page exposes the API error and offers an explicit retry.
  }
}

async function complete() {
  await store.selectStatus(selected.value)
  uni.showToast({ title: '状态已更新', icon: 'success' })
  setTimeout(() => {
    if (getCurrentPages().length > 1) uni.navigateBack()
    else uni.switchTab({ url: '/pages/index/index' })
  }, 350)
}

onLoad(() => void loadStatuses())
</script>

<template>
  <view class="status-page">
    <view class="status-page__glow" />
    <image class="status-hero" src="/static/images/home/action-recover.png" mode="aspectFit" />
    <text class="title">选择你的身体状态</text>
    <text class="subtitle">选择当前最明显的状态，饭搭子会推荐更合适的食谱</text>
    <view v-if="loading && !statusOptions.length" class="api-state">正在加载状态选项…</view>
    <view v-else-if="errorMessage && !statusOptions.length" class="api-state" @click="loadStatuses">{{ errorMessage }}，点击重试</view>
    <view v-else class="option-grid">
      <button v-for="item in statusOptions" :key="item.id" class="option" :class="{ 'option--active': selected === item.id }" @click="selected = item.id">
        <text class="option__icon">{{ item.icon }}</text>
        <text class="option__name">{{ item.name }}</text>
      </button>
    </view>
    <button class="complete" :disabled="!selected" @click="complete">完成（1/{{ statusOptions.length || 1 }}）</button>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.status-page { position: relative; min-height: 100vh; padding: calc(var(--status-bar-height) + 58rpx) 38rpx calc(env(safe-area-inset-bottom) + 42rpx); overflow: hidden; background: $color-page; }
.status-page__glow { position: absolute; top: -160rpx; left: 50%; width: 640rpx; height: 520rpx; transform: translateX(-50%); border-radius: 50%; background: radial-gradient(circle, rgba(255, 222, 180, .65), transparent 70%); }
.status-hero { position: relative; display: block; width: 190rpx; height: 190rpx; margin: 20rpx auto 0; }
.title { position: relative; display: block; margin-top: 26rpx; font-size: 40rpx; font-weight: 800; text-align: center; }
.subtitle { position: relative; display: block; margin-top: 14rpx; color: $color-text-secondary; font-size: 24rpx; line-height: 1.5; text-align: center; }
.api-state { position: relative; margin-top: 48rpx; padding: 42rpx 24rpx; border-radius: 24rpx; background: #fff; color: $color-text-secondary; font-size: 24rpx; text-align: center; }
.option-grid { position: relative; display: grid; margin-top: 48rpx; grid-template-columns: repeat(3, 1fr); gap: 18rpx; }
.option { display: flex; height: 150rpx; align-items: center; justify-content: center; flex-direction: column; border: 2rpx solid transparent; border-radius: 24rpx; background: rgba(255,255,255,.88); box-shadow: $shadow-card; }
.option--active { color: #5b814a; border-color: $color-success; background: $color-success-soft; }
.option__icon { font-size: 48rpx; }
.option__name { margin-top: 12rpx; font-size: 24rpx; }
.complete { position: fixed; right: 38rpx; bottom: calc(env(safe-area-inset-bottom) + 28rpx); left: 38rpx; height: 92rpx; color: #fff; border-radius: 999rpx; background: $color-primary; box-shadow: 0 12rpx 28rpx rgba(255, 122, 26, .22); font-size: 28rpx; font-weight: 700; }
</style>
