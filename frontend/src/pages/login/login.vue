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
const { profile, profileReady, phoneBound, phoneMasked } = storeToRefs(recipeStore)
const loggingIn = ref(false)
const savingProfile = ref(false)
const bindingPhone = ref(false)
const privacySettingReady = ref(false)
const privacyAuthorizationRequired = ref(false)
const errorMessage = ref('')
const currentStep = ref<'login' | 'phone' | 'profile'>('login')
const profileStep = computed(() => currentStep.value === 'profile')
const authenticated = ref(hasAuthToken())
const nickname = ref('')
const avatarTempPath = ref('')
const avatarLoadFailed = ref(false)
const joiningInvitation = ref(false)
const invitedMealId = ref('')
const phoneModeRequested = ref(false)
const hasMealInvitation = computed(() => Boolean(mealStore.invitation))
const capabilities = ref<Awaited<ReturnType<typeof authApi.getCapabilities>>>({
  phoneNumberBinding: false,
  mealNotification: null,
})

const title = computed(() => ({
  login: '欢迎来到饭搭子',
  phone: '绑定微信手机号',
  profile: '让饭搭子认出你',
}[currentStep.value]))

const subtitle = computed(() => {
  if (currentStep.value === 'phone') return '由微信验证号码，仅用于账号识别；你也可以暂时跳过'
  if (currentStep.value === 'profile') return '头像和昵称会显示给同桌的饭搭子'
  return hasMealInvitation.value ? '微信登录后加入饭局，一起决定这餐吃什么' : '今天吃什么？饭搭子帮你决定'
})

onLoad(async (options) => {
  checkPrivacySetting()
  mealStore.useInvitationOptions((options ?? {}) as Record<string, string | undefined>)
  phoneModeRequested.value = options?.mode === 'phone'
  joiningInvitation.value = hasMealInvitation.value
  invitedMealId.value = mealStore.invitation?.mealId ?? ''
  try {
    capabilities.value = await authApi.getCapabilities()
  } catch {
    // 登录本身不应被可选能力配置阻塞。
  }
  if (phoneModeRequested.value && authenticated.value) currentStep.value = 'phone'
})

function checkPrivacySetting() {
  // #ifdef MP-WEIXIN
  const api = uni as unknown as {
    getPrivacySetting?: (options: {
      success: (result: { needAuthorization: boolean }) => void
      fail: (error: UniApp.GeneralCallbackResult) => void
    }) => void
  }
  if (typeof api.getPrivacySetting !== 'function') {
    privacySettingReady.value = true
    return
  }
  try {
    api.getPrivacySetting({
      success(result) {
        privacyAuthorizationRequired.value = Boolean(result.needAuthorization)
        privacySettingReady.value = true
      },
      fail() {
        privacySettingReady.value = true
      },
    })
  } catch {
    privacySettingReady.value = true
  }
  // #endif
  // #ifndef MP-WEIXIN
  privacySettingReady.value = true
  // #endif
}

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
    invitedMealId.value = mealStore.invitation?.mealId ?? invitedMealId.value
    const session = await authApi.login(await getWechatCode())
    recipeStore.applyUserState(session.user)
    authenticated.value = true
    mealStore.refreshAuth()
    if (capabilities.value.phoneNumberBinding && !phoneBound.value) {
      currentStep.value = 'phone'
      return
    }
    await continueAfterPhone()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  } finally {
    loggingIn.value = false
  }
}

function openProfileStep() {
  currentStep.value = 'profile'
  nickname.value = profile.value.nickname === '微信用户' ? '' : profile.value.nickname
  avatarTempPath.value = ''
  avatarLoadFailed.value = false
}

async function continueAfterPhone() {
  if (phoneModeRequested.value) {
    goBack()
    return
  }
  if (!profileReady.value) {
    openProfileStep()
    return
  }
  await continueAfterProfile()
}

async function continueAfterProfile() {
  await finishLogin()
}

