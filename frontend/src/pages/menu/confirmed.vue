<script setup lang="ts">
import { onLoad, onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { useMealClock } from '@/composables/useMealClock'
import { dishImageFor } from '@/config/dish-images'
import { mealSharePath } from '@/config/meal-share'
import { useMealStore } from '@/stores/meal'

const mealStore = useMealStore()
const {
  meal,
  members,
  memberCount,
  dishCount: mealDishCount,
  selectedDishes,
  mealLoading: pageLoading,
  mealError: errorMessage,
  canReopen,
  beforeMealStart,
} = storeToRefs(mealStore)
useMealClock()
const avatarErrors = ref<string[]>([])
const redirecting = ref(false)
const requestedMealId = ref('')

async function loadConfirmedMenu(force = false) {
  if (requestedMealId.value) await mealStore.loadMealById(requestedMealId.value, force)
  else await mealStore.loadMeal(force)
  if (meal.value?.status === 'active' && !redirecting.value) {
    redirecting.value = true
    uni.redirectTo({ url: `/pages/menu/menu?mealId=${encodeURIComponent(meal.value.id)}` })
  }
}

function goBack() {
  uni.switchTab({ url: '/pages/index/index' })
}

function returnToSelection() {
  uni.switchTab({ url: '/pages/index/index' })
}

async function modifyMenu() {
  if (pageLoading.value || redirecting.value) return
  const reopened = await mealStore.reopenMeal()
  if (!reopened) {
    uni.showToast({ title: errorMessage.value || '菜单暂未恢复编辑，请重试', icon: 'none' })
    return
  }
  redirecting.value = true
  uni.redirectTo({ url: `/pages/menu/menu?mealId=${encodeURIComponent(meal.value!.id)}` })
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
  void loadConfirmedMenu(true)
})
onShow(() => {
  mealStore.refreshAuth()
  void loadConfirmedMenu(true)
})

onShareAppMessage(() => ({
  title: selectedDishes.value.length
    ? `${meal.value?.title || '今晚'}菜单已定：${selectedDishes.value.map(item => item.recipe.name).join('、')}`
    : '今晚一起吃什么？来饭搭子点菜吧',
  path: mealSharePath('/pages/index/index', meal.value?.id, meal.value?.inviteCode),
}))
</script>

