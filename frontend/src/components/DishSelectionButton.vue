<script setup lang="ts">
defineProps<{ selected: boolean; disabled?: boolean; pending?: boolean; dishName: string }>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    class="dish-selection"
    :class="{ 'dish-selection--selected': selected, 'dish-selection--pending': pending }"
    :disabled="disabled"
    :aria-label="`${selected ? '取消想吃' : '想吃'}${dishName}`"
    :aria-pressed="selected"
    @click.stop="emit('toggle')"
  >
    <image class="dish-selection__icon" :src="selected ? '/static/icons/dish-selected.svg' : '/static/icons/dish-add.svg'" mode="aspectFit" aria-hidden="true" />
  </button>
</template>

<style scoped lang="scss">
@use '@/styles/tokens.scss' as *;
.dish-selection { display: inline-flex; width: 68rpx; height: 68rpx; margin: 0; padding: 0; flex: 0 0 68rpx; align-items: center; justify-content: center; border: 2rpx solid $color-primary; border-radius: 50%; background: $color-primary; color: #fff; font-weight: 750; line-height: 1; box-sizing: border-box; }
.dish-selection__icon { width: 36rpx; height: 36rpx; }
/* The request lock disables all actions, but must not gray out every dish. */
.dish-selection[disabled] { opacity: 1; background: $color-primary; border-color: $color-primary; color: #fff; }
.dish-selection--pending[disabled] { opacity: .6; }
</style>
