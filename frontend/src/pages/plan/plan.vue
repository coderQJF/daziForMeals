<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import AppTabBar from '@/components/AppTabBar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { experienceApi } from '@/services/experience'
import { useRecipeStore } from '@/stores/recipe'
import { useTabBarSelection } from '@/composables/useTabBarSelection'
import type { PlanDish, PlanMeal } from '@/types/experience'

const today = new Date()
const designDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
const selectedDateTime = ref(designDate.getTime())
const calendarMonthTime = ref(new Date(designDate.getFullYear(), designDate.getMonth(), 1).getTime())
const calendarVisible = ref(false)
const recipeStore = useRecipeStore()
const planMeals = ref<PlanMeal[]>([])
const loading = ref(false)
const errorMessage = ref('')
const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const calendarWeekLabels = ['一', '二', '三', '四', '五', '六', '日']

interface CalendarCell {
  key: string
  date: number
  time: number
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
}

function formatDate(time: number) {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

async function loadPlan() {
  loading.value = true
  errorMessage.value = ''
  await recipeStore.loadUserState(true)
  try {
    const payload = await experienceApi.getPlan(formatDate(selectedDateTime.value))
    planMeals.value = payload.meals
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '饮食计划加载失败'
  } finally {
    loading.value = false
  }
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

const weekDays = computed(() => {
  const selected = new Date(selectedDateTime.value)
  const mondayOffset = (selected.getDay() + 6) % 7
  const monday = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - mondayOffset)

  return weekLabels.map((weekday, index) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      weekday: isSameDay(date, designDate) ? '今天' : weekday,
      date: date.getDate(),
      time: date.getTime(),
      isSelected: isSameDay(date, selected),
    }
  })
})

const calendarTitle = computed(() => {
  const month = new Date(calendarMonthTime.value)
  return `${month.getFullYear()}年${month.getMonth() + 1}月`
})

const calendarCells = computed<CalendarCell[]>(() => {
  const month = new Date(calendarMonthTime.value)
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const gridStart = new Date(year, monthIndex, 1 - firstDayOffset)
  const selected = new Date(selectedDateTime.value)
  const today = new Date()

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
    return {
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
      date: date.getDate(),
      time: date.getTime(),
      inMonth: date.getMonth() === monthIndex,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(date, selected),
    }
  })
})

useTabBarSelection(2)

function selectDay(time: number) {
  selectedDateTime.value = time
  void loadPlan()
}

function openPlanDetail() {
  uni.navigateTo({ url: `/pages/plan/detail?date=${formatDate(selectedDateTime.value)}` })
}

function openCalendar() {
  const selected = new Date(selectedDateTime.value)
  calendarMonthTime.value = new Date(selected.getFullYear(), selected.getMonth(), 1).getTime()
  calendarVisible.value = true
}

function closeCalendar() {
  calendarVisible.value = false
}

function changeCalendarMonth(offset: number) {
  const month = new Date(calendarMonthTime.value)
  calendarMonthTime.value = new Date(month.getFullYear(), month.getMonth() + offset, 1).getTime()
}

function selectCalendarDay(cell: CalendarCell) {
  selectedDateTime.value = cell.time
  if (!cell.inMonth) {
    const date = new Date(cell.time)
    calendarMonthTime.value = new Date(date.getFullYear(), date.getMonth(), 1).getTime()
  }
  void loadPlan()
}

function selectToday() {
  const today = new Date()
  selectedDateTime.value = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  calendarMonthTime.value = new Date(today.getFullYear(), today.getMonth(), 1).getTime()
  void loadPlan()
}

function openDish(dish: PlanDish) {
  uni.navigateTo({ url: `/pages/recipe/detail?id=${dish.id}` })
}

function replaceDish(dish: PlanDish) {
  uni.showActionSheet({
    itemList: ['换一道同类菜', '调整份量', '从本餐移除'],
    success: ({ tapIndex }) => {
      const messages = [`正在为「${dish.name}」推荐替换菜`, '份量编辑功能正在接入', '已从本餐移除']
      uni.showToast({ title: messages[tapIndex], icon: 'none' })
    },
  })
}

