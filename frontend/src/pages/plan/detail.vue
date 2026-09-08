<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import AppTabBar from '@/components/AppTabBar.vue'
import { experienceApi } from '@/services/experience'
import type { PlanMeal, PlanNutrient, PlanReminder } from '@/types/experience'

const planMeals = ref<PlanMeal[]>([])
const nutrients = ref<PlanNutrient[]>([])
const reminders = ref<PlanReminder[]>([])
const loading = ref(false)
const errorMessage = ref('')
const requestedDate = ref('')
const calories = computed<Record<string, number>>(() => Object.fromEntries(planMeals.value.map(meal => [meal.id, meal.calories])))

async function loadDetail() {
  loading.value = true
  errorMessage.value = ''
  try {
    const payload = await experienceApi.getPlan(requestedDate.value || new Date().toISOString().slice(0, 10))
    planMeals.value = payload.meals
    nutrients.value = payload.nutrients
    reminders.value = payload.reminders
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '计划详情加载失败'
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: '/pages/plan/plan' }),
  })
}

function sharePlan() {
  uni.showShareMenu({ withShareTicket: true })
  uni.showToast({ title: '本周计划已准备分享', icon: 'none' })
}

function openMeal(mealId: string) {
  uni.showToast({ title: `正在打开${mealId === 'snack' ? '加餐' : '餐次'}详情`, icon: 'none' })
}

function returnToPlan() {
  uni.switchTab({ url: '/pages/plan/plan' })
}

onLoad((query) => {
  requestedDate.value = typeof query?.date === 'string' ? query.date : ''
  void loadDetail()
})
</script>

<template>
  <view class="detail-page">
    <view class="detail-page__glow" />

    <view class="nav-bar">
      <button class="nav-button" aria-label="返回" @click="goBack">
        <image class="nav-button__icon nav-button__icon--back" src="/static/images/plan-detail/back.png" mode="aspectFit" />
      </button>
      <text class="nav-bar__title">计划详情</text>
      <button class="nav-button" aria-label="分享" @click="sharePlan">
        <image class="nav-button__icon" src="/static/images/plan-detail/share.png" mode="aspectFit" />
      </button>
    </view>

    <view v-if="loading" class="api-state">正在同步计划详情…</view>
    <view v-else-if="errorMessage" class="api-state">
      <text>{{ errorMessage }}</text>
      <button @click="loadDetail">重新加载</button>
    </view>

    <view class="goal-heading">
      <view>
        <text class="goal-heading__title">本周目标</text>
        <text class="goal-heading__subtitle">骨骼修复 · 营养均衡 · 温和好消化</text>
      </view>
      <text class="goal-heading__week">第 <text>1</text> / <text>4</text> 周</text>
    </view>

    <view class="progress-card">
      <view class="progress-ring">
        <view class="progress-ring__inner">
          <text class="progress-ring__value">72%</text>
          <text class="progress-ring__label">完成度</text>
        </view>
      </view>
      <view class="nutrient-list">
        <view v-for="item in nutrients" :key="item.name" class="nutrient">
          <view class="nutrient__copy">
            <text class="nutrient__name">{{ item.name }}</text>
            <text class="nutrient__value">{{ item.value }}</text>
          </view>
          <view class="nutrient__track">
            <view class="nutrient__bar" :style="{ width: `${item.progress}%`, background: item.color }" />
          </view>
        </view>
      </view>
    </view>

    <view class="reminder-card">
      <view class="card-title">
        <image class="card-title__icon" src="/static/images/plan-detail/bell.png" mode="aspectFit" />
        <text>每日提醒</text>
      </view>
      <view class="reminder-grid">
        <view v-for="item in reminders" :key="item.name" class="reminder">
          <view class="reminder__icon-wrap" :class="`reminder__icon-wrap--${item.tone}`">
            <image class="reminder__icon" :src="item.icon" mode="aspectFit" />
          </view>
          <text class="reminder__name">{{ item.name }}</text>
          <text class="reminder__value">{{ item.value }}</text>
        </view>
      </view>
    </view>

    <view class="schedule-card">
      <view class="schedule-card__header">
        <view class="card-title">
          <image class="card-title__icon" src="/static/images/plan-detail/list.png" mode="aspectFit" />
          <text>今日安排</text>
        </view>
        <button class="view-plan" @click="returnToPlan">查看饮食计划 <text>›</text></button>
      </view>

      <button v-for="meal in planMeals" :key="meal.id" class="schedule-row" @click="openMeal(meal.id)">
        <view class="schedule-row__time">
          <text class="schedule-row__name">{{ meal.name }}</text>
          <text class="schedule-row__clock">{{ meal.time }}</text>
        </view>
        <image class="schedule-row__image" :src="meal.dishes[0].image" mode="aspectFill" />
        <view class="schedule-row__content">
          <text class="schedule-row__dishes">{{ meal.summary }}</text>
          <text class="schedule-row__calories">≈ {{ calories[meal.id] }} 千卡</text>
        </view>
        <image class="schedule-row__chevron" src="/static/images/plan-detail/chevron-right.png" mode="aspectFit" />
      </button>
    </view>

    <view class="detail-tip">
      <text class="detail-tip__heart">♥</text>
      <text>科学搭配每一餐，助力骨骼修复，吃得对，康复更快！</text>
    </view>

    <AppTabBar :selected="2" />
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  padding: calc(var(--status-bar-height) + 18rpx) 28rpx calc(env(safe-area-inset-bottom) + 164rpx);
  background: #fdf9f4;
  box-sizing: border-box;
}

