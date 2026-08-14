Component({
  data: {
    selected: 0,
    color: '#999999',
    selectedColor: '#ff7a1a',
    list: [
      { pagePath: '/pages/index/index', text: '首页', icon: '/static/tabbar/home.png', selectedIcon: '/static/tabbar/home-active.png' },
      { pagePath: '/pages/category/category', text: '分类', icon: '/static/tabbar/category.png', selectedIcon: '/static/tabbar/category-active.png' },
      { pagePath: '/pages/plan/plan', text: '计划', icon: '/static/tabbar/plan.png', selectedIcon: '/static/tabbar/plan-active.png' },
      { pagePath: '/pages/favorite/favorite', text: '收藏', icon: '/static/tabbar/favorite.png', selectedIcon: '/static/tabbar/favorite-active.png' },
      { pagePath: '/pages/user/user', text: '我的', icon: '/static/tabbar/user.png', selectedIcon: '/static/tabbar/user-active.png' },
    ],
  },
  methods: {
    switchTab(event) {
      const { index, path } = event.currentTarget.dataset
      if (index === this.data.selected) return
      wx.switchTab({ url: path })
    },
  },
})
