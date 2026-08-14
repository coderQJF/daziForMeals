<script setup lang="ts">
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import AppTabBar from '@/components/AppTabBar.vue'
import { quickCategories, statusOptions } from '@/mocks/recipe'
import { useRecipeStore } from '@/stores/recipe'
import { useTabBarSelection } from '@/composables/useTabBarSelection'
import type { CategoryItem } from '@/types/recipe'

const recipeStore = useRecipeStore()
const { recommendation, selectedStatus, statusLabel } = storeToRefs(recipeStore)

function handleQuickAction(item: CategoryItem) {
  if (item.id === 'takeout') {
    uni.navigateTo({ url: '/pages/takeout/takeout' })
    return
  }

  if (item.id === 'recover') recipeStore.selectStatus('recover')
  uni.navigateTo({ url: `/pages/recipe/list?type=${item.id}` })
}

function openRecipe() {
  uni.navigateTo({ url: `/pages/recipe/detail?id=${recommendation.value.id}` })
}

function openMore() {
  uni.navigateTo({ url: '/pages/recipe/list' })
}

function openSearch() {
  uni.showToast({ title: '搜索功能正在接入', icon: 'none' })
}

function refreshRecommendation() {
  recipeStore.refreshRecommendation()
}

useTabBarSelection(0)

onPullDownRefresh(() => {
  recipeStore.refreshRecommendation()
  setTimeout(() => uni.stopPullDownRefresh(), 350)
})
</script>

<template>
  <view class="home">
    <view class="home__glow" />

    <view class="header">
      <view class="header__row">
        <text class="brand">饭搭子</text>
        <button class="notice" aria-label="消息通知">
          <view class="bell">
            <view class="bell__body" />
            <view class="bell__clapper" />
          </view>
        </button>
      </view>
      <view class="greeting">
        <text>早上好，骨骼也要好好吃饭呀</text>
        <text class="sun">☀</text>
      </view>
    </view>

    <button class="search" @click="openSearch">
      <view class="search__icon" />
      <text class="search__placeholder">搜索菜谱、食材或功效</text>
    </button>

    <view class="quick-grid">
      <button
        v-for="(item, index) in quickCategories"
        :key="item.id"
        class="quick-card"
        :class="`quick-card--${index + 1}`"
        @click="handleQuickAction(item)"
      >
        <image
          class="quick-card__image"
          :src="`/static/images/home/${item.id}.png`"
          mode="aspectFit"
        />
        <text class="quick-card__name">{{ item.name }}</text>
        <text class="quick-card__desc">{{ item.description }}</text>
      </button>
    </view>

    <button class="blind-box" @click="refreshRecommendation">
      <view class="blind-box__icon-wrap">
        <image class="blind-box__icon" src="/static/images/home/blind-box.png" mode="aspectFit" />
      </view>
      <view class="blind-box__copy">
        <text class="blind-box__title">随机盲盒</text>
        <text class="blind-box__subtitle">不知道吃什么？点我试试吧</text>
      </view>
      <view class="blind-box__go">GO</view>
    </button>

    <view class="status-card">
      <view class="status-card__header">
        <text class="section-title">我的状态</text>
        <button class="edit" aria-label="编辑状态">
          <view class="edit__pencil" />
        </button>
      </view>
      <scroll-view class="status-card__scroll" scroll-x :show-scrollbar="false">
        <view class="status-list">
          <button
            v-for="item in statusOptions"
            :key="item.id"
            class="status-chip"
            :class="{ 'status-chip--active': item.id === selectedStatus }"
            @click="recipeStore.selectStatus(item.id)"
          >
            {{ item.name }}
          </button>
        </view>
      </scroll-view>
    </view>

    <view class="recommend-heading">
      <text class="section-title">为你推荐</text>
      <button class="more" @click="openMore">查看更多 <text class="more__arrow">›</text></button>
    </view>

    <button class="recipe-card" @click="openRecipe">
      <image class="recipe-card__cover" :src="recommendation.cover" mode="aspectFill" />
      <view class="recipe-card__body">
        <view class="recipe-card__title-row">
          <text class="recipe-card__name">{{ recommendation.name }}</text>
          <text class="recipe-card__badge">{{ statusLabel }}推荐</text>
        </view>
        <text class="recipe-card__reason">富含钙与胶原蛋白，助力骨骼修复</text>
        <view class="recipe-card__tags">
          <text v-for="tag in recommendation.tags" :key="tag" class="recipe-card__tag">{{ tag }}</text>
        </view>
        <view class="recipe-card__meta">
          <view class="meta-item"><view class="clock" />{{ recommendation.cookTime }} 分钟</view>
          <view class="meta-item"><text class="person">♙</text>约 {{ recommendation.calories }} kcal</view>
        </view>
      </view>
    </button>

    <!-- #ifndef MP-WEIXIN -->
    <AppTabBar :selected="0" />
    <!-- #endif -->
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.home {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: calc(var(--status-bar-height) + 22rpx) 28rpx 152rpx;
  background: #fdf9f4;
}

