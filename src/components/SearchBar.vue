<script setup lang="ts">
const emit = defineEmits<{
  search: [keyword: string]
}>()

function openSearch() {
  emit('search', '')
  uni.showToast({ title: '搜索功能正在接入', icon: 'none' })
}
</script>

<template>
  <button class="search surface-card" @click="openSearch">
    <text class="icon">⌕</text>
    <text class="placeholder">搜索菜谱、食材或功效</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;

.search {
  display: flex;
  width: 100%;
  height: 92rpx;
  margin-top: 28rpx;
  padding: 0 30rpx;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(82, 53, 30, 0.04);
  text-align: left;
}

.icon {
  color: $color-text-secondary;
  font-size: 48rpx;
  transform: rotate(-18deg);
}

.placeholder {
  margin-left: 18rpx;
  color: $color-text-muted;
  font-size: 27rpx;
}
</style>
