import { onReady, onShow } from '@dcloudio/uni-app'

interface CustomTabBarInstance {
  setData(data: { selected: number }): void
}

interface PageWithCustomTabBar {
  getTabBar?: () => CustomTabBarInstance
}

export function useTabBarSelection(selected: number) {
  function syncSelection() {
    // App/H5 use the page component; never show a second system tab bar.
    // #ifndef MP-WEIXIN
    uni.hideTabBar({ animation: false, fail: () => undefined })
    // #endif
    // WeChat custom-tab-bar manages visibility using its own selected state.
    // #ifdef MP-WEIXIN
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as unknown as PageWithCustomTabBar
    page?.getTabBar?.()?.setData({ selected })
    // #endif
  }
  onShow(syncSelection)
  onReady(syncSelection)
}