onShow(() => void loadPlan())
</script>

<template>
  <view class="plan-page">
    <view class="plan-page__glow" />

    <AppHeader
      title="饮食计划"
      subtitle="科学搭配每一餐，助力骨骼修复"
      action-icon="/static/images/plan/calendar.png"
      action-label="查看当月日历"
      action-background="#fff0e7"
      :page-padding="30"
      @action="openCalendar"
    />

    <view class="week-card">
      <button
        v-for="day in weekDays"
        :key="day.key"
        class="day"
        :class="{ 'day--active': day.isSelected }"
        @click="selectDay(day.time)"
      >
        <text class="day__weekday">{{ day.weekday }}</text>
        <view class="day__date-wrap"><text class="day__date">{{ day.date }}</text></view>
        <text v-if="day.isSelected" class="day__dot" />
      </button>
    </view>

    <view v-if="loading && !planMeals.length" class="plan-state">正在加载饮食计划…</view>
    <view v-else-if="errorMessage && !planMeals.length" class="plan-state">
      <text>{{ errorMessage }}</text>
      <button @click="loadPlan">重新加载</button>
    </view>

    <view v-else class="meal-list">
      <view v-for="meal in planMeals" :key="meal.id" class="meal-card">
        <button class="meal-card__header" @click="openPlanDetail">
          <view class="meal-card__title">
            <image class="meal-card__icon" :src="meal.icon" mode="aspectFit" />
            <text class="meal-card__name">{{ meal.name }}</text>
            <text class="meal-card__time">{{ meal.time }}</text>
          </view>
          <image class="meal-card__chevron" src="/static/images/plan/chevron-right.png" mode="aspectFit" />
        </button>

        <view class="dish-grid">
          <button
            v-for="dish in meal.dishes"
            :key="dish.id"
            class="dish"
            @click="openDish(dish)"
            @longpress.stop="replaceDish(dish)"
          >
            <image class="dish__image" :src="dish.image" mode="aspectFill" />
            <text class="dish__name">{{ dish.name }}</text>
            <text class="dish__amount">{{ dish.amount }}</text>
          </button>
        </view>
      </view>
    </view>

    <view class="hold-tip">
      <image class="hold-tip__icon" src="/static/images/plan/tap-hand.png" mode="aspectFit" />
      <text>长按菜品可以替换或调整份量</text>
    </view>

    <view v-if="calendarVisible" class="calendar-mask" @click="closeCalendar">
      <view class="calendar-sheet" @click.stop>
        <view class="calendar-sheet__handle" />

        <view class="calendar-sheet__header">
          <view>
            <text class="calendar-sheet__eyebrow">选择饮食计划日期</text>
            <text class="calendar-sheet__title">{{ calendarTitle }}</text>
          </view>
          <button class="calendar-sheet__close" aria-label="关闭日历" @click="closeCalendar">×</button>
        </view>

        <view class="calendar-nav">
          <button class="calendar-nav__button" aria-label="上个月" @click="changeCalendarMonth(-1)">‹</button>
          <view class="calendar-nav__weekdays">
            <text v-for="weekday in calendarWeekLabels" :key="weekday">{{ weekday }}</text>
          </view>
          <button class="calendar-nav__button" aria-label="下个月" @click="changeCalendarMonth(1)">›</button>
        </view>

        <view class="calendar-grid">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            class="calendar-cell"
            :class="{
              'calendar-cell--muted': !cell.inMonth,
              'calendar-cell--today': cell.isToday,
              'calendar-cell--selected': cell.isSelected,
            }"
            @click="selectCalendarDay(cell)"
          >
            <text>{{ cell.date }}</text>
            <text v-if="cell.isToday && !cell.isSelected" class="calendar-cell__today-dot" />
          </button>
        </view>

        <view class="calendar-actions">
          <button class="calendar-actions__today" @click="selectToday">回到今天</button>
          <button class="calendar-actions__confirm" @click="closeCalendar">查看当天计划</button>
        </view>
      </view>
    </view>

    <!-- #ifndef MP-WEIXIN -->
    <AppTabBar :selected="2" />
    <!-- #endif -->
  </view>
