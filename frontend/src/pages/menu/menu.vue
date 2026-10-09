<script setup lang="ts">
import { onLoad, onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { dishImageFor, mealDishKindFor, type MealDishKind } from '@/config/dish-images'
import { mealSharePath } from '@/config/meal-share'
import { authApi } from '@/services/auth'
import { requestMealNotification } from '@/services/wechat'
import { useMealStore } from '@/stores/meal'
import type { MealDish } from '@/types/meal'

const mealStore = useMealStore()
const {
  meal,
  members,
  memberCount,
  loggedIn,
  selectedDishes,
  dishCount,
  mealLoading: pageLoading,
  mealError: errorMessage,
  pendingRecipeId,
} = storeToRefs(mealStore)
const avatarErrors = ref<string[]>([])
const confirming = ref(false)
const redirecting = ref(false)
const mealNotificationTemplateId = ref('')
const notificationAccepted = ref(false)
const subscribingNotification = ref(false)
const requestedMealId = ref('')

function notificationStorageKey(mealId = meal.value?.id) {
  return mealId && mealNotificationTemplateId.value
    ? `fandaziMealNotification:${mealId}:${mealNotificationTemplateId.value}`
    : ''
}

function restoreNotificationState() {
  const key = notificationStorageKey()
  notificationAccepted.value = Boolean(key && uni.getStorageSync(key))
}

const headerTitle = computed(() => {
  if (meal.value?.title.includes('午餐')) return '午餐菜单'
  if (meal.value?.title.includes('晚餐')) return '晚餐菜单'
  return '查看菜单'
})

const memberSummary = computed(() => {
  if (!memberCount.value) return '还没有饭搭子加入'
  if (memberCount.value === 1) return '这顿饭先从自己开始'
  return `${memberCount.value} 位饭搭子正在一起点`
})

const dishStats = computed(() => {
  const stats: Record<MealDishKind, number> = {
    meat: 0,
    vegetable: 0,
    soup: 0,
    staple: 0,
  }

  selectedDishes.value.forEach((dish) => {
    stats[mealDishKindFor(dish.recipe)] += 1
  })
  return stats
})

const visibleStats = computed(() => [
  { id: 'meat', icon: '🍖', count: dishStats.value.meat, label: '荤' },
  { id: 'vegetable', icon: '🌿', count: dishStats.value.vegetable, label: '素' },
  { id: 'soup', icon: '🍲', count: dishStats.value.soup, label: '汤' },
  { id: 'staple', icon: '🍚', count: dishStats.value.staple, label: '主食' },
].filter(item => item.count > 0))

const pairingText = computed(() => {
  if (dishStats.value.meat && dishStats.value.vegetable && dishStats.value.soup) return '搭配刚刚好'
  if (!dishStats.value.vegetable) return '再加道素菜更均衡'
  if (!dishStats.value.soup) return '加碗汤更舒服'
  return '这一餐很丰富'
})

function wishLabel(item: MealDish) {
  if (!item.wishCount) return '已加入菜单'
  if (item.wishers.some(wisher => wisher.userId === meal.value?.currentUserId)) {
    return item.wishCount === 1 ? '你想吃' : `你和其他 ${item.wishCount - 1} 人想吃`
  }
  const names = item.wishers.slice(0, 2).map(wisher => wisher.nickname).filter(Boolean)
  if (!names.length) return `${item.wishCount} 人想吃`
  return item.wishCount > names.length
    ? `${names.join('、')}等 ${item.wishCount} 人想吃`
    : `${names.join('、')}想吃`
}

async function loadMenu(force = false) {
  if (requestedMealId.value) await mealStore.loadMealById(requestedMealId.value, force)
  else await mealStore.loadMeal(force)
  restoreNotificationState()
  if (meal.value?.status === 'confirmed' && !redirecting.value) {
    redirecting.value = true
    uni.redirectTo({ url: `/pages/menu/confirmed?mealId=${encodeURIComponent(meal.value.id)}` })
  }
}

async function loadWechatCapabilities() {
  try {
    const capabilities = await authApi.getCapabilities()
    mealNotificationTemplateId.value = capabilities.mealNotification?.templateId ?? ''
    restoreNotificationState()
  } catch {
    mealNotificationTemplateId.value = ''
  }
}

async function subscribeForMeal(showFeedback = true) {
  const mealId = meal.value?.id
  if (!mealId || !mealNotificationTemplateId.value || subscribingNotification.value) return false
  const storageKey = notificationStorageKey(mealId)
  subscribingNotification.value = true
  try {
    const result = await requestMealNotification(mealId, mealNotificationTemplateId.value)
    const accepted = result === 'accepted'
    if (storageKey) {
      if (accepted) uni.setStorageSync(storageKey, true)
      else uni.removeStorageSync(storageKey)
    }
    if (meal.value?.id === mealId) notificationAccepted.value = accepted
    if (showFeedback) {
      uni.showToast({
        title: accepted ? '本餐通知已开启' : '未开启通知',
        icon: accepted ? 'success' : 'none',
      })
    }
    return accepted
  } catch (error) {
    if (showFeedback) {
      uni.showToast({ title: error instanceof Error ? error.message : '通知授权未完成', icon: 'none' })
    }
    return false
  } finally {
    subscribingNotification.value = false
  }
}

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/index/index' })
}

