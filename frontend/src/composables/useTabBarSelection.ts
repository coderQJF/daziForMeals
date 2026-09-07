import { onShow } from '@dcloudio/uni-app'

interface CustomTabBarInstance {
  setData(data: { selected: number }): void
}

interface PageWithCustomTabBar {
  getTabBar?: () => CustomTabBarInstance
}

export function useTabBarSelection(selected: number) {
  onShow(() => {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as unknown as PageWithCustomTabBar
    page?.getTabBar?.()?.setData({ selected })
  })
}
