<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { experienceApi } from '@/services/experience'
import type { TakeoutShop } from '@/types/experience'

const categories = [
  { id: 'hot-pot', name: '火锅', emoji: '🍲' },
  { id: 'noodles', name: '面食', emoji: '🍜' },
  { id: 'light-meal', name: '轻食', emoji: '🥗' },
  { id: 'fried-chicken', name: '炸鸡', emoji: '🍗' },
  { id: 'japanese', name: '日料', emoji: '🍣' },
]
const activeCategory = ref('hot-pot')
const shops = ref<TakeoutShop[]>([])
const loading = ref(false)
const errorMessage = ref('')
const activeCategoryInfo = computed(() => categories.find(item => item.id === activeCategory.value) ?? categories[0])

async function loadShops(category = activeCategory.value) {
  activeCategory.value = category
  loading.value = true
  errorMessage.value = ''
  try {
    shops.value = await experienceApi.getTakeout(category)
  } catch (error) {
    shops.value = []
    errorMessage.value = error instanceof Error ? error.message : '外卖商家加载失败'
  } finally {
    loading.value = false
  }
}

onLoad((query) => {
  const requested = typeof query?.category === 'string' ? query.category : ''
  void loadShops(categories.some(item => item.id === requested) ? requested : 'hot-pot')
})
</script>

<template>
  <view class="takeout">
    <view class="tabs">
      <text v-for="item in categories" :key="item.id" :class="{ active: activeCategory === item.id }" @click="loadShops(item.id)">{{ item.name }}</text>
    </view>
    <view class="hero">
      <view><text class="badge">{{ activeCategoryInfo?.name }}推荐</text><text class="hero__title">今天吃点{{ activeCategoryInfo?.name }}</text><text class="hero__desc">省心选择，好好吃饭</text></view>
      <text class="hero__emoji">{{ activeCategoryInfo?.emoji }}</text>
    </view>
    <view class="section-title">附近商家</view>
    <view v-if="loading" class="api-state">正在加载附近商家…</view>
    <view v-else-if="errorMessage" class="api-state" @click="loadShops()">{{ errorMessage }}，点击重试</view>
    <view v-else-if="!shops.length" class="api-state">附近暂时没有这类商家</view>
    <view v-else class="shops">
      <view v-for="shop in shops" :key="shop.id" class="shop surface-card">
        <view class="shop__logo">锅</view>
        <view class="shop__copy"><text class="shop__name">{{ shop.name }}</text><text class="shop__meta">★ {{ shop.score }}　{{ shop.deliveryTime }}　{{ shop.distance }}</text><text class="shop__promo">{{ shop.promotion }}</text></view>
        <text class="heart">♡</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.takeout { min-height: 100vh; padding: 26rpx 32rpx 48rpx; background: $color-page; }
.tabs { display: flex; padding: 8rpx; justify-content: space-between; border-radius: 40rpx; background: white; }
.tabs text { padding: 13rpx 25rpx; color: $color-text-secondary; border-radius: 30rpx; font-size: 24rpx; }
.tabs .active { color: white; background: $color-primary; }
.hero { display: flex; min-height: 250rpx; margin-top: 24rpx; padding: 34rpx; align-items: center; justify-content: space-between; border-radius: 34rpx; background: linear-gradient(120deg, #ffe6c5, #fff6e9); }
.badge { display: inline-block; padding: 8rpx 16rpx; color: white; border-radius: 20rpx; background: $color-primary; font-size: 24rpx; }
.hero__title, .hero__desc { display: block; }
.hero__title { margin-top: 22rpx; font-size: 35rpx; font-weight: 750; }
.hero__desc { margin-top: 10rpx; color: $color-text-secondary; font-size: 24rpx; }
.hero__emoji { font-size: 116rpx; }
.section-title { margin: 34rpx 0 18rpx; }
.api-state { padding: 48rpx 24rpx; border-radius: 24rpx; background: #fff; color: $color-text-secondary; font-size: 24rpx; text-align: center; }
.shops { display: flex; flex-direction: column; gap: 16rpx; }
.shop { display: flex; padding: 22rpx; align-items: center; }
.shop__logo { display: flex; width: 90rpx; height: 90rpx; align-items: center; justify-content: center; color: white; border-radius: 20rpx; background: $color-primary; font-size: 30rpx; font-weight: 700; }
.shop__copy { display: flex; min-width: 0; margin-left: 20rpx; flex: 1; flex-direction: column; }
.shop__name { overflow: hidden; font-size: 27rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.shop__meta { margin-top: 9rpx; color: $color-text-secondary; font-size: 24rpx; }
.shop__promo { margin-top: 9rpx; color: $color-primary; font-size: 24rpx; }
.heart { color: $color-text-secondary; font-size: 40rpx; }
</style>
