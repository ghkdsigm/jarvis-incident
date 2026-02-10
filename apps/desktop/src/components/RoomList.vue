<template>
  <div class="h-full flex flex-col min-h-0">
    <div class="p-3 border-b t-border">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-xs t-text-muted">{{ store.user?.name }}</div>
          <div class="flex items-center gap-2 pr-8">
            <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="createRoom">
              방 만들기
            </button>
            <button
              type="button"
              class="h-7 w-7 inline-flex items-center justify-center rounded t-btn-secondary"
              title="새로고침"
              aria-label="새로고침"
              @click="store.reloadRooms"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0">
                <path
                  d="M21 12a9 9 0 0 0-15.5-6.5L3 8"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M3 3v5h5"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M3 12a9 9 0 0 0 15.5 6.5L21 16"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M21 21v-5h-5"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="relative">
          <input
            v-model="roomSearch"
            class="w-full px-3 py-2 text-sm rounded t-input"
            placeholder="메시지 내용으로 방 검색"
          />
          <button
            v-if="roomSearch.trim().length"
            class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded t-btn-secondary"
            @click="clearSearch"
            title="검색 초기화"
          >
            초기화
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto t-scrollbar" @scroll.passive="onRoomListScroll">
      <div v-if="!store.rooms.length" class="p-3 text-xs t-text-subtle">
        방이 없습니다. 우측 상단의 '방 만들기'로 생성하세요.
      </div>
      <div v-else-if="roomSearch.trim() && searching" class="p-3 text-xs t-text-subtle">검색 중...</div>
      <div v-else-if="roomSearch.trim() && !searching && filteredRooms.length === 0" class="p-3 text-xs t-text-subtle">
        검색 결과가 없습니다.
      </div>
      <button
        v-for="r in filteredRooms"
        :key="r.id"
        class="w-full text-left px-3 py-2 border-b t-border t-row"
        :class="store.activeRoomId === r.id ? 't-row-active' : ''"
        @click="store.openRoom(r.id)"
        @contextmenu.prevent="openRoomContextMenu($event, r)"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="text-sm font-medium truncate" :class="theme === 'dark' ? 'text-white' : 'text-black'">{{ r.title }}</div>
          <div class="shrink-0 relative" @mouseenter="openMemberPopover(r.id, $event)" @mouseleave="scheduleCloseMemberPopover">
            <div
              class="text-[11px] px-2 py-0.5 rounded-full border t-chip select-none"
              :title="`참여자 수: ${getMemberCount(r) ?? '0'}명 (호버 시 목록 보기)`"
            >
              {{ getMemberCount(r) ?? "0" }}
            </div>
          </div>
        </div>
        <div class="text-xs t-text-subtle">{{ r.type }} · {{ r.id.slice(0, 8) }}</div>
      </button>
    </div>
  </div>

  <!-- Members hover popover -->
  <div
    v-if="memberPop.open"
    class="fixed z-50 rounded-md border t-border t-surface shadow-lg overflow-hidden"
    :style="{ left: `${memberPop.x}px`, top: `${memberPop.y}px` }"
    @mouseenter="cancelCloseMemberPopover"
    @mouseleave="closeMemberPopover"
  >
    <div class="px-3 py-2 border-b t-border flex items-center justify-between gap-3">
      <div class="text-xs t-text-muted">참여자</div>
      <div class="text-xs t-text-subtle">{{ activeMemberCountLabel }}</div>
    </div>
    <div class="max-h-[280px] overflow-auto t-scrollbar">
      <div v-if="memberPop.loading" class="px-3 py-3 text-xs t-text-subtle">불러오는 중...</div>
      <div v-else-if="memberPop.members.length === 0" class="px-3 py-3 text-xs t-text-subtle">참여자 정보가 없습니다.</div>
      <div v-else class="py-1">
        <div v-for="m in memberPop.members" :key="m.id" class="px-3 py-2 flex items-center gap-2 t-row">
          <div class="h-7 w-7 rounded-full border t-border overflow-hidden bg-[#FBFBFB] shrink-0">
            <img
              v-if="m.avatarUrl"
              :src="m.avatarUrl"
              alt=""
              class="h-full w-full object-cover"
              referrerpolicy="no-referrer"
            />
            <div v-else class="h-full w-full flex items-center justify-center text-[11px] font-medium t-text-muted">
              {{ getInitials(m.name) }}
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 min-w-0">
              <div class="text-sm font-medium truncate">{{ m.name }}</div>
              <div
                v-if="m.isOnline"
                class="text-[10px] px-1.5 py-0.5 rounded-full border"
                style="border-color: #00CE7D; color: #00CE7D"
              >
                ONLINE
              </div>
            </div>
            <div class="text-xs t-text-subtle truncate">
              {{ m.department || m.email }}
            </div>
          </div>
          <div class="text-[10px] t-text-subtle shrink-0">{{ m.role }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Room context menu -->
  <div
    v-if="roomCtx.open"
    class="fixed inset-0 z-40"
    @mousedown="closeRoomContextMenu"
    @contextmenu.prevent="closeRoomContextMenu"
  />
  <div
    v-if="roomCtx.open"
    ref="roomCtxEl"
    class="fixed z-50 min-w-[220px] rounded-md border t-border t-surface shadow-lg overflow-hidden"
    :style="{ left: `${roomCtx.x}px`, top: `${roomCtx.y}px` }"
    @mousedown.stop
    @click.stop
    @contextmenu.prevent
  >
    <button class="w-full text-left px-3 py-2 text-sm t-row" type="button" @click="actionMoveRoomTop">
      채팅창 맨위로 올리기
    </button>
    <button class="w-full text-left px-3 py-2 text-sm t-row" type="button" @click="actionLeaveRoom">
      채팅방 나가기
    </button>
    <button
      class="w-full text-left px-3 py-2 text-sm t-row text-[#FB4F4F]"
      type="button"
      @click="actionDeleteRoom"
    >
      채팅방 삭제하기
    </button>
  </div>

  <CommonModal :open="createRoomOpen" title="채팅방 만들기" @close="closeCreateRoom">
    <div class="space-y-2">
      <div class="text-xs t-text-muted">방 이름</div>
      <input
        v-model="createRoomTitle"
        class="w-full px-3 py-2 text-sm rounded t-input"
        placeholder="예: Incident 대응"
        @keydown.enter="submitCreateRoom"
      />
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeCreateRoom">취소</button>
        <button class="px-3 py-2 text-sm rounded t-btn-primary" @click="submitCreateRoom">
          생성
        </button>
      </div>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { getActiveTheme, type ThemeMode } from "../theme";
import CommonModal from "./ui/CommonModal.vue";

const store = useSessionStore();

const theme = ref<ThemeMode>("dark");
let themeObserver: MutationObserver | null = null;

const createRoomOpen = ref(false);
const createRoomTitle = ref("");

const roomSearch = ref("");
const searching = ref(false);
const matchedRoomIds = ref<string[] | null>(null);
let searchSeq = 0;
let debounceTimer: number | null = null;

const roomCtxEl = ref<HTMLDivElement | null>(null);
const roomCtx = ref<{ open: boolean; x: number; y: number; room: any | null }>({
  open: false,
  x: 0,
  y: 0,
  room: null
});

const memberPop = ref<{
  open: boolean;
  roomId: string;
  x: number;
  y: number;
  members: any[];
  loading: boolean;
}>({
  open: false,
  roomId: "",
  x: 0,
  y: 0,
  members: [],
  loading: false
});
let memberCloseTimer: number | null = null;

function getMemberCount(r: any): number | null {
  const c = r?._count?.members ?? r?.membersCount ?? r?.memberCount ?? null;
  return typeof c === "number" ? c : null;
}

function getInitials(name: string): string {
  const s = String(name ?? "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? s[0];
  const b = parts.length > 1 ? parts[1]?.[0] : "";
  return (a + b).toUpperCase();
}

const activeMemberCountLabel = computed(() => {
  const n = memberPop.value.members.length;
  return `${n}명`;
});

const filteredRooms = computed(() => {
  if (!store.token) return [];
  const q = roomSearch.value.trim();
  if (!q) return store.rooms;
  if (!matchedRoomIds.value) return [];
  const set = new Set(matchedRoomIds.value);
  return store.rooms.filter((r) => set.has(r.id));
});

function cancelCloseMemberPopover() {
  if (memberCloseTimer) window.clearTimeout(memberCloseTimer);
  memberCloseTimer = null;
}

function scheduleCloseMemberPopover() {
  cancelCloseMemberPopover();
  memberCloseTimer = window.setTimeout(() => {
    closeMemberPopover();
  }, 120);
}

function closeMemberPopover() {
  cancelCloseMemberPopover();
  memberPop.value.open = false;
  memberPop.value.roomId = "";
  memberPop.value.members = [];
  memberPop.value.loading = false;
}

async function openMemberPopover(roomId: string, e: MouseEvent) {
  cancelCloseMemberPopover();
  const anchor = e.currentTarget as HTMLElement | null;
  if (!anchor) return;

  const rect = anchor.getBoundingClientRect();
  const width = 320;
  const pad = 8;
  const left = Math.max(pad, Math.min(rect.right - width, window.innerWidth - width - pad));
  const top = Math.max(pad, Math.min(rect.bottom + 6, window.innerHeight - 320 - pad));

  memberPop.value.open = true;
  memberPop.value.roomId = roomId;
  memberPop.value.x = left;
  memberPop.value.y = top;
  memberPop.value.loading = true;
  memberPop.value.members = [];

  try {
    const members = await store.ensureRoomMembers(roomId);
    // If user moved away quickly, ignore stale results
    if (!memberPop.value.open || memberPop.value.roomId !== roomId) return;
    memberPop.value.members = members ?? [];
  } catch {
    if (!memberPop.value.open || memberPop.value.roomId !== roomId) return;
    memberPop.value.members = [];
  } finally {
    if (memberPop.value.open && memberPop.value.roomId === roomId) memberPop.value.loading = false;
  }
}

function clearSearch() {
  roomSearch.value = "";
  matchedRoomIds.value = null;
  searching.value = false;
  searchSeq += 1; // cancel in-flight
}

async function runSearch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    matchedRoomIds.value = null;
    searching.value = false;
    return;
  }

  const currentSeq = ++searchSeq;
  searching.value = true;
  matchedRoomIds.value = [];

  const roomIds = store.rooms.map((r) => r.id);
  const matched: string[] = [];
  let idx = 0;
  const workers = Array.from({ length: Math.min(4, roomIds.length || 1) }, async () => {
    while (idx < roomIds.length) {
      const i = idx++;
      const rid = roomIds[i];
      if (currentSeq !== searchSeq) return;
      try {
        const msgs = await store.ensureRoomMessages(rid, 200);
        if (currentSeq !== searchSeq) return;
        const ok = msgs.some((m: any) => String(m?.content ?? "").toLowerCase().includes(q));
        if (ok) matched.push(rid);
      } catch {
        // ignore individual room failures
      }
    }
  });

  await Promise.all(workers);
  if (currentSeq !== searchSeq) return;
  matchedRoomIds.value = matched;
  searching.value = false;
}

