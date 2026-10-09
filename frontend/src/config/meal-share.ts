export function mealSharePath(
  basePath: string,
  mealId?: string,
  inviteCode?: string,
): string {
  if (!mealId || !inviteCode) return basePath
  return `${basePath}?mealId=${encodeURIComponent(mealId)}&invite=${encodeURIComponent(inviteCode)}`
}
