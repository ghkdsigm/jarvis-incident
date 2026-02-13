<template>
  <div
    class="flex items-center justify-between border-b t-border t-topbar"
    :class="[miniMode ? 'h-11 px-2' : 'h-12 px-3', theme === 'dark' ? 't-topbar-dark' : 'bg-[#eee]']"
  >
    <div class="flex items-center gap-2 min-w-0">
      <button
        v-if="miniMode"
        class="h-8 w-8 inline-flex items-center justify-center rounded border transition-colors t-btn-secondary"
        title="채팅방 목록"
        aria-label="채팅방 목록 열기"
        @click="emit('open-rooms')"
      >
        <!-- list -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 7h14M5 12h14M5 17h14"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
      <div class="min-w-0">
        <div class="text-sm font-semibold truncate" :class="theme === 'dark' ? 'text-white' : 'text-black'">
          {{ miniMode ? store.activeRoom?.title ?? "DW-BRAIN" : "DW-BRAIN" }}
        </div>
        <div v-if="!miniMode" class="text-xs t-text-muted truncate">Dongwha Business Real-time AI Network</div>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <button
        class="h-8 w-8 inline-flex items-center justify-center rounded border transition-colors"
        :class="
          calendarActive
            ? 't-btn-primary border-transparent'
            : 't-btn-secondary'
        "
        title="캘린더"
        aria-label="캘린더 보기"
        @click="emit('toggle-calendar')"
      >
        <!-- calendar -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="2"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
          <path
            d="M16 2v4M8 2v4M3 10h18"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <button
        class="h-8 w-8 inline-flex items-center justify-center rounded border transition-colors"
        :class="
          alwaysOnTop
            ? 't-btn-primary border-transparent'
            : 't-btn-secondary'
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
            ? 't-btn-primary border-transparent'
            : 't-btn-secondary'
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

      <button
        class="h-8 w-8 inline-flex items-center justify-center rounded border transition-colors t-btn-secondary"
        :title="theme === 'dark' ? '라이트 모드' : '다크 모드'"
        aria-label="테마 전환"
        @click="onToggleTheme"
      >
        <!-- sun/moon -->
        <svg v-if="theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <button
        v-if="store.token"
        class="h-8 w-8 inline-flex items-center justify-center rounded border transition-colors t-btn-secondary"
        title="로그아웃"
        aria-label="로그아웃"
        @click="openLogoutConfirm"
      >
        <!-- logout -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M15 12H3m0 0 3-3M3 12l3 3"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>

  <CommonModal :open="logoutModalOpen" title="로그아웃" :closeOnBackdrop="logoutModalStep !== 'confirm'" @close="closeLogoutModal">
    <div v-if="logoutModalStep === 'confirm'" class="text-sm">
      로그아웃하시겠습니까?
    </div>
    <div v-else class="text-sm">
      로그아웃되었습니다.
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          v-if="logoutModalStep === 'confirm'"
          class="px-3 py-2 text-sm rounded t-btn-secondary"
          @click="closeLogoutModal"
        >
          취소
        </button>
        <button
          class="px-3 py-2 text-sm rounded"
          :class="logoutModalStep === 'confirm' ? 't-btn-primary' : 't-btn-secondary'"
          @click="onLogoutModalPrimary"
        >
          확인
        </button>
      </div>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useWindowStore } from "../stores/window";
import { useThemeStore } from "../stores/theme";
import CommonModal from "./ui/CommonModal.vue";

const emit = defineEmits<{ (e: "open-rooms"): void; (e: "toggle-calendar"): void }>();

defineProps<{ calendarActive?: boolean }>();

const store = useSessionStore();
const windowStore = useWindowStore();
const themeStore = useThemeStore();

const alwaysOnTop = computed(() => windowStore.alwaysOnTop);
const miniMode = computed(() => windowStore.miniMode);
const theme = computed(() => themeStore.theme);

const logoutModalOpen = ref(false);
const logoutModalStep = ref<"confirm" | "done">("confirm");

onMounted(async () => {
  windowStore.init();
});

function onToggleTheme() {
  themeStore.toggle();
}

function openLogoutConfirm() {
  logoutModalStep.value = "confirm";
  logoutModalOpen.value = true;
}

function closeLogoutModal() {
  logoutModalOpen.value = false;
  logoutModalStep.value = "confirm";
}

function onLogoutModalPrimary() {
  if (logoutModalStep.value === "confirm") {
    // show success message first, then actually logout on next confirm
    logoutModalStep.value = "done";
    return;
  }
  // done step: logout and close modal (view will switch to LoginView)
  closeLogoutModal();
  store.logout();
}

async function toggleAlwaysOnTop() {
  await windowStore.toggleAlwaysOnTop();
}
async function toggleMiniMode() {
  await windowStore.toggleMiniMode();
}
</script>
