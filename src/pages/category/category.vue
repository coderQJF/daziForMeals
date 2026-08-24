<script setup lang="ts">
import { ref } from 'vue'
import AppTabBar from '@/components/AppTabBar.vue'
import { todayRecipe } from '@/mocks/recipe'
import { useRecipeStore } from '@/stores/recipe'
import { useTabBarSelection } from '@/composables/useTabBarSelection'

interface CategoryCard {
  id: string
  name: string
  description: string
  icon: string
  cover: string
}

const cookingCategories: CategoryCard[] = [
  { id: 'quick', name: '快手菜', description: '15分钟上桌', icon: '/static/images/category/cooking/quick-icon.png', cover: '/static/images/category/cooking/quick-cover.jpg' },
  { id: 'home-style', name: '家常菜', description: '家的味道', icon: '/static/images/category/cooking/home-style-icon.png', cover: '/static/images/category/cooking/home-style-cover.jpg' },
  { id: 'soup', name: '汤羹', description: '温暖滋养', icon: '/static/images/category/cooking/soup-icon.png', cover: '/static/images/category/cooking/soup-cover.jpg' },
  { id: 'light', name: '清淡', description: '少油少盐', icon: '/static/images/category/cooking/light-icon.png', cover: '/static/images/category/cooking/light-cover.jpg' },
  { id: 'recovery', name: '恢复期', description: '营养修复', icon: '/static/images/category/cooking/recovery-icon.png', cover: '/static/images/category/cooking/recovery-cover.jpg' },
]

const takeoutCategories: CategoryCard[] = [
  { id: 'hot-pot', name: '火锅', description: '热辣过瘾', icon: '/static/images/category/takeout/hot-pot-icon.png', cover: '/static/images/category/takeout/hot-pot-cover.jpg' },
  { id: 'noodles', name: '面食', description: '面面俱到', icon: '/static/images/category/takeout/noodles-icon.png', cover: '/static/images/category/takeout/noodles-cover.jpg' },
  { id: 'light-meal', name: '轻食', description: '轻盈健康', icon: '/static/images/category/takeout/light-meal-icon.png', cover: '/static/images/category/takeout/light-meal-cover.jpg' },
  { id: 'fried-chicken', name: '炸鸡', description: '酥脆满足', icon: '/static/images/category/takeout/fried-chicken-icon.png', cover: '/static/images/category/takeout/fried-chicken-cover.jpg' },
  { id: 'japanese', name: '日料', description: '新鲜美味', icon: '/static/images/category/takeout/japanese-icon.png', cover: '/static/images/category/takeout/japanese-cover.jpg' },
]

const statusFilters = [
  { id: 'recover', icon: '🦴', name: '骨折恢复期' },
  { id: 'late', icon: '🌙', name: '熬夜' },
  { id: 'rainy', icon: '🌧️', name: '下雨天' },
  { id: 'lazy', icon: '😴', name: '犯懒' },
  { id: 'appetite', icon: '😟', name: '没胃口' },
]

const recipeStore = useRecipeStore()
const selectedStatus = ref('recover')

useTabBarSelection(1)

function openSearch() {
  uni.showToast({ title: '搜索功能正在接入', icon: 'none' })
}

function openCategory(id: string, source: 'cooking' | 'takeout') {
  uni.navigateTo({ url: `/pages/recipe/list?category=${id}&source=${source}` })
}

function viewAll(source: 'cooking' | 'takeout') {
  uni.navigateTo({ url: `/pages/recipe/list?source=${source}` })
}

function selectStatus(id: string) {
  selectedStatus.value = id
  if (id !== 'rainy') recipeStore.selectStatus(id)
}

function refreshRecommendation() {
  recipeStore.refreshRecommendation()
}

function openRecipe() {
  uni.navigateTo({ url: `/pages/recipe/detail?id=${todayRecipe.id}` })
}
</script>

<template>
  <view class="category-page">
    <view class="category-page__glow" />

    <view class="header">
      <text class="header__title">分类</text>
      <button class="notice" aria-label="消息通知">
        <image class="notice__icon" src="/static/images/home/icon-bell.png" mode="aspectFit" />
      </button>
    </view>

    <button class="search" @click="openSearch">
      <image class="search__icon" src="/static/images/home/icon-search.png" mode="aspectFit" />
      <text class="search__placeholder">搜索菜名、口味或场景</text>
    </button>

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

    <button class="recommend-card" @click="openRecipe">
      <image class="recommend-card__cover" :src="todayRecipe.cover" mode="aspectFill" />
      <view class="recommend-card__body">
        <view class="recommend-card__top">
          <text class="recommend-card__name">{{ todayRecipe.name }}</text>
          <text class="recommend-card__arrow">›</text>
        </view>
        <view class="recommend-card__tags">
          <text v-for="tag in todayRecipe.tags" :key="tag" class="recommend-card__tag">{{ tag }}</text>
        </view>
        <text class="recommend-card__reason">富含钙与胶原蛋白，助力骨骼修复，适合恢复期食用。</text>
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
  padding: calc(var(--status-bar-height) + 26rpx) 28rpx calc(env(safe-area-inset-bottom) + 164rpx);
  background: #fdf9f4;
  box-sizing: border-box;
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
  font-size: 24rpx;
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
  font-size: 27rpx;
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
  font-size: 20rpx;
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
  height: 188rpx;
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
  height: 92rpx;
  padding: 2rpx 2rpx 5rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.category-card__icon {
  width: 29rpx;
  height: 29rpx;
}

.category-card__name {
  margin-top: 1rpx;
  color: #26201c;
  font-size: 21rpx;
  font-weight: 750;
  line-height: 1.2;
  white-space: nowrap;
}

.category-card__desc {
  margin-top: 3rpx;
  overflow: hidden;
  color: #908983;
  font-size: 16rpx;
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
  height: 43rpx;
  padding: 0 15rpx;
  align-items: center;
  color: #5f5b57;
  border: 1rpx solid #ebe8e5;
  border-radius: 23rpx;
  background: #fbfaf9;
  font-size: 18rpx;
  white-space: nowrap;
}

.status-chip__icon {
  margin-right: 6rpx;
  font-size: 20rpx;
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
  height: 178rpx;
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
  padding: 15rpx 17rpx 13rpx 18rpx;
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
  font-size: 27rpx;
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
  padding: 3rpx 8rpx;
  color: #f47a13;
  border-radius: 11rpx;
  background: #fff2e6;
  font-size: 16rpx;
}

.recommend-card__reason {
  display: -webkit-box;
  margin-top: 10rpx;
  overflow: hidden;
  color: #7f7973;
  font-size: 18rpx;
  line-height: 1.45;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* #ifdef MP-WEIXIN */
.notice { margin-right: 178rpx; }
/* #endif */

@media (min-width: 500px) {
  .category-page {
    max-width: 750rpx;
    margin: 0 auto;
  }
}
</style>
