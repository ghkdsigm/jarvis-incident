<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/60" @click="onBackdrop" />
      <div class="absolute inset-0 flex items-center justify-center p-4" @keydown.esc="emitClose">
        <div
          ref="panel"
          class="w-full max-w-xl rounded-lg border t-border t-surface shadow-2xl"
          role="dialog"
          aria-modal="true"
          :aria-label="title || 'dialog'"
          tabindex="-1"
        >
          <div class="flex items-center justify-between gap-3 px-4 py-3 border-b t-border">
            <div class="text-sm font-semibold truncate">{{ title }}</div>
            <button
              type="button"
              class="h-8 w-8 inline-flex items-center justify-center rounded border transition-colors t-btn-secondary"
              title="닫기"
              aria-label="닫기"
              @click="emitClose"
            >
              <!-- close (X) -->
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18 6 6 18M6 6l12 12"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <div class="px-4 py-3">
            <slot />
          </div>

          <div v-if="$slots.footer" class="px-4 py-3 border-t t-border">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    closeOnBackdrop?: boolean;
  }>(),
  {
    closeOnBackdrop: true
  }
);

const emit = defineEmits<{
  (e: "close"): void;
}>();

const panel = ref<HTMLDivElement | null>(null);

function emitClose() {
  emit("close");
}

function onBackdrop() {
  if (!props.closeOnBackdrop) return;
  emitClose();
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (!props.open) return;
  if (e.key === "Escape") emitClose();
}

watch(
  () => props.open,
  async (v) => {
    if (!v) return;
    // focus panel so ESC works even if no input is focused
    await nextTick();
    panel.value?.focus?.();
  }
);

window.addEventListener("keydown", onGlobalKeydown);
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
});
</script>