.home__glow {
  position: absolute;
  top: -96rpx;
  right: -126rpx;
  width: 430rpx;
  height: 370rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 235, 208, 0.66) 0%, rgba(255, 244, 230, 0.24) 52%, rgba(255, 255, 255, 0) 72%);
  pointer-events: none;
}

.header,
.search,
.quick-grid,
.blind-box,
.status-card,
.recommend-heading,
.recipe-card {
  position: relative;
  z-index: 1;
}

.header__row {
  display: flex;
  height: 64rpx;
  align-items: center;
  justify-content: space-between;
}

.brand {
  color: #3d2719;
  font-size: 45rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
  line-height: 1;
}

.notice {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
}

.bell {
  position: relative;
  width: 35rpx;
  height: 40rpx;
}

.bell__body {
  position: absolute;
  top: 3rpx;
  left: 5rpx;
  width: 25rpx;
  height: 28rpx;
  border: 3rpx solid #1d252b;
  border-top-left-radius: 18rpx;
  border-top-right-radius: 18rpx;
  border-bottom: 0;

  &::before {
    position: absolute;
    bottom: -5rpx;
    left: -7rpx;
    width: 33rpx;
    height: 9rpx;
    border: 3rpx solid #1d252b;
    border-top: 0;
    border-radius: 0 0 18rpx 18rpx;
    content: '';
  }
}

.bell__clapper {
  position: absolute;
  bottom: 0;
  left: 15rpx;
  width: 7rpx;
  height: 5rpx;
  border-radius: 0 0 8rpx 8rpx;
  background: #1d252b;
}

.greeting {
  display: flex;
  margin-top: 14rpx;
  align-items: center;
  color: #231d19;
  font-size: 28rpx;
  font-weight: 650;
  line-height: 1.25;
}

.sun {
  margin-left: 10rpx;
  color: #ffa211;
  font-size: 30rpx;
}

.search {
  display: flex;
  width: 100%;
  height: 88rpx;
  margin-top: 21rpx;
  padding: 0 28rpx;
  align-items: center;
  border: 1rpx solid rgba(90, 64, 44, 0.025);
  border-radius: 25rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 9rpx 25rpx rgba(97, 67, 41, 0.04);
  text-align: left;
}

.search__icon {
  position: relative;
  width: 30rpx;
  height: 30rpx;
  border: 3rpx solid #92969c;
  border-radius: 50%;

  &::after {
    position: absolute;
    right: -10rpx;
    bottom: -7rpx;
    width: 14rpx;
    height: 3rpx;
    border-radius: 2rpx;
    background: #92969c;
    content: '';
    transform: rotate(45deg);
  }
}

.search__placeholder {
  margin-left: 22rpx;
  color: #a7a8ab;
  font-size: 25rpx;
}

.quick-grid {
  display: grid;
  margin-top: 25rpx;
  grid-template-columns: repeat(3, 1fr);
  gap: 18rpx;
}

