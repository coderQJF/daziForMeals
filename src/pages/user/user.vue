<script setup lang="ts">
import AppTabBar from '@/components/AppTabBar.vue'
import { useTabBarSelection } from '@/composables/useTabBarSelection'

interface MenuItem {
  id: 'taste' | 'kitchen' | 'records' | 'couple' | 'settings'
  label: string
  icon: string
  tone: string
}

const mainMenuItems: MenuItem[] = [
  { id: 'taste', label: '我的口味', icon: '/static/images/user/taste.png', tone: '#fff6e9' },
  { id: 'kitchen', label: '我的厨房', icon: '/static/images/user/kitchen.png', tone: '#fff8e7' },
  { id: 'records', label: '吃饭记录', icon: '/static/images/user/meal-record.png', tone: '#eef8e8' },
  { id: 'couple', label: '情侣吃饭投票', icon: '/static/images/user/couple-vote.png', tone: '#fff0ef' },
]

const settingsItem: MenuItem = {
  id: 'settings',
  label: '设置',
  icon: '/static/images/user/settings.png',
  tone: '#f2f3f5',
}

useTabBarSelection(4)

function showNotice() {
  uni.showToast({ title: '暂时没有新消息', icon: 'none' })
}

function editProfile() {
  uni.showToast({ title: '个人资料编辑功能正在接入', icon: 'none' })
}

function openFavorite() {
  uni.switchTab({ url: '/pages/favorite/favorite' })
}

function handleMenu(item: MenuItem) {
  if (item.id === 'kitchen') {
    openFavorite()
    return
  }

  const messages: Record<MenuItem['id'], string> = {
    taste: '口味偏好管理功能正在接入',
    kitchen: '正在进入我的厨房',
    records: '吃饭记录功能正在接入',
    couple: '双人投票功能正在接入',
    settings: '账号与通知设置正在接入',
  }

  uni.showToast({ title: messages[item.id], icon: 'none' })
}
</script>

<template>
  <view class="user-page">
    <view class="user-page__glow" />

    <view class="page-header">
      <text class="page-header__title">我的</text>
      <button class="page-header__bell" aria-label="查看消息" @click="showNotice">
        <image src="/static/images/user/notification-bell.png" mode="aspectFit" />
      </button>
    </view>

    <button class="profile-card" @click="editProfile">
      <image class="profile-card__avatar" src="/static/images/user/avatar-female.png" mode="aspectFit" />
      <view class="profile-card__copy">
        <text class="profile-card__nickname">早睡早起吃饭饭 ☀️</text>
        <text class="profile-card__bio">享受每一餐，认真生活每一天～</text>
      </view>
      <text class="page-chevron">›</text>
    </button>

    <view class="stats-card">
      <button class="stat-item" @click="openFavorite">
        <text class="stat-item__symbol stat-item__symbol--star">★</text>
        <text class="stat-item__number">56</text>
        <text class="stat-item__label">收藏</text>
      </button>
      <button class="stat-item" @click="openFavorite">
        <text class="stat-item__symbol stat-item__symbol--heart">♥</text>
        <text class="stat-item__number">128</text>
        <text class="stat-item__label">喜欢</text>
      </button>
      <button class="stat-item" @click="openFavorite">
        <view class="stat-item__done">✓</view>
        <text class="stat-item__number">36</text>
        <text class="stat-item__label">做过</text>
      </button>
    </view>

    <view class="menu-card">
      <button
        v-for="item in mainMenuItems"
        :key="item.id"
        class="menu-row"
        @click="handleMenu(item)"
      >
        <view class="menu-row__icon-wrap" :style="{ backgroundColor: item.tone }">
          <image class="menu-row__icon" :src="item.icon" mode="aspectFit" />
        </view>
        <text class="menu-row__label">{{ item.label }}</text>
        <text class="page-chevron">›</text>
      </button>
    </view>

    <view class="menu-card menu-card--settings">
      <button class="menu-row" @click="handleMenu(settingsItem)">
        <view class="menu-row__icon-wrap" :style="{ backgroundColor: settingsItem.tone }">
          <image class="menu-row__icon" :src="settingsItem.icon" mode="aspectFit" />
        </view>
        <text class="menu-row__label">{{ settingsItem.label }}</text>
        <text class="page-chevron">›</text>
      </button>
    </view>

    <view class="meal-reminder">
      <view class="meal-reminder__copy">
        <text class="meal-reminder__title">别忘了好好吃饭呀～</text>
        <text class="meal-reminder__description">规律饮食，身体更棒棒！</text>
      </view>
      <image class="meal-reminder__pot" src="/static/images/user/kitchen.png" mode="aspectFit" />
    </view>

    <!-- #ifndef MP-WEIXIN -->
    <AppTabBar :selected="4" />
    <!-- #endif -->
  </view>
</template>

<style scoped lang="scss">
.user-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  padding: calc(var(--status-bar-height) + 26rpx) 32rpx calc(env(safe-area-inset-bottom) + 184rpx);
  background: #fdf9f4;
  box-sizing: border-box;
}

