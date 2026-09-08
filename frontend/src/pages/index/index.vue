<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import AppTabBar from '@/components/AppTabBar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useRecipeStore } from '@/stores/recipe'
import { useTabBarSelection } from '@/composables/useTabBarSelection'
import type { CategoryItem } from '@/types/recipe'

const recipeStore = useRecipeStore()
const { recommendation, selectedStatus, statusLabel, quickCategories, statusOptions, loading, errorMessage } = storeToRefs(recipeStore)

async function loadHome(force = false) {
  try {
    await recipeStore.loadBootstrap(force)
  } catch {
    if (force) uni.showToast({ title: errorMessage.value, icon: 'none' })
  }
}

function handleQuickAction(item: CategoryItem) {
  if (item.id === 'takeout') {
    uni.navigateTo({ url: '/pages/takeout/takeout' })
    return
  }

  if (item.id === 'recover') recipeStore.selectStatus('recover')
  uni.navigateTo({ url: `/pages/recommend/recommend?type=${item.id}` })
}

function openRecipe() {
  if (!recommendation.value.id) return
  uni.navigateTo({ url: `/pages/recipe/detail?id=${recommendation.value.id}` })
}

function openMore() {
  uni.navigateTo({ url: '/pages/recipe/list?source=cooking' })
}

function openSearch() {
  uni.showToast({ title: '搜索功能正在接入', icon: 'none' })
}

function showNotice() {
  uni.showToast({ title: '暂时没有新消息', icon: 'none' })
}

function openStatus() {
  uni.navigateTo({ url: '/pages/status/status' })
}

async function refreshRecommendation() {
  try {
    await recipeStore.refreshRecommendation()
    uni.showToast({ title: '已为你刷新推荐', icon: 'none' })
  } catch {
    uni.showToast({ title: errorMessage.value, icon: 'none' })
  }
}

async function selectStatus(status: string) {
  recipeStore.selectStatus(status)
  await loadHome(true)
}

useTabBarSelection(0)

onShow(() => void loadHome())

onPullDownRefresh(async () => {
  await loadHome(true)
  uni.stopPullDownRefresh()
})
</script>

<template>
  <view class="home">
    <view class="home__glow" />

    <AppHeader title="饭搭子" action-icon="/static/images/home/icon-bell.png" action-label="消息通知" @action="showNotice">
      <template #subtitle>
        <view class="greeting">
          <text>早上好，骨骼也要好好吃饭呀</text>
          <text class="sun">☀</text>
        </view>
      </template>
    </AppHeader>

    <button class="search" @click="openSearch">
      <image class="search__icon" src="/static/images/home/icon-search.png" mode="aspectFit" />
      <text class="search__placeholder">搜索菜谱、食材或功效</text>
    </button>

    <view class="quick-grid">
      <button v-for="(item, index) in quickCategories" :key="item.id" class="quick-card" :class="`quick-card--${index + 1}`" @click="handleQuickAction(item)">
        <image class="quick-card__image" :src="item.icon" mode="aspectFit" />
        <text class="quick-card__name">{{ item.name }}</text>
        <text class="quick-card__desc">{{ item.description }}</text>
      </button>
    </view>

    <button class="blind-box" @click="refreshRecommendation">
      <view class="blind-box__icon-wrap">
        <image class="blind-box__icon" src="/static/images/home/icon-blind-box.png" mode="aspectFit" />
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
        <button class="edit" aria-label="编辑状态" @click="openStatus">
          <image class="edit__icon" src="/static/images/home/icon-edit.png" mode="aspectFit" />
        </button>
      </view>
      <scroll-view class="status-card__scroll" scroll-x :show-scrollbar="false">
        <view class="status-list">
          <button
            v-for="item in statusOptions"
            :key="item.id"
            class="status-chip"
            :class="{ 'status-chip--active': item.id === selectedStatus }"
            @click="selectStatus(item.id)"
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

    <view v-if="loading && !recommendation.id" class="data-state">正在加载今日推荐…</view>
    <button v-else-if="errorMessage && !recommendation.id" class="data-state data-state--error" @click="loadHome(true)">
      {{ errorMessage }}，点击重试
    </button>
    <button v-else-if="recommendation.id" class="recipe-card" @click="openRecipe">
      <image class="recipe-card__cover" :src="recommendation.cover" mode="aspectFill" />
      <view class="recipe-card__body">
        <view class="recipe-card__title-row">
          <text class="recipe-card__name">{{ recommendation.name }}</text>
          <text class="recipe-card__badge">{{ statusLabel }}推荐</text>
        </view>
        <text class="recipe-card__reason">{{ recommendation.reason }}</text>
        <view class="recipe-card__tags">
          <text v-for="tag in recommendation.tags" :key="tag" class="recipe-card__tag">{{ tag }}</text>
        </view>
        <view class="recipe-card__meta">
          <view class="meta-item"><view class="clock" />{{ recommendation.cookTime }} 分钟</view>
          <view class="meta-item"><view class="person-icon" />约 {{ recommendation.calories }} kcal</view>
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
  overflow-x: hidden;
  padding: 0 32rpx calc(env(safe-area-inset-bottom) + 164rpx);
  background: #fdf9f4;
  box-sizing: border-box;
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

