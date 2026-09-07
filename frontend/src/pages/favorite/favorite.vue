<script setup lang="ts">
import { computed, ref } from 'vue'
import AppTabBar from '@/components/AppTabBar.vue'
import AppHeader from '@/components/AppHeader.vue'
import { useTabBarSelection } from '@/composables/useTabBarSelection'
import { recipeCatalog } from '@/mocks/recipe'
import { useRecipeStore } from '@/stores/recipe'

type KitchenTab = 'favorite' | 'cooked'

interface KitchenRecipe {
  id: number
  name: string
  description: string
  cookTime: number
  servings: number
  cover: string
  cooked: boolean
}

const activeTab = ref<KitchenTab>('favorite')
const recipeStore = useRecipeStore()
const cookedIds = ref<number[]>(uni.getStorageSync('cookedRecipeIds') || [2001])

const visibleRecipes = computed<KitchenRecipe[]>(() => {
  const filtered = activeTab.value === 'favorite'
    ? recipeCatalog.filter(recipe => recipeStore.isFavorite(recipe.id))
    : recipeCatalog.filter(recipe => cookedIds.value.includes(recipe.id))

  return filtered.map(recipe => ({
    id: recipe.id,
    name: recipe.name,
    description: recipe.reason,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    cover: recipe.cover,
    cooked: cookedIds.value.includes(recipe.id),
  }))
})

useTabBarSelection(3)

function switchTab(tab: KitchenTab) {
  activeTab.value = tab
}

function openRecipe(recipe: KitchenRecipe) {
  uni.navigateTo({ url: `/pages/recipe/detail?id=${recipe.id}` })
}

function toggleFavorite(recipe: KitchenRecipe) {
  recipeStore.toggleFavorite(recipe.id)
  uni.showToast({
    title: recipeStore.isFavorite(recipe.id) ? '已加入收藏' : '已取消收藏',
    icon: 'none',
  })
}

function openRecipeMenu(recipe: KitchenRecipe) {
  uni.showActionSheet({
    itemList: [recipeStore.isFavorite(recipe.id) ? '取消收藏' : '加入收藏', '添加到饮食计划', '标记为做过'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) {
        toggleFavorite(recipe)
        return
      }

      if (tapIndex === 1) {
        recipeStore.addToPlan(recipe.id)
        uni.showToast({ title: '已添加到饮食计划', icon: 'none' })
        return
      }

      if (!cookedIds.value.includes(recipe.id)) cookedIds.value = [...cookedIds.value, recipe.id]
      uni.setStorageSync('cookedRecipeIds', cookedIds.value)
      uni.showToast({ title: '已记录为做过', icon: 'none' })
    },
  })
}

function addRecipe() {
  uni.showToast({ title: '自定义菜谱录入功能正在接入', icon: 'none' })
}

function showNotice() {
  uni.showToast({ title: '暂时没有新消息', icon: 'none' })
}

function showTip() {
  uni.showToast({ title: '计划页可一键添加收藏菜谱', icon: 'none' })
}
</script>

