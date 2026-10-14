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
    :aria-pressed="selected"
    @click.stop="emit('toggle')"
  >
    <text class="dish-selection__icon">{{ selected ? '✓' : '＋' }}</text>
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.dish-selection { display: inline-flex; width: 68rpx; height: 68rpx; margin: 0; padding: 0; flex: 0 0 68rpx; align-items: center; justify-content: center; border: 2rpx solid $color-primary; border-radius: 50%; background: $color-primary; color: #fff; font-weight: 750; line-height: 1; box-sizing: border-box; }
.dish-selection--selected { background: $color-page; color: $color-primary-deep; }
.dish-selection__icon { font-size: 40rpx; line-height: 1; }
.dish-selection--selected .dish-selection__icon { font-size: 34rpx; }
.dish-selection[disabled] { opacity: .6; }
</style>