async function bindPhone(event: any) {
  if (bindingPhone.value) return
  const code = event?.detail?.code
  if (typeof code !== 'string' || !code) {
    const errMsg = typeof event?.detail?.errMsg === 'string' ? event.detail.errMsg : ''
    const errno = Number(event?.detail?.errno)
    if (/deny|cancel/i.test(errMsg)) {
      errorMessage.value = '你已取消手机号授权，可以暂时跳过'
    } else if (/permission|access denied/i.test(errMsg) || errno === 102) {
      errorMessage.value = capabilities.value.phoneNumberUnavailableReason
        || '当前微信小程序暂不具备手机号授权权限'
    } else if (/quota|limit/i.test(errMsg)) {
      errorMessage.value = '手机号验证额度暂不可用，请稍后再试'
    } else {
      errorMessage.value = errMsg ? `微信未返回手机号：${errMsg}` : '未获得手机号授权，你可以暂时跳过'
    }
    return
  }
  bindingPhone.value = true
  errorMessage.value = ''
  try {
    recipeStore.applyUserState(await authApi.bindPhone(code))
    uni.showToast({ title: '手机号已绑定', icon: 'success' })
    await continueAfterPhone()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '手机号绑定失败，请稍后重试'
  } finally {
    bindingPhone.value = false
  }
}

function openPrivacyContract() {
  // #ifdef MP-WEIXIN
  const api = uni as unknown as { openPrivacyContract(options: { fail: (error: UniApp.GeneralCallbackResult) => void }): void }
  api.openPrivacyContract({
    fail: () => uni.showToast({ title: '隐私保护指引暂时无法打开', icon: 'none' }),
  })
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中查看隐私保护指引', icon: 'none' })
  // #endif
}

function privacyAuthorized(event: any) {
  const errMsg = event?.detail?.errMsg
  if (typeof errMsg === 'string' && !errMsg.endsWith(':ok')) {
    errorMessage.value = '需同意隐私保护指引后才能获取手机号'
    return
  }
  privacyAuthorizationRequired.value = false
  errorMessage.value = ''
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
    await continueAfterProfile()
  } catch (error) {
    joiningInvitation.value = Boolean(mealStore.invitation)
    errorMessage.value = error instanceof Error ? error.message : '资料保存失败，请稍后重试'
  } finally {
    savingProfile.value = false
  }
}

