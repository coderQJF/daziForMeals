<script setup lang="ts">
const props = defineProps<{
  selected: number
}>()

const items = [
  { path: '/pages/index/index', text: '首页', icon: '/static/tabbar/home.png', activeIcon: '/static/tabbar/home-active.png' },
  { path: '/pages/category/category', text: '分类', icon: '/static/tabbar/category.png', activeIcon: '/static/tabbar/category-active.png' },
  { path: '/pages/plan/plan', text: '计划', icon: '/static/tabbar/plan.png', activeIcon: '/static/tabbar/plan-active.png' },
  { path: '/pages/favorite/favorite', text: '收藏', icon: '/static/tabbar/favorite.png', activeIcon: '/static/tabbar/favorite-active.png' },
  { path: '/pages/user/user', text: '我的', icon: '/static/tabbar/user.png', activeIcon: '/static/tabbar/user-active.png' },
]

function switchTab(index: number, path: string) {
  if (index === props.selected) return
  uni.switchTab({ url: path })
}
</script>

<template>
  <view class="app-tabbar">
    <button
      v-for="(item, index) in items"
      :key="item.path"
      class="app-tabbar__item"
      :class="{ 'app-tabbar__item--active': selected === index }"
      @click="switchTab(index, item.path)"
    >
      <view class="app-tabbar__active-bg" />
      <image
        class="app-tabbar__icon"
        :src="selected === index ? item.activeIcon : item.icon"
        mode="aspectFit"
      />
      <text class="app-tabbar__text">{{ item.text }}</text>
    </button>
  </view>
</template>

<style scoped lang="scss">
.app-tabbar {
  position: fixed;
  z-index: 9999;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  height: 108rpx;
  padding: 9rpx 18rpx calc(env(safe-area-inset-bottom) + 8rpx);
  align-items: flex-start;
  border-top: 1rpx solid rgba(91, 67, 49, 0.05);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -10rpx 34rpx rgba(75, 47, 27, 0.055);
  box-sizing: content-box;
}

.app-tabbar__item {
  position: relative;
  display: flex;
  height: 94rpx;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.app-tabbar__active-bg {
  position: absolute;
  top: 2rpx;
  left: 50%;
  width: 74rpx;
  height: 58rpx;
  border-radius: 25rpx;
  transform: translateX(-50%);
}

.app-tabbar__item--active {
  color: #ff7a1a;

  .app-tabbar__active-bg { background: #fff6ed; }
  .app-tabbar__text { font-weight: 700; }
}

.app-tabbar__icon {
  position: relative;
  z-index: 1;
  width: 43rpx;
  height: 43rpx;
}

.app-tabbar__text {
  position: relative;
  z-index: 1;
  margin-top: 4rpx;
  font-size: 20rpx;
  line-height: 25rpx;
}
</style>