watch(
  roomSearch,
  (v) => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      runSearch(v);
    }, 250);
  },
  { flush: "post" }
);

async function createRoom() {
  createRoomTitle.value = "";
  createRoomOpen.value = true;
}

function closeRoomContextMenu() {
  roomCtx.value.open = false;
  roomCtx.value.room = null;
}

function onRoomListScroll() {
  closeRoomContextMenu();
  closeMemberPopover();
}

async function openRoomContextMenu(e: MouseEvent, r: any) {
  roomCtx.value.open = true;
  roomCtx.value.room = r;
  roomCtx.value.x = e.clientX;
  roomCtx.value.y = e.clientY;

  await nextTick();
  const el = roomCtxEl.value;
  if (!el) return;

  const pad = 8;
  const rect = el.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - pad;
  const maxY = window.innerHeight - rect.height - pad;
  roomCtx.value.x = Math.max(pad, Math.min(roomCtx.value.x, maxX));
  roomCtx.value.y = Math.max(pad, Math.min(roomCtx.value.y, maxY));
}

function actionMoveRoomTop() {
  const r = roomCtx.value.room;
  if (!r?.id) return closeRoomContextMenu();
  store.moveRoomToTop(r.id);
  closeRoomContextMenu();
}

function actionDeleteRoom() {
  const r = roomCtx.value.room;
  if (!r?.id) return closeRoomContextMenu();
  const ok = window.confirm("이 채팅방을 삭제할까요?\n삭제하면 방/메시지가 모두 제거됩니다. (Owner만 가능)");
  if (!ok) return closeRoomContextMenu();
  store.deleteRoom(r.id);
  closeRoomContextMenu();
}

function actionLeaveRoom() {
  const r = roomCtx.value.room;
  if (!r?.id) return closeRoomContextMenu();
  const ok = window.confirm("이 채팅방에서 나갈까요?");
  if (!ok) return closeRoomContextMenu();
  store.leaveRoom(r.id);
  closeRoomContextMenu();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    closeRoomContextMenu();
    closeMemberPopover();
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  theme.value = getActiveTheme();
  themeObserver = new MutationObserver(() => {
    theme.value = getActiveTheme();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  themeObserver?.disconnect();
  themeObserver = null;
});

function closeCreateRoom() {
  createRoomOpen.value = false;
}

async function submitCreateRoom() {
  const title = createRoomTitle.value.trim();
  if (!title) return;
  createRoomOpen.value = false;
  await store.createRoomAndOpen(title);
}
</script>
