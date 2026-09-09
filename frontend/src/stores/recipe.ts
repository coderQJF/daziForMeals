import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { assetUrl } from '@/config/assets'
import { experienceApi } from '@/services/experience'
import { recipeApi } from '@/services/recipes'
import type { UserProfile, UserStateUpdate } from '@/types/experience'
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
  categoryIds: [],
  tagIds: [],
  taggings: [],
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
  const recentRecommendationIds = ref<number[]>(uni.getStorageSync('recentRecommendationIds') || [])
  const bootstrapLoaded = ref(false)
  const loading = ref(false)
  const errorMessage = ref('')
  const favoriteIds = ref<number[]>(uni.getStorageSync('favoriteRecipeIds') || [2001, 2002, 2003])
  const plannedRecipeIds = ref<number[]>(uni.getStorageSync('plannedRecipeIds') || [])
  const cookedRecipeIds = ref<number[]>(uni.getStorageSync('cookedRecipeIds') || [2001])
  const likedRecipeIds = ref<number[]>(uni.getStorageSync('likedRecipeIds') || [])
  const profile = ref<UserProfile>(uni.getStorageSync('userProfile') || {
    nickname: '早睡早起吃饭饭 ☀️',
    bio: '享受每一餐，认真生活每一天～',
    avatar: assetUrl('images/user/avatar-female.png'),
  })
  const userLoaded = ref(false)
  const userLoading = ref(false)
  const userErrorMessage = ref('')

  const statusLabel = computed(() => (
    statusOptions.value.find(item => item.id === selectedStatus.value)?.name ?? '今日'
  ))
  const userStats = computed(() => ({
    favorites: favoriteIds.value.length,
    likes: likedRecipeIds.value.length,
    cooked: cookedRecipeIds.value.length,
  }))

  function applyUserState(state: Awaited<ReturnType<typeof experienceApi.getUser>>) {
    selectedStatus.value = state.selectedStatus
    favoriteIds.value = state.favoriteRecipeIds
    likedRecipeIds.value = state.likedRecipeIds
    cookedRecipeIds.value = state.cookedRecipeIds
    plannedRecipeIds.value = state.plannedRecipeIds
    profile.value = state.profile
    recommendation.value = withLocalState(recommendation.value)
    recipes.value = recipes.value.map(withLocalState)
  }

  async function loadUserState(force = false) {
    if (userLoading.value || (userLoaded.value && !force)) return
    userLoading.value = true
    userErrorMessage.value = ''
    try {
      applyUserState(await experienceApi.getUser())
      userLoaded.value = true
    } catch (error) {
      userErrorMessage.value = error instanceof Error ? error.message : '用户数据同步失败，已使用本地记录'
    } finally {
      userLoading.value = false
    }
  }

  async function persistUserState(update: UserStateUpdate) {
    try {
      applyUserState(await experienceApi.updateUser(update))
      userLoaded.value = true
      userErrorMessage.value = ''
    } catch (error) {
      userErrorMessage.value = error instanceof Error ? error.message : '用户数据同步失败'
    }
  }

  async function updateProfile(nextProfile: UserProfile) {
    const state = await experienceApi.updateUser({ profile: nextProfile })
    applyUserState(state)
    userLoaded.value = true
    userErrorMessage.value = ''
    return state.profile
  }

  function applyUploadedAvatar(state: Awaited<ReturnType<typeof experienceApi.uploadAvatar>>) {
    applyUserState(state)
    userLoaded.value = true
    userErrorMessage.value = ''
    return state.profile.avatar
  }

  function withLocalState<T extends Recipe>(recipe: T): T {
    return { ...recipe, isFavorite: favoriteIds.value.includes(recipe.id) }
  }

  function rememberRecommendation(recipeId: number) {
    if (!recipeId) return
    recentRecommendationIds.value = [
      recipeId,
      ...recentRecommendationIds.value.filter(id => id !== recipeId),
    ].slice(0, 8)
  }

  async function loadBootstrap(force = false) {
    if (loading.value || (bootstrapLoaded.value && !force)) return
    await loadUserState(force)
    loading.value = true
    errorMessage.value = ''
    try {
      const payload = await recipeApi.getBootstrap(selectedStatus.value)
      quickCategories.value = payload.quickCategories
      cookingCategories.value = payload.cookingCategories
      takeoutCategories.value = payload.takeoutCategories
      statusOptions.value = payload.statusOptions
      recommendation.value = withLocalState(payload.recommendation)
      rememberRecommendation(recommendation.value.id)
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

  async function selectStatus(status: string) {
    selectedStatus.value = status
    await persistUserState({ selectedStatus: status })
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
    void persistUserState({ favoriteRecipeIds: favoriteIds.value })
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
    if (recipeId && !plannedRecipeIds.value.includes(recipeId)) {
      plannedRecipeIds.value = [...plannedRecipeIds.value, recipeId]
      void persistUserState({ plannedRecipeIds: plannedRecipeIds.value })
    }
  }

  function isInPlan(recipeId: number) {
    return plannedRecipeIds.value.includes(recipeId)
  }

  function isCooked(recipeId: number) {
    return cookedRecipeIds.value.includes(recipeId)
  }

  function markCooked(recipeId: number) {
    if (!cookedRecipeIds.value.includes(recipeId)) {
      cookedRecipeIds.value = [...cookedRecipeIds.value, recipeId]
      void persistUserState({ cookedRecipeIds: cookedRecipeIds.value })
    }
  }

  function isLiked(recipeId: number) {
    return likedRecipeIds.value.includes(recipeId)
  }

  function toggleLike(recipeId: number) {
    likedRecipeIds.value = isLiked(recipeId)
      ? likedRecipeIds.value.filter(id => id !== recipeId)
      : [...likedRecipeIds.value, recipeId]
    void persistUserState({ likedRecipeIds: likedRecipeIds.value })
  }

  async function refreshRecommendation() {
    errorMessage.value = ''
    try {
      recommendation.value = withLocalState(await recipeApi.getRandomRecipe(
        selectedStatus.value,
        recentRecommendationIds.value,
      ))
      rememberRecommendation(recommendation.value.id)
      return recommendation.value
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : '随机菜谱获取失败'
      throw error
    }
  }

  watch(favoriteIds, value => uni.setStorageSync('favoriteRecipeIds', value), { deep: true })
  watch(plannedRecipeIds, value => uni.setStorageSync('plannedRecipeIds', value), { deep: true })
  watch(cookedRecipeIds, value => uni.setStorageSync('cookedRecipeIds', value), { deep: true })
  watch(likedRecipeIds, value => uni.setStorageSync('likedRecipeIds', value), { deep: true })
  watch(profile, value => uni.setStorageSync('userProfile', value), { deep: true })
  watch(recentRecommendationIds, value => uni.setStorageSync('recentRecommendationIds', value), { deep: true })

  return {
    selectedStatus,
    recommendation,
    recipes,
    quickCategories,
    cookingCategories,
    takeoutCategories,
    statusOptions,
    recentRecommendationIds,
    statusLabel,
    loading,
    errorMessage,
    bootstrapLoaded,
    favoriteIds,
    plannedRecipeIds,
    cookedRecipeIds,
    likedRecipeIds,
    profile,
    userStats,
    userLoaded,
    userLoading,
    userErrorMessage,
    applyUserState,
    loadBootstrap,
    loadRecipes,
    loadRecipe,
    loadUserState,
    updateProfile,
    applyUploadedAvatar,
    selectStatus,
    toggleFavorite,
    isFavorite,
    addToPlan,
    isInPlan,
    isCooked,
    markCooked,
    isLiked,
    toggleLike,
    selectRecommendation,
    refreshRecommendation,
  }
})
