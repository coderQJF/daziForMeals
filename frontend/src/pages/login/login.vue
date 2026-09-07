<script setup lang="ts">
function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}

function login() {
  uni.setStorageSync('isLoggedIn', true)
  uni.showToast({ title: '登录成功', icon: 'success' })
  setTimeout(() => uni.switchTab({ url: '/pages/index/index' }), 450)
}
</script>

<template>
  <view class="login-page">
    <button class="back" aria-label="返回" @click="goBack">‹</button>
    <view class="hero-glow" />
    <image class="mascot" src="/static/images/home/icon-blind-box.png" mode="aspectFit" />
    <text class="title">欢迎来到饭搭子</text>
    <text class="subtitle">今天吃什么？饭搭子帮你决定</text>
    <button class="login-button" @click="login">
      <text class="wechat">●</text>
      <text>微信一键登录</text>
    </button>
    <text class="agreement">登录即表示同意《用户协议》和《隐私政策》</text>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.login-page { position: relative; display: flex; min-height: 100vh; padding: calc(var(--status-bar-height) + 24rpx) 48rpx 70rpx; align-items: center; flex-direction: column; overflow: hidden; background: $color-page; }
.back { position: absolute; z-index: 2; top: calc(var(--status-bar-height) + 18rpx); left: 30rpx; width: 70rpx; height: 70rpx; color: $color-text; font-size: 58rpx; }
.hero-glow { position: absolute; top: 120rpx; width: 560rpx; height: 470rpx; border-radius: 50%; background: radial-gradient(circle, rgba(255, 219, 174, .62), transparent 70%); }
.mascot { position: relative; width: 260rpx; height: 260rpx; margin-top: 230rpx; }
.title { position: relative; margin-top: 38rpx; font-size: 42rpx; font-weight: 800; }
.subtitle { position: relative; margin-top: 18rpx; color: $color-text-secondary; font-size: 26rpx; }
.login-button { display: flex; width: 100%; height: 94rpx; margin-top: 170rpx; align-items: center; justify-content: center; color: #fff; border-radius: 999rpx; background: $color-success; box-shadow: 0 12rpx 28rpx rgba(84, 130, 62, .18); font-size: 29rpx; font-weight: 700; }
.wechat { margin-right: 14rpx; font-size: 26rpx; }
.agreement { margin-top: 28rpx; color: $color-text-muted; font-size: 24rpx; text-align: center; }
</style>
