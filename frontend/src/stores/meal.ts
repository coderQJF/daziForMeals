import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mealEditingDeadline } from '@/config/meal-time'
import { mealApi } from '@/services/meals'
import { ApiError, hasAuthToken } from '@/services/http'
import { recipeApi } from '@/services/recipes'
import type { Meal, MealInvitation } from '@/types/meal'
import type { RecipeDetail } from '@/types/recipe'

const INVITATION_STORAGE_KEY = 'fandaziPendingMealInvitationV1'

function storedInvitation(): MealInvitation | null {
  const value = uni.getStorageSync(INVITATION_STORAGE_KEY) as Partial<MealInvitation> | undefined
  if (!value || typeof value.mealId !== 'string' || typeof value.inviteCode !== 'string') return null
  if (!value.mealId.trim() || !value.inviteCode.trim()) return null
  return { mealId: value.mealId.trim(), inviteCode: value.inviteCode.trim() }
}

export const useMealStore = defineStore('meal', () => {
  const meal = ref<Meal | null>(null)
  const invitation = ref<MealInvitation | null>(storedInvitation())
  const catalog = ref<RecipeDetail[]>([])
  const categories = ref<Awaited<ReturnType<typeof mealApi.getCategories>>>([])
  const loggedIn = ref(hasAuthToken())
  const mealLoading = ref(false)
  const catalogLoading = ref(false)
  const mealError = ref('')
  const catalogError = ref('')
  const pendingRecipeId = ref<number | null>(null)
  const mealClock = ref(Date.now())
  let mealLoadRequestId = 0
  let loadingMealId: string | null = null

  const members = computed(() => meal.value?.members ?? [])
  const selectedDishes = computed(() => meal.value?.dishes ?? [])
  const dishCount = computed(() => selectedDishes.value.length)
  const itemCount = computed(() => selectedDishes.value.reduce((total, dish) => total + dish.quantity, 0))
  const memberCount = computed(() => members.value.length)
  const beforeMealStart = computed(() => Boolean(meal.value && mealClock.value < mealEditingDeadline(meal.value)))
  const canEdit = computed(() => Boolean(loggedIn.value && meal.value?.isMember && meal.value.status === 'active' && beforeMealStart.value))
  const canReopen = computed(() => Boolean(loggedIn.value && meal.value?.isMember && meal.value.status === 'confirmed' && beforeMealStart.value))
  const currentUserId = computed(() => meal.value?.currentUserId ?? null)

  function refreshAuth() {
    refreshMealClock()
    loggedIn.value = hasAuthToken()
    return loggedIn.value
  }

  function refreshMealClock() {
    mealClock.value = Date.now()
  }

  function setInvitation(next: MealInvitation | null) {
    invitation.value = next
    if (next) uni.setStorageSync(INVITATION_STORAGE_KEY, next)
    else uni.removeStorageSync(INVITATION_STORAGE_KEY)
  }

  function useInvitationOptions(options: Record<string, string | undefined>) {
    const mealId = typeof options.mealId === 'string' ? options.mealId.trim() : ''
    const inviteCode = typeof options.invite === 'string'
      ? options.invite.trim()
      : typeof options.inviteCode === 'string' ? options.inviteCode.trim() : ''
    if (mealId && inviteCode) setInvitation({ mealId, inviteCode })
  }

  async function loadCatalog(force = false) {
    if (catalogLoading.value || (!force && catalog.value.length && categories.value.length)) return
    catalogLoading.value = true
    catalogError.value = ''
    try {
      const [nextCategories, nextCatalog] = await Promise.all([
        mealApi.getCategories(),
        recipeApi.getRecipes({ limit: 100, sort: 'popular' }),
      ])
      categories.value = nextCategories
      catalog.value = nextCatalog
    } catch (error) {
      catalogError.value = error instanceof Error ? error.message : '菜单加载失败'
    } finally {
      catalogLoading.value = false
    }
  }

  async function loadMeal(_force = false) {
    refreshAuth()
    if (mealLoading.value) return meal.value
    const requestId = ++mealLoadRequestId
    loadingMealId = null
    mealLoading.value = true
    mealError.value = ''
    try {
      if (invitation.value) {
        try {
          let nextMeal = await mealApi.get(invitation.value.mealId, invitation.value.inviteCode)
          if (loggedIn.value && !nextMeal.isMember) {
            nextMeal = await mealApi.join(invitation.value.mealId, invitation.value.inviteCode)
          }
          if (requestId !== mealLoadRequestId) return meal.value
          meal.value = nextMeal
          if (nextMeal.isMember) setInvitation(null)
          return nextMeal
        } catch (error) {
          if (requestId !== mealLoadRequestId) return meal.value
          const invalidInvitation = error instanceof ApiError
            && (error.statusCode === 403 || error.statusCode === 404)
          if (invalidInvitation) setInvitation(null)
          if (!loggedIn.value || !invalidInvitation) throw error
        }
      }

      if (!loggedIn.value) {
        meal.value = null
        return null
      }

      const currentMeal = await mealApi.getCurrent()
      if (requestId !== mealLoadRequestId) return meal.value
      const nextMeal = currentMeal ?? await mealApi.create()
      if (requestId !== mealLoadRequestId) return meal.value
      meal.value = nextMeal
      return nextMeal
    } catch (error) {
      if (requestId !== mealLoadRequestId) return meal.value
      refreshAuth()
      meal.value = null
      mealError.value = error instanceof Error ? error.message : '饭局加载失败'
      return null
    } finally {
      if (requestId === mealLoadRequestId) {
        mealLoading.value = false
        loadingMealId = null
      }
    }
  }

  async function loadMealById(mealId: string, force = false) {
    refreshAuth()
    const normalizedMealId = mealId.trim()
    if (!normalizedMealId) {
      meal.value = null
      mealError.value = '饭局编号无效'
      return null
    }
    if (!force && meal.value?.id === normalizedMealId && meal.value.isMember) return meal.value
    if (mealLoading.value && loadingMealId === normalizedMealId) return meal.value

    const requestId = ++mealLoadRequestId
    loadingMealId = normalizedMealId
    mealLoading.value = true
    mealError.value = ''
    if (meal.value?.id !== normalizedMealId) meal.value = null
    try {
      if (!loggedIn.value) throw new Error('登录后才能查看这个饭局')
      const nextMeal = await mealApi.get(normalizedMealId)
      if (requestId !== mealLoadRequestId) return meal.value
      if (!nextMeal.isMember) throw new Error('你暂无权限访问这个饭局')
      meal.value = nextMeal
      return nextMeal
    } catch (error) {
      if (requestId !== mealLoadRequestId) return meal.value
      refreshAuth()
      meal.value = null
      mealError.value = error instanceof Error ? error.message : '饭局加载失败'
      return null
    } finally {
      if (requestId === mealLoadRequestId) {
        mealLoading.value = false
        loadingMealId = null
      }
    }
  }

  function dishFor(recipeId: number) {
    return selectedDishes.value.find(dish => dish.recipe.id === recipeId)
  }

  function quantityFor(recipeId: number) {
    return dishFor(recipeId)?.quantity ?? 0
  }

  function hasWished(recipeId: number) {
    const userId = currentUserId.value
    return Boolean(userId && dishFor(recipeId)?.wishers.some(wisher => wisher.userId === userId))
  }

  async function mutate(recipeId: number, action: () => Promise<Meal>) {
    refreshMealClock()
    if (!meal.value || !canEdit.value || pendingRecipeId.value !== null) return false
    pendingRecipeId.value = recipeId
    mealError.value = ''
    try {
      meal.value = await action()
      return true
    } catch (error) {
      mealError.value = error instanceof Error ? error.message : '操作没有保存，请重试'
      uni.showToast({ title: mealError.value, icon: 'none' })
      return false
    } finally {
      pendingRecipeId.value = null
    }
  }

  function addRecipe(recipeId: number) {
    if (!meal.value) return Promise.resolve(false)
    const mealId = meal.value.id
    const dish = dishFor(recipeId)
    if (!dish || !hasWished(recipeId)) {
      return mutate(recipeId, () => mealApi.setWish(mealId, recipeId))
    }
    return mutate(recipeId, () => mealApi.setDish(mealId, recipeId, Math.min(20, dish.quantity + 1)))
  }

  function incrementRecipe(recipeId: number) {
    if (!meal.value) return Promise.resolve(false)
    const mealId = meal.value.id
    const quantity = quantityFor(recipeId)
    if (!quantity) return mutate(recipeId, () => mealApi.setWish(mealId, recipeId))
    if (quantity >= 20) return Promise.resolve(false)
    return mutate(recipeId, () => mealApi.adjustDishQuantity(mealId, recipeId, 1))
  }

  function decrementRecipe(recipeId: number) {
    if (!meal.value) return Promise.resolve(false)
    const mealId = meal.value.id
    const dish = dishFor(recipeId)
    if (!dish) return Promise.resolve(false)
    if (dish.quantity <= 1) {
      if (hasWished(recipeId)) return mutate(recipeId, () => mealApi.removeWish(mealId, recipeId))
      if (dish.wishCount > 0) {
        uni.showToast({ title: '还有饭搭子想吃这道菜', icon: 'none' })
        return Promise.resolve(false)
      }
      return mutate(recipeId, () => mealApi.removeDish(mealId, recipeId))
    }
    return mutate(recipeId, () => mealApi.adjustDishQuantity(mealId, recipeId, -1))
  }

  function removeRecipe(recipeId: number) {
    if (!meal.value) return Promise.resolve(false)
    const mealId = meal.value.id
    return mutate(recipeId, () => mealApi.removeDish(mealId, recipeId))
  }

  function toggleWish(recipeId: number) {
    if (!meal.value) return Promise.resolve(false)
    const mealId = meal.value.id
    return mutate(recipeId, () => (
      hasWished(recipeId)
        ? mealApi.removeWish(mealId, recipeId)
        : mealApi.setWish(mealId, recipeId)
    ))
  }

  async function confirmMeal() {
    refreshMealClock()
    if (!meal.value || !canEdit.value || mealLoading.value || pendingRecipeId.value !== null) return false
    mealLoading.value = true
    mealError.value = ''
    try {
      meal.value = await mealApi.confirm(meal.value.id)
      return true
    } catch (error) {
      mealError.value = error instanceof Error ? error.message : '菜单确认失败'
      return false
    } finally {
      mealLoading.value = false
    }
  }

  async function reopenMeal() {
    refreshMealClock()
    if (!meal.value || mealLoading.value || pendingRecipeId.value !== null) return false
    if (!canReopen.value) {
      mealError.value = beforeMealStart.value ? '当前菜单暂不可修改' : '已到开饭时间，本餐菜单不能再修改'
      return false
    }
    mealLoading.value = true
    mealError.value = ''
    try {
      meal.value = await mealApi.reopen(meal.value.id)
      return true
    } catch (error) {
      mealError.value = error instanceof Error ? error.message : '菜单暂未恢复编辑，请重试'
      return false
    } finally {
      mealLoading.value = false
    }
  }

  async function startNewMeal() {
    if (!loggedIn.value || mealLoading.value) return null
    mealLoading.value = true
    mealError.value = ''
    try {
      meal.value = await mealApi.create()
      return meal.value
    } catch (error) {
      mealError.value = error instanceof Error ? error.message : '新饭局创建失败'
      return null
    } finally {
      mealLoading.value = false
    }
  }

  return {
    meal,
    invitation,
    catalog,
    categories,
    loggedIn,
    mealLoading,
    catalogLoading,
    mealError,
    catalogError,
    pendingRecipeId,
    members,
    selectedDishes,
    dishCount,
    itemCount,
    memberCount,
    canEdit,
    canReopen,
    beforeMealStart,
    currentUserId,
    refreshAuth,
    refreshMealClock,
    setInvitation,
    useInvitationOptions,
    loadCatalog,
    loadMeal,
    loadMealById,
    dishFor,
    quantityFor,
    hasWished,
    addRecipe,
    incrementRecipe,
    decrementRecipe,
    removeRecipe,
    toggleWish,
    confirmMeal,
    reopenMeal,
    startNewMeal,
  }
})
