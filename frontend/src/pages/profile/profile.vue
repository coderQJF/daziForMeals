<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader from '@/components/AppHeader.vue'
import { experienceApi } from '@/services/experience'
import { hasAuthToken } from '@/services/http'
import { useRecipeStore } from '@/stores/recipe'

const recipeStore = useRecipeStore()
const { profile } = storeToRefs(recipeStore)
const nickname = ref('')
const bio = ref('')
const avatarTempPath = ref('')
const avatarLoadFailed = ref(false)
const saving = ref(false)
const errorMessage = ref('')

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.switchTab({ url: '/pages/user/user' })
}

function chooseAvatar(event: any) {
  const path = event?.detail?.avatarUrl
  if (typeof path !== 'string' || !path) return
  avatarTempPath.value = path
  avatarLoadFailed.value = false
}

async function saveProfile() {
  const nextNickname = nickname.value.trim()
  if (!nextNickname) {
    errorMessage.value = '请填写昵称'
    return
  }
  if (saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    let avatar = profile.value.avatar
    if (avatarTempPath.value) {
      avatar = recipeStore.applyUploadedAvatar(await experienceApi.uploadAvatar(avatarTempPath.value))
    }
    await recipeStore.updateProfile({
      nickname: nextNickname,
      bio: bio.value.trim() || '享受每一餐，认真生活每一天～',
      avatar,
    })
    uni.showToast({ title: '资料已保存', icon: 'success' })
    setTimeout(goBack, 450)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '资料保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

onShow(() => {
  if (!hasAuthToken()) {
    uni.redirectTo({ url: '/pages/login/login' })
    return
  }
  nickname.value = profile.value.nickname
  bio.value = profile.value.bio
  avatarTempPath.value = ''
  avatarLoadFailed.value = false
})
</script>

<template>
  <view class="profile-page">
    <view class="profile-page__glow" />
    <AppHeader title="个人资料" :show-back="true" @back="goBack" />

    <view class="profile-card">
      <text class="section-title">头像</text>
      <button class="avatar-picker" open-type="chooseAvatar" @chooseavatar="chooseAvatar">
        <image
          v-if="(avatarTempPath || profile.avatar) && !avatarLoadFailed"
          class="avatar-picker__image"
          :src="avatarTempPath || profile.avatar"
          mode="aspectFill"
          @error="avatarLoadFailed = true"
        />
        <image v-else class="avatar-picker__fallback" src="/static/tabbar/user-active.png" mode="aspectFit" />
        <view class="avatar-picker__badge">换</view>
      </button>
      <text class="avatar-tip">点击头像可使用微信头像或选择新图片</text>
    </view>

    <view class="form-card">
      <label class="field">
        <text class="field__label">昵称</text>
        <input v-model="nickname" class="field__input" type="nickname" maxlength="40" placeholder="填写你的昵称" />
      </label>
      <label class="field field--bio">
        <text class="field__label">个人签名</text>
        <textarea v-model="bio" class="field__textarea" maxlength="120" placeholder="写一句关于吃饭的小心情" />
        <text class="field__count">{{ bio.length }}/120</text>
      </label>
    </view>

    <button class="save-button" :loading="saving" :disabled="saving" @click="saveProfile">
      {{ saving ? '正在保存…' : '保存资料' }}
    </button>
    <text v-if="errorMessage" class="error-message">{{ errorMessage }}</text>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.profile-page {
  position: relative;
  min-height: 100vh;
  padding: 0 32rpx calc(env(safe-area-inset-bottom) + 56rpx);
  overflow: hidden;
  background: $color-page;
  box-sizing: border-box;
}

.profile-page__glow {
  position: absolute;
  top: -140rpx;
  right: -120rpx;
  width: 480rpx;
  height: 420rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 224, 184, .62), transparent 72%);
}

.profile-card,
.form-card {
  position: relative;
  z-index: 1;
  border: 1rpx solid rgba(104, 75, 53, .04);
  border-radius: 30rpx;
  background: #fff;
  box-shadow: 0 10rpx 30rpx rgba(79, 51, 31, .05);
}

.profile-card {
  display: flex;
  margin-top: 32rpx;
  padding: 30rpx;
  align-items: center;
  flex-direction: column;
}

.section-title {
  align-self: flex-start;
  color: $color-text;
  font-size: 30rpx;
  font-weight: 700;
}

.avatar-picker {
  position: relative;
  display: flex;
  width: 164rpx;
  height: 164rpx;
  margin-top: 24rpx;
  overflow: visible;
  align-items: center;
  justify-content: center;
  border: 6rpx solid #fff1df;
  border-radius: 50%;
  background: linear-gradient(145deg, #fff7eb, #ffe3bf);
  box-shadow: 0 12rpx 28rpx rgba(209, 126, 37, .16);
}

.avatar-picker__image {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 50%;
}

.avatar-picker__fallback {
  width: 74rpx;
  height: 74rpx;
}

.avatar-picker__badge {
  position: absolute;
  right: -2rpx;
  bottom: 2rpx;
  display: flex;
  width: 48rpx;
  height: 48rpx;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #fff;
  border-radius: 50%;
  background: $color-primary;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}

.avatar-tip {
  margin-top: 22rpx;
  color: $color-text-muted;
  font-size: 24rpx;
}

.form-card {
  margin-top: 24rpx;
  padding: 0 30rpx;
}

.field {
  display: flex;
  min-height: 112rpx;
  align-items: center;
  border-bottom: 1rpx solid #f1ebe5;
}

.field--bio {
  position: relative;
  min-height: 210rpx;
  padding: 26rpx 0 38rpx;
  align-items: stretch;
  flex-direction: column;
  border-bottom: 0;
}

.field__label {
  width: 150rpx;
  flex: 0 0 150rpx;
  color: $color-text;
  font-size: 28rpx;
  font-weight: 650;
}

.field__input {
  min-width: 0;
  height: 72rpx;
  flex: 1;
  color: $color-text;
  font-size: 28rpx;
  text-align: right;
}

.field__textarea {
  width: 100%;
  height: 112rpx;
  margin-top: 20rpx;
  color: $color-text;
  font-size: 27rpx;
  line-height: 1.55;
}

.field__count {
  position: absolute;
  right: 0;
  bottom: 18rpx;
  color: $color-text-muted;
  font-size: 24rpx;
}

.save-button {
  position: relative;
  z-index: 1;
  display: flex;
  height: 94rpx;
  margin-top: 34rpx;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: $color-primary;
  box-shadow: 0 12rpx 28rpx rgba(255, 144, 11, .2);
  color: #fff;
  font-size: 29rpx;
  font-weight: 700;
}

.save-button[disabled] { opacity: .72; }
.error-message { display: block; margin-top: 22rpx; color: #d85a47; font-size: 24rpx; text-align: center; }

@media (min-width: 500px) {
  .profile-page { max-width: 750rpx; margin: 0 auto; }
}
</style>
