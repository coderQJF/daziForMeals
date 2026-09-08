import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { recipeApi } from '@/services/recipes'
import type { CategoryItem, Recipe, RecipeDetail, RecipeListQuery, StatusOption } from '@/types/recipe'

const emptyRecipe: RecipeDetail = {
  id: 0,
  name: '',
  cover: '',
  hero: '',
  thumbnail: '',
  category: '',
  categoryId: '',
  tags: [],
  statusIds: [],
  reason: '',
  cookTime: 0,
  calories: 0,
  popularity: 0,
  servings: 0,
  difficulty: '简单',
  isFavorite: false,
  ingredients: [],
  steps: [],
}

export const useRecipeStore = defineStore('recipe', () => {
  const selectedStatus = ref('recover')
  const recommendation = ref<RecipeDetail>({ ...emptyRecipe })
  const recipes = ref<RecipeDetail[]>([])
  const quickCategories = ref<CategoryItem[]>([])
  const cookingCategories = ref<CategoryItem[]>([])
  const takeoutCategories = ref<CategoryItem[]>([])
  const statusOptions = ref<StatusOption[]>([])
  const refreshCount = ref(0)
  const bootstrapLoaded = ref(false)
  const loading = ref(false)
  const errorMessage = ref('')
  const favoriteIds = ref<number[]>(uni.getStorageSync('favoriteRecipeIds') || [2001, 2002, 2003])
  const plannedRecipeIds = ref<number[]>(uni.getStorageSync('plannedRecipeIds') || [])

  const statusLabel = computed(() => (
    statusOptions.value.find(item => item.id === selectedStatus.value)?.name ?? '今日'
  ))

  function withLocalState<T extends Recipe>(recipe: T): T {
    return { ...recipe, isFavorite: favoriteIds.value.includes(recipe.id) }
  }

  async function loadBootstrap(force = false) {
    if (loading.value || (bootstrapLoaded.value && !force)) return
    loading.value = true
    errorMessage.value = ''
    try {
      const payload = await recipeApi.getBootstrap(selectedStatus.value, refreshCount.value)
      quickCategories.value = payload.quickCategories
      cookingCategories.value = payload.cookingCategories
      takeoutCategories.value = payload.takeoutCategories
      statusOptions.value = payload.statusOptions
      recommendation.value = withLocalState(payload.recommendation)
      bootstrapLoaded.value = true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '菜谱服务暂时不可用'
      throw error
    } finally {
      loading.value = false
    }
  }

  async function loadRecipes(query: RecipeListQuery = {}) {
    loading.value = true
    errorMessage.value = ''
    try {
      recipes.value = (await recipeApi.getRecipes(query)).map(withLocalState)
      return recipes.value
    } catch (error) {
      recipes.value = []
      errorMessage.value = error instanceof Error ? error.message : '菜谱列表加载失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  async function loadRecipe(recipeId: number) {
    loading.value = true
    errorMessage.value = ''
    try {
      recommendation.value = withLocalState(await recipeApi.getRecipe(recipeId))
      return recommendation.value
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '菜谱详情加载失败'
      throw error
    } finally {
      loading.value = false
    }
  }

  function selectStatus(status: string) {
    selectedStatus.value = status
  }

  function isFavorite(recipeId: number) {
    return favoriteIds.value.includes(recipeId)
  }

  function toggleFavorite(recipeId = recommendation.value.id) {
    if (!recipeId) return
    favoriteIds.value = isFavorite(recipeId)
      ? favoriteIds.value.filter(id => id !== recipeId)
      : [...favoriteIds.value, recipeId]
    recommendation.value.isFavorite = isFavorite(recommendation.value.id)
    recipes.value = recipes.value.map(recipe => withLocalState(recipe))
  }

  function selectRecommendation(recipe: Recipe) {
    const detail = recipe as Partial<RecipeDetail>
    recommendation.value = {
      ...emptyRecipe,
      ...recipe,
      ingredients: detail.ingredients ?? [],
      steps: detail.steps ?? [],
      isFavorite: isFavorite(recipe.id),
    }
  }

  function addToPlan(recipeId = recommendation.value.id) {
    if (recipeId && !plannedRecipeIds.value.includes(recipeId)) plannedRecipeIds.value = [...plannedRecipeIds.value, recipeId]
  }

  function isInPlan(recipeId: number) {
    return plannedRecipeIds.value.includes(recipeId)
  }

  async function refreshRecommendation() {
    refreshCount.value += 1
    await loadBootstrap(true)
  }

  watch(favoriteIds, value => uni.setStorageSync('favoriteRecipeIds', value), { deep: true })
  watch(plannedRecipeIds, value => uni.setStorageSync('plannedRecipeIds', value), { deep: true })

  return {
    selectedStatus,
    recommendation,
    recipes,
    quickCategories,
    cookingCategories,
    takeoutCategories,
    statusOptions,
    refreshCount,
    statusLabel,
    loading,
    errorMessage,
    bootstrapLoaded,
    favoriteIds,
    plannedRecipeIds,
    loadBootstrap,
    loadRecipes,
    loadRecipe,
    selectStatus,
    toggleFavorite,
    isFavorite,
    addToPlan,
    isInPlan,
    selectRecommendation,
    refreshRecommendation,
  }
})