.quick-card {
  display: flex;
  min-width: 0;
  height: 212rpx;
  padding: 19rpx 6rpx 15rpx;
  flex-direction: column;
  align-items: center;
  border-radius: 30rpx;
  background: linear-gradient(145deg, #fff1e7, #fff5ec);

  &--2 { background: linear-gradient(145deg, #fff4e4, #fff9e7); }
  &--3 { background: linear-gradient(145deg, #f4f7e9, #eef5e7); }
}

.quick-card__image {
  width: 88rpx;
  height: 88rpx;
}

.quick-card__name {
  margin-top: 5rpx;
  color: #1f1b18;
  font-size: 28rpx;
  font-weight: 750;
  line-height: 1.25;
}

.quick-card__desc {
  margin-top: 5rpx;
  color: #8d8883;
  font-size: 21rpx;
  line-height: 1.2;
}

.blind-box {
  display: flex;
  width: 100%;
  height: 106rpx;
  margin-top: 23rpx;
  padding: 0 20rpx 0 22rpx;
  align-items: center;
  border: 1rpx solid rgba(235, 187, 133, 0.2);
  border-radius: 28rpx;
  background: linear-gradient(102deg, rgba(255, 255, 255, 0.97), #fff9ef);
  box-shadow: 0 9rpx 27rpx rgba(110, 73, 39, 0.045);
  text-align: left;
}

.blind-box__icon-wrap {
  display: flex;
  width: 67rpx;
  height: 67rpx;
  align-items: center;
  justify-content: center;
  border-radius: 19rpx;
  background: #fff1da;
}

.blind-box__icon {
  width: 55rpx;
  height: 55rpx;
}

.blind-box__copy {
  display: flex;
  min-width: 0;
  margin-left: 18rpx;
  flex: 1;
  flex-direction: column;
}

.blind-box__title {
  color: #1f1b18;
  font-size: 28rpx;
  font-weight: 750;
}

.blind-box__subtitle {
  margin-top: 5rpx;
  color: #908a85;
  font-size: 21rpx;
}

.blind-box__go {
  display: flex;
  width: 69rpx;
  height: 69rpx;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-radius: 50%;
  background: linear-gradient(145deg, #ff9d24, #f46a00);
  box-shadow: 0 7rpx 18rpx rgba(239, 102, 0, 0.2);
  font-size: 23rpx;
  font-weight: 750;
}

.status-card {
  margin-top: 23rpx;
  padding: 21rpx 26rpx 20rpx;
  border: 1rpx solid rgba(95, 66, 43, 0.025);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 10rpx 30rpx rgba(91, 59, 34, 0.045);
}

.status-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  color: #201b18;
  font-size: 29rpx;
  font-weight: 750;
}

.edit {
  display: flex;
  width: 40rpx;
  height: 35rpx;
  align-items: center;
  justify-content: center;
}

.edit__pencil {
  position: relative;
  width: 23rpx;
  height: 8rpx;
  border: 2rpx solid #85898d;
  transform: rotate(-45deg);

  &::after {
    position: absolute;
    top: -2rpx;
    right: -8rpx;
    width: 5rpx;
    height: 8rpx;
    border: 2rpx solid #85898d;
    border-left: 0;
    content: '';
  }
}

.status-card__scroll {
  width: 100%;
  margin-top: 15rpx;
  white-space: nowrap;
}

.status-list {
  display: inline-flex;
  gap: 13rpx;
}

.status-chip {
  height: 52rpx;
  padding: 0 23rpx;
  color: #615d59;
  border: 2rpx solid transparent;
  border-radius: 29rpx;
  background: #f8f6f4;
  font-size: 23rpx;
  line-height: 48rpx;

  &--active {
    color: #f47a13;
    border-color: #ff8b27;
    background: #fff8f0;
    font-weight: 650;
  }
}

.recommend-heading {
  display: flex;
  height: 67rpx;
  padding: 2rpx 3rpx 0;
  align-items: center;
  justify-content: space-between;
}

.more {
  display: flex;
  align-items: center;
  color: #918d88;
  font-size: 22rpx;
}

.more__arrow {
  margin-left: 8rpx;
  color: #a5a29e;
  font-size: 37rpx;
  line-height: 1;
}

.recipe-card {
  display: flex;
  width: 100%;
  height: 184rpx;
  overflow: hidden;
  align-items: stretch;
  border: 1rpx solid rgba(92, 62, 39, 0.025);
  border-radius: 26rpx;
  background: #fff;
  box-shadow: 0 9rpx 27rpx rgba(100, 65, 39, 0.05);
  text-align: left;
}

.recipe-card__cover {
  width: 44%;
  height: 100%;
  flex: 0 0 44%;
  background: #f1e9e1;
}

.recipe-card__body {
  display: flex;
  min-width: 0;
  padding: 17rpx 16rpx 14rpx 19rpx;
  flex: 1;
  flex-direction: column;
}

.recipe-card__title-row {
  display: flex;
  min-width: 0;
  align-items: center;
}

.recipe-card__name {
  color: #181512;
  font-size: 29rpx;
  font-weight: 780;
  white-space: nowrap;
}

.recipe-card__badge {
  margin-left: 10rpx;
  padding: 5rpx 9rpx;
  color: #f47a13;
  border-radius: 14rpx;
  background: #fff1e4;
  font-size: 17rpx;
  white-space: nowrap;
}

.recipe-card__reason {
  margin-top: 7rpx;
  overflow: hidden;
  color: #817a74;
  font-size: 20rpx;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-card__tags {
  display: flex;
  margin-top: 10rpx;
  gap: 9rpx;
}

.recipe-card__tag {
  padding: 4rpx 9rpx;
  color: #f47a13;
  border-radius: 13rpx;
  background: #fff3e8;
  font-size: 18rpx;
}

.recipe-card__meta {
  display: flex;
  margin-top: auto;
  align-items: center;
  gap: 22rpx;
  color: #85817c;
  font-size: 19rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.clock {
  position: relative;
  width: 21rpx;
  height: 21rpx;
  margin-right: 7rpx;
  border: 2rpx solid #96999c;
  border-radius: 50%;

  &::before,
  &::after {
    position: absolute;
    top: 4rpx;
    left: 8rpx;
    width: 2rpx;
    border-radius: 1rpx;
    background: #96999c;
    content: '';
    transform-origin: bottom center;
  }

  &::before { height: 6rpx; }
  &::after { height: 5rpx; transform: rotate(120deg); }
}

.person {
  margin-right: 5rpx;
  color: #96999c;
  font-size: 22rpx;
}

/* #ifdef MP-WEIXIN */
.notice { margin-right: 178rpx; }
.home { padding-bottom: 32rpx; }
/* #endif */

@media (min-width: 500px) {
  .home {
    max-width: 750rpx;
    margin: 0 auto;
  }
}
</style>
