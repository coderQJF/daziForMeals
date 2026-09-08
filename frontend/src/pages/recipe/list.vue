<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppTabBar from '@/components/AppTabBar.vue'
import { useRecipeStore } from '@/stores/recipe'
import type { Recipe } from '@/types/recipe'

const categoryNames: Record<string, string> = {
  quick: '快手菜',
  'home-style': '家常菜',
  soup: '汤羹',
  light: '清淡',
  recovery: '恢复期',
}

const filters = ['综合', '最新', '热度'] as const
const category = ref('')
const activeFilter = ref<(typeof filters)[number]>('综合')
const keyword = ref('')
const recipeStore = useRecipeStore()
const { recipes: visibleRecipes, loading, errorMessage } = storeToRefs(recipeStore)

const pageTitle = computed(() => categoryNames[category.value] ?? '做饭菜谱')

async function loadList() {
  try {
    await recipeStore.loadRecipes({
      category: category.value && category.value !== 'recovery' ? category.value : undefined,
      status: category.value === 'recovery' ? 'recover' : undefined,
      q: keyword.value.trim() || undefined,
      sort: activeFilter.value === '最新' ? 'latest' : activeFilter.value === '热度' ? 'popular' : 'default',
    })
  } catch {
    // Store exposes the user-facing error state.
  }
}

function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/category/category' })
}

function openRecipe(recipe: Recipe) {
  recipeStore.selectRecommendation(recipe)
  uni.navigateTo({ url: `/pages/recipe/detail?id=${recipe.id}` })
}

function clearSearch() {
  keyword.value = ''
}

onLoad((query) => {
  category.value = String(query?.category ?? '')
  void loadList()
})

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch([keyword, activeFilter], () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void loadList(), 300)
})
</script>

<template>
  <view class="list-page">
    <view class="list-page__glow" />

    <view class="nav-row">
      <button class="back-button" aria-label="返回分类" @click="goBack">‹</button>
      <text class="nav-title">{{ pageTitle }}</text>
      <view class="nav-spacer" />
    </view>

    <view class="search-box">
      <view class="search-icon" />
      <input v-model="keyword" class="search-input" placeholder="搜索菜名、食材或功效" placeholder-class="search-placeholder" />
      <button v-if="keyword" class="clear-button" aria-label="清除搜索" @click="clearSearch">×</button>
    </view>

    <view class="filter-row">
      <button
        v-for="filter in filters"
        :key="filter"
        class="filter-button"
        :class="{ 'filter-button--active': activeFilter === filter }"
        @click="activeFilter = filter"
      >
        {{ filter }}
      </button>
      <text class="filter-sort">筛选⌄</text>
    </view>

    <view v-if="loading" class="recipe-list skeleton-list">
      <view v-for="index in 4" :key="index" class="recipe-row skeleton-row">
        <view class="skeleton-image" />
        <view class="skeleton-content">
          <view class="skeleton-line skeleton-line--title" />
          <view class="skeleton-line" />
          <view class="skeleton-line skeleton-line--short" />
        </view>
      </view>
    </view>

    <button v-else-if="errorMessage" class="empty-state" @click="loadList">
      <text class="empty-state__icon">⚠</text>
      <text class="empty-state__title">{{ errorMessage }}</text>
      <text class="empty-state__copy">点击重新加载菜谱</text>
    </button>

    <view v-else-if="visibleRecipes.length" class="recipe-list">
      <button v-for="recipe in visibleRecipes" :key="recipe.id" class="recipe-row" @click="openRecipe(recipe)">
        <image class="recipe-image" :src="recipe.thumbnail || recipe.cover" mode="aspectFill" />
        <view class="recipe-content">
          <view class="recipe-title-row">
            <text class="recipe-name">{{ recipe.name }}</text>
            <text class="recipe-score">★ {{ recipe.popularity }}</text>
          </view>
          <view class="recipe-tags">
            <text v-for="tag in recipe.tags.slice(0, 3)" :key="tag">{{ tag }}</text>
          </view>
          <text class="recipe-reason">{{ recipe.reason }}</text>
          <view class="recipe-meta">
            <text>◷ {{ recipe.cookTime }}分钟</text>
            <text>{{ recipe.difficulty }}</text>
            <text>{{ recipe.servings }}人份</text>
          </view>
        </view>
        <text class="recipe-arrow">›</text>
      </button>
    </view>

    <view v-else class="empty-state">
      <text class="empty-state__icon">🍲</text>
      <text class="empty-state__title">没有找到合适的菜谱</text>
      <text class="empty-state__copy">换个关键词试试，或者返回分类重新挑选。</text>
      <button class="empty-state__button" @click="clearSearch">查看全部菜谱</button>
    </view>

    <AppTabBar :selected="1" />
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.list-page {
  position: relative;
  min-height: 100vh;
  padding: calc(var(--status-bar-height) + 18rpx) 28rpx calc(env(safe-area-inset-bottom) + 174rpx);
  overflow-x: hidden;
  background: $color-page;
}

