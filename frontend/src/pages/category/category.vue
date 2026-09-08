<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import AppTabBar from '@/components/AppTabBar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useRecipeStore } from '@/stores/recipe'
import { useTabBarSelection } from '@/composables/useTabBarSelection'

const recipeStore = useRecipeStore()
const { cookingCategories, takeoutCategories, statusOptions: statusFilters, selectedStatus, recommendation, loading, errorMessage } = storeToRefs(recipeStore)

async function loadCategory(force = false) {
  try {
    await recipeStore.loadBootstrap(force)
  } catch {
    if (force) uni.showToast({ title: errorMessage.value, icon: 'none' })
  }
}

useTabBarSelection(1)

function openSearch() {
  uni.showToast({ title: '搜索功能正在接入', icon: 'none' })
}

function showNotice() {
  uni.showToast({ title: '暂时没有新消息', icon: 'none' })
}

function openCategory(id: string, source: 'cooking' | 'takeout') {
  if (source === 'takeout') {
    uni.navigateTo({ url: `/pages/takeout/takeout?category=${id}` })
    return
  }
  uni.navigateTo({ url: `/pages/recipe/list?category=${id}&source=${source}` })
}

function viewAll(source: 'cooking' | 'takeout') {
  if (source === 'takeout') {
    uni.navigateTo({ url: '/pages/takeout/takeout' })
    return
  }
  uni.navigateTo({ url: `/pages/recipe/list?source=${source}` })
}

async function selectStatus(id: string) {
  recipeStore.selectStatus(id)
  await loadCategory(true)
}

async function refreshRecommendation() {
  try {
    await recipeStore.refreshRecommendation()
  } catch {
    uni.showToast({ title: errorMessage.value, icon: 'none' })
  }
}

function openRecipe() {
  if (recommendation.value.id) uni.navigateTo({ url: `/pages/recipe/detail?id=${recommendation.value.id}` })
}

onShow(() => void loadCategory())
</script>

<template>
  <view class="category-page">
    <view class="category-page__glow" />

    <AppHeader title="分类" action-icon="/static/images/home/icon-bell.png" action-label="消息通知" :page-padding="28" @action="showNotice" />

    <button class="search" @click="openSearch">
      <image class="search__icon" src="/static/images/home/icon-search.png" mode="aspectFit" />
      <text class="search__placeholder">搜索菜名、口味或场景</text>
    </button>

    <view v-if="loading && !cookingCategories.length" class="data-state">正在加载分类…</view>
    <button v-else-if="errorMessage && !cookingCategories.length" class="data-state data-state--error" @click="loadCategory(true)">{{ errorMessage }}，点击重试</button>

    <view class="category-section">
      <view class="section-header">
        <view class="section-header__title"><text class="section-dot" />做饭分类</view>
        <button class="section-more" @click="viewAll('cooking')">查看全部 <text>›</text></button>
      </view>
      <view class="category-grid">
        <button v-for="item in cookingCategories" :key="item.id" class="category-card" @click="openCategory(item.id, 'cooking')">
          <image class="category-card__cover" :src="item.cover" mode="aspectFill" />
          <view class="category-card__body">
            <image class="category-card__icon" :src="item.icon" mode="aspectFit" />
            <text class="category-card__name">{{ item.name }}</text>
            <text class="category-card__desc">{{ item.description }}</text>
          </view>
        </button>
      </view>
    </view>

    <view class="category-section">
      <view class="section-header">
        <view class="section-header__title"><text class="section-dot" />外卖分类</view>
        <button class="section-more" @click="viewAll('takeout')">查看全部 <text>›</text></button>
      </view>
      <view class="category-grid">
        <button v-for="item in takeoutCategories" :key="item.id" class="category-card" @click="openCategory(item.id, 'takeout')">
          <image class="category-card__cover" :src="item.cover" mode="aspectFill" />
          <view class="category-card__body">
            <image class="category-card__icon" :src="item.icon" mode="aspectFit" />
            <text class="category-card__name">{{ item.name }}</text>
            <text class="category-card__desc">{{ item.description }}</text>
          </view>
        </button>
      </view>
    </view>

    <view class="status-section">
      <view class="section-header section-header--status">
        <view class="section-header__title"><text class="section-dot" />按状态找吃的</view>
      </view>
      <scroll-view class="status-scroll" scroll-x :show-scrollbar="false">
        <view class="status-list">
          <button v-for="item in statusFilters" :key="item.id" class="status-chip" :class="{ 'status-chip--active': selectedStatus === item.id }" @click="selectStatus(item.id)">
            <text class="status-chip__icon">{{ item.icon }}</text>{{ item.name }}
          </button>
        </view>
      </scroll-view>
    </view>

    <view class="recommend-heading">
      <view class="section-header__title"><text class="section-dot" />为你推荐</view>
      <button class="refresh" @click="refreshRecommendation">换一换 <text>↻</text></button>
    </view>

    <button v-if="recommendation.id" class="recommend-card" @click="openRecipe">
      <image class="recommend-card__cover" :src="recommendation.cover" mode="aspectFill" />
      <view class="recommend-card__body">
        <view class="recommend-card__top">
          <text class="recommend-card__name">{{ recommendation.name }}</text>
          <text class="recommend-card__arrow">›</text>
        </view>
        <view class="recommend-card__tags">
          <text v-for="tag in recommendation.tags" :key="tag" class="recommend-card__tag">{{ tag }}</text>
        </view>
        <text class="recommend-card__reason">{{ recommendation.reason }}</text>
      </view>
    </button>

    <!-- #ifndef MP-WEIXIN -->
    <AppTabBar :selected="1" />
    <!-- #endif -->
  </view>
