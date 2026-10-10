<script setup lang="ts">
import { onLoad, onPullDownRefresh, onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import { dishImageFor, dishTagFor, mealDishKindFor, type MealDishKind } from '@/config/dish-images'
import { mealSharePath } from '@/config/meal-share'
import { useMealStore } from '@/stores/meal'
import { useRecipeStore } from '@/stores/recipe'
import type { MealWisher } from '@/types/meal'

const mealStore = useMealStore()
const recipeStore = useRecipeStore()
const {
  meal, catalog: recipes, categories, loggedIn, mealLoading, catalogLoading,
  mealError, catalogError, members, dishCount, memberCount, canEdit, pendingRecipeId,
} = storeToRefs(mealStore)
const { profileReady } = storeToRefs(recipeStore)
const keyword = ref('')
const activeCategory = ref('')
const rotation = ref(0)
const bootstrapped = ref(false)
const avatarErrors = ref<string[]>([])
const mealClock = ref(Date.now())
const mealConfirmed = computed(() => meal.value?.status === 'confirmed')
const mealCreationFailed = computed(() => Boolean(loggedIn.value && !meal.value && mealError.value))
const SMART_BATCH_SIZE = 8
const SMART_BATCH_TARGETS: Array<{ kind: MealDishKind; count: number }> = [
  { kind: 'meat', count: 3 },
  { kind: 'vegetable', count: 2 },
  { kind: 'soup', count: 2 },
  { kind: 'staple', count: 1 },
]

function targetMealCopy(now = new Date()) {
  const chinaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const hour = chinaNow.getUTCHours()
  const mealType = hour < 12 || hour >= 19 ? 'lunch' : 'dinner'
  if (hour >= 19) chinaNow.setUTCDate(chinaNow.getUTCDate() + 1)
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][chinaNow.getUTCDay()]
  const period = mealType === 'lunch' ? '午餐' : '晚餐'
  return { title: `${weekday}${period}`, period }
}

const activeMealCopy = computed(() => {
  const target = targetMealCopy(new Date(mealClock.value))
  const period = meal.value?.mealType === 'lunch' ? '午餐' : meal.value?.mealType === 'dinner' ? '晚餐' : target.period
  return { title: meal.value?.title || target.title, period }
})

const mealContext = computed(() => {
  if (meal.value) return `${meal.value.title} · ${memberCount.value} 人`
  if (mealLoading.value) return `${activeMealCopy.value.title} · 正在准备…`
  if (mealCreationFailed.value) return activeMealCopy.value.title
  return loggedIn.value ? `正在发起${activeMealCopy.value.title}…` : `登录后发起${activeMealCopy.value.period}`
})

const dockButtonLabel = computed(() => {
  if (!loggedIn.value) return '微信登录'
  if (mealLoading.value) return '正在准备…'
  if (mealCreationFailed.value) return '重新创建'
  return mealConfirmed.value ? '查看已定菜单' : '查看菜单'
})

const matchingRecipes = computed(() => {
  const category = categories.value.find(item => item.id === activeCategory.value)
  const allowedIds = category ? new Set(category.recipeIds) : null
  const query = keyword.value.trim().toLocaleLowerCase()
  return recipes.value.filter(recipe => (
    (!allowedIds || allowedIds.has(recipe.id))
    && (!query
      || recipe.name.toLocaleLowerCase().includes(query)
      || recipe.tags.some(tag => tag.toLocaleLowerCase().includes(query))
      || recipe.ingredients.some(item => item.name.toLocaleLowerCase().includes(query)))
  ))
})

function rotateRecipes<T>(items: T[], offset: number) {
  if (!items.length) return []
  const normalizedOffset = offset % items.length
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)]
}