.user-page__glow {
  position: absolute;
  top: -130rpx;
  right: -110rpx;
  width: 460rpx;
  height: 400rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 230, 199, 0.64), rgba(255, 246, 235, 0.13) 62%, transparent 74%);
  pointer-events: none;
}

.page-header,
.profile-card,
.stats-card,
.menu-card,
.meal-reminder {
  position: relative;
  z-index: 1;
}

.page-header {
  display: flex;
  min-height: 88rpx;
  align-items: center;
  justify-content: space-between;
}

.page-header__title {
  color: #392519;
  font-size: 43rpx;
  font-weight: 800;
}

.page-header__bell {
  display: flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
}

.page-header__bell image {
  width: 72rpx;
  height: 72rpx;
}

.profile-card,
.stats-card,
.menu-card,
.meal-reminder {
  border: 1rpx solid rgba(104, 75, 53, 0.035);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 9rpx 28rpx rgba(79, 51, 31, 0.048);
}

.profile-card {
  display: flex;
  width: 100%;
  min-height: 172rpx;
  margin-top: 16rpx;
  padding: 22rpx 26rpx 22rpx 22rpx;
  align-items: center;
  border-radius: 28rpx;
  text-align: left;
}

.profile-card__avatar {
  width: 116rpx;
  height: 116rpx;
  flex: 0 0 116rpx;
}

.profile-card__copy {
  display: flex;
  min-width: 0;
  margin-left: 20rpx;
  flex: 1;
  flex-direction: column;
}

.profile-card__nickname {
  overflow: hidden;
  color: #302722;
  font-size: 29rpx;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-card__bio {
  margin-top: 13rpx;
  overflow: hidden;
  color: #8c8580;
  font-size: 22rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-chevron {
  color: #99948f;
  font-size: 44rpx;
  font-weight: 300;
  line-height: 1;
}

.stats-card {
  display: grid;
  min-height: 176rpx;
  margin-top: 20rpx;
  padding: 18rpx 8rpx 16rpx;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-radius: 28rpx;
}

.stat-item {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.stat-item:not(:last-child)::after {
  position: absolute;
  top: 34rpx;
  right: 0;
  bottom: 24rpx;
  width: 1rpx;
  background: #f0ebe7;
  content: '';
}

.stat-item__symbol {
  height: 46rpx;
  font-size: 43rpx;
  line-height: 46rpx;
}

.stat-item__symbol--star {
  color: #ffac24;
}

.stat-item__symbol--heart {
  color: #ff655b;
}

.stat-item__done {
  display: flex;
  width: 39rpx;
  height: 39rpx;
  margin: 3rpx 0 4rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #78bc45;
  color: #fff;
  font-size: 25rpx;
  font-weight: 800;
}

.stat-item__number {
  margin-top: 7rpx;
  color: #302722;
  font-size: 31rpx;
  font-weight: 750;
  line-height: 1.2;
}

.stat-item__label {
  margin-top: 5rpx;
  color: #8d8782;
  font-size: 21rpx;
}

.menu-card {
  margin-top: 20rpx;
  overflow: hidden;
  padding: 0 25rpx;
  border-radius: 28rpx;
}

.menu-card--settings {
  margin-top: 16rpx;
}

.menu-row {
  display: flex;
  width: 100%;
  height: 94rpx;
  align-items: center;
  border-bottom: 1rpx solid #f0ebe7;
  text-align: left;
}

.menu-row:last-child {
  border-bottom: 0;
}

.menu-row__icon-wrap {
  display: flex;
  width: 65rpx;
  height: 65rpx;
  flex: 0 0 65rpx;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
}

.menu-row__icon {
  width: 68rpx;
  height: 68rpx;
}

.menu-row__label {
  min-width: 0;
  margin-left: 18rpx;
  flex: 1;
  color: #352d28;
  font-size: 27rpx;
  font-weight: 600;
}

.meal-reminder {
  display: flex;
  min-height: 122rpx;
  margin-top: 20rpx;
  padding: 21rpx 20rpx 20rpx 27rpx;
  overflow: hidden;
  align-items: center;
  border-radius: 27rpx;
  background: linear-gradient(105deg, #fff7e8, #fff0dd);
}

.meal-reminder__copy {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.meal-reminder__title {
  color: #554235;
  font-size: 26rpx;
  font-weight: 700;
}

.meal-reminder__description {
  margin-top: 10rpx;
  color: #8d827a;
  font-size: 21rpx;
}

.meal-reminder__pot {
  width: 138rpx;
  height: 138rpx;
  margin: -14rpx 0 -19rpx 12rpx;
  flex: 0 0 138rpx;
}

/* #ifdef MP-WEIXIN */
.page-header__bell { margin-right: 178rpx; }
/* #endif */

@media (min-width: 500px) {
  .user-page {
    max-width: 750rpx;
    margin: 0 auto;
  }
}
</style>
