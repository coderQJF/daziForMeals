<script setup lang="ts">
import ComingPage from '@/components/ComingPage.vue'
import { todayRecipe } from '@/mocks/recipe'

const days = [
  { week: '一', date: 27 },
  { week: '二', date: 28 },
  { week: '三', date: 29 },
  { week: '今天', date: 30 },
  { week: '五', date: 31 },
  { week: '六', date: 1 },
  { week: '日', date: 2 },
]

const meals = [
  { name: '早餐', time: '07:30', icon: '☀️', recipes: ['山药排骨汤', '鸡蛋羹'] },
  { name: '午餐', time: '12:30', icon: '☀️', recipes: ['番茄牛肉汤', '清炒时蔬'] },
  { name: '晚餐', time: '18:30', icon: '🌙', recipes: ['山药排骨汤', '糙米饭'] },
  { name: '加餐', time: '15:30', icon: '🧺', recipes: ['牛奶', '水果拼盘'] },
]
</script>

<template>
  <ComingPage title="饮食计划" subtitle="科学搭配每一餐，助力身体恢复" icon="▣">
    <view class="week surface-card">
      <view v-for="day in days" :key="`${day.week}-${day.date}`" class="day" :class="{ active: day.date === 30 }">
        <text class="day__week">{{ day.week }}</text>
        <text class="day__date">{{ day.date }}</text>
      </view>
    </view>

    <view class="meal-list">
      <view v-for="meal in meals" :key="meal.name" class="meal surface-card">
        <view class="meal__header">
          <text class="meal__name">{{ meal.icon }}　{{ meal.name }}</text>
          <text class="meal__time">{{ meal.time }}　›</text>
        </view>
        <scroll-view scroll-x class="meal__scroll" :show-scrollbar="false">
          <view class="meal__recipes">
            <view v-for="name in meal.recipes" :key="name" class="meal-recipe">
              <image class="meal-recipe__image" :src="todayRecipe.thumbnail" mode="aspectFill" />
              <text class="meal-recipe__name">{{ name }}</text>
              <text class="meal-recipe__amount">1 份</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </ComingPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.week {
  display: grid;
  margin-top: 32rpx;
  padding: 18rpx 12rpx;
  grid-template-columns: repeat(7, 1fr);
}

.day {
  display: flex;
  height: 98rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
}

.day__week {
  color: $color-text-secondary;
  font-size: 19rpx;
}

.day__date {
  margin-top: 10rpx;
  font-size: 25rpx;
  font-weight: 700;
}

.day.active {
  color: white;
  background: $color-primary;

  .day__week {
    color: white;
  }
}

.meal-list {
  display: flex;
  margin-top: 24rpx;
  flex-direction: column;
  gap: 20rpx;
}

.meal {
  padding: 24rpx;
}

.meal__header {
  display: flex;
  justify-content: space-between;
}

.meal__name {
  font-size: 29rpx;
  font-weight: 700;
}

.meal__time {
  color: $color-text-secondary;
  font-size: 23rpx;
}

.meal__scroll {
  width: 100%;
  margin-top: 20rpx;
  white-space: nowrap;
}

.meal__recipes {
  display: inline-flex;
  gap: 18rpx;
}

.meal-recipe {
  display: inline-flex;
  width: 190rpx;
  flex-direction: column;
}

.meal-recipe__image {
  width: 190rpx;
  height: 118rpx;
  border-radius: 20rpx;
}

.meal-recipe__name {
  margin-top: 10rpx;
  overflow: hidden;
  font-size: 23rpx;
  font-weight: 600;
  text-overflow: ellipsis;
}

.meal-recipe__amount {
  margin-top: 4rpx;
  color: $color-text-secondary;
  font-size: 20rpx;
}
</style>