function smartMealBatch(items: typeof recipes.value, round: number) {
  const buckets: Record<MealDishKind, typeof recipes.value> = {
    meat: [],
    vegetable: [],
    soup: [],
    staple: [],
  }
  items.forEach(recipe => buckets[mealDishKindFor(recipe)].push(recipe))

  const selectedIds = new Set<number>()
  const selected: typeof recipes.value = []
  SMART_BATCH_TARGETS.forEach(({ kind, count }, targetIndex) => {
    const bucket = rotateRecipes(buckets[kind], round * (targetIndex + 2))
    bucket.slice(0, count).forEach((recipe) => {
      if (selectedIds.has(recipe.id)) return
      selectedIds.add(recipe.id)
      selected.push(recipe)
    })
  })

  rotateRecipes(items, round * 5).forEach((recipe) => {
    if (selected.length >= SMART_BATCH_SIZE || selectedIds.has(recipe.id)) return
    selectedIds.add(recipe.id)
    selected.push(recipe)
  })
  return selected.slice(0, SMART_BATCH_SIZE)
}

const visibleRecipes = computed(() => {
  const items = matchingRecipes.value
  if (keyword.value.trim()) return items
  if (activeCategory.value === 'hot') return smartMealBatch(items, rotation.value)
  if (items.length <= SMART_BATCH_SIZE) return items
  return rotateRecipes(items, rotation.value * 4).slice(0, SMART_BATCH_SIZE)
})
const pageError = computed(() => catalogError.value || mealError.value)

function normalizeCategory() {
  if (!categories.value.some(item => item.id === activeCategory.value)) activeCategory.value = categories.value[0]?.id ?? ''
}

function selectCategory(categoryId: string) {
  activeCategory.value = categoryId
  rotation.value = 0
}

function changeBatch() {
  rotation.value += 1
  if (activeCategory.value === 'hot') uni.showToast({ title: '已换一组荤素搭配', icon: 'none' })
}

async function loadMealSession(force = false) {
  mealClock.value = Date.now()
  mealStore.refreshAuth()
  if (loggedIn.value) await recipeStore.loadUserState(force)
  await mealStore.loadMeal(force)
}

async function loadPage(force = false) {
  await Promise.all([mealStore.loadCatalog(force), loadMealSession(force)])
  normalizeCategory()
}

function loginUrl() {
  const invitation = mealStore.invitation
  const mealId = invitation?.mealId || (!meal.value?.isMember ? meal.value?.id : '')
  const inviteCode = invitation?.inviteCode || (!meal.value?.isMember ? meal.value?.inviteCode : '')
  return mealId && inviteCode
    ? `/pages/login/login?mealId=${encodeURIComponent(mealId)}&invite=${encodeURIComponent(inviteCode)}`
    : '/pages/login/login'
}

function openLogin() { uni.navigateTo({ url: loginUrl() }) }

async function retryMeal() {
  if (!loggedIn.value || meal.value || mealLoading.value) return
  const restored = await mealStore.loadMeal(true)
  if (restored) uni.showToast({ title: '饭局已准备好', icon: 'success' })
}

async function withEditableMeal(action: () => Promise<boolean>) {
  if (!loggedIn.value) { openLogin(); return }
  if (!meal.value) await mealStore.loadMeal(true)
  if (!meal.value) {
    uni.showToast({ title: mealLoading.value ? '当前餐次正在创建，请稍候' : mealError.value || '当前餐次创建失败，请重试', icon: 'none' })
    return
  }
  if (mealConfirmed.value) {
    uni.showToast({ title: '本餐菜单已经确定', icon: 'none' })
    return
  }
  if (!canEdit.value) {
    uni.showToast({ title: mealError.value || (mealLoading.value ? '饭局正在加载' : '当前餐次暂不可编辑'), icon: 'none' })
    return
  }
  await action()
}

function addRecipe(id: number) { void withEditableMeal(() => mealStore.addRecipe(id)) }
function incrementRecipe(id: number) { void withEditableMeal(() => mealStore.incrementRecipe(id)) }
function decrementRecipe(id: number) { void withEditableMeal(() => mealStore.decrementRecipe(id)) }
function toggleWish(id: number) { void withEditableMeal(() => mealStore.toggleWish(id)) }