function continueSelecting() {
  goBack()
}

function showShareHint() {
  uni.showToast({ title: '可从下方邀请饭搭子', icon: 'none' })
}

async function confirmMenu() {
  if (confirming.value) return
  if (!selectedDishes.value.length) {
    uni.showToast({ title: '先选几道想吃的菜吧', icon: 'none' })
    return
  }
  const mealId = meal.value?.id
  if (!mealId) return
  confirming.value = true
  if (mealNotificationTemplateId.value && !notificationAccepted.value) await subscribeForMeal(false)
  const confirmed = await mealStore.confirmMeal()
  confirming.value = false
  if (!confirmed) {
    uni.showToast({ title: errorMessage.value || '菜单确认失败，请重试', icon: 'none' })
    return
  }
  const confirmedMealId = meal.value?.id ?? mealId
  const notificationKey = notificationStorageKey(confirmedMealId)
  if (notificationKey) uni.removeStorageSync(notificationKey)
  uni.redirectTo({ url: `/pages/menu/confirmed?mealId=${encodeURIComponent(confirmedMealId)}` })
}

function memberInitial(nickname: string) {
  return nickname.trim().slice(0, 1) || '友'
}

function markAvatarError(userId: string) {
  if (!avatarErrors.value.includes(userId)) avatarErrors.value = [...avatarErrors.value, userId]
}

function canShowAvatar(userId: string, avatar: string) {
  return Boolean(avatar && !avatarErrors.value.includes(userId))
}

onLoad((options) => {
  requestedMealId.value = typeof options?.mealId === 'string' ? options.mealId.trim() : ''
  void loadWechatCapabilities()
  void loadMenu(true)
})
onShow(() => {
  mealStore.refreshAuth()
  void loadMenu(true)
})

onShareAppMessage(() => ({
  title: selectedDishes.value.length
    ? `${meal.value?.title || '今晚'}想吃：${selectedDishes.value.map(item => item.recipe.name).join('、')}`
    : '来饭搭子一起点今晚的菜',
  path: mealSharePath('/pages/index/index', meal.value?.id, meal.value?.inviteCode),
}))
</script>

