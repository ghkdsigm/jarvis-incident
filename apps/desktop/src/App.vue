<template>
  <LoginView v-if="store.authReady && !store.token" />

  <div v-else-if="store.authReady && store.token" class="w-screen h-screen flex flex-col">
    <TopBar
      :calendar-active="showCalendar"
      @open-rooms="roomDrawerOpen = true"
      @toggle-calendar="showCalendar = !showCalendar"
    />
    <div class="flex-1 min-h-0" :class="isMiniMode ? 'flex flex-col' : 'flex'">
      <aside
        v-if="!isMiniMode"
        class="border-r t-border min-h-0 relative t-sidebar"
        :style="{ width: `${sidebarCollapsed ? collapsedWidth : sidebarWidth}px` }"
      >
        <div class="h-full min-h-0">
          <div v-if="sidebarCollapsed" class="h-full flex items-start justify-center pt-2">
            <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="toggleSidebar" title="채팅방 리스트 펼치기">
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
        <CalendarView v-if="showCalendar" />
        <ChatPanel v-else />
      </main>
    </div>

    <!-- Mini mode: room list drawer -->
    <div v-if="isMiniMode && roomDrawerOpen" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40" @click="roomDrawerOpen = false" />
      <div
        class="absolute left-0 top-0 bottom-0 w-[340px] max-w-[86vw] t-surface border-r t-border shadow-xl flex flex-col"
      >
        <div class="h-12 px-3 border-b t-border flex items-center justify-between">
          <div class="text-sm font-semibold">채팅방</div>
          <button
            class="h-8 w-8 inline-flex items-center justify-center rounded border transition-colors t-btn-secondary"
            title="닫기"
            aria-label="채팅방 목록 닫기"
            @click="roomDrawerOpen = false"
          >
            <!-- x -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
        <div class="flex-1 min-h-0">
          <RoomList />
        </div>
      </div>
    </div>
  </div>

  <div v-else class="w-screen h-screen flex items-center justify-center t-surface t-text-muted text-sm">
    세션 확인 중...
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import TopBar from "./components/TopBar.vue";
import RoomList from "./components/RoomList.vue";
import ChatPanel from "./components/ChatPanel.vue";
import CalendarView from "./components/CalendarView.vue";
import LoginView from "./components/LoginView.vue";
import { useSessionStore } from "./stores/session";
import { useWindowStore } from "./stores/window";

const store = useSessionStore();
const windowStore = useWindowStore();

const collapsedWidth = 44;
const sidebarCollapsed = ref(false);
const sidebarWidth = ref(250);
const roomDrawerOpen = ref(false);
const showCalendar = ref(false);
const sidebarCollapsedSnapshot = ref<boolean | null>(null);

const isMiniMode = computed(() => windowStore.miniMode);

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
  windowStore.init();
});

watch(
  () => store.activeRoomId,
  () => {
    if (isMiniMode.value) roomDrawerOpen.value = false;
  }
);

watch(
  isMiniMode,
  (v) => {
    if (!v) roomDrawerOpen.value = false;
    if (v) {
      sidebarCollapsedSnapshot.value = sidebarCollapsed.value;
      sidebarCollapsed.value = true;
    } else {
      if (sidebarCollapsedSnapshot.value != null) sidebarCollapsed.value = sidebarCollapsedSnapshot.value;
      sidebarCollapsedSnapshot.value = null;
    }
  },
  { immediate: true }
);
</script>