.list-page__glow {
  position: absolute;
  top: -120rpx;
  right: -120rpx;
  width: 420rpx;
  height: 360rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 226, 190, 0.58), transparent 70%);
  pointer-events: none;
}

.nav-row {
  position: relative;
  z-index: 1;
  display: grid;
  height: 82rpx;
  align-items: center;
  grid-template-columns: 72rpx 1fr 72rpx;
}

.back-button {
  color: $color-text;
  font-size: 58rpx;
  line-height: 72rpx;
  text-align: left;
}

.nav-title {
  font-size: 36rpx;
  font-weight: 800;
  text-align: center;
}

.search-box {
  position: relative;
  z-index: 1;
  display: flex;
  height: 82rpx;
  padding: 0 24rpx;
  align-items: center;
  border-radius: 26rpx;
  background: #fff;
  box-shadow: $shadow-card;
}

.search-icon {
  width: 25rpx;
  height: 25rpx;
  margin-right: 18rpx;
  border: 3rpx solid $color-text-muted;
  border-radius: 50%;
}

.search-icon::after {
  display: block;
  width: 12rpx;
  height: 3rpx;
  margin: 20rpx 0 0 19rpx;
  transform: rotate(45deg);
  border-radius: 3rpx;
  background: $color-text-muted;
  content: '';
}

.search-input {
  height: 100%;
  min-width: 0;
  flex: 1;
  font-size: 27rpx;
}

.search-placeholder { color: $color-text-muted; }
.clear-button { width: 54rpx; color: $color-text-muted; font-size: 38rpx; }

.filter-row {
  position: relative;
  z-index: 1;
  display: flex;
  height: 86rpx;
  align-items: center;
  border-bottom: 1rpx solid $color-line;
  gap: 34rpx;
}

.filter-button {
  position: relative;
  height: 86rpx;
  color: $color-text-secondary;
  font-size: 26rpx;
}

.filter-button--active { color: $color-text; font-weight: 800; }
.filter-button--active::after {
  position: absolute;
  right: 4rpx;
  bottom: 4rpx;
  left: 4rpx;
  height: 5rpx;
  border-radius: 5rpx;
  background: $color-primary;
  content: '';
}

.filter-sort { margin-left: auto; color: $color-text-secondary; font-size: 25rpx; }
.recipe-list { position: relative; z-index: 1; padding-top: 10rpx; }

.recipe-row {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 178rpx;
  padding: 18rpx 26rpx 18rpx 12rpx;
  align-items: center;
  border-bottom: 1rpx solid $color-line;
  text-align: left;
}

.recipe-image {
  width: 140rpx;
  height: 126rpx;
  margin-right: 22rpx;
  flex: 0 0 140rpx;
  border-radius: 24rpx;
}

.recipe-content { min-width: 0; flex: 1; }
.recipe-title-row { display: flex; min-width: 0; align-items: center; }
.recipe-name { min-width: 0; flex: 1; font-size: 30rpx; font-weight: 800; }
.recipe-score { margin-left: 10rpx; color: $color-primary; font-size: 24rpx; white-space: nowrap; }
.recipe-tags { display: flex; margin-top: 10rpx; gap: 8rpx; }
.recipe-tags text { padding: 4rpx 9rpx; color: $color-success; border-radius: 12rpx; background: $color-success-soft; font-size: 24rpx; }
.recipe-reason { display: -webkit-box; margin-top: 9rpx; overflow: hidden; color: $color-text-secondary; font-size: 24rpx; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 1; }
.recipe-meta { display: flex; margin-top: 9rpx; color: $color-text-muted; font-size: 24rpx; gap: 20rpx; }
.recipe-arrow { margin-left: 10rpx; color: $color-text-muted; font-size: 42rpx; }

.skeleton-row { overflow: hidden; }
.skeleton-image, .skeleton-line { background: linear-gradient(90deg, #f1ece7 25%, #faf7f2 50%, #f1ece7 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; }
.skeleton-image { width: 140rpx; height: 126rpx; margin-right: 22rpx; border-radius: 24rpx; }
.skeleton-content { flex: 1; }
.skeleton-line { height: 20rpx; margin-top: 15rpx; border-radius: 10rpx; }
.skeleton-line--title { width: 58%; height: 28rpx; margin-top: 0; }
.skeleton-line--short { width: 72%; }

.empty-state {
  position: relative;
  z-index: 1;
  display: flex;
  padding: 130rpx 36rpx 0;
  align-items: center;
  flex-direction: column;
  text-align: center;
}
.empty-state__icon { font-size: 92rpx; }
.empty-state__title { margin-top: 24rpx; font-size: 31rpx; font-weight: 800; }
.empty-state__copy { margin-top: 14rpx; color: $color-text-secondary; font-size: 24rpx; line-height: 1.6; }
.empty-state__button { margin-top: 30rpx; padding: 18rpx 34rpx; color: #fff; border-radius: 999rpx; background: $color-primary; font-size: 26rpx; }

@keyframes shimmer { to { background-position: -200% 0; } }

@media (min-width: 500px) {
  .list-page { max-width: 750rpx; margin: 0 auto; }
}
</style>