<template>
  <view class="menu-page">
    <view class="menu-page__glow" />

    <AppHeader
      :title="headerTitle"
      :show-back="true"
      :centered="true"
      :page-padding="30"
      action-label="分享菜单"
      @back="goBack"
      @action="showShareHint"
    >
      <template #action>
        <view class="share-icon" aria-hidden="true">
          <view class="share-icon__line share-icon__line--top" />
          <view class="share-icon__line share-icon__line--bottom" />
          <view class="share-icon__dot share-icon__dot--left" />
          <view class="share-icon__dot share-icon__dot--top" />
          <view class="share-icon__dot share-icon__dot--bottom" />
        </view>
      </template>
    </AppHeader>

    <view v-if="meal" class="party-card">
      <view class="party-card__mascot-wrap">
        <image class="party-card__mascot" src="/static/images/home/meal-mascot.png" mode="aspectFit" />
      </view>
      <view class="party-card__content">
        <text class="party-card__title">{{ meal?.title || '今晚晚餐' }} · {{ memberCount }} 人</text>
        <view class="party-card__people">
          <scroll-view class="avatar-scroll" scroll-x :show-scrollbar="false">
            <view class="avatar-list">
              <view
                v-for="member in members"
                :key="member.userId"
                class="avatar"
              >
                <image
                  v-if="canShowAvatar(member.userId, member.avatar)"
                  class="avatar__image"
                  :src="member.avatar"
                  mode="aspectFill"
                  @error="markAvatarError(member.userId)"
                />
                <text v-else>{{ memberInitial(member.nickname) }}</text>
              </view>
            </view>
          </scroll-view>
          <button class="invite-button" open-type="share">邀请</button>
        </view>
        <text class="party-card__hint">{{ memberSummary }}</text>
        <button
          v-if="mealNotificationTemplateId && meal?.status === 'active'"
          class="party-card__notice"
          :class="{ 'party-card__notice--active': notificationAccepted }"
          :loading="subscribingNotification"
          :disabled="subscribingNotification"
          @click="subscribeForMeal(true)"
        >{{ notificationAccepted ? '✓ 本餐会微信通知' : '🔔 菜单定了通知我' }}</button>
      </view>
    </view>

    <view v-if="selectedDishes.length" class="balance-card">
      <view class="balance-card__stats">
        <view v-for="item in visibleStats" :key="item.id" class="balance-stat">
          <text class="balance-stat__icon">{{ item.icon }}</text>
          <text class="balance-stat__count">{{ item.count }}</text>
          <text class="balance-stat__label">{{ item.label }}</text>
        </view>
      </view>
      <view class="balance-card__result">
        <text class="balance-card__check">✓</text>
        <text>{{ pairingText }}</text>
      </view>
    </view>

    <view v-if="pageLoading && !selectedDishes.length" class="dish-section dish-section--loading">
      <view class="section-heading section-heading--skeleton" />
      <view v-for="index in 4" :key="index" class="dish-card dish-card--skeleton">
        <view class="skeleton skeleton--image" />
        <view class="skeleton-copy">
          <view class="skeleton skeleton--title" />
          <view class="skeleton skeleton--tag" />
        </view>
        <view class="skeleton skeleton--stepper" />
      </view>
    </view>

    <button v-else-if="errorMessage && !selectedDishes.length" class="state-card" @click="loadMenu(true)">
      <text class="state-card__emoji">🍲</text>
      <text class="state-card__title">菜单暂时没端上来</text>
      <text class="state-card__copy">{{ errorMessage || '有已选菜品暂未加载，请稍后重试' }}</text>
      <text class="state-card__action">点击重新加载</text>
    </button>

    <view v-else-if="selectedDishes.length" class="dish-section">
      <view class="section-heading">
        <text>已点 <text class="section-heading__number">{{ dishCount }}</text> 道</text>
        <view class="section-heading__spark"><text /> <text /> <text /></view>
      </view>

      <view v-for="item in selectedDishes" :key="item.recipe.id" class="dish-card">
        <image class="dish-card__image" :src="dishImageFor(item.recipe)" mode="aspectFill" />
        <view class="dish-card__copy">
          <text class="dish-card__name">{{ item.recipe.name }}</text>
          <text class="dish-card__tag">{{ wishLabel(item) }}</text>
        </view>
        <view class="stepper">
          <button
            class="stepper__button stepper__button--minus"
            :aria-label="`减少一份${item.recipe.name}`"
            :disabled="pendingRecipeId === item.recipe.id"
            @click="mealStore.decrementRecipe(item.recipe.id)"
          >−</button>
          <text class="stepper__value">{{ item.quantity }}</text>
          <button
            class="stepper__button stepper__button--plus"
            :aria-label="`增加一份${item.recipe.name}`"
            :disabled="pendingRecipeId === item.recipe.id"
            @click="mealStore.incrementRecipe(item.recipe.id)"
          >＋</button>
        </view>
        <button
          class="remove-button"
          :aria-label="`从菜单移除${item.recipe.name}`"
          :disabled="pendingRecipeId === item.recipe.id"
          @click="mealStore.removeRecipe(item.recipe.id)"
        >×</button>
      </view>

      <button class="add-more-card" @click="continueSelecting">
        <text class="add-more-card__icon">＋</text>
        <text>帮我加一道</text>
      </button>
    </view>

    <view v-else class="state-card state-card--empty">
      <image class="state-card__mascot" src="/static/images/home/meal-mascot.png" mode="aspectFit" />
      <text class="state-card__title">{{ loggedIn ? '这顿饭还没点菜' : '登录后查看菜单' }}</text>
      <text class="state-card__copy">{{ loggedIn ? '先去挑几道自己或大家想吃的菜吧' : '返回选择菜品页，用微信登录后就能开始点菜' }}</text>
      <button class="state-card__primary" @click="continueSelecting">{{ loggedIn ? '去选菜' : '返回登录' }}</button>
    </view>

    <view v-if="selectedDishes.length" class="menu-footer">
      <view class="menu-footer__inner">
        <button class="footer-button footer-button--secondary" @click="continueSelecting">继续加菜</button>
        <button class="footer-button footer-button--primary" :loading="confirming" :disabled="confirming" @click="confirmMenu">{{ confirming ? '正在确认…' : '就吃这些' }}</button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.menu-page {
  position: relative;
  min-height: 100vh;
  padding: 0 30rpx calc(env(safe-area-inset-bottom) + 194rpx);
  overflow-x: hidden;
  background: $color-page;
  box-sizing: border-box;
}

