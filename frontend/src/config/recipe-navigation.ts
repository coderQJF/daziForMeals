/** Tutorials use the recipe's real catalog ID; viewing never changes a meal. */
export function openRecipeDetail(recipeId: number) {
  if (!Number.isInteger(recipeId) || recipeId < 1) return
  uni.navigateTo({ url: `/pages/recipe/detail?id=${recipeId}` })
}