<template>
  <view class="confirmed-page">
    <view class="confirmed-page__glow confirmed-page__glow--top" />
    <view class="confirmed-page__glow confirmed-page__glow--side" />

    <AppHeader title="" :show-back="true" :centered="true" :page-padding="30" @back="goBack" />

    <view v-if="pageLoading && !selectedDishes.length" class="result-state result-state--loading">
      <view class="loading-mascot skeleton" />
      <view class="loading-title skeleton" />
      <view class="loading-subtitle skeleton" />
      <view class="loading-grid">
        <view v-for="index in 4" :key="index" class="loading-dish skeleton" />
      </view>
    </view>

    <button
      v-else-if="errorMessage && !selectedDishes.length"
      class="result-state result-state--error"
      @click="loadConfirmedMenu(true)"
    >
      <text class="result-state__emoji">🍲</text>
      <text class="result-state__title">菜单暂时没端上来</text>
      <text class="result-state__copy">{{ errorMessage || '有已选菜品暂未加载，请稍后重试' }}</text>
      <text class="result-state__action">点击重新加载</text>
    </button>

    <template v-else-if="selectedDishes.length">
      <view class="celebration">
        <text class="celebration__heart celebration__heart--left">♥</text>
        <text class="celebration__heart celebration__heart--right">♥</text>
        <view class="celebration__spark celebration__spark--left"><text /><text /><text /></view>
        <view class="celebration__spark celebration__spark--right"><text /><text /><text /></view>
        <image class="celebration__mascot" src="/static/images/home/meal-mascot.png" mode="aspectFit" />
        <text class="celebration__title">菜单已定</text>
        <text class="celebration__subtitle">{{ meal?.title || '今晚' }}就吃这 {{ mealDishCount }} 道</text>
      </view>

      <view class="dish-grid">
        <view v-for="item in selectedDishes" :key="item.recipe.id" class="dish-tile">
          <view class="dish-tile__visual">
            <image class="dish-tile__image" :src="dishImageFor(item.recipe)" mode="aspectFill" />
            <text v-if="item.quantity > 1" class="dish-tile__quantity">×{{ item.quantity }}</text>
          </view>
          <text class="dish-tile__name">{{ item.recipe.name }}</text>
        </view>
      </view>

      <view class="friends-card">
        <text class="friends-card__title">{{ memberCount }} 位饭搭子已加入</text>
        <view class="friends-card__people">
          <view class="friends-card__ray friends-card__ray--left"><text /><text /></view>
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
          <view class="friends-card__ray friends-card__ray--right"><text /><text /></view>
        </view>
      </view>

      <button class="share-button" open-type="share">
        <image class="share-button__icon" src="/static/icons/share-white.svg" mode="aspectFit" />
        <text>分享给饭搭子</text>
      </button>
      <button v-if="canReopen" class="modify-button" :loading="pageLoading" :disabled="pageLoading" @click="modifyMenu">{{ pageLoading ? '正在恢复编辑…' : '修改本餐菜单' }}</button>
      <text v-if="meal?.isMember" class="edit-hint">{{ beforeMealStart ? `开饭前可修改，修改后需重新确认（${meal?.mealType === 'lunch' ? '12:00' : '19:00'} 开饭）` : '已到开饭时间，本餐菜单已锁定' }}</text>
      <button class="restart-button" @click="returnToSelection">返回首页</button>
    </template>

    <view v-else class="result-state result-state--empty">
      <image class="result-state__mascot" src="/static/images/home/meal-mascot.png" mode="aspectFit" />
      <text class="result-state__title">还没有确定菜单</text>
      <text class="result-state__copy">先去选几道想吃的菜，再来敲定今晚这一餐。</text>
      <button class="result-state__primary" @click="returnToSelection">返回选菜</button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.confirmed-page {
  position: relative;
  min-height: 100vh;
  padding: 0 30rpx calc(env(safe-area-inset-bottom) + 42rpx);
  overflow-x: hidden;
  background: linear-gradient(180deg, #fffaf2 0%, $color-page 46%, #fffaf4 100%);
  box-sizing: border-box;
}

.confirmed-page__glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.confirmed-page__glow--top {
  top: -120rpx;
  right: -80rpx;
  width: 420rpx;
  height: 390rpx;
  background: radial-gradient(circle, rgba(255, 231, 194, 0.65), transparent 70%);
}

.confirmed-page__glow--side {
  top: 380rpx;
  left: -210rpx;
  width: 460rpx;
  height: 460rpx;
  background: radial-gradient(circle, rgba(255, 241, 220, 0.72), transparent 70%);
}

.celebration,
.dish-grid,
.friends-card,
.share-button,
.restart-button,
.result-state {
  position: relative;
  z-index: 1;
}

.celebration {
  display: flex;
  margin-top: -18rpx;
  flex-direction: column;
  align-items: center;
}

.celebration__mascot {
  width: 228rpx;
  height: 202rpx;
}

.celebration__title {
  margin-top: 5rpx;
  color: #3e2416;
  font-size: 40rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
  line-height: 1.2;
}

.celebration__subtitle {
  margin-top: 13rpx;
  color: #f05218;
  font-size: 39rpx;
  font-weight: 900;
  line-height: 1.2;
}

.celebration__heart {
  position: absolute;
  color: #ffd58b;
  line-height: 1;
}

.celebration__heart--left { top: 74rpx; left: 65rpx; font-size: 50rpx; transform: rotate(-16deg); }
.celebration__heart--right { top: 26rpx; right: 62rpx; font-size: 68rpx; transform: rotate(13deg); opacity: 0.72; }

.celebration__spark {
  position: absolute;
  bottom: 5rpx;
  width: 54rpx;
  height: 60rpx;
}

.celebration__spark--left { left: 38rpx; }
.celebration__spark--right { right: 38rpx; transform: scaleX(-1); }

.celebration__spark text {
  position: absolute;
  width: 6rpx;
  height: 22rpx;
  border-radius: 5rpx;
  background: $color-primary;
}

.celebration__spark text:nth-child(1) { top: 5rpx; left: 4rpx; transform: rotate(-34deg); }
.celebration__spark text:nth-child(2) { top: 0; left: 26rpx; transform: rotate(5deg); }
.celebration__spark text:nth-child(3) { top: 24rpx; left: 42rpx; transform: rotate(55deg); }

.dish-grid {
  display: grid;
  margin-top: 30rpx;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.dish-tile {
  min-width: 0;
  overflow: hidden;
  border: 1rpx solid rgba(99, 66, 41, 0.035);
  border-radius: 25rpx;
  background: #fff;
  box-shadow: 0 9rpx 26rpx rgba(91, 55, 28, 0.055);
}

.dish-tile__visual {
  position: relative;
  width: 100%;
  height: 214rpx;
  overflow: hidden;
  background: #f2e8df;
}

.dish-tile__image {
  width: 100%;
  height: 100%;
}

.dish-tile__quantity {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  display: flex;
  min-width: 50rpx;
  height: 45rpx;
  padding: 0 12rpx;
  align-items: center;
  justify-content: center;
  color: #fff;
  border: 3rpx solid rgba(255, 255, 255, 0.92);
  border-radius: 24rpx;
  background: rgba(255, 118, 0, 0.92);
  font-size: 24rpx;
  font-weight: 800;
  box-sizing: border-box;
}

.dish-tile__name {
  display: block;
  height: 70rpx;
  padding: 0 15rpx;
  overflow: hidden;
  color: #352116;
  font-size: 27rpx;
  font-weight: 800;
  line-height: 70rpx;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-sizing: border-box;
}

.friends-card {
  display: flex;
  min-height: 192rpx;
  margin-top: 23rpx;
  padding: 26rpx 24rpx 24rpx;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid rgba(255, 255, 255, 0.9);
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10rpx 30rpx rgba(91, 55, 28, 0.05);
  box-sizing: border-box;
}

.friends-card__title {
  color: #3a281d;
  font-size: 28rpx;
  font-weight: 800;
}

.friends-card__people {
  position: relative;
  display: flex;
  width: 100%;
  margin-top: 20rpx;
  align-items: center;
  justify-content: center;
}

.avatar-list {
  display: flex;
  max-width: 520rpx;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  row-gap: 10rpx;
}

.avatar {
  display: flex;
  width: 68rpx;
  height: 68rpx;
  margin-left: 12rpx;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #fff;
  border-radius: 50%;
  background: #f1dfce;
  box-shadow: 0 4rpx 13rpx rgba(84, 50, 25, 0.1);
  font-size: 42rpx;
  box-sizing: border-box;
}

.avatar:first-child { margin-left: 0; }
.avatar__image { width: 100%; height: 100%; }
.avatar--2 { background: #f7ddda; }
.avatar--3 { background: #dbeee5; }
.avatar--4 { background: #f8ebc6; }

.friends-card__ray {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  margin: 0 19rpx;
}

.friends-card__ray text {
  position: absolute;
  width: 7rpx;
  height: 22rpx;
  border-radius: 5rpx;
  background: #ffc466;
}

.friends-card__ray text:first-child { top: 5rpx; left: 22rpx; transform: rotate(-42deg); }
.friends-card__ray text:last-child { bottom: 5rpx; left: 7rpx; transform: rotate(86deg); }
.friends-card__ray--right { transform: scaleX(-1); }

.share-button {
  display: flex;
  width: 100%;
  height: 88rpx;
  padding: 0 28rpx;
  margin-top: 24rpx;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #ffa92f, #ff7900);
  box-shadow: 0 12rpx 28rpx rgba(255, 118, 0, 0.22);
  font-size: 29rpx;
  font-weight: 800;
  line-height: 1;
  box-sizing: border-box;
}

.share-button__icon {
  width: 40rpx;
  height: 40rpx;
  flex: 0 0 40rpx;
  margin-right: 14rpx;
}

.restart-button {
  display: flex;
  min-width: 180rpx;
  height: 70rpx;
  margin: 11rpx auto 0;
  align-items: center;
  justify-content: center;
  color: #918982;
  font-size: 25rpx;
}

.modify-button {
  position: relative;
  display: flex;
  width: 100%;
  height: 84rpx;
  margin-top: 20rpx;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $color-primary;
  border-radius: 42rpx;
  background: $color-card;
  color: $color-primary-deep;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.2;
}
.edit-hint { position: relative; display: block; margin-top: 16rpx; color: $color-text-secondary; font-size: 24rpx; line-height: 1.5; text-align: center; }

.result-state {
  display: flex;
  width: 100%;
  min-height: 620rpx;
  padding: 70rpx 34rpx 50rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;
}

.result-state__emoji { font-size: 90rpx; }
.result-state__mascot { width: 260rpx; height: 230rpx; }
.result-state__title { margin-top: 22rpx; color: $color-text; font-size: 34rpx; font-weight: 850; }
.result-state__copy { max-width: 480rpx; margin-top: 15rpx; color: $color-text-secondary; font-size: 24rpx; line-height: 1.6; }
.result-state__action { margin-top: 28rpx; color: $color-primary-deep; font-size: 26rpx; font-weight: 750; }

.result-state__primary {
  min-width: 260rpx;
  height: 82rpx;
  margin-top: 32rpx;
  padding: 0 40rpx;
  color: #fff;
  border-radius: 41rpx;
  background: linear-gradient(135deg, #ffa92f, #ff7600);
  box-shadow: 0 11rpx 27rpx rgba(255, 118, 0, 0.22);
  font-size: 28rpx;
  font-weight: 800;
  line-height: 82rpx;
}

.result-state--loading { justify-content: flex-start; padding-top: 30rpx; }
.skeleton { background: linear-gradient(90deg, #eee5db 25%, #faf5ef 50%, #eee5db 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
.loading-mascot { width: 220rpx; height: 190rpx; border-radius: 48%; }
.loading-title { width: 190rpx; height: 40rpx; margin-top: 18rpx; border-radius: 16rpx; }
.loading-subtitle { width: 300rpx; height: 38rpx; margin-top: 17rpx; border-radius: 16rpx; }
.loading-grid { display: grid; width: 100%; margin-top: 32rpx; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16rpx; }
.loading-dish { height: 278rpx; border-radius: 25rpx; }

@keyframes shimmer { to { background-position: -200% 0; } }

@media (max-width: 360px) {
  .celebration__heart--left { left: 36rpx; }
  .celebration__heart--right { right: 35rpx; }
  .dish-tile__visual { height: 190rpx; }
  .friends-card__ray { margin: 0 10rpx; }
}

@media (min-width: 500px) {
  .confirmed-page { max-width: 750rpx; margin: 0 auto; }
}
</style>