.detail-page__glow {
  position: absolute;
  top: -100rpx;
  right: -130rpx;
  width: 430rpx;
  height: 360rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 232, 201, 0.62) 0%, rgba(255, 244, 230, 0.2) 55%, transparent 74%);
  pointer-events: none;
}

.api-state {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 96rpx;
  margin-top: 14rpx;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  border-radius: 20rpx;
  background: #fff;
  color: #8d8580;
  font-size: 24rpx;
}

.api-state button {
  color: #ff7818;
  font-size: 24rpx;
}

.nav-bar,
.goal-heading,
.progress-card,
.reminder-card,
.schedule-card,
.detail-tip {
  position: relative;
  z-index: 1;
}

.nav-bar {
  display: grid;
  height: 72rpx;
  align-items: center;
  grid-template-columns: 70rpx 1fr 70rpx;
}

.nav-button {
  display: flex;
  width: 62rpx;
  height: 62rpx;
  align-items: center;
  justify-content: center;
}

.nav-button:last-child {
  justify-self: end;
}

.nav-button__icon {
  width: 40rpx;
  height: 40rpx;
}

.nav-button__icon--back {
  width: 37rpx;
  height: 37rpx;
}

.nav-bar__title {
  color: #251d18;
  font-size: 29rpx;
  font-weight: 750;
  text-align: center;
}

.goal-heading {
  display: flex;
  min-height: 77rpx;
  padding: 4rpx 4rpx 9rpx;
  align-items: flex-end;
  justify-content: space-between;
}

.goal-heading__title {
  display: block;
  color: #28201b;
  font-size: 34rpx;
  font-weight: 780;
}

.goal-heading__subtitle {
  display: block;
  margin-top: 5rpx;
  color: #8d8781;
  font-size: 24rpx;
}

.goal-heading__week {
  color: #8d8781;
  font-size: 24rpx;
  white-space: nowrap;
}

.goal-heading__week text {
  color: #f56f20;
  font-size: 27rpx;
  font-weight: 750;
}

.progress-card,
.reminder-card,
.schedule-card {
  border: 1rpx solid rgba(103, 71, 47, 0.035);
  border-radius: 27rpx;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 8rpx 26rpx rgba(94, 61, 35, 0.045);
}

.progress-card {
  display: flex;
  height: 218rpx;
  padding: 22rpx 23rpx;
  align-items: center;
}

