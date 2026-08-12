import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { todayRecipe } from '@/mocks/recipe'

export const useRecipeStore = defineStore('recipe', () => {
  const selectedStatus = ref('recover')
  const recommendation = ref({ ...todayRecipe })
  const refreshCount = ref(0)

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

  function toggleFavorite() {
    recommendation.value.isFavorite = !recommendation.value.isFavorite
  }

  function refreshRecommendation() {
    refreshCount.value += 1
    uni.showToast({ title: '已为你刷新推荐', icon: 'none' })
  }

  return {
    selectedStatus,
    recommendation,
    refreshCount,
    statusLabel,
    selectStatus,
    toggleFavorite,
    refreshRecommendation,
  }
})