</template>

<style scoped lang="scss">
.plan-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  padding: 0 30rpx calc(env(safe-area-inset-bottom) + 180rpx);
  background: #fdf9f4;
  box-sizing: border-box;
}

.plan-page__glow {
  position: absolute;
  top: -100rpx;
  right: -120rpx;
  width: 420rpx;
  height: 350rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 233, 204, 0.62) 0%, rgba(255, 244, 230, 0.2) 55%, transparent 73%);
  pointer-events: none;
}

.header,
.week-card,
.plan-state,
.meal-list,
.hold-tip {
  position: relative;
  z-index: 1;
}

.plan-state {
  display: flex;
  min-height: 360rpx;
  margin-top: 18rpx;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 20rpx;
  color: #8d8580;
  font-size: 26rpx;
}

.plan-state button {
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: #ff900b;
  color: #fff;
  font-size: 24rpx;
}

.header {
  display: flex;
  min-height: 92rpx;
  align-items: center;
  justify-content: space-between;
}

.header__copy {
  display: flex;
  flex-direction: column;
}

.header__title {
  color: #342217;
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.1;
}

.header__subtitle {
  margin-top: 10rpx;
  color: #87817b;
  font-size: 24rpx;
}

.calendar-button {
  display: flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  background: #fff0e7;
}

.calendar-button__icon {
  width: 45rpx;
  height: 45rpx;
}

.week-card {
  display: grid;
  height: 138rpx;
  margin-top: 16rpx;
  padding: 12rpx 7rpx 10rpx;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border: 1rpx solid rgba(105, 73, 49, 0.025);
  border-radius: 27rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8rpx 25rpx rgba(96, 63, 37, 0.04);
}

