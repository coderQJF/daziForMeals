<script setup lang="ts">
import ComingPage from '@/components/ComingPage.vue'

const menuItems = [
  { icon: '🍴', label: '我的口味', color: '#fff2df' },
  { icon: '🍲', label: '我的厨房', color: '#fff8df' },
  { icon: '📋', label: '吃饭记录', color: '#edf6e7' },
  { icon: '💕', label: '情侣吃饭投票', color: '#fff0ef' },
  { icon: '⚙️', label: '设置', color: '#f1f2f4' },
]
</script>

<template>
  <ComingPage title="我的" subtitle="认真吃好每一餐" icon="♙">
    <view class="profile surface-card">
      <view class="avatar">👩🏻‍🍳</view>
      <view class="profile__copy">
        <text class="nickname">早睡早起吃饭饭 ☀️</text>
        <text class="bio">享受每一餐，认真生活每一天～</text>
      </view>
      <text class="arrow">›</text>
    </view>

    <view class="stats surface-card">
      <view><text class="stat-icon">★</text><text class="stat-number">56</text><text>收藏</text></view>
      <view><text class="stat-icon heart">♥</text><text class="stat-number">128</text><text>喜欢</text></view>
      <view><text class="stat-icon done">●</text><text class="stat-number">36</text><text>做过</text></view>
    </view>

    <view class="menu surface-card">
      <button v-for="item in menuItems" :key="item.label" class="menu__item">
        <view class="menu__icon" :style="{ background: item.color }">{{ item.icon }}</view>
        <text class="menu__label">{{ item.label }}</text>
        <text class="arrow">›</text>
      </button>
    </view>

    <view class="reminder surface-card">
      <view>
        <text class="reminder__title">别忘了好好吃饭呀～</text>
        <text class="reminder__desc">规律饮食，身体更棒棒！</text>
      </view>
      <text class="reminder__pot">🍲</text>
    </view>
  </ComingPage>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.profile {
  display: flex;
  margin-top: 34rpx;
  padding: 30rpx;
  align-items: center;
}

.avatar {
  display: flex;
  width: 104rpx;
  height: 104rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff0df;
  font-size: 60rpx;
}

.profile__copy {
  display: flex;
  min-width: 0;
  margin-left: 22rpx;
  flex: 1;
  flex-direction: column;
}

.nickname {
  font-size: 29rpx;
  font-weight: 700;
}

.bio {
  margin-top: 10rpx;
  color: $color-text-secondary;
  font-size: 22rpx;
}

.arrow {
  color: $color-text-muted;
  font-size: 44rpx;
}

.stats {
  display: grid;
  margin-top: 22rpx;
  padding: 28rpx 16rpx;
  grid-template-columns: repeat(3, 1fr);

  > view {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: $color-text-secondary;
    font-size: 21rpx;
  }
}

.stat-icon {
  color: #ffad22;
  font-size: 42rpx;
}

.heart { color: #ff665b; }
.done { color: #78b747; }

.stat-number {
  margin: 8rpx 0 3rpx;
  color: $color-text;
  font-size: 31rpx;
  font-weight: 700;
}

.menu {
  margin-top: 22rpx;
  overflow: hidden;
  padding: 0 26rpx;
}

.menu__item {
  display: flex;
  width: 100%;
  height: 104rpx;
  align-items: center;
  border-bottom: 1rpx solid $color-line;
  text-align: left;

  &:last-child { border-bottom: 0; }
}

.menu__icon {
  display: flex;
  width: 60rpx;
  height: 60rpx;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  font-size: 30rpx;
}

.menu__label {
  margin-left: 20rpx;
  flex: 1;
  font-size: 27rpx;
}

.reminder {
  display: flex;
  margin-top: 22rpx;
  padding: 26rpx 30rpx;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(100deg, #fff7e8, #fff1df);
}

.reminder__title,
.reminder__desc {
  display: block;
}

.reminder__title { font-size: 26rpx; font-weight: 650; }
.reminder__desc { margin-top: 8rpx; color: $color-text-secondary; font-size: 21rpx; }
.reminder__pot { font-size: 70rpx; }
</style>
