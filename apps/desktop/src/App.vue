<template>
  <LoginView v-if="store.authReady && !store.token" />

  <div v-else-if="store.authReady && store.token" class="w-screen h-screen flex flex-col">
    <TopBar />
    <div class="flex-1 flex min-h-0">
      <aside
        class="border-r t-border min-h-0 relative t-sidebar"
        :style="{ width: `${sidebarCollapsed ? collapsedWidth : sidebarWidth}px` }"
      >
        <div class="h-full min-h-0">
          <div v-if="sidebarCollapsed" class="h-full flex items-start justify-center pt-2">
            <button
              class="px-2 py-1 text-xs rounded t-btn-secondary"
              @click="toggleSidebar"
              title="채팅방 리스트 펼치기"
            >
              &gt;
            </button>
          </div>
          <div v-else class="h-full min-h-0">
            <button
              class="absolute top-3 right-2 z-10 px-2 py-1 text-xs rounded t-btn-secondary"
              @click="toggleSidebar"
              title="채팅방 리스트 접기"
            >
              &lt;
            </button>
            <RoomList />
          </div>
        </div>

        <div
          v-if="!sidebarCollapsed"
          class="absolute top-0 right-0 h-full w-1 cursor-col-resize"
          @pointerdown="onResizeStart"
          title="드래그로 폭 조절"
        />
      </aside>

      <main class="flex-1 min-h-0 t-surface">
        <ChatPanel />
      </main>
    </div>
  </div>

  <div v-else class="w-screen h-screen flex items-center justify-center t-surface t-text-muted text-sm">
    세션 확인 중...
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import TopBar from "./components/TopBar.vue";
import RoomList from "./components/RoomList.vue";
import ChatPanel from "./components/ChatPanel.vue";
import LoginView from "./components/LoginView.vue";
import { useSessionStore } from "./stores/session";

const store = useSessionStore();

const collapsedWidth = 44;
const sidebarCollapsed = ref(false);
const sidebarWidth = ref(360);

const resizing = ref(false);
let startX = 0;
let startW = 0;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function onResizeStart(e: PointerEvent) {
  resizing.value = true;
  startX = e.clientX;
  startW = sidebarWidth.value;
  (e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
  window.addEventListener("pointermove", onResizeMove);
  window.addEventListener("pointerup", onResizeEnd, { once: true });
}

function onResizeMove(e: PointerEvent) {
  if (!resizing.value) return;
  const dx = e.clientX - startX;
  sidebarWidth.value = clamp(startW + dx, 260, 560);
}

function onResizeEnd() {
  resizing.value = false;
  window.removeEventListener("pointermove", onResizeMove);
}

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", onResizeMove);
});

onMounted(() => {
  store.initAuth();
});
</script>