.day {
  position: relative;
  display: flex;
  min-width: 0;
  height: 114rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.day__weekday {
  color: #7e7975;
  font-size: 24rpx;
  white-space: nowrap;
}

.day__date-wrap {
  display: flex;
  width: 58rpx;
  height: 58rpx;
  margin-top: 7rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.day__date {
  color: #26211d;
  font-size: 27rpx;
  font-weight: 700;
}

.day__dot {
  position: absolute;
  bottom: -2rpx;
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: #ff7818;
}

.day--active {
  .day__weekday { color: #ff7211; font-weight: 650; }
  .day__date-wrap { background: linear-gradient(145deg, #ff9c25, #ff6700); }
  .day__date { color: #fff; }
}

.meal-list {
  display: flex;
  margin-top: 18rpx;
  flex-direction: column;
  gap: 16rpx;
}

.meal-card {
  padding: 15rpx 16rpx 17rpx;
  border: 1rpx solid rgba(105, 73, 49, 0.025);
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 8rpx 25rpx rgba(96, 63, 37, 0.045);
}

.meal-card__header {
  display: flex;
  width: 100%;
  height: 45rpx;
  align-items: center;
  justify-content: space-between;
}

.meal-card__title {
  display: flex;
  min-width: 0;
  align-items: center;
}

.meal-card__icon {
  width: 35rpx;
  height: 35rpx;
}

.meal-card__name {
  margin-left: 9rpx;
  color: #28211d;
  font-size: 29rpx;
  font-weight: 750;
}

.meal-card__time {
  margin-left: 14rpx;
  color: #96918c;
  font-size: 24rpx;
}

.meal-card__chevron {
  width: 30rpx;
  height: 30rpx;
}

.dish-grid {
  display: grid;
  margin-top: 10rpx;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 13rpx;
}

.dish {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
}

.dish__image {
  display: block;
  width: 100%;
  height: 114rpx;
  border-radius: 19rpx;
  background: #f3ebe2;
}

.dish__name {
  width: 100%;
  margin-top: 7rpx;
  overflow: hidden;
  color: #28221e;
  font-size: 24rpx;
  font-weight: 650;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dish__amount {
  margin-top: 3rpx;
  color: #918c87;
  font-size: 24rpx;
  line-height: 1.1;
}

.hold-tip {
  display: flex;
  height: 66rpx;
  margin-top: 16rpx;
  align-items: center;
  justify-content: center;
  color: #9a928b;
  font-size: 24rpx;
}

.hold-tip__icon {
  width: 31rpx;
  height: 31rpx;
  margin-right: 7rpx;
}

.calendar-mask {
  position: fixed;
  z-index: 10000;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(47, 34, 25, 0.34);
  backdrop-filter: blur(4rpx);
}

.calendar-sheet {
  width: 100%;
  max-width: 750rpx;
  padding: 16rpx 30rpx calc(env(safe-area-inset-bottom) + 30rpx);
  border-radius: 42rpx 42rpx 0 0;
  background:
    radial-gradient(circle at 90% 4%, rgba(255, 225, 190, 0.65), transparent 25%),
    #fffdfb;
  box-shadow: 0 -24rpx 70rpx rgba(71, 45, 26, 0.16);
}

.calendar-sheet__handle {
  width: 76rpx;
  height: 8rpx;
  margin: 0 auto 24rpx;
  border-radius: 999rpx;
  background: #e5dfd9;
}

.calendar-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6rpx 18rpx;
}

.calendar-sheet__eyebrow,
.calendar-sheet__title {
  display: block;
}

.calendar-sheet__eyebrow {
  color: #9a918a;
  font-size: 24rpx;
  line-height: 1.4;
}

.calendar-sheet__title {
  margin-top: 4rpx;
  color: #342217;
  font-size: 38rpx;
  font-weight: 800;
  line-height: 1.3;
}

.calendar-sheet__close {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f7f2ed;
  color: #746a62;
  font-size: 42rpx;
  font-weight: 300;
}

.calendar-nav {
  display: flex;
  height: 62rpx;
  align-items: center;
}

.calendar-nav__button {
  display: flex;
  width: 60rpx;
  height: 60rpx;
  flex: 0 0 60rpx;
  align-items: center;
  justify-content: center;
  color: #5e5148;
  font-size: 46rpx;
  font-weight: 400;
}

.calendar-nav__weekdays {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  color: #91877f;
  font-size: 24rpx;
  text-align: center;
}

.calendar-grid {
  display: grid;
  padding: 4rpx 60rpx 8rpx;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  row-gap: 4rpx;
}

.calendar-cell {
  position: relative;
  display: flex;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #332922;
  font-size: 26rpx;
  font-weight: 600;
}

.calendar-cell--muted {
  color: #c7c0ba;
  font-weight: 400;
}

.calendar-cell--today {
  color: #ff6f0a;
}

.calendar-cell--selected {
  background: linear-gradient(145deg, #ff9f2b, #ff6800);
  box-shadow: 0 8rpx 20rpx rgba(255, 104, 0, 0.25);
  color: #fff;
  font-weight: 750;
}

.calendar-cell__today-dot {
  position: absolute;
  bottom: 5rpx;
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: #ff6f0a;
}

.calendar-actions {
  display: flex;
  margin-top: 20rpx;
  gap: 18rpx;
}

.calendar-actions__today,
.calendar-actions__confirm {
  display: flex;
  height: 82rpx;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  font-size: 27rpx;
  font-weight: 700;
}

.calendar-actions__today {
  width: 190rpx;
  flex: 0 0 190rpx;
  background: #fff2e7;
  color: #ff7411;
}

.calendar-actions__confirm {
  flex: 1;
  background: linear-gradient(135deg, #ffa226, #ff6800);
  box-shadow: 0 12rpx 28rpx rgba(255, 104, 0, 0.2);
  color: #fff;
}

@media (min-width: 500px) {
  .plan-page {
    max-width: 750rpx;
    margin: 0 auto;
  }
}
</style>
