<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '@/services/auth'
import { useRecipeStore } from '@/stores/recipe'

const recipeStore = useRecipeStore()
const loggingIn = ref(false)
const errorMessage = ref('')

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/index/index' })
}

function getWechatCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success(result) {
        if (result.code) resolve(result.code)
        else reject(new Error('微信未返回登录凭证'))
      },
      fail(error) {
        reject(new Error(error.errMsg || '无法唤起微信登录'))
      },
    })
  })
}

async function login() {
  if (loggingIn.value) return
  loggingIn.value = true
  errorMessage.value = ''
  try {
    const session = await authApi.login(await getWechatCode())
    recipeStore.applyUserState(session.user)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      if (getCurrentPages().length > 1) uni.navigateBack()
      else uni.switchTab({ url: '/pages/index/index' })
    }, 450)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  } finally {
    loggingIn.value = false
  }
}
</script>

<template>
  <view class="login-page">
    <button class="back" aria-label="返回" @click="goBack">‹</button>
    <view class="hero-glow" />
    <image class="mascot" src="/static/images/home/icon-blind-box.png" mode="aspectFit" />
    <text class="title">欢迎来到饭搭子</text>
    <text class="subtitle">今天吃什么？饭搭子帮你决定</text>
    <button class="login-button" :loading="loggingIn" :disabled="loggingIn" @click="login">
      <view class="wechat" aria-hidden="true">
        <view class="wechat__bubble wechat__bubble--large"><view class="wechat__dot wechat__dot--left" /><view class="wechat__dot wechat__dot--right" /></view>
        <view class="wechat__bubble wechat__bubble--small"><view class="wechat__dot wechat__dot--left" /><view class="wechat__dot wechat__dot--right" /></view>
      </view>
      <text>{{ loggingIn ? '正在登录…' : '微信一键登录' }}</text>
    </button>
    <button v-if="errorMessage" class="error-message" @click="login">{{ errorMessage }}，点击重试</button>
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
.login-button[disabled] { opacity: .72; }
.wechat { position: relative; width: 46rpx; height: 38rpx; margin-right: 14rpx; flex: 0 0 46rpx; }
.wechat__bubble { position: absolute; border-radius: 50%; background: #fff; }
.wechat__bubble::after { position: absolute; bottom: -3rpx; width: 8rpx; height: 8rpx; background: #fff; content: ''; transform: rotate(34deg); }
.wechat__dot { position: absolute; top: 46%; width: 4rpx; height: 4rpx; border-radius: 50%; background: $color-success; transform: translateY(-50%); }
.wechat__dot--left { left: 30%; }
.wechat__dot--right { right: 30%; }
.wechat__bubble--large { top: 1rpx; left: 0; width: 31rpx; height: 25rpx; }
.wechat__bubble--large::after { left: 5rpx; }
.wechat__bubble--small { right: 0; bottom: 0; width: 27rpx; height: 22rpx; border: 2rpx solid $color-success; }
.wechat__bubble--small::after { right: 4rpx; border-right: 2rpx solid $color-success; border-bottom: 2rpx solid $color-success; }
.error-message { margin-top: 22rpx; color: #d85a47; font-size: 24rpx; text-align: center; }
.agreement { margin-top: 28rpx; color: $color-text-muted; font-size: 24rpx; text-align: center; }
</style>
