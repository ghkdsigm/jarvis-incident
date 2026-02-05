<template>
  <div class="h-12 flex items-center justify-between px-3 border-b border-zinc-800 bg-zinc-900/40">
    <div class="flex items-center gap-2">
      <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
      <div class="text-sm font-semibold">Dw-Brain</div>
      <div class="text-xs text-zinc-400">Dongwah Business Real-time AI Network</div>
    </div>
    <div class="flex items-center gap-2">
      <button
        class="h-8 w-8 inline-flex items-center justify-center rounded border transition-colors"
        :class="
          alwaysOnTop
            ? 'bg-[#00694D] border-[#00694D] text-white'
            : 'bg-zinc-800 border-zinc-800 hover:bg-zinc-700 hover:border-zinc-700 text-zinc-100'
        "
        title="항상 위"
        aria-label="항상 위 토글"
        @click="toggleAlwaysOnTop"
      >
        <!-- pin -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 3h6l1 7 3 3v2H5v-2l3-3 1-7Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
          <path
            d="M12 15v6"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <button
        class="h-8 w-8 inline-flex items-center justify-center rounded border transition-colors"
        :class="
          miniMode
            ? 'bg-[#00694D] border-[#00694D] text-white'
            : 'bg-zinc-800 border-zinc-800 hover:bg-zinc-700 hover:border-zinc-700 text-zinc-100'
        "
        title="미니 모드"
        aria-label="미니 모드 토글"
        @click="toggleMiniMode"
      >
        <!-- minimize/window -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 7h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
          <path
            d="M8 16h8"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

declare global {
  interface Window {
    jarvisDesktop?: {
      getWindowState: () => Promise<{ alwaysOnTop: boolean; miniMode: boolean }>;
      toggleAlwaysOnTop: () => Promise<boolean>;
      toggleMiniMode: () => Promise<boolean>;
    };
  }
}

const alwaysOnTop = ref(false);
const miniMode = ref(false);

onMounted(async () => {
  try {
    const s = await window.jarvisDesktop?.getWindowState?.();
    if (s) {
      alwaysOnTop.value = !!s.alwaysOnTop;
      miniMode.value = !!s.miniMode;
    }
  } catch {
    // ignore
  }
});

async function toggleAlwaysOnTop() {
  try {
    const v = await window.jarvisDesktop?.toggleAlwaysOnTop?.();
    if (typeof v === "boolean") alwaysOnTop.value = v;
  } catch {
    // ignore
  }
}
async function toggleMiniMode() {
  try {
    const v = await window.jarvisDesktop?.toggleMiniMode?.();
    if (typeof v === "boolean") miniMode.value = v;
  } catch {
    // ignore
  }
}
</script>