</template>

<style scoped lang="scss">
.category-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  padding: 0 28rpx calc(env(safe-area-inset-bottom) + 164rpx);
  background: #fdf9f4;
  box-sizing: border-box;
}

.data-state {
  display: flex;
  min-height: 150rpx;
  margin-top: 24rpx;
  align-items: center;
  justify-content: center;
  border-radius: 24rpx;
  background: #fff;
  color: #8d8883;
  font-size: 26rpx;
}

.data-state--error {
  color: #d76832;
}

.category-page__glow {
  position: absolute;
  top: -110rpx;
  right: -120rpx;
  width: 430rpx;
  height: 360rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 235, 208, 0.66) 0%, rgba(255, 244, 230, 0.24) 52%, transparent 72%);
  pointer-events: none;
}

.header,
.search,
.category-section,
.status-section,
.recommend-heading,
.recommend-card {
  position: relative;
  z-index: 1;
}

.header {
  display: flex;
  height: 64rpx;
  align-items: center;
  justify-content: space-between;
}

.header__title {
  color: #3d2719;
  font-size: 45rpx;
  font-weight: 800;
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

.search {
  display: flex;
  width: 100%;
  height: 84rpx;
  margin-top: 18rpx;
  padding: 0 27rpx;
  align-items: center;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 8rpx 24rpx rgba(97, 67, 41, 0.04);
  text-align: left;
}

.search__icon {
  width: 35rpx;
  height: 35rpx;
}

.search__placeholder {
  margin-left: 19rpx;
  color: #a6a7aa;
  font-size: 26rpx;
}

.category-section,
.status-section {
  margin-top: 18rpx;
  padding: 16rpx 14rpx 17rpx;
  border: 1rpx solid rgba(105, 75, 51, 0.035);
  border-radius: 27rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8rpx 25rpx rgba(96, 63, 37, 0.045);
}

.section-header {
  display: flex;
  height: 35rpx;
  padding: 0 3rpx;
  align-items: center;
  justify-content: space-between;
}

.section-header__title {
  display: flex;
  align-items: center;
  color: #201b18;
  font-size: 29rpx;
  font-weight: 750;
  white-space: nowrap;
}

.section-dot {
  width: 11rpx;
  height: 11rpx;
  margin-right: 10rpx;
  border-radius: 50%;
  background: #ff9a25;
}

.section-more,
.refresh {
  display: flex;
  align-items: center;
  color: #918d88;
  font-size: 24rpx;
}

.section-more text {
  margin-left: 5rpx;
  font-size: 29rpx;
  line-height: 1;
}

.category-grid {
  display: grid;
  margin-top: 11rpx;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 9rpx;
}

.category-card {
  min-width: 0;
  height: 198rpx;
  overflow: hidden;
  border-radius: 19rpx;
  background: #fffaf4;
  box-shadow: 0 4rpx 12rpx rgba(94, 61, 35, 0.035);
}

.category-card__cover {
  display: block;
  width: 100%;
  height: 96rpx;
  background: #f3eadf;
}

.category-card__body {
  display: flex;
  height: 102rpx;
  padding: 3rpx 1rpx 6rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.category-card__icon {
  width: 31rpx;
  height: 31rpx;
}

.category-card__name {
  margin-top: 2rpx;
  color: #26201c;
  font-size: 24rpx;
  font-weight: 750;
  line-height: 1.2;
  white-space: nowrap;
}

.category-card__desc {
  width: 100%;
  margin-top: 4rpx;
  overflow: hidden;
  color: #908983;
  font-size: 24rpx;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-section {
  padding-bottom: 15rpx;
}

.section-header--status {
  justify-content: flex-start;
}

.status-scroll {
  width: 100%;
  margin-top: 11rpx;
  white-space: nowrap;
}

.status-list {
  display: inline-flex;
  padding: 0 2rpx;
  gap: 9rpx;
}

.status-chip {
  display: inline-flex;
  height: 48rpx;
  padding: 0 14rpx;
  align-items: center;
  color: #5f5b57;
  border: 1rpx solid #ebe8e5;
  border-radius: 23rpx;
  background: #fbfaf9;
  font-size: 24rpx;
  white-space: nowrap;
}

.status-chip__icon {
  margin-right: 6rpx;
  font-size: 24rpx;
}

.status-chip--active {
  color: #5d814d;
  border-color: #9bc384;
  background: #f4faee;
  font-weight: 650;
}

.recommend-heading {
  display: flex;
  height: 63rpx;
  padding: 4rpx 5rpx 0;
  align-items: center;
  justify-content: space-between;
}

.refresh text {
  margin-left: 6rpx;
  font-size: 25rpx;
}

.recommend-card {
  display: flex;
  width: 100%;
  height: 190rpx;
  overflow: hidden;
  border-radius: 25rpx;
  background: #fff;
  box-shadow: 0 8rpx 25rpx rgba(96, 63, 37, 0.05);
  text-align: left;
}

.recommend-card__cover {
  width: 39%;
  height: 100%;
  flex: 0 0 39%;
}

.recommend-card__body {
  display: flex;
  min-width: 0;
  padding: 16rpx 17rpx 14rpx 18rpx;
  flex: 1;
  flex-direction: column;
}

.recommend-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.recommend-card__name {
  color: #1f1a17;
  font-size: 29rpx;
  font-weight: 780;
}

.recommend-card__arrow {
  display: flex;
  width: 37rpx;
  height: 37rpx;
  align-items: center;
  justify-content: center;
  color: #a6a19d;
  border-radius: 50%;
  background: #f8f6f3;
  font-size: 31rpx;
}

.recommend-card__tags {
  display: flex;
  margin-top: 8rpx;
  gap: 7rpx;
}

.recommend-card__tag {
  padding: 4rpx 9rpx;
  color: #f47a13;
  border-radius: 11rpx;
  background: #fff2e6;
  font-size: 24rpx;
}

.recommend-card__reason {
  display: -webkit-box;
  margin-top: 10rpx;
  overflow: hidden;
  color: #7f7973;
  font-size: 24rpx;
  line-height: 1.4;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (min-width: 500px) {
  .category-page {
    max-width: 750rpx;
    margin: 0 auto;
  }
}
</style>
