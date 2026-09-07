import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { todayRecipe } from '@/mocks/recipe'
import type { Recipe } from '@/types/recipe'

export const useRecipeStore = defineStore('recipe', () => {
  const selectedStatus = ref('recover')
  const recommendation = ref({ ...todayRecipe })
  const refreshCount = ref(0)
  const favoriteIds = ref<number[]>(uni.getStorageSync('favoriteRecipeIds') || [2001, 2002, 2003])
  const plannedRecipeIds = ref<number[]>(uni.getStorageSync('plannedRecipeIds') || [])

  const statusLabel = computed(() => {
    const labels: Record<string, string> = {
      recover: '骨折恢复期',
      late: '熬夜',
      appetite: '没胃口',
      lazy: '犯懒',
    }
    return labels[selectedStatus.value] ?? '今日推荐'
  })

  function selectStatus(status: string) {
    selectedStatus.value = status
  }

  function isFavorite(recipeId: number) {
    return favoriteIds.value.includes(recipeId)
  }

  function toggleFavorite(recipeId = recommendation.value.id) {
    favoriteIds.value = isFavorite(recipeId)
      ? favoriteIds.value.filter(id => id !== recipeId)
      : [...favoriteIds.value, recipeId]
    if (recommendation.value.id === recipeId) recommendation.value.isFavorite = isFavorite(recipeId)
  }

  function selectRecommendation(recipe: Recipe) {
    recommendation.value = { ...recipe, isFavorite: isFavorite(recipe.id) }
  }

  function addToPlan(recipeId = recommendation.value.id) {
    if (!plannedRecipeIds.value.includes(recipeId)) plannedRecipeIds.value = [...plannedRecipeIds.value, recipeId]
  }

  function isInPlan(recipeId: number) {
    return plannedRecipeIds.value.includes(recipeId)
  }

  function refreshRecommendation() {
    refreshCount.value += 1
    uni.showToast({ title: '已为你刷新推荐', icon: 'none' })
  }

  watch(favoriteIds, value => uni.setStorageSync('favoriteRecipeIds', value), { deep: true })
  watch(plannedRecipeIds, value => uni.setStorageSync('plannedRecipeIds', value), { deep: true })

  return {
    selectedStatus,
    recommendation,
    refreshCount,
    statusLabel,
    favoriteIds,
    plannedRecipeIds,
    selectStatus,
    toggleFavorite,
    isFavorite,
    addToPlan,
    isInPlan,
    selectRecommendation,
    refreshRecommendation,
  }
})