async function openMenu() {
  if (!loggedIn.value) { openLogin(); return }
  if (mealLoading.value) return
  if (!meal.value) await mealStore.loadMeal(true)
  if (!meal.value) { uni.showToast({ title: mealError.value || '当前餐次创建失败，请重试', icon: 'none' }); return }
  const mealId = encodeURIComponent(meal.value.id)
  uni.navigateTo({ url: mealConfirmed.value ? `/pages/menu/confirmed?mealId=${mealId}` : `/pages/menu/menu?mealId=${mealId}` })
}

function memberInitial(name: string) { return name.trim().slice(0, 1) || '友' }
function markAvatarError(id: string) { if (!avatarErrors.value.includes(id)) avatarErrors.value = [...avatarErrors.value, id] }
function canShowAvatar(id: string, avatar: string) { return Boolean(avatar && !avatarErrors.value.includes(id)) }
function wishersFor(id: number): MealWisher[] { return mealStore.dishFor(id)?.wishers ?? [] }
function wishCountFor(id: number) { return mealStore.dishFor(id)?.wishCount ?? 0 }

onLoad(async (options) => {
  mealStore.useInvitationOptions((options ?? {}) as Record<string, string | undefined>)
  await loadPage()
  bootstrapped.value = true
})
onShow(() => {
  uni.hideTabBar({ animation: false, fail: () => undefined })
  mealStore.refreshAuth()
  if (bootstrapped.value) void loadMealSession(true)
})
onPullDownRefresh(async () => { await loadPage(true); uni.stopPullDownRefresh() })
onShareAppMessage(() => ({
  title: `${activeMealCopy.value.title}，来一起点菜`,
  path: mealSharePath('/pages/index/index', meal.value?.id, meal.value?.inviteCode),
}))
</script>

