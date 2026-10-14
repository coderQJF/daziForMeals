<script setup lang="ts">
defineProps<{ selected: boolean; disabled?: boolean; dishName: string }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    class="dish-selection"
    :class="{ 'dish-selection--selected': selected }"
    :disabled="disabled"
    :aria-label="`${selected ? '取消想吃' : '想吃'}${dishName}`"
    @click.stop="emit('toggle')"
  >
    <text class="dish-selection__icon">{{ selected ? '✓' : '＋' }}</text>
    <text>{{ selected ? '已选' : '想吃' }}</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.dish-selection { display: inline-flex; min-width: 128rpx; height: 68rpx; margin: 0; padding: 0 16rpx; flex: 0 0 auto; align-items: center; justify-content: center; gap: 6rpx; border: 2rpx solid $color-primary; border-radius: 34rpx; background: $color-primary; color: #fff; font-size: 24rpx; font-weight: 750; line-height: 1.2; box-sizing: border-box; }
.dish-selection--selected { background: $color-page; color: $color-primary-deep; }
.dish-selection__icon { font-size: 30rpx; line-height: 1; }
.dish-selection[disabled] { opacity: .6; }
</style>