.data-state {
  display: flex;
  min-height: 180rpx;
  align-items: center;
  justify-content: center;
  border-radius: 26rpx;
  background: #fff;
  color: #8d8883;
  font-size: 26rpx;
}

.data-state--error {
  color: #d76832;
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

.notice__icon {
  width: 43rpx;
  height: 43rpx;
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
  height: 96rpx;
  margin-top: 23rpx;
  padding: 0 28rpx;
  align-items: center;
  border: 1rpx solid rgba(90, 64, 44, 0.025);
  border-radius: 25rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 9rpx 25rpx rgba(97, 67, 41, 0.04);
  text-align: left;
}

.search__icon {
  width: 39rpx;
  height: 39rpx;
}

.search__placeholder {
  margin-left: 22rpx;
  color: #a7a8ab;
  font-size: 26rpx;
}

.quick-grid {
  display: grid;
  margin-top: 27rpx;
  grid-template-columns: repeat(3, 1fr);
  gap: 18rpx;
}

.quick-card {
  display: flex;
  min-width: 0;
  height: 232rpx;
  padding: 18rpx 6rpx 16rpx;
  flex-direction: column;
  align-items: center;
  border-radius: 30rpx;
  background: linear-gradient(145deg, #fff1e7, #fff5ec);

  &--2 { background: linear-gradient(145deg, #fff4e4, #fff9e7); }
  &--3 { background: linear-gradient(145deg, #f4f7e9, #eef5e7); }
}

.quick-card__image {
  width: 104rpx;
  height: 104rpx;
}

.quick-card__name {
  margin-top: 3rpx;
  color: #1f1b18;
  font-size: 29rpx;
  font-weight: 750;
  line-height: 1.25;
}

.quick-card__desc {
  margin-top: 5rpx;
  color: #8d8883;
  font-size: 24rpx;
  line-height: 1.2;
}

.blind-box {
  display: flex;
  width: 100%;
  height: 116rpx;
  margin-top: 25rpx;
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
  width: 70rpx;
  height: 70rpx;
  align-items: center;
  justify-content: center;
  border-radius: 19rpx;
  background: #fff1da;
}

.blind-box__icon {
  width: 63rpx;
  height: 63rpx;
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
  font-size: 29rpx;
  font-weight: 750;
}

.blind-box__subtitle {
  margin-top: 5rpx;
  color: #908a85;
  font-size: 24rpx;
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
  font-size: 24rpx;
  font-weight: 750;
}

.status-card {
  margin-top: 25rpx;
  padding: 23rpx 26rpx 22rpx;
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
  font-size: 30rpx;
  font-weight: 750;
}

.edit {
  display: flex;
  width: 44rpx;
  height: 42rpx;
  align-items: center;
  justify-content: center;
}

.edit__icon {
  width: 40rpx;
  height: 40rpx;
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
  height: 56rpx;
  padding: 0 25rpx;
  color: #615d59;
  border: 2rpx solid transparent;
  border-radius: 29rpx;
  background: #f8f6f4;
  font-size: 24rpx;
  line-height: 52rpx;

  &--active {
    color: #f47a13;
    border-color: #ff8b27;
    background: #fff8f0;
    font-weight: 650;
  }
}

.recommend-heading {
  display: flex;
  height: 72rpx;
  padding: 2rpx 3rpx 0;
  align-items: center;
  justify-content: space-between;
}

.more {
  display: flex;
  align-items: center;
  color: #918d88;
  font-size: 24rpx;
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
  height: 246rpx;
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
  padding: 23rpx 18rpx 19rpx 21rpx;
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
  font-size: 30rpx;
  font-weight: 780;
  white-space: nowrap;
}

.recipe-card__badge {
  margin-left: 10rpx;
  padding: 5rpx 9rpx;
  color: #f47a13;
  border-radius: 14rpx;
  background: #fff1e4;
  font-size: 24rpx;
  white-space: nowrap;
}

.recipe-card__reason {
  margin-top: 11rpx;
  overflow: hidden;
  color: #817a74;
  font-size: 24rpx;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-card__tags {
  display: flex;
  margin-top: 15rpx;
  gap: 9rpx;
}

.recipe-card__tag {
  padding: 4rpx 9rpx;
  color: #f47a13;
  border-radius: 13rpx;
  background: #fff3e8;
  font-size: 24rpx;
}

.recipe-card__meta {
  display: flex;
  margin-top: auto;
  align-items: center;
  gap: 22rpx;
  color: #85817c;
  font-size: 24rpx;
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

.person-icon {
  position: relative;
  width: 20rpx;
  height: 20rpx;
  margin-right: 7rpx;

  &::before {
    position: absolute;
    top: 0;
    left: 7rpx;
    width: 6rpx;
    height: 6rpx;
    border: 2rpx solid #96999c;
    border-radius: 50%;
    content: '';
  }

  &::after {
    position: absolute;
    bottom: 0;
    left: 3rpx;
    width: 14rpx;
    height: 8rpx;
    border: 2rpx solid #96999c;
    border-top-left-radius: 9rpx;
    border-top-right-radius: 9rpx;
    border-bottom: 0;
    content: '';
  }
}

@media (min-width: 500px) {
  .home {
    max-width: 750rpx;
    margin: 0 auto;
  }
}
</style>