<template>
  <view class="page">
    <view class="page__glow" />
    <AppHeader title="选择菜品" :centered="true" :page-padding="24" />

    <view class="meal-bar">
      <view class="meal-bar__status">
        <text class="meal-bar__title">{{ mealContext }}</text>
        <button v-if="mealCreationFailed" class="meal-retry" :loading="mealLoading" :disabled="mealLoading" @click="retryMeal">重新创建</button>
      </view>
      <button v-if="!loggedIn" class="login-entry" @click="openLogin">未登录</button>
      <button v-else-if="!profileReady" class="login-entry" @click="openLogin">完善资料</button>
      <scroll-view v-else class="people-scroll" scroll-x :show-scrollbar="false">
        <view class="people-track">
          <view v-for="member in members" :key="member.userId" class="avatar" :aria-label="member.nickname">
            <image v-if="canShowAvatar(member.userId, member.avatar)" :src="member.avatar" mode="aspectFill" @error="markAvatarError(member.userId)" />
            <text v-else>{{ memberInitial(member.nickname) }}</text>
          </view>
          <button v-if="meal?.isMember" class="invite-add" open-type="share" aria-label="邀请饭搭子">＋</button>
        </view>
      </scroll-view>
    </view>

    <button v-if="meal && !meal.isMember" class="invite-notice" @click="openLogin">
      <text class="invite-notice__title">你收到一份{{ activeMealCopy.period }}邀请</text>
      <text class="invite-notice__copy">微信登录后加入，当前已有 {{ memberCount }} 位饭搭子</text>
    </button>

    <view class="hero">
      <view class="hero__copy"><text class="hero__title">{{ activeMealCopy.period }}想吃点什么？</text><text class="hero__subtitle">喜欢的先加进来，大家一起慢慢选</text></view>
      <image class="hero__mascot" src="/static/images/home/meal-mascot.png" mode="aspectFit" />
    </view>

    <view class="search"><view class="search__icon" /><input v-model="keyword" class="search__input" placeholder="搜菜名或食材" placeholder-class="search__placeholder" confirm-type="search" /><button v-if="keyword" class="search__clear" @click="keyword = ''">×</button></view>

    <view class="menu-layout">
      <view v-if="categories.length" class="category-rail">
        <button
          v-for="category in categories"
          :key="category.id"
          class="category"
          :class="{ 'category--active': category.id === activeCategory }"
          @click="selectCategory(category.id)"
        >{{ category.name }}</button>
      </view>

      <scroll-view class="dish-scroll" scroll-y :show-scrollbar="false">
        <view class="dish-scroll__content">
          <view class="section-title">
            <text>{{ keyword ? '搜索结果' : '大家都爱吃' }}</text>
            <button v-if="!keyword && matchingRecipes.length > SMART_BATCH_SIZE" aria-label="智能搭配换一批" @click="changeBatch"><text>↻</text> 换一批</button>
          </view>

          <view v-if="catalogLoading && !recipes.length" class="state">正在读取真实菜单…</view>
          <button v-else-if="catalogError && !recipes.length" class="state state--error" @click="loadPage(true)">{{ catalogError }}，点击重试</button>
          <view v-else-if="visibleRecipes.length" class="dish-list">
            <view v-for="recipe in visibleRecipes" :key="recipe.id" class="dish-card">
              <view class="dish-card__visual">
                <image :src="dishImageFor(recipe)" mode="aspectFill" />
              </view>
              <view class="dish-card__body">
                <view class="dish-card__heading">
                  <text class="dish-card__name">{{ recipe.name }}</text>
                  <button v-if="wishCountFor(recipe.id)" class="wish-badge" :class="{ 'wish-badge--mine': mealStore.hasWished(recipe.id) }" @click="toggleWish(recipe.id)">
                    <view class="wish-faces"><view v-for="wisher in wishersFor(recipe.id).slice(0, 2)" :key="wisher.userId" class="wish-face"><image v-if="canShowAvatar(wisher.userId, wisher.avatar)" :src="wisher.avatar" mode="aspectFill" @error="markAvatarError(wisher.userId)" /><text v-else>{{ memberInitial(wisher.nickname) }}</text></view></view>
                    <text>{{ wishCountFor(recipe.id) }} 人想吃</text>
                  </button>
                </view>
                <view class="dish-card__footer">
                  <text class="dish-card__tag">{{ dishTagFor(recipe) }}</text>
                  <view v-if="mealStore.quantityFor(recipe.id)" class="stepper">
                    <button :disabled="pendingRecipeId === recipe.id" class="stepper__button stepper__button--minus" @click="decrementRecipe(recipe.id)">−</button>
                    <text>{{ mealStore.quantityFor(recipe.id) }}</text>
                    <button :disabled="pendingRecipeId === recipe.id" class="stepper__button stepper__button--plus" @click="incrementRecipe(recipe.id)">＋</button>
                  </view>
                  <button v-else :disabled="pendingRecipeId === recipe.id" class="add-button" @click="addRecipe(recipe.id)">＋</button>
                </view>
              </view>
            </view>
          </view>
          <view v-else class="empty"><image src="/static/images/home/meal-mascot.png" mode="aspectFit" /><text class="empty__title">{{ pageError ? '菜单暂时没端上来' : '没找到这道菜' }}</text><text class="empty__copy">{{ pageError || '换个菜名或分类再看看吧' }}</text><button @click="pageError ? loadPage(true) : (keyword = '')">{{ pageError ? '重新加载' : '清空搜索' }}</button></view>
          <view class="dish-scroll__spacer" />
        </view>
      </scroll-view>
    </view>

    <view class="dock">
      <view class="dock__summary"><template v-if="loggedIn"><text>{{ mealConfirmed ? '菜单已定' : '已选' }} <text class="dock__number">{{ dishCount }}</text> 道</text><text class="dock__dot">·</text><text><text class="dock__number">{{ memberCount }}</text> 人参与</text></template><text v-else>微信登录后一起点菜</text></view>
      <button class="dock__button" :class="{ 'dock__button--retry': mealCreationFailed }" :loading="mealLoading" :disabled="mealLoading" @click="openMenu"><text>{{ dockButtonLabel }}</text></button>
    </view>
  </view>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.page { position: relative; display: flex; height: 100vh; min-height: 0; padding: 0 28rpx calc(env(safe-area-inset-bottom) + 142rpx); overflow: hidden; flex-direction: column; background: $color-page; box-sizing: border-box; }
