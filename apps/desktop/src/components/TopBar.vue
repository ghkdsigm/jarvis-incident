<template>
  <div class="h-12 flex items-center justify-between px-3 border-b border-zinc-800 bg-zinc-900/40">
    <div class="flex items-center gap-2">
      <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
      <div class="text-sm font-semibold">Jarvis Chat</div>
      <div class="text-xs text-zinc-400">Always-on-top / Mini mode</div>
    </div>
    <div class="flex items-center gap-2">
      <button class="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700" @click="toggleAlwaysOnTop">
        항상 위 토글
      </button>
      <button class="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700" @click="toggleMiniMode">
        미니 모드
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
declare global {
  interface Window {
    jarvisDesktop?: {
      toggleAlwaysOnTop: () => void;
      toggleMiniMode: () => void;
    };
  }
}

function toggleAlwaysOnTop() {
  window.jarvisDesktop?.toggleAlwaysOnTop();
}
function toggleMiniMode() {
  window.jarvisDesktop?.toggleMiniMode();
}
</script>