.progress-ring {
  display: flex;
  width: 138rpx;
  height: 138rpx;
  flex: 0 0 138rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: conic-gradient(#ef6e59 0 52%, #ff9a76 52% 72%, #f2ece7 72% 100%);
}

.progress-ring__inner {
  display: flex;
  width: 113rpx;
  height: 113rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff;
}

.progress-ring__value {
  color: #241d19;
  font-size: 37rpx;
  font-weight: 800;
  line-height: 1;
}

.progress-ring__label {
  margin-top: 8rpx;
  color: #8e8882;
  font-size: 24rpx;
}

.nutrient-list {
  display: flex;
  min-width: 0;
  margin-left: 30rpx;
  flex: 1;
  flex-direction: column;
  gap: 17rpx;
}

.nutrient__copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nutrient__name {
  color: #332a24;
  font-size: 24rpx;
  font-weight: 700;
}

.nutrient__value {
  color: #8c8781;
  font-size: 24rpx;
}

.nutrient__track {
  height: 8rpx;
  margin-top: 7rpx;
  overflow: hidden;
  border-radius: 5rpx;
  background: #f1ede9;
}

.nutrient__bar {
  height: 100%;
  border-radius: 5rpx;
}

.reminder-card {
  margin-top: 14rpx;
  padding: 14rpx 16rpx 17rpx;
}

.card-title {
  display: flex;
  align-items: center;
  color: #2c241f;
  font-size: 26rpx;
  font-weight: 750;
}

.card-title__icon {
  width: 31rpx;
  height: 31rpx;
  margin-right: 8rpx;
}

.reminder-grid {
  display: grid;
  margin-top: 11rpx;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.reminder {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
}

.reminder__icon-wrap {
  display: flex;
  width: 54rpx;
  height: 54rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.reminder__icon-wrap--blue { background: #e8f5ff; }
.reminder__icon-wrap--yellow { background: #fff6df; }
.reminder__icon-wrap--orange { background: #fff0e9; }
.reminder__icon-wrap--pink { background: #fff0f4; }

.reminder__icon {
  width: 39rpx;
  height: 39rpx;
}

.reminder__name {
  margin-top: 7rpx;
  color: #302823;
  font-size: 24rpx;
  font-weight: 650;
}

.reminder__value {
  margin-top: 3rpx;
  color: #928b85;
  font-size: 24rpx;
  white-space: nowrap;
}

.schedule-card {
  margin-top: 14rpx;
  padding: 14rpx 16rpx 10rpx;
}

.schedule-card__header {
  display: flex;
  height: 42rpx;
  align-items: center;
  justify-content: space-between;
}

.view-plan {
  display: flex;
  align-items: center;
  color: #8e8984;
  font-size: 24rpx;
}

.view-plan text {
  margin-left: 6rpx;
  font-size: 27rpx;
}

.schedule-row {
  display: grid;
  width: 100%;
  min-height: 106rpx;
  padding: 9rpx 0;
  align-items: center;
  grid-template-columns: 92rpx 108rpx minmax(0, 1fr) 29rpx;
  border-top: 1rpx solid #f2eee9;
  text-align: left;
}

.schedule-row__time {
  display: flex;
  flex-direction: column;
}

.schedule-row__name {
  color: #2d251f;
  font-size: 24rpx;
  font-weight: 700;
}

.schedule-row__clock {
  margin-top: 5rpx;
  color: #928c87;
  font-size: 24rpx;
}

.schedule-row__image {
  width: 91rpx;
  height: 65rpx;
  border-radius: 15rpx;
}

.schedule-row__content {
  display: flex;
  min-width: 0;
  padding: 0 10rpx;
  flex-direction: column;
}

.schedule-row__dishes {
  overflow: hidden;
  color: #3a312b;
  font-size: 24rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schedule-row__calories {
  margin-top: 8rpx;
  color: #918b85;
  font-size: 24rpx;
}

.schedule-row__chevron {
  width: 27rpx;
  height: 27rpx;
}

.detail-tip {
  display: flex;
  min-height: 75rpx;
  margin-top: 14rpx;
  padding: 13rpx 18rpx;
  align-items: center;
  color: #746d67;
  border: 1rpx solid rgba(240, 174, 107, 0.12);
  border-radius: 24rpx;
  background: linear-gradient(100deg, rgba(255, 255, 255, 0.95), #fff7ec);
  font-size: 24rpx;
  line-height: 1.45;
}

.detail-tip__heart {
  margin-right: 10rpx;
  color: #ff9b55;
  font-size: 26rpx;
}

@media (min-width: 500px) {
  .detail-page {
    max-width: 750rpx;
    margin: 0 auto;
  }
}
</style>
