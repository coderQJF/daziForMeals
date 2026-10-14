/** Tutorials use the recipe's real catalog ID; viewing never changes a meal. */
export function openRecipeDetail(recipeId: number) {
  if (!Number.isInteger(recipeId) || recipeId < 1) return
  uni.navigateTo({ url: `/pages/recipe/detail?id=${recipeId}` })
}

export function returnFromRecipeDetail(fromShare = false) {
  const returnHome = () => uni.switchTab({ url: '/pages/index/index' })
  if (!fromShare && getCurrentPages().length > 1) {
    uni.navigateBack({ fail: returnHome })
    return
  }
  returnHome()
}
