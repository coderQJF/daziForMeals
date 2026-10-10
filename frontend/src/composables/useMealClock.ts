import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { useMealStore } from '@/stores/meal'

export function useMealClock() {
  const mealStore = useMealStore()
  let timer: ReturnType<typeof setInterval> | undefined
  function stop() {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
  }
  onShow(() => {
    stop()
    mealStore.refreshMealClock()
    timer = setInterval(() => mealStore.refreshMealClock(), 1000)
  })
  onHide(stop)
  onUnload(stop)
}
