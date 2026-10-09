import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { mealApi } from '@/services/meals'
import { hasAuthToken } from '@/services/http'
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

  const members = computed(() => meal.value?.members ?? [])
  const selectedDishes = computed(() => meal.value?.dishes ?? [])
  const dishCount = computed(() => selectedDishes.value.length)
  const itemCount = computed(() => selectedDishes.value.reduce((total, dish) => total + dish.quantity, 0))
  const memberCount = computed(() => members.value.length)
  const canEdit = computed(() => Boolean(loggedIn.value && meal.value?.isMember && meal.value.status === 'active'))
  const currentUserId = computed(() => meal.value?.currentUserId ?? null)

  function refreshAuth() {
    loggedIn.value = hasAuthToken()
    return loggedIn.value
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

  async function loadMeal(force = false) {
    refreshAuth()
    if (mealLoading.value || (!force && meal.value?.isMember && !invitation.value)) return meal.value
    mealLoading.value = true
    mealError.value = ''
    try {
      if (invitation.value) {
        const preview = await mealApi.get(invitation.value.mealId, invitation.value.inviteCode)
        if (loggedIn.value && !preview.isMember) {
          meal.value = await mealApi.join(invitation.value.mealId, invitation.value.inviteCode)
        } else {
          meal.value = preview
        }
        if (meal.value.isMember) setInvitation(null)
        return meal.value
      }

      if (!loggedIn.value) {
        meal.value = null
        return null
      }

      meal.value = await mealApi.getCurrent()
      if (!meal.value) meal.value = await mealApi.create()
      return meal.value
    } catch (error) {
      if (invitation.value) setInvitation(null)
      refreshAuth()
      mealError.value = error instanceof Error ? error.message : '饭局加载失败'
      return null
    } finally {
      mealLoading.value = false
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
    if (!meal.value || !canEdit.value || mealLoading.value) return false
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
    currentUserId,
    refreshAuth,
    setInvitation,
    useInvitationOptions,
    loadCatalog,
    loadMeal,
    dishFor,
    quantityFor,
    hasWished,
    addRecipe,
    incrementRecipe,
    decrementRecipe,
    removeRecipe,
    toggleWish,
    confirmMeal,
    startNewMeal,
  }
})
