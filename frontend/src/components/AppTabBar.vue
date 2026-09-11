<script setup lang="ts">
const props = defineProps<{
  selected: number
}>()

const items = [
  { path: '/pages/index/index', text: '首页', icon: '/static/tabbar/home.png', activeIcon: '/static/tabbar/home-active.png' },
  { path: '/pages/category/category', text: '分类', icon: '/static/tabbar/category.png', activeIcon: '/static/tabbar/category-active.png' },
  { path: '/pages/user/user', text: '我的', icon: '/static/tabbar/user.png', activeIcon: '/static/tabbar/user-active.png' },
]

function switchTab(index: number, path: string) {
  const pages = getCurrentPages()
  const currentRoute = pages[pages.length - 1]?.route
  if (`/${currentRoute}` === path) return
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
  right: 16rpx;
  bottom: calc(env(safe-area-inset-bottom) + 28rpx);
  left: 16rpx;
  display: flex;
  height: 112rpx;
  padding: 12rpx 8rpx 10rpx;
  align-items: flex-start;
  border-top: 1rpx solid rgba(91, 67, 49, 0.05);
  border-radius: 32rpx;
  background: #fff;
  box-shadow: 0 -9rpx 30rpx rgba(75, 47, 27, 0.052);
  box-sizing: content-box;
}

.app-tabbar__item {
  position: relative;
  display: flex;
  width: 33.333%;
  min-width: 0;
  height: 108rpx;
  flex: 0 0 33.333%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9da1aa;
  box-sizing: border-box;
}

.app-tabbar__item--active {
  color: #ff900b;

  .app-tabbar__text { font-weight: 700; }
}

.app-tabbar__icon {
  position: relative;
  z-index: 1;
  display: block;
  width: 56rpx;
  height: 56rpx;
}

.app-tabbar__text {
  position: relative;
  z-index: 1;
  margin-top: 5rpx;
  font-size: 24rpx;
  line-height: 30rpx;
  white-space: nowrap;
}
</style>
