<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/60" @click="onBackdrop" />
      <div class="absolute inset-0 flex items-center justify-center p-4" @keydown.esc="emitClose">
        <div
          ref="panel"
          :class="['w-full rounded-lg border t-border t-surface shadow-2xl', props.panelClass || 'max-w-xl']"
          role="dialog"
          aria-modal="true"
          :aria-label="title || 'dialog'"
          tabindex="-1"
        >
          <div class="flex items-center justify-between gap-3 px-4 py-3 border-b t-border">
            <div class="text-sm font-semibold truncate" :class="theme === 'dark' ? 'text-white' : 'text-black'">{{ title }}</div>
            <button
              type="button"
              class="h-7 w-7 inline-flex items-center justify-center rounded t-btn-secondary"
              title="닫기"
              aria-label="닫기"
              @click="emitClose"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18 6L6 18"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M6 6l12 12"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="sr-only">닫기</span>
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
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { getActiveTheme, type ThemeMode } from "../../theme";

const theme = ref<ThemeMode>("dark");
let themeObserver: MutationObserver | null = null;

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    closeOnBackdrop?: boolean;
    /** Optional extra class for the panel (e.g. max-w-4xl for wider modals) */
    panelClass?: string;
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

onMounted(() => {
  theme.value = getActiveTheme();
  themeObserver = new MutationObserver(() => {
    theme.value = getActiveTheme();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
});

window.addEventListener("keydown", onGlobalKeydown);
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
  themeObserver?.disconnect();
  themeObserver = null;
});
</script>