.menu-page__glow {
  position: absolute;
  top: -100rpx;
  right: -120rpx;
  width: 440rpx;
  height: 390rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 230, 198, 0.66), transparent 70%);
  pointer-events: none;
}

.share-icon {
  position: relative;
  width: 44rpx;
  height: 44rpx;
}

.share-icon__line {
  position: absolute;
  left: 12rpx;
  width: 23rpx;
  height: 3rpx;
  border-radius: 2rpx;
  background: #432616;
  transform-origin: left center;
}

.share-icon__line--top { top: 19rpx; transform: rotate(-31deg); }
.share-icon__line--bottom { top: 25rpx; transform: rotate(31deg); }

.share-icon__dot {
  position: absolute;
  width: 10rpx;
  height: 10rpx;
  border: 3rpx solid #432616;
  border-radius: 50%;
  background: $color-page;
  box-sizing: border-box;
}

.share-icon__dot--left { top: 18rpx; left: 3rpx; }
.share-icon__dot--top { top: 4rpx; right: 1rpx; }
.share-icon__dot--bottom { right: 1rpx; bottom: 4rpx; }

.party-card,
.balance-card,
.dish-section,
.state-card {
  position: relative;
  z-index: 1;
}

.party-card {
  display: flex;
  min-height: 210rpx;
  margin-top: 26rpx;
  padding: 24rpx 22rpx 24rpx 16rpx;
  align-items: center;
  border: 3rpx solid rgba(255, 255, 255, 0.95);
  border-radius: 32rpx;
  background: linear-gradient(112deg, #fffaf3, rgba(255, 255, 255, 0.98));
  box-shadow: 0 12rpx 34rpx rgba(100, 60, 27, 0.07);
  box-sizing: border-box;
}

.party-card__mascot-wrap {
  display: flex;
  width: 184rpx;
  height: 166rpx;
  flex: 0 0 184rpx;
  align-items: center;
  justify-content: center;
}

.party-card__mascot {
  width: 184rpx;
  height: 174rpx;
}

.party-card__content {
  min-width: 0;
  padding-left: 10rpx;
  flex: 1;
}

.party-card__title {
  display: block;
  overflow: hidden;
  color: #3d2113;
  font-size: 32rpx;
  font-weight: 800;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.party-card__people {
  display: flex;
  min-width: 0;
  margin-top: 14rpx;
  align-items: center;
}

.avatar-scroll {
  width: 0;
  height: 60rpx;
  min-width: 0;
  flex: 1;
  white-space: nowrap;
}

.avatar-list {
  display: inline-flex;
  height: 60rpx;
  padding-right: 10rpx;
  align-items: center;
  vertical-align: top;
  box-sizing: border-box;
}

.avatar {
  display: flex;
  width: 60rpx;
  height: 60rpx;
  margin-left: -8rpx;
  overflow: hidden;
  flex: 0 0 60rpx;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #fff;
  border-radius: 50%;
  background: #f5e4d5;
  box-shadow: 0 3rpx 10rpx rgba(85, 51, 24, 0.1);
  font-size: 34rpx;
  box-sizing: border-box;
}

.avatar:first-child { margin-left: 0; }
.avatar__image { width: 100%; height: 100%; }
.avatar--2 { background: #f8dfdb; }
.avatar--3 { background: #dceee6; }
.avatar--4 { background: #f8edc9; }

.invite-button {
  display: flex;
  min-width: 106rpx;
  height: 64rpx;
  margin-left: 12rpx;
  padding: 0 24rpx;
  align-items: center;
  justify-content: center;
  color: $color-primary-deep;
  border: 2rpx solid $color-primary;
  border-radius: 31rpx;
  background: #fffaf3;
  font-size: 25rpx;
  font-weight: 700;
}

.party-card__hint {
  display: block;
  margin-top: 8rpx;
  overflow: hidden;
  color: #948d87;
  font-size: 24rpx;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.party-card__notice {
  display: inline-flex;
  min-height: 52rpx;
  margin-top: 10rpx;
  padding: 0 16rpx;
  align-items: center;
  justify-content: center;
  border-radius: 26rpx;
  background: #fff3e3;
  color: $color-primary-deep;
  font-size: 24rpx;
  font-weight: 700;
}

.party-card__notice--active { background: #edf8e6; color: #57943b; }

.balance-card {
  display: flex;
  min-height: 98rpx;
  margin-top: 18rpx;
  padding: 15rpx 18rpx;
  align-items: center;
  border-radius: 28rpx;
  background: #fff;
  border: 1rpx solid rgba(99, 66, 41, 0.03);
  box-shadow: 0 9rpx 28rpx rgba(83, 49, 24, 0.055);
  box-sizing: border-box;
}

.balance-card__stats {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
}

.balance-stat {
  display: flex;
  min-width: 0;
  height: 44rpx;
  padding: 0 15rpx;
  align-items: center;
  border-right: 1rpx solid #ded8d2;
}

.balance-stat:first-child { padding-left: 2rpx; }
.balance-stat:last-child { border-right: 0; }
.balance-stat__icon { margin-right: 8rpx; font-size: 27rpx; }
.balance-stat__count { color: #351f14; font-size: 27rpx; font-weight: 800; }
.balance-stat__label { margin-left: 5rpx; color: #351f14; font-size: 24rpx; }

.balance-card__result {
  display: flex;
  min-height: 56rpx;
  padding: 0 16rpx;
  align-items: center;
  justify-content: center;
  color: #55783d;
  border-radius: 19rpx;
  background: $color-success-soft;
  font-size: 24rpx;
  font-weight: 700;
  white-space: nowrap;
}

.balance-card__check {
  display: flex;
  width: 36rpx;
  height: 36rpx;
  margin-right: 8rpx;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-radius: 50%;
  background: #63b94f;
  font-size: 25rpx;
  line-height: 1;
}

.dish-section { margin-top: 26rpx; }

.section-heading {
  display: flex;
  height: 64rpx;
  padding: 0 8rpx;
  align-items: center;
  color: #432617;
  font-size: 32rpx;
  font-weight: 800;
}

.section-heading__number {
  color: $color-primary-deep;
  font-size: 46rpx;
  line-height: 1;
}

.section-heading__spark {
  position: relative;
  width: 43rpx;
  height: 38rpx;
  margin-left: 9rpx;
}

.section-heading__spark text {
  position: absolute;
  width: 5rpx;
  height: 18rpx;
  border-radius: 5rpx;
  background: $color-primary;
  transform: rotate(-35deg);
}

.section-heading__spark text:nth-child(1) { top: 2rpx; left: 5rpx; }
.section-heading__spark text:nth-child(2) { top: 1rpx; right: 10rpx; transform: rotate(25deg); }
.section-heading__spark text:nth-child(3) { right: 0; bottom: 1rpx; height: 13rpx; transform: rotate(68deg); }

.dish-card {
  display: flex;
  width: 100%;
  min-height: 140rpx;
  margin-top: 14rpx;
  padding: 11rpx 12rpx 11rpx 11rpx;
  align-items: center;
  border: 1rpx solid rgba(99, 66, 41, 0.025);
  border-radius: 27rpx;
  background: #fff;
  box-shadow: 0 8rpx 26rpx rgba(86, 50, 24, 0.055);
  box-sizing: border-box;
}

.dish-card__image {
  width: 180rpx;
  height: 118rpx;
  flex: 0 0 180rpx;
  border-radius: 20rpx;
  background: #f3e9df;
}

.dish-card__copy {
  display: flex;
  min-width: 0;
  padding: 0 12rpx 0 17rpx;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
}

.dish-card__name {
  max-width: 100%;
  overflow: hidden;
  color: #352015;
  font-size: 29rpx;
  font-weight: 800;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dish-card__tag {
  max-width: 100%;
  margin-top: 10rpx;
  padding: 5rpx 11rpx;
  overflow: hidden;
  color: #d87223;
  border-radius: 12rpx;
  background: #fff3e3;
  font-size: 24rpx;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stepper {
  display: flex;
  height: 64rpx;
  flex: 0 0 auto;
  align-items: center;
  overflow: hidden;
  border-radius: 32rpx;
  background: #fffaf3;
}

.stepper__button {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  padding: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 38rpx;
  font-weight: 600;
  line-height: 1;
}

.stepper__button--minus { color: $color-primary-deep; background: #fff1dc; }
.stepper__button--plus { color: #fff; background: linear-gradient(135deg, #ff9f22, #ff7300); }
.stepper__value { width: 45rpx; color: #211b17; font-size: 29rpx; font-weight: 700; text-align: center; }

.remove-button {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  margin-left: 5rpx;
  padding: 0;
  flex: 0 0 64rpx;
  align-items: center;
  justify-content: center;
  color: #a29c97;
  font-size: 47rpx;
  font-weight: 300;
  line-height: 1;
}

.add-more-card {
  display: flex;
  width: 100%;
  height: 98rpx;
  margin-top: 20rpx;
  align-items: center;
  justify-content: center;
  color: #423932;
  border: 2rpx dashed #ffc986;
  border-radius: 28rpx;
  font-size: 27rpx;
  font-weight: 650;
}

.add-more-card__icon {
  display: flex;
  width: 54rpx;
  height: 54rpx;
  margin-right: 16rpx;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-radius: 50%;
  background: linear-gradient(145deg, #ff9e1e, #ff7300);
  font-size: 39rpx;
  line-height: 1;
}

.state-card {
  display: flex;
  width: 100%;
  min-height: 390rpx;
  margin-top: 30rpx;
  padding: 48rpx 34rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: $shadow-card;
  text-align: center;
  box-sizing: border-box;
}

.state-card__emoji { font-size: 82rpx; }
.state-card__mascot { width: 210rpx; height: 176rpx; }
.state-card__title { margin-top: 20rpx; color: $color-text; font-size: 31rpx; font-weight: 800; }
.state-card__copy { margin-top: 12rpx; color: $color-text-secondary; font-size: 24rpx; line-height: 1.55; }
.state-card__action { margin-top: 26rpx; color: $color-primary-deep; font-size: 26rpx; font-weight: 700; }

.state-card__primary {
  min-width: 236rpx;
  height: 76rpx;
  margin-top: 28rpx;
  padding: 0 36rpx;
  color: #fff;
  border-radius: 38rpx;
  background: linear-gradient(135deg, #ffa529, #ff7600);
  box-shadow: 0 10rpx 24rpx rgba(255, 118, 0, 0.2);
  font-size: 27rpx;
  font-weight: 750;
  line-height: 76rpx;
}

.dish-section--loading { padding-top: 4rpx; }
.section-heading--skeleton { width: 190rpx; height: 42rpx; margin: 11rpx 8rpx; padding: 0; border-radius: 15rpx; background: #eee5dc; }
.dish-card--skeleton { height: 130rpx; }
.skeleton { background: linear-gradient(90deg, #f0e9e2 25%, #faf6f1 50%, #f0e9e2 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
.skeleton--image { width: 174rpx; height: 108rpx; border-radius: 20rpx; }
.skeleton-copy { min-width: 0; padding: 0 17rpx; flex: 1; }
.skeleton--title { width: 78%; height: 27rpx; border-radius: 10rpx; }
.skeleton--tag { width: 54%; height: 23rpx; margin-top: 14rpx; border-radius: 10rpx; }
.skeleton--stepper { width: 150rpx; height: 64rpx; border-radius: 32rpx; }

.menu-footer {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 20rpx 30rpx calc(env(safe-area-inset-bottom) + 20rpx);
  border-top: 1rpx solid rgba(118, 75, 43, 0.06);
  background: rgba(255, 250, 244, 0.97);
  box-shadow: 0 -10rpx 34rpx rgba(76, 45, 23, 0.07);
}

.menu-footer__inner {
  display: flex;
  max-width: 690rpx;
  margin: 0 auto;
  gap: 18rpx;
}

.footer-button {
  height: 92rpx;
  flex: 1;
  border-radius: 44rpx;
  font-size: 29rpx;
  font-weight: 800;
  line-height: 88rpx;
}

.footer-button--secondary {
  color: $color-primary-deep;
  border: 3rpx solid $color-primary;
  background: #fffdf9;
}

.footer-button--primary {
  color: #fff;
  background: linear-gradient(135deg, #ffa92f, #ff7600);
  box-shadow: 0 11rpx 27rpx rgba(255, 118, 0, 0.22);
}

@keyframes shimmer { to { background-position: -200% 0; } }

@media (max-width: 360px) {
  .party-card { padding-right: 16rpx; }
  .party-card__mascot-wrap { width: 142rpx; flex-basis: 142rpx; }
  .party-card__mascot { width: 150rpx; }
  .balance-stat { padding: 0 9rpx; }
  .balance-card__result { padding: 0 10rpx; }
  .dish-card__image { width: 148rpx; flex-basis: 148rpx; }
  .dish-card__copy { padding-right: 7rpx; padding-left: 12rpx; }
}

@media (min-width: 500px) {
  .menu-page { max-width: 750rpx; margin: 0 auto; }
}
</style>