<template>
  <view class="favorite-page">
    <view class="favorite-page__glow" />

    <AppHeader title="我的厨房" action-icon="/static/images/favorite/notification-bell.png" action-label="查看消息" @action="showNotice" />

    <view class="kitchen-tabs">
      <button
        class="kitchen-tab"
        :class="{ 'kitchen-tab--active': activeTab === 'favorite' }"
        @click="switchTab('favorite')"
      >
        收藏
      </button>
      <button
        class="kitchen-tab"
        :class="{ 'kitchen-tab--active': activeTab === 'cooked' }"
        @click="switchTab('cooked')"
      >
        我做过
      </button>
    </view>

    <view v-if="visibleRecipes.length" class="recipe-list">
      <view
        v-for="recipe in visibleRecipes"
        :key="recipe.id"
        class="kitchen-card"
        @click="openRecipe(recipe)"
      >
        <image class="kitchen-card__cover" :src="recipe.cover" mode="aspectFill" />

        <view class="kitchen-card__content">
          <view class="kitchen-card__topline">
            <text class="kitchen-card__name">{{ recipe.name }}</text>
            <view class="kitchen-card__actions">
              <button
                class="kitchen-card__icon-button"
                :aria-label="recipeStore.isFavorite(recipe.id) ? '取消收藏' : '加入收藏'"
                @click.stop="toggleFavorite(recipe)"
              >
                <image
                  v-if="recipeStore.isFavorite(recipe.id)"
                  class="kitchen-card__heart-image"
                  src="/static/images/favorite/favorite-filled.png"
                  mode="aspectFit"
                />
                <text v-else class="kitchen-card__heart-empty">♡</text>
              </button>
              <button
                class="kitchen-card__more"
                aria-label="更多操作"
                @click.stop="openRecipeMenu(recipe)"
              >
                <image src="/static/images/favorite/more.png" mode="aspectFit" />
              </button>
            </view>
          </view>

          <text class="kitchen-card__description">{{ recipe.description }}</text>

          <view class="kitchen-card__meta">
            <view class="meta-item">
              <view class="meta-icon meta-icon--clock" />
              <text>{{ recipe.cookTime }} 分钟</text>
            </view>
            <view class="meta-item">
              <view class="meta-icon meta-icon--person" />
              <text>{{ recipe.servings }} 人份</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <image src="/static/images/favorite/recipe-note-soft.png" mode="aspectFit" />
      <text class="empty-state__title">这里还没有菜谱</text>
      <text class="empty-state__copy">做过喜欢的菜后，可以在这里慢慢收藏。</text>
    </view>

    <button class="add-recipe" @click="addRecipe">
      <image src="/static/images/favorite/add.png" mode="aspectFit" />
      <text>录入我的菜</text>
    </button>

    <button class="kitchen-tip" @click="showTip">
      <image class="kitchen-tip__icon" src="/static/images/favorite/tip-bulb.png" mode="aspectFit" />
      <view class="kitchen-tip__copy">
        <text class="kitchen-tip__title">小贴士</text>
        <text class="kitchen-tip__description">收藏常做的菜，计划时一键添加，搭配更省心！</text>
      </view>
      <text class="kitchen-tip__chevron">›</text>
    </button>

    <!-- #ifndef MP-WEIXIN -->
    <AppTabBar :selected="3" />
    <!-- #endif -->
  </view>
</template>

<style scoped lang="scss">
.favorite-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  padding: 0 32rpx calc(env(safe-area-inset-bottom) + 184rpx);
  background: #fdf9f4;
  box-sizing: border-box;
}

.favorite-page__glow {
  position: absolute;
  top: -130rpx;
  right: -100rpx;
  width: 450rpx;
  height: 390rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 232, 202, 0.62), rgba(255, 247, 238, 0.12) 62%, transparent 73%);
  pointer-events: none;
}

.page-header,
.kitchen-tabs,
.recipe-list,
.empty-state,
.add-recipe,
.kitchen-tip {
  position: relative;
  z-index: 1;
}

.page-header {
  display: flex;
  min-height: 90rpx;
  align-items: center;
  justify-content: space-between;
}

.page-header__title {
  color: #3b2618;
  font-size: 44rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}

.page-header__bell {
  display: flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
}

.page-header__bell-icon {
  width: 72rpx;
  height: 72rpx;
}

.kitchen-tabs {
  display: flex;
  height: 88rpx;
  align-items: flex-end;
  gap: 64rpx;
  border-bottom: 1rpx solid rgba(77, 55, 40, 0.09);
}

.kitchen-tab {
  position: relative;
  height: 78rpx;
  padding: 0 10rpx;
  color: #6e6965;
  font-size: 29rpx;
  font-weight: 550;
}

.kitchen-tab--active {
  color: #ff6f0a;
  font-weight: 750;
}

.kitchen-tab--active::after {
  position: absolute;
  right: 10rpx;
  bottom: 0;
  left: 10rpx;
  height: 5rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #ff971e, #ff6800);
  content: '';
}

.recipe-list {
  display: flex;
  margin-top: 18rpx;
  flex-direction: column;
  gap: 14rpx;
}

.kitchen-card {
  display: flex;
  width: 100%;
  height: 226rpx;
  overflow: hidden;
  border: 1rpx solid rgba(98, 68, 46, 0.035);
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 9rpx 26rpx rgba(76, 49, 29, 0.05);
}

.kitchen-card__cover {
  display: block;
  width: 252rpx;
  height: 100%;
  flex: 0 0 252rpx;
  background: #f1e9e1;
}

.kitchen-card__content {
  display: flex;
  min-width: 0;
  flex: 1;
  padding: 20rpx 19rpx 17rpx 22rpx;
  flex-direction: column;
}

.kitchen-card__topline {
  display: flex;
  min-width: 0;
  height: 45rpx;
  align-items: center;
  justify-content: space-between;
}