.page__glow { position: absolute; top: -130rpx; right: -150rpx; width: 500rpx; height: 430rpx; border-radius: 50%; background: radial-gradient(circle, rgba(255, 221, 177, .48), rgba(255, 247, 237, 0) 72%); pointer-events: none; }
.meal-bar, .invite-notice, .hero, .search, .menu-layout, .section-title, .dish-list, .state, .empty { position: relative; z-index: 1; }
.page :deep(.app-header), .meal-bar, .invite-notice, .hero, .search { flex: 0 0 auto; }

.meal-bar { display: flex; min-height: 78rpx; margin-top: 8rpx; align-items: center; justify-content: space-between; gap: 16rpx; }
.meal-bar__status { display: flex; min-width: 0; flex: 1; align-items: center; gap: 12rpx; }
.meal-bar__title { min-width: 0; overflow: hidden; color: $color-text; font-size: 29rpx; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.meal-retry { display: inline-flex; min-width: 132rpx; height: 58rpx; padding: 0 18rpx; flex: 0 0 auto; align-items: center; justify-content: center; border: 1rpx solid rgba(255, 144, 11, .28); border-radius: 29rpx; background: #fff4e5; color: $color-primary-deep; font-size: 24rpx; font-weight: 750; }
.people-scroll { min-width: 0; max-width: 330rpx; height: 68rpx; white-space: nowrap; }
.people-track { display: inline-flex; min-width: 100%; height: 68rpx; padding-left: 12rpx; align-items: center; justify-content: flex-end; box-sizing: border-box; }
.avatar { display: inline-flex; width: 58rpx; height: 58rpx; margin-left: -10rpx; overflow: hidden; align-items: center; justify-content: center; border: 4rpx solid $color-page; border-radius: 50%; background: #e7f0db; color: #5b3b29; font-size: 24rpx; font-weight: 800; box-sizing: border-box; }
.avatar image { width: 100%; height: 100%; }
.invite-add, .login-entry { display: inline-flex; height: 64rpx; padding: 0 18rpx; align-items: center; justify-content: center; border-radius: 32rpx; background: rgba(255, 255, 255, .78); color: $color-primary-deep; font-size: 26rpx; font-weight: 750; line-height: 1; }
.invite-add { width: 64rpx; margin-left: 4rpx; padding: 0; font-size: 38rpx; }
.invite-notice { display: flex; width: 100%; margin-top: 12rpx; padding: 18rpx 22rpx; align-items: flex-start; flex-direction: column; border: 1rpx solid rgba(255, 144, 11, .16); border-radius: 22rpx; background: rgba(255, 238, 216, .88); text-align: left; box-sizing: border-box; }
.invite-notice__title { color: #7d3a12; font-size: 27rpx; font-weight: 800; }
.invite-notice__copy { margin-top: 5rpx; color: #996449; font-size: 24rpx; }

.hero { display: flex; min-height: 168rpx; align-items: center; }
.hero__copy { position: relative; z-index: 1; display: flex; min-width: 0; padding-right: 180rpx; flex: 1; flex-direction: column; }
.hero__title { color: #32170b; font-size: 48rpx; font-weight: 900; line-height: 1.18; }
.hero__subtitle { margin-top: 14rpx; color: $color-text-secondary; font-size: 24rpx; line-height: 1.45; }
.hero__mascot { position: absolute; right: -10rpx; bottom: -8rpx; width: 205rpx; height: 205rpx; }

.search { display: flex; height: 92rpx; padding: 0 26rpx; align-items: center; border-radius: 28rpx; background: rgba(255, 255, 255, .98); box-shadow: $shadow-card; box-sizing: border-box; }
.search__icon { position: relative; width: 28rpx; height: 28rpx; margin-right: 20rpx; flex: 0 0 28rpx; border: 4rpx solid #9d9a96; border-radius: 50%; }
.search__icon::after { position: absolute; right: -13rpx; bottom: -8rpx; width: 18rpx; height: 4rpx; border-radius: 4rpx; background: #9d9a96; content: ''; transform: rotate(45deg); }
.search__input { min-width: 0; height: 100%; flex: 1; color: $color-text; font-size: 28rpx; }
.search__placeholder { color: #aaa6a2; }
.search__clear { display: flex; width: 64rpx; height: 64rpx; padding: 0; align-items: center; justify-content: center; color: #aaa6a2; font-size: 38rpx; }

.menu-layout { display: flex; min-height: 0; margin-top: 20rpx; flex: 1; align-items: stretch; gap: 16rpx; overflow: hidden; }
.category-rail { width: 128rpx; min-height: 0; overflow: hidden; flex: 0 0 128rpx; border-radius: 26rpx; background: rgba(244, 238, 231, .9); }
.category { position: relative; display: flex; width: 100%; min-height: 98rpx; padding: 0 12rpx; align-items: center; justify-content: center; color: #77716c; font-size: 26rpx; font-weight: 700; box-sizing: border-box; }
.category::after { position: absolute; right: 16rpx; bottom: 0; left: 16rpx; height: 1rpx; background: rgba(139, 108, 84, .08); content: ''; }
.category:last-child::after { display: none; }
.category--active { background: rgba(255, 255, 255, .98); color: $color-text; font-weight: 850; }
.category--active::before { position: absolute; top: 24rpx; bottom: 24rpx; left: 0; width: 7rpx; border-radius: 0 7rpx 7rpx 0; background: $color-primary; content: ''; }
.dish-scroll { min-width: 0; height: 100%; flex: 1; }
.dish-scroll__content { min-height: 100%; }
.dish-scroll__spacer { height: 24rpx; }
.section-title { display: flex; min-height: 72rpx; align-items: center; justify-content: space-between; color: $color-text; font-size: 32rpx; font-weight: 850; }
.section-title button { display: flex; min-width: 122rpx; height: 64rpx; padding: 0; align-items: center; justify-content: flex-end; color: $color-primary-deep; font-size: 25rpx; font-weight: 700; }
.section-title button text { font-size: 36rpx; }

.dish-list { display: flex; min-width: 0; flex-direction: column; gap: 16rpx; }
.dish-card { display: flex; min-width: 0; min-height: 184rpx; overflow: hidden; border: 1rpx solid rgba(110, 77, 51, .04); border-radius: 26rpx; background: $color-card; box-shadow: $shadow-card; }
.dish-card__visual { position: relative; width: 210rpx; min-height: 184rpx; overflow: hidden; flex: 0 0 210rpx; background: #f3ebe2; }
.dish-card__visual > image { width: 100%; height: 100%; }
.dish-card__heading { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: 8rpx; }
.wish-badge { display: flex; min-height: 46rpx; max-width: 168rpx; padding: 0 10rpx 0 5rpx; overflow: hidden; flex: 0 0 auto; align-items: center; border-radius: 24rpx; background: rgba(255, 248, 239, .98); color: #7b4b2d; font-size: 24rpx; font-weight: 650; white-space: nowrap; box-sizing: border-box; }
.wish-badge--mine { background: rgba(255, 244, 227, .96); color: #9f4b13; }
.wish-faces { display: flex; margin-right: 7rpx; }
.wish-face { display: flex; width: 34rpx; height: 34rpx; margin-right: -7rpx; overflow: hidden; align-items: center; justify-content: center; border: 2rpx solid #fff; border-radius: 50%; background: #ffe3d1; color: #70452d; font-size: 24rpx; box-sizing: border-box; }
.wish-face image { width: 100%; height: 100%; }
.dish-card__body { display: flex; min-width: 0; padding: 18rpx 14rpx 14rpx 18rpx; flex: 1; flex-direction: column; box-sizing: border-box; }
.dish-card__name { display: block; min-width: 0; overflow: hidden; flex: 1; color: $color-text; font-size: 29rpx; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.dish-card__footer { display: flex; min-height: 68rpx; margin-top: auto; align-items: center; justify-content: space-between; gap: 8rpx; }
.dish-card__tag { min-width: 0; overflow: hidden; padding: 7rpx 10rpx; border-radius: 12rpx; background: #fff3e3; color: #b56b21; font-size: 24rpx; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.add-button, .stepper__button { display: flex; width: 68rpx; height: 68rpx; padding: 0; flex: 0 0 68rpx; align-items: center; justify-content: center; border-radius: 50%; font-size: 38rpx; line-height: 1; }
.add-button, .stepper__button--plus { background: linear-gradient(135deg, #ffab2e, $color-primary-deep); color: #fff; }
.stepper { display: flex; flex: 0 0 auto; align-items: center; }
.stepper__button--minus { background: #fff1df; color: $color-primary-deep; }
.stepper > text { min-width: 42rpx; color: $color-text; font-size: 28rpx; font-weight: 800; text-align: center; }
.add-button[disabled], .stepper__button[disabled] { opacity: .62; }

.state, .empty { display: flex; min-height: 300rpx; align-items: center; justify-content: center; border-radius: 28rpx; background: rgba(255, 255, 255, .84); color: $color-text-secondary; font-size: 26rpx; }
.state--error { color: #c96531; }
.empty { padding: 50rpx 30rpx; flex-direction: column; box-sizing: border-box; }
.empty image { width: 180rpx; height: 180rpx; }
.empty__title { margin-top: 8rpx; color: $color-text; font-size: 31rpx; font-weight: 800; }
.empty__copy { margin-top: 10rpx; color: $color-text-secondary; font-size: 24rpx; text-align: center; }
.empty button { min-width: 220rpx; height: 72rpx; margin-top: 26rpx; border-radius: 36rpx; background: $color-primary; color: #fff; font-size: 26rpx; font-weight: 700; }

.dock { position: fixed; z-index: 999; right: 24rpx; bottom: calc(env(safe-area-inset-bottom) + 20rpx); left: 24rpx; display: flex; min-height: 104rpx; padding: 12rpx 14rpx 12rpx 26rpx; align-items: center; justify-content: space-between; border: 1rpx solid rgba(133, 85, 47, .08); border-radius: 30rpx; background: rgba(255, 255, 255, .98); box-shadow: 0 12rpx 36rpx rgba(79, 48, 25, .13); box-sizing: border-box; }
.dock__summary { display: flex; min-width: 0; align-items: baseline; color: $color-text; font-size: 27rpx; font-weight: 750; }
.dock__number { color: $color-primary-deep; font-size: 36rpx; font-weight: 900; }
.dock__dot { margin: 0 9rpx; color: #b6aaa0; }
.dock__button { display: flex; min-width: 220rpx; height: 80rpx; padding: 0 24rpx; align-items: center; justify-content: center; border-radius: 24rpx; background: linear-gradient(135deg, #ffac32, $color-primary-deep); box-shadow: 0 8rpx 18rpx rgba(255, 118, 0, .18); color: #fff; font-size: 28rpx; font-weight: 800; line-height: 1; white-space: nowrap; box-sizing: border-box; }
.dock__button text { display: block; line-height: 1.2; }
.dock__button--retry { background: #fff1df; box-shadow: none; color: $color-primary-deep; }
.dock__button[disabled] { opacity: .72; }

@media (max-width: 360px) {
  .category-rail { width: 116rpx; flex-basis: 116rpx; }
  .dish-card__visual { width: 176rpx; flex-basis: 176rpx; }
  .wish-badge { max-width: 145rpx; }
  .dock__button { min-width: 204rpx; padding: 0 18rpx; }
}

@media (min-width: 500px) {
  .page { max-width: 750rpx; margin: 0 auto; }
  .dock { right: calc((100vw - 750rpx) / 2 + 24rpx); left: calc((100vw - 750rpx) / 2 + 24rpx); }
}
</style>