async function finishLogin() {
  const joinedMeal = await mealStore.loadMeal(true)
  if (!joinedMeal?.isMember) throw new Error(mealStore.mealError || '饭局加载失败，请重试')
  const joinedInvitation = Boolean(invitedMealId.value && joinedMeal.id === invitedMealId.value)
  uni.showToast({
    title: joiningInvitation.value && !joinedInvitation
      ? '邀请已失效，已进入自己的饭局'
      : joinedInvitation ? '已加入饭局' : '登录成功',
    icon: joiningInvitation.value && !joinedInvitation ? 'none' : 'success',
  })
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
    <image class="mascot" :class="{ 'mascot--compact': currentStep !== 'login' }" src="/static/images/home/icon-blind-box.png" mode="aspectFit" />
    <text class="title">{{ title }}</text>
    <text class="subtitle">{{ subtitle }}</text>

    <view v-if="currentStep === 'phone'" class="permission-card">
      <view class="permission-card__icon">📱</view>
      <text class="permission-card__title">微信验证手机号</text>
      <text v-if="phoneBound" class="permission-card__status">已绑定 {{ phoneMasked }}</text>
      <template v-if="capabilities.phoneNumberBinding">
        <button v-if="!privacySettingReady" class="login-button login-button--permission" loading disabled>正在确认微信授权…</button>
        <button v-else-if="privacyAuthorizationRequired" class="login-button login-button--permission" open-type="agreePrivacyAuthorization" @agreeprivacyauthorization="privacyAuthorized">同意隐私保护指引并继续</button>
        <button v-else class="login-button login-button--permission" open-type="getPhoneNumber" :loading="bindingPhone" :disabled="bindingPhone" @getphonenumber="bindPhone">{{ bindingPhone ? '正在绑定…' : '选择微信手机号' }}</button>
        <button class="privacy-link" @click="openPrivacyContract">查看《小程序用户隐私保护指引》</button>
        <button class="skip-button" @click="continueAfterPhone">暂不绑定，继续点菜</button>
      </template>
      <template v-else>
        <text class="permission-card__unavailable">{{ capabilities.phoneNumberUnavailableReason || '当前小程序暂不支持微信手机号授权，微信登录和点菜不受影响' }}</text>
        <button class="login-button login-button--permission" @click="continueAfterPhone">知道了</button>
      </template>
    </view>

    <view v-else-if="profileStep" class="profile-form">
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
    <text v-if="currentStep === 'login'" class="agreement">手机号、头像和通知均由微信逐项确认，可按需跳过</text>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.login-page { position: relative; display: flex; min-height: 100vh; padding: calc(var(--status-bar-height) + 24rpx) 48rpx 70rpx; align-items: center; flex-direction: column; overflow: hidden; background: $color-page; }
.back { position: absolute; z-index: 2; top: calc(var(--status-bar-height) + 18rpx); left: 30rpx; width: 70rpx; height: 70rpx; color: $color-text; font-size: 58rpx; }
.hero-glow { position: absolute; top: 120rpx; width: 560rpx; height: 470rpx; border-radius: 50%; background: radial-gradient(circle, rgba(255, 219, 174, .62), transparent 70%); }
.mascot { position: relative; width: 260rpx; height: 260rpx; margin-top: 230rpx; }
.mascot--compact { width: 190rpx; height: 190rpx; margin-top: 150rpx; }
.title { position: relative; margin-top: 38rpx; font-size: 42rpx; font-weight: 800; }
.subtitle { position: relative; margin-top: 18rpx; color: $color-text-secondary; font-size: 26rpx; }
.login-button { display: flex; width: 100%; height: 94rpx; margin-top: 170rpx; align-items: center; justify-content: center; color: #fff; border-radius: 999rpx; background: $color-success; box-shadow: 0 12rpx 28rpx rgba(84, 130, 62, .18); font-size: 29rpx; font-weight: 700; }
.profile-form { position: relative; display: flex; width: 100%; margin-top: 54rpx; align-items: center; flex-direction: column; }
.avatar-picker { position: relative; display: flex; width: 144rpx; height: 144rpx; padding: 0; overflow: visible; align-items: center; justify-content: center; border: 5rpx solid #fff; border-radius: 50%; background: #ffead2; box-shadow: 0 10rpx 28rpx rgba(100, 60, 27, .12); color: $color-primary-deep; font-size: 24rpx; font-weight: 700; }
.avatar-picker image { width: 100%; height: 100%; border-radius: 50%; }
.avatar-picker__badge { position: absolute; right: -3rpx; bottom: 2rpx; display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; border: 3rpx solid #fff; border-radius: 50%; background: $color-primary; color: #fff; font-size: 24rpx; }
.nickname-input { width: 100%; height: 88rpx; margin-top: 30rpx; padding: 0 28rpx; border: 1rpx solid rgba(139, 96, 60, .1); border-radius: 24rpx; background: #fff; color: $color-text; font-size: 28rpx; box-shadow: $shadow-card; box-sizing: border-box; }
.login-button--profile { margin-top: 28rpx; }
.permission-card { position: relative; display: flex; width: 100%; margin-top: 48rpx; padding: 34rpx 30rpx 24rpx; align-items: center; flex-direction: column; border: 1rpx solid rgba(139, 96, 60, .1); border-radius: 30rpx; background: rgba(255, 255, 255, .92); box-shadow: $shadow-card; box-sizing: border-box; }
.permission-card__icon { display: flex; width: 86rpx; height: 86rpx; align-items: center; justify-content: center; border-radius: 50%; background: #eaf6e5; font-size: 42rpx; }
.permission-card__title { margin-top: 18rpx; color: $color-text; font-size: 30rpx; font-weight: 800; }
.permission-card__status { margin-top: 10rpx; color: $color-text-secondary; font-size: 24rpx; }
.permission-card__unavailable { margin-top: 20rpx; color: $color-text-secondary; font-size: 25rpx; line-height: 1.6; text-align: center; }
.login-button--permission { margin-top: 30rpx; background: $color-success; }
.skip-button { min-width: 260rpx; min-height: 68rpx; margin-top: 14rpx; color: $color-text-secondary; font-size: 25rpx; }
.privacy-link { min-height: 58rpx; margin-top: 10rpx; color: $color-primary-deep; font-size: 24rpx; text-decoration: underline; }
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
