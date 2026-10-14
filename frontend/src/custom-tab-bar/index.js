Component({
  data: {
    selected: 0,
    color: '#9da1aa',
    selectedColor: '#ff900b',
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: '/static/tabbar/home.png', selectedIcon: '/static/tabbar/home-active.png' },
      { pagePath: '/pages/category/category', text: '分类', icon: '/static/tabbar/category.png', selectedIcon: '/static/tabbar/category-active.png' },
      { pagePath: '/pages/user/user', text: '我的', icon: '/static/tabbar/user.png', selectedIcon: '/static/tabbar/user-active.png' },
    ],
  },
  lifetimes: {
    attached() {
      this.syncSelection()
    },
  },
  pageLifetimes: {
    show() {
      this.syncSelection()
    },
  },
  methods: {
    syncSelection() {
      const pages = getCurrentPages()
      const currentRoute = pages[pages.length - 1]?.route
      const selected = this.data.list.findIndex(item => item.pagePath === `/${currentRoute}`)
      if (selected >= 0) this.setData({ selected })
    },
    switchTab(event) {
      const { path } = event.currentTarget.dataset
      const pages = getCurrentPages()
      if (`/${pages[pages.length - 1]?.route}` === path) return
      wx.switchTab({ url: path })
    },
  },
})