.kitchen-card__name {
  min-width: 0;
  overflow: hidden;
  color: #2f2722;
  font-size: 29rpx;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kitchen-card__actions {
  display: flex;
  margin-left: 8rpx;
  flex: 0 0 auto;
  align-items: center;
}

.kitchen-card__icon-button,
.kitchen-card__more {
  display: flex;
  width: 49rpx;
  height: 49rpx;
  align-items: center;
  justify-content: center;
}

.kitchen-card__heart-image {
  width: 49rpx;
  height: 49rpx;
}

.kitchen-card__heart-empty {
  color: #9299a2;
  font-size: 44rpx;
  line-height: 1;
}

.kitchen-card__more {
  width: 52rpx;
}

.kitchen-card__more image {
  width: 52rpx;
  height: 52rpx;
}

.kitchen-card__description {
  display: -webkit-box;
  margin-top: 12rpx;
  overflow: hidden;
  color: #77716c;
  font-size: 24rpx;
  line-height: 1.52;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.kitchen-card__meta {
  display: flex;
  margin-top: auto;
  align-items: center;
  gap: 28rpx;
  color: #8e8a86;
  font-size: 24rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.meta-icon {
  position: relative;
  display: block;
  width: 25rpx;
  height: 25rpx;
  margin-right: 7rpx;
  flex: 0 0 25rpx;
}

.meta-icon--clock {
  border: 2rpx solid #a1a3a6;
  border-radius: 50%;
}

.meta-icon--clock::before,
.meta-icon--clock::after {
  position: absolute;
  top: 10rpx;
  left: 11rpx;
  width: 7rpx;
  height: 2rpx;
  transform-origin: left center;
  border-radius: 999rpx;
  background: #a1a3a6;
  content: '';
}

.meta-icon--clock::before {
  transform: rotate(-90deg);
}

.meta-icon--clock::after {
  transform: rotate(28deg);
}

.meta-icon--person::before {
  position: absolute;
  top: 1rpx;
  left: 8rpx;
  width: 9rpx;
  height: 9rpx;
  border: 2rpx solid #a1a3a6;
  border-radius: 50%;
  content: '';
}

.meta-icon--person::after {
  position: absolute;
  right: 2rpx;
  bottom: 1rpx;
  left: 2rpx;
  height: 10rpx;
  border: 2rpx solid #a1a3a6;
  border-radius: 12rpx 12rpx 4rpx 4rpx;
  content: '';
}

.empty-state {
  display: flex;
  min-height: 450rpx;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.empty-state image {
  width: 150rpx;
  height: 150rpx;
}

.empty-state__title {
  margin-top: 12rpx;
  color: #3c2b20;
  font-size: 29rpx;
  font-weight: 700;
}

.empty-state__copy {
  margin-top: 10rpx;
  color: #98918c;
  font-size: 24rpx;
}

.add-recipe {
  display: flex;
  width: 100%;
  height: 88rpx;
  margin-top: 22rpx;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #ff7b1c;
  border-radius: 25rpx;
  color: #ff7110;
  font-size: 27rpx;
}

.add-recipe image {
  width: 48rpx;
  height: 48rpx;
  margin-right: 8rpx;
}

.kitchen-tip {
  display: flex;
  width: 100%;
  min-height: 104rpx;
  margin-top: 22rpx;
  padding: 12rpx 20rpx 12rpx 14rpx;
  align-items: center;
  border: 1rpx solid rgba(238, 175, 81, 0.05);
  border-radius: 25rpx;
  background: linear-gradient(100deg, #fff7e9, #fff3dc);
  box-shadow: 0 8rpx 22rpx rgba(128, 88, 42, 0.035);
  text-align: left;
}

.kitchen-tip__icon {
  width: 74rpx;
  height: 74rpx;
  flex: 0 0 74rpx;
}

.kitchen-tip__copy {
  display: flex;
  min-width: 0;
  margin-left: 7rpx;
  flex: 1;
  flex-direction: column;
}

.kitchen-tip__title {
  color: #5e4736;
  font-size: 25rpx;
  font-weight: 700;
}

.kitchen-tip__description {
  margin-top: 5rpx;
  overflow: hidden;
  color: #8b8179;
  font-size: 24rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kitchen-tip__chevron {
  margin-left: 12rpx;
  color: #aaa29b;
  font-size: 42rpx;
  font-weight: 300;
}

@media (min-width: 500px) {
  .favorite-page {
    max-width: 750rpx;
    margin: 0 auto;
  }
}
</style>
