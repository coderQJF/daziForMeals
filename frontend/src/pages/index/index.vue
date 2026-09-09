<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { onUnmounted, ref } from 'vue'
import AppTabBar from '@/components/AppTabBar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useRecipeStore } from '@/stores/recipe'
import { useTabBarSelection } from '@/composables/useTabBarSelection'
import type { CategoryItem } from '@/types/recipe'

const recipeStore = useRecipeStore()
const { recommendation, selectedStatus, statusLabel, quickCategories, statusOptions, loading, errorMessage } = storeToRefs(recipeStore)
const blindBoxOpen = ref(false)
const blindBoxStage = ref<'rolling' | 'result'>('rolling')
let blindBoxDelay: ReturnType<typeof setTimeout> | undefined

async function loadHome(force = false) {
  try {
    await recipeStore.loadBootstrap(force)
  } catch {
    if (force) uni.showToast({ title: errorMessage.value, icon: 'none' })
  }
}

async function handleQuickAction(item: CategoryItem) {
  if (item.id === 'takeout') {
    uni.navigateTo({ url: '/pages/takeout/takeout' })
    return
  }

  if (item.id === 'recover') await recipeStore.selectStatus('recover')
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

function waitForBlindBoxRoll() {
  return new Promise<void>((resolve) => {
    blindBoxDelay = setTimeout(resolve, 1600)
  })
}

async function openBlindBox() {
  if (blindBoxOpen.value && blindBoxStage.value === 'rolling') return
  blindBoxStage.value = 'rolling'
  blindBoxOpen.value = true

  try {
    await Promise.all([
      recipeStore.refreshRecommendation(),
      waitForBlindBoxRoll(),
    ])
    blindBoxStage.value = 'result'
  } catch {
    blindBoxOpen.value = false
    uni.showToast({ title: errorMessage.value, icon: 'none' })
  }
}

function closeBlindBox() {
  if (blindBoxStage.value === 'rolling') return
  blindBoxOpen.value = false
}

function openBlindBoxRecipe() {
  blindBoxOpen.value = false
  openRecipe()
}

async function selectStatus(status: string) {
  await recipeStore.selectStatus(status)
  await loadHome(true)
}

useTabBarSelection(0)

onShow(() => void loadHome())

onPullDownRefresh(async () => {
  await loadHome(true)
  uni.stopPullDownRefresh()
})

onUnmounted(() => {
  if (blindBoxDelay) clearTimeout(blindBoxDelay)
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

    <button class="blind-box" :disabled="blindBoxOpen" @click="openBlindBox">
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

    <view v-if="blindBoxOpen" class="blind-modal" @touchmove.stop.prevent>
      <view class="blind-modal__backdrop" />

      <view v-if="blindBoxStage === 'rolling'" class="blind-rolling">
        <view class="blind-rolling__halo">
          <image class="blind-rolling__dice" src="/static/images/home/icon-blind-box.png" mode="aspectFit" />
        </view>
        <text class="blind-rolling__title">骰子转呀转…</text>
        <text class="blind-rolling__hint">正在帮你挑一道今天想吃的菜</text>
        <view class="blind-rolling__dots"><text /><text /><text /></view>
      </view>

      <view v-else class="blind-result" role="dialog" aria-label="随机盲盒结果">
        <button class="blind-result__close" aria-label="关闭随机盲盒" @click="closeBlindBox">×</button>
        <view class="blind-result__spark blind-result__spark--left">✦</view>
        <view class="blind-result__spark blind-result__spark--right">✦</view>
        <text class="blind-result__eyebrow">今天就吃这个吧</text>
        <image class="blind-result__cover" :src="recommendation.cover" mode="aspectFill" />
        <text class="blind-result__name">{{ recommendation.name }}</text>
        <text class="blind-result__reason">{{ recommendation.reason }}</text>
        <view class="blind-result__meta">
          <text>{{ recommendation.cookTime }} 分钟</text>
          <text>{{ recommendation.difficulty }}</text>
          <text>约 {{ recommendation.calories }} kcal</text>
        </view>
        <button class="blind-result__action" @click="openBlindBoxRecipe">看看怎么做</button>
        <button class="blind-result__again" @click="openBlindBox">再摇一次</button>
      </view>
    </view>

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

.blind-modal {
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: flex;
  padding: 48rpx;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.blind-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(37, 26, 18, 0.58);
  animation: blind-fade-in 220ms ease-out both;
}

.blind-rolling {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  color: #fff;
}

.blind-rolling__halo {
  display: flex;
  width: 196rpx;
  height: 196rpx;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 20rpx rgba(255, 144, 11, 0.16), 0 22rpx 64rpx rgba(30, 18, 8, 0.24);
  animation: blind-halo-pulse 900ms ease-in-out infinite alternate;
}

.blind-rolling__dice {
  width: 128rpx;
  height: 128rpx;
  animation: blind-dice-roll 620ms cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

.blind-rolling__title {
  margin-top: 52rpx;
  font-size: 36rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.blind-rolling__hint {
  margin-top: 14rpx;
  color: rgba(255, 255, 255, 0.84);
  font-size: 25rpx;
}

.blind-rolling__dots {
  display: flex;
  margin-top: 28rpx;
  gap: 13rpx;
}

.blind-rolling__dots text {
  width: 11rpx;
  height: 11rpx;
  border-radius: 50%;
  background: #fff;
  animation: blind-dot 720ms ease-in-out infinite alternate;
}

.blind-rolling__dots text:nth-child(2) { animation-delay: 180ms; }
.blind-rolling__dots text:nth-child(3) { animation-delay: 360ms; }

.blind-result {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  max-width: 620rpx;
  padding: 34rpx 32rpx 30rpx;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid rgba(255, 197, 122, 0.6);
  border-radius: 38rpx;
  background: linear-gradient(180deg, #fffaf3 0%, #fff 62%);
  box-shadow: 0 32rpx 90rpx rgba(36, 21, 8, 0.28);
  box-sizing: border-box;
  transform-origin: center center;
  animation: blind-result-grow 680ms cubic-bezier(0.2, 0.9, 0.25, 1.16) both;
}

.blind-result__close {
  position: absolute;
  z-index: 2;
  top: 18rpx;
  right: 18rpx;
  display: flex;
  width: 64rpx;
  height: 64rpx;
  padding: 0;
  align-items: center;
  justify-content: center;
  color: #7b7068;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  font-size: 44rpx;
  font-weight: 300;
  line-height: 1;
}

.blind-result__spark {
  position: absolute;
  color: #ffaf43;
  font-size: 42rpx;
  animation: blind-spark 900ms ease-in-out infinite alternate;
}

.blind-result__spark--left { top: 118rpx; left: 18rpx; }
.blind-result__spark--right { top: 210rpx; right: 17rpx; animation-delay: 260ms; }

.blind-result__eyebrow {
  color: $color-primary-deep;
  font-size: 26rpx;
  font-weight: 750;
  letter-spacing: 2rpx;
}

.blind-result__cover {
  width: 284rpx;
  height: 284rpx;
  margin-top: 24rpx;
  border: 10rpx solid #fff;
  border-radius: 50%;
  background: #f1e9e1;
  box-shadow: 0 16rpx 42rpx rgba(190, 110, 35, 0.2);
  animation: blind-dish-grow 820ms 130ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.blind-result__name {
  max-width: 100%;
  margin-top: 23rpx;
  overflow: hidden;
  color: $color-text;
  font-size: 38rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.blind-result__reason {
  display: -webkit-box;
  margin-top: 12rpx;
  overflow: hidden;
  color: $color-text-secondary;
  font-size: 25rpx;
  line-height: 1.5;
  text-align: center;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.blind-result__meta {
  display: flex;
  margin-top: 20rpx;
  color: #918780;
  font-size: 24rpx;
  gap: 23rpx;
}

.blind-result__action {
  width: 100%;
  height: 82rpx;
  margin-top: 28rpx;
  color: #fff;
  border-radius: 41rpx;
  background: linear-gradient(135deg, #ffad35, $color-primary-deep);
  box-shadow: 0 12rpx 28rpx rgba(255, 118, 0, 0.22);
  font-size: 28rpx;
  font-weight: 750;
  line-height: 82rpx;
}

.blind-result__again {
  min-width: 160rpx;
  height: 64rpx;
  margin-top: 12rpx;
  color: $color-primary-deep;
  font-size: 24rpx;
  line-height: 64rpx;
}

@keyframes blind-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes blind-dice-roll {
  0% { transform: rotate(0deg) scale(0.92); }
  25% { transform: rotate(92deg) scale(1.08); }
  50% { transform: rotate(180deg) scale(0.94); }
  75% { transform: rotate(272deg) scale(1.08); }
  100% { transform: rotate(360deg) scale(0.92); }
}

@keyframes blind-halo-pulse {
  from { transform: scale(0.96); }
  to { transform: scale(1.04); }
}

@keyframes blind-dot {
  from { opacity: 0.35; transform: translateY(4rpx); }
  to { opacity: 1; transform: translateY(-4rpx); }
}

@keyframes blind-result-grow {
  0% { opacity: 0; transform: scale(0.12); }
  62% { opacity: 1; transform: scale(1.035); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes blind-dish-grow {
  0% { opacity: 0; transform: scale(0.3) rotate(-8deg); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}

@keyframes blind-spark {
  from { opacity: 0.35; transform: scale(0.75) rotate(-12deg); }
  to { opacity: 1; transform: scale(1.15) rotate(10deg); }
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
