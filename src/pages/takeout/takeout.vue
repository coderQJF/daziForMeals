<script setup lang="ts">
const shops = [
  { name: '小龙坎火锅（科技园店）', score: '4.8', distance: '1.2km', time: '30分钟送达' },
  { name: '海底捞火锅（后海店）', score: '4.9', distance: '1.6km', time: '30分钟送达' },
  { name: '呷哺呷哺（南山店）', score: '4.6', distance: '2.0km', time: '40分钟送达' },
]
</script>

<template>
  <view class="takeout">
    <view class="tabs">
      <text class="active">火锅</text><text>面食</text><text>轻食</text><text>炒菜</text><text>粥</text>
    </view>
    <view class="hero">
      <view><text class="badge">火锅推荐</text><text class="hero__title">冬日暖心火锅</text><text class="hero__desc">热气腾腾，幸福加倍</text></view>
      <text class="hero__emoji">🍲</text>
    </view>
    <view class="section-title">附近商家</view>
    <view class="shops">
      <view v-for="shop in shops" :key="shop.name" class="shop surface-card">
        <view class="shop__logo">锅</view>
        <view class="shop__copy"><text class="shop__name">{{ shop.name }}</text><text class="shop__meta">★ {{ shop.score }}　{{ shop.time }}　{{ shop.distance }}</text><text class="shop__promo">满69减15　支持自取</text></view>
        <text class="heart">♡</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.takeout { min-height: 100vh; padding: 26rpx 32rpx 48rpx; background: $color-page; }
.tabs { display: flex; padding: 8rpx; justify-content: space-between; border-radius: 40rpx; background: white; }
.tabs text { padding: 13rpx 25rpx; color: $color-text-secondary; border-radius: 30rpx; font-size: 23rpx; }
.tabs .active { color: white; background: $color-primary; }
.hero { display: flex; min-height: 250rpx; margin-top: 24rpx; padding: 34rpx; align-items: center; justify-content: space-between; border-radius: 34rpx; background: linear-gradient(120deg, #ffe6c5, #fff6e9); }
.badge { display: inline-block; padding: 8rpx 16rpx; color: white; border-radius: 20rpx; background: $color-primary; font-size: 20rpx; }
.hero__title, .hero__desc { display: block; }
.hero__title { margin-top: 22rpx; font-size: 35rpx; font-weight: 750; }
.hero__desc { margin-top: 10rpx; color: $color-text-secondary; font-size: 23rpx; }
.hero__emoji { font-size: 116rpx; }
.section-title { margin: 34rpx 0 18rpx; }
.shops { display: flex; flex-direction: column; gap: 16rpx; }
.shop { display: flex; padding: 22rpx; align-items: center; }
.shop__logo { display: flex; width: 90rpx; height: 90rpx; align-items: center; justify-content: center; color: white; border-radius: 20rpx; background: $color-primary; font-size: 30rpx; font-weight: 700; }
.shop__copy { display: flex; min-width: 0; margin-left: 20rpx; flex: 1; flex-direction: column; }
.shop__name { overflow: hidden; font-size: 27rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.shop__meta { margin-top: 9rpx; color: $color-text-secondary; font-size: 21rpx; }
.shop__promo { margin-top: 9rpx; color: $color-primary; font-size: 20rpx; }
.heart { color: $color-text-secondary; font-size: 40rpx; }
</style>
