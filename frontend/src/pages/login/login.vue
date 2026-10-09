<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/services/auth'
import { experienceApi } from '@/services/experience'
import { hasAuthToken } from '@/services/http'
import { useMealStore } from '@/stores/meal'
import { useRecipeStore } from '@/stores/recipe'

const recipeStore = useRecipeStore()
const mealStore = useMealStore()
const { profile, profileReady } = storeToRefs(recipeStore)
const loggingIn = ref(false)
const savingProfile = ref(false)
const errorMessage = ref('')
const profileStep = ref(false)
const authenticated = ref(hasAuthToken())
const nickname = ref('')
const avatarTempPath = ref('')
const avatarLoadFailed = ref(false)
const joiningInvitation = ref(false)
const hasMealInvitation = computed(() => Boolean(mealStore.invitation))

onLoad(async (options) => {
  mealStore.useInvitationOptions((options ?? {}) as Record<string, string | undefined>)
  joiningInvitation.value = hasMealInvitation.value
  if (!authenticated.value) return
  mealStore.refreshAuth()
  await recipeStore.loadUserState(true)
  if (!profileReady.value) openProfileStep()
})

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
    joiningInvitation.value = hasMealInvitation.value
    if (!authenticated.value) {
      const session = await authApi.login(await getWechatCode())
      recipeStore.applyUserState(session.user)
      authenticated.value = true
    }
    mealStore.refreshAuth()
    if (!profileReady.value) { openProfileStep(); return }
    await finishLogin()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  } finally {
    loggingIn.value = false
  }
}

function openProfileStep() {
  profileStep.value = true
  nickname.value = profile.value.nickname === '微信用户' ? '' : profile.value.nickname
  avatarTempPath.value = ''
  avatarLoadFailed.value = false
}

function chooseAvatar(event: any) {
  const path = event?.detail?.avatarUrl
  if (typeof path !== 'string' || !path) return
  avatarTempPath.value = path
  avatarLoadFailed.value = false
}

async function saveProfile() {
  const nextNickname = nickname.value.trim()
  if (!nextNickname || nextNickname === '微信用户') { errorMessage.value = '请填写你的真实昵称'; return }
  if (!avatarTempPath.value && !profile.value.avatar) { errorMessage.value = '请选择微信头像'; return }
  if (savingProfile.value) return
  savingProfile.value = true
  errorMessage.value = ''
  try {
    let avatar = profile.value.avatar
    if (avatarTempPath.value) avatar = recipeStore.applyUploadedAvatar(await experienceApi.uploadAvatar(avatarTempPath.value))
    await recipeStore.updateProfile({ nickname: nextNickname, bio: profile.value.bio, avatar })
    await finishLogin()
  } catch (error) {
    joiningInvitation.value = Boolean(mealStore.invitation)
    errorMessage.value = error instanceof Error ? error.message : '资料保存失败，请稍后重试'
  } finally {
    savingProfile.value = false
  }
}

async function finishLogin() {
  const joinedMeal = await mealStore.loadMeal(true)
  if (joiningInvitation.value && !joinedMeal?.isMember) throw new Error(mealStore.mealError || '邀请加入失败，请重新打开邀请')
  uni.showToast({ title: joiningInvitation.value ? '已加入饭局' : '登录成功', icon: 'success' })
  setTimeout(() => {
    if (getCurrentPages().length > 1) uni.navigateBack()
    else uni.switchTab({ url: '/pages/index/index' })
  }, 450)
}
</script>

<template>
  <view class="login-page">
    <button class="back" aria-label="返回" @click="goBack">‹</button>
    <view class="hero-glow" />
    <image class="mascot" :class="{ 'mascot--profile': profileStep }" src="/static/images/home/icon-blind-box.png" mode="aspectFit" />
    <text class="title">{{ profileStep ? '让饭搭子认出你' : '欢迎来到饭搭子' }}</text>
    <text class="subtitle">{{ profileStep ? '头像和昵称会显示给同桌的饭搭子' : hasMealInvitation ? '微信登录后加入饭局，一起决定今晚吃什么' : '今天吃什么？饭搭子帮你决定' }}</text>

    <view v-if="profileStep" class="profile-form">
      <button class="avatar-picker" open-type="chooseAvatar" @chooseavatar="chooseAvatar">
        <image v-if="(avatarTempPath || profile.avatar) && !avatarLoadFailed" :src="avatarTempPath || profile.avatar" mode="aspectFill" @error="avatarLoadFailed = true" />
        <text v-else>选择头像</text>
        <view class="avatar-picker__badge">换</view>
      </button>
      <input v-model="nickname" class="nickname-input" type="nickname" maxlength="40" placeholder="填写微信昵称" />
      <button class="login-button login-button--profile" :loading="savingProfile" :disabled="savingProfile" @click="saveProfile">{{ savingProfile ? '正在保存…' : '保存并进入饭局' }}</button>
    </view>

    <button v-else class="login-button" :loading="loggingIn" :disabled="loggingIn" @click="login">
      <view class="wechat" aria-hidden="true">
        <view class="wechat__bubble wechat__bubble--large"><view class="wechat__dot wechat__dot--left" /><view class="wechat__dot wechat__dot--right" /></view>
        <view class="wechat__bubble wechat__bubble--small"><view class="wechat__dot wechat__dot--left" /><view class="wechat__dot wechat__dot--right" /></view>
      </view>
      <text>{{ loggingIn ? '正在登录…' : authenticated ? '继续进入饭搭子' : '微信一键登录' }}</text>
    </button>
    <text v-if="errorMessage" class="error-message">{{ errorMessage }}</text>
    <text class="agreement">登录即表示同意《用户协议》和《隐私政策》</text>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.login-page { position: relative; display: flex; min-height: 100vh; padding: calc(var(--status-bar-height) + 24rpx) 48rpx 70rpx; align-items: center; flex-direction: column; overflow: hidden; background: $color-page; }
.back { position: absolute; z-index: 2; top: calc(var(--status-bar-height) + 18rpx); left: 30rpx; width: 70rpx; height: 70rpx; color: $color-text; font-size: 58rpx; }
.hero-glow { position: absolute; top: 120rpx; width: 560rpx; height: 470rpx; border-radius: 50%; background: radial-gradient(circle, rgba(255, 219, 174, .62), transparent 70%); }
.mascot { position: relative; width: 260rpx; height: 260rpx; margin-top: 230rpx; }
.mascot--profile { width: 190rpx; height: 190rpx; margin-top: 150rpx; }
.title { position: relative; margin-top: 38rpx; font-size: 42rpx; font-weight: 800; }
.subtitle { position: relative; margin-top: 18rpx; color: $color-text-secondary; font-size: 26rpx; }
.login-button { display: flex; width: 100%; height: 94rpx; margin-top: 170rpx; align-items: center; justify-content: center; color: #fff; border-radius: 999rpx; background: $color-success; box-shadow: 0 12rpx 28rpx rgba(84, 130, 62, .18); font-size: 29rpx; font-weight: 700; }
.profile-form { position: relative; display: flex; width: 100%; margin-top: 54rpx; align-items: center; flex-direction: column; }
.avatar-picker { position: relative; display: flex; width: 144rpx; height: 144rpx; padding: 0; overflow: visible; align-items: center; justify-content: center; border: 5rpx solid #fff; border-radius: 50%; background: #ffead2; box-shadow: 0 10rpx 28rpx rgba(100, 60, 27, .12); color: $color-primary-deep; font-size: 24rpx; font-weight: 700; }
.avatar-picker image { width: 100%; height: 100%; border-radius: 50%; }
.avatar-picker__badge { position: absolute; right: -3rpx; bottom: 2rpx; display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; border: 3rpx solid #fff; border-radius: 50%; background: $color-primary; color: #fff; font-size: 24rpx; }
.nickname-input { width: 100%; height: 88rpx; margin-top: 30rpx; padding: 0 28rpx; border: 1rpx solid rgba(139, 96, 60, .1); border-radius: 24rpx; background: #fff; color: $color-text; font-size: 28rpx; box-shadow: $shadow-card; box-sizing: border-box; }
.login-button--profile { margin-top: 28rpx; }
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
