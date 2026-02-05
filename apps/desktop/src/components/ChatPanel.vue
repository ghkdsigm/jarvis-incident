<template>
  <div class="h-full flex flex-col min-h-0">
    <div class="p-3 border-b border-zinc-800">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate">{{ store.activeRoom?.title ?? "No room" }}</div>
          <div class="text-xs text-zinc-500 font-mono truncate">{{ store.activeRoomId }}</div>
        </div>
        <div v-if="store.activeRoomId" class="flex items-center gap-2 shrink-0">
          <button
            class="h-8 w-8 inline-flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
            title="이름 변경"
            aria-label="채팅방 이름 변경"
            @click="openRenameRoom"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8L17.3 5a2 2 0 0 0-2.8 0L4 15.5V20Z"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M13.5 6.5 17.5 10.5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            class="h-8 w-8 inline-flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-[#FB4F4F]"
            title="방 삭제"
            aria-label="채팅방 삭제"
            @click="openDeleteRoom"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 7h16"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M10 11v7M14 11v7"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M6 7l1 14h10l1-14"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M9 7V4h6v3"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="store.activeRoomId" class="p-3 border-b border-zinc-800 bg-zinc-950 space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs text-zinc-400">
          화면 공유:
          <span class="text-zinc-200">
            {{ store.screenShareRoomId === store.activeRoomId ? store.screenShareMode : "idle" }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700" @click="openInvite">
            + 동료추가
          </button>
          <button
            class="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700"
            :disabled="store.screenShareMode === 'sharing' && store.screenShareRoomId === store.activeRoomId"
            @click="startShare"
          >
            화면 공유 시작
          </button>
          <button class="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700" @click="stopShare">중지</button>
        </div>
      </div>

      <div
        v-if="store.screenShareRoomId === store.activeRoomId && (store.screenShareRemote || store.screenShareLocal)"
        class="grid grid-cols-2 gap-2"
      >
        <div class="space-y-1">
          <div class="text-[11px] text-zinc-500">상대 화면</div>
          <video
            ref="remoteVideo"
            class="w-full h-40 bg-black rounded border border-zinc-800 object-contain"
            autoplay
            playsinline
          />
        </div>
        <div class="space-y-1">
          <div class="text-[11px] text-zinc-500">내 화면(프리뷰)</div>
          <video
            ref="localVideo"
            class="w-full h-40 bg-black rounded border border-zinc-800 object-contain"
            autoplay
            muted
            playsinline
          />
        </div>
      </div>
    </div>

    <div ref="scroller" class="flex-1 overflow-auto p-3 space-y-2">
      <div v-for="m in store.activeMessages" :key="m.id" class="w-full">
        <div class="flex" :class="bubbleWrapClass(m)">
          <div class="max-w-[72%] min-w-0">
            <div class="text-[11px] text-zinc-500 flex items-center gap-2" :class="metaClass(m)">
              <span class="font-mono">{{ labelFor(m) }}</span>
              <span>{{ new Date(m.createdAt).toLocaleTimeString() }}</span>
              <span v-if="isDeleted(m)" class="text-zinc-600">삭제됨</span>
            </div>

            <div
              class="group mt-1 rounded-2xl border px-3 py-2 text-sm whitespace-pre-wrap break-words"
              :class="bubbleClass(m)"
            >
              <template v-if="editingId === m.id">
                <textarea
                  v-model="editingText"
                  class="w-full min-h-[72px] px-2 py-1 text-sm rounded bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-[#00AD50]"
                />
                <div class="mt-2 flex items-center justify-end gap-2">
                  <button class="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700" @click="cancelEdit">취소</button>
                  <button
                    class="px-2 py-1 text-xs rounded bg-[#00694D] hover:bg-[#005a42] text-white disabled:opacity-50"
                    :disabled="!editingText.trim().length"
                    @click="submitEdit(m)"
                  >
                    저장
                  </button>
                </div>
              </template>
              <template v-else>
                <div :class="isDeleted(m) ? 'italic text-zinc-400' : ''">
                  {{ isDeleted(m) ? "(삭제된 메시지)" : m.content }}
                </div>

                <div
                  v-if="canEditOrDelete(m)"
                  class="mt-2 hidden group-hover:flex items-center justify-end gap-2"
                >
                  <button class="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700" @click="startEdit(m)">수정</button>
                  <button class="px-2 py-1 text-xs rounded bg-[#FB4F4F] hover:bg-[#e54545] text-white" @click="confirmDelete(m)">
                    삭제
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-3 border-t border-zinc-800 bg-zinc-950">
      <div class="flex gap-2">
        <input
          v-model="text"
          class="flex-1 px-3 py-2 text-sm rounded bg-zinc-900 border border-zinc-800"
          placeholder="메시지 입력 (예: 자비스야 궁금하다 ...)"
          @keydown.enter="send"
        />
        <button class="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700" @click="send">전송</button>
      </div>
      <div class="mt-2 flex items-center gap-2 text-xs text-zinc-400">
        <button class="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700" @click="askJarvisQuick">자비스 질문</button>
        <span>트리거: 메시지가 '자비스야'로 시작하면 자동 호출</span>
      </div>
    </div>
  </div>

  <CommonModal :open="jarvisOpen" title="자비스에게 질문" @close="closeJarvis">
    <div class="space-y-2">
      <div class="text-xs text-zinc-400">질문</div>
      <textarea
        v-model="jarvisPrompt"
        class="w-full min-h-[120px] px-3 py-2 text-sm rounded bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-[#00AD50]"
        placeholder="예: 이 에러 로그 원인 분석해줘..."
      />
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700" @click="closeJarvis">취소</button>
        <button class="px-3 py-2 text-sm rounded bg-[#00694D] hover:bg-[#005a42] text-white" @click="submitJarvis">
          질문
        </button>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="inviteOpen" title="동료 초대" @close="closeInvite">
    <div class="space-y-3">
      <div class="space-y-1">
        <div class="text-xs text-zinc-400">검색</div>
        <input
          v-model="inviteQuery"
          class="w-full px-3 py-2 text-sm rounded bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-[#00AD50]"
          placeholder="이름/팀/태그로 검색"
        />
      </div>

      <div class="max-h-[360px] overflow-auto rounded border border-zinc-800 divide-y divide-zinc-800">
        <label
          v-for="c in filteredColleagues"
          :key="c.id"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-900"
        >
          <input v-model="selectedColleagueIds" class="accent-[#00AD50]" type="checkbox" :value="c.id" />

          <div class="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-200">
            {{ c.name.slice(0, 1) }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 min-w-0">
              <div class="text-xs text-zinc-400 truncate">{{ c.team }}</div>
              <div class="text-sm font-medium text-zinc-100 truncate">{{ c.name }}</div>
              <div class="text-xs text-zinc-500 shrink-0">{{ c.role }}</div>
            </div>
            <div class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="t in c.tags"
                :key="t"
                class="text-[11px] px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-300"
              >
                {{ t }}
              </span>
            </div>
          </div>
        </label>

        <div v-if="!filteredColleagues.length" class="p-3 text-xs text-zinc-500">검색 결과가 없습니다.</div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs text-zinc-500">선택: {{ selectedColleagueIds.length }}명</div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700" @click="closeInvite">취소</button>
          <button
            class="px-3 py-2 text-sm rounded bg-[#00694D] hover:bg-[#005a42] text-white disabled:opacity-50"
            :disabled="selectedColleagueIds.length === 0"
            @click="submitInvite"
          >
            초대하기
          </button>
        </div>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="deleteConfirmOpen" title="메시지 삭제" @close="closeDeleteConfirm">
    <div class="text-sm text-zinc-200">이 메시지를 삭제할까요?</div>
    <div class="mt-2 text-xs text-zinc-500">삭제 후에는 메시지가 “(삭제된 메시지)”로 표시됩니다.</div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700" @click="closeDeleteConfirm">취소</button>
        <button class="px-3 py-2 text-sm rounded bg-[#FB4F4F] hover:bg-[#e54545] text-white" @click="submitDeleteConfirm">
          삭제
        </button>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="renameRoomOpen" title="채팅방 이름 변경" @close="closeRenameRoom">
    <div class="space-y-2">
      <div class="text-xs text-zinc-400">새 이름</div>
      <input
        v-model="renameRoomTitle"
        class="w-full px-3 py-2 text-sm rounded bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-[#00AD50]"
        placeholder="예: Incident 대응"
        @keydown.enter="submitRenameRoom"
      />
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700" @click="closeRenameRoom">취소</button>
        <button
          class="px-3 py-2 text-sm rounded bg-[#00694D] hover:bg-[#005a42] text-white disabled:opacity-50"
          :disabled="!renameRoomTitle.trim().length"
          @click="submitRenameRoom"
        >
          저장
        </button>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="deleteRoomOpen" title="채팅방 삭제" @close="closeDeleteRoom">
    <div class="text-sm text-zinc-200">이 채팅방을 삭제할까요?</div>
    <div class="mt-2 text-xs text-zinc-500">삭제하면 방/메시지가 모두 제거됩니다. (Owner만 가능)</div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700" @click="closeDeleteRoom">취소</button>
        <button class="px-3 py-2 text-sm rounded bg-[#FB4F4F] hover:bg-[#e54545] text-white" @click="submitDeleteRoom">
          삭제
        </button>
      </div>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { isJarvisTrigger, stripJarvisPrefix } from "@jarvis/shared";
import CommonModal from "./ui/CommonModal.vue";

const store = useSessionStore();
const text = ref("");
const scroller = ref<HTMLDivElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);
const localVideo = ref<HTMLVideoElement | null>(null);

const DELETED_PLACEHOLDER = "(삭제된 메시지)";

const jarvisOpen = ref(false);
const jarvisPrompt = ref("");

type Colleague = { id: string; team: string; name: string; role: string; tags: string[] };
const inviteOpen = ref(false);
const inviteQuery = ref("");
const selectedColleagueIds = ref<string[]>([]);
const colleagues = ref<Colleague[]>([
  { id: "u-1", team: "플랫폼팀", name: "김동화", role: "FE", tags: ["incident", "ui", "triage"] },
  { id: "u-2", team: "플랫폼팀", name: "박지원", role: "BE", tags: ["api", "websocket"] },
  { id: "u-3", team: "SRE팀", name: "이서연", role: "SRE", tags: ["oncall", "k8s", "observability"] },
  { id: "u-4", team: "보안팀", name: "최민수", role: "Security", tags: ["auth", "audit"] },
  { id: "u-5", team: "CS팀", name: "정하늘", role: "CS", tags: ["support", "handoff"] }
]);

const filteredColleagues = computed(() => {
  const q = inviteQuery.value.trim().toLowerCase();
  if (!q) return colleagues.value;
  return colleagues.value.filter((c) => {
    const hay = [c.team, c.name, c.role, ...c.tags].join(" ").toLowerCase();
    return hay.includes(q);
  });
});

const editingId = ref<string>("");
const editingText = ref<string>("");
const deleteConfirmOpen = ref(false);
const deleteTarget = ref<any | null>(null);

const renameRoomOpen = ref(false);
const renameRoomTitle = ref("");
const deleteRoomOpen = ref(false);

function isMine(m: any) {
  return m?.senderType === "user" && m?.senderUserId && store.user?.id && m.senderUserId === store.user.id;
}
function isOtherUser(m: any) {
  return m?.senderType === "user" && !isMine(m);
}
function isBot(m: any) {
  return m?.senderType === "bot";
}
function isDeleted(m: any) {
  return String(m?.content ?? "") === DELETED_PLACEHOLDER;
}

function labelFor(m: any) {
  if (isBot(m)) return "ai";
  if (isMine(m)) return "me";
  if (isOtherUser(m)) return "other";
  return m?.senderType ?? "system";
}

function bubbleWrapClass(m: any) {
  if (isMine(m)) return "justify-end";
  if (isBot(m)) return "justify-start";
  if (isOtherUser(m)) return "justify-start";
  return "justify-center";
}
function metaClass(m: any) {
  if (isMine(m)) return "justify-end";
  if (isBot(m) || isOtherUser(m)) return "justify-start";
  return "justify-center";
}
function bubbleClass(m: any) {
  if (isMine(m)) return "bg-[#00694D] text-white border-[#00694D]";
  if (isBot(m)) return "bg-zinc-900 text-zinc-100 border-zinc-800";
  if (isOtherUser(m)) return "bg-zinc-800 text-zinc-100 border-zinc-700";
  return "bg-transparent text-zinc-400 border-transparent";
}

function canEditOrDelete(m: any) {
  if (!store.activeRoomId) return false;
  if (!isMine(m)) return false;
  if (isDeleted(m)) return false;
  // local optimistic message는 서버 id가 아니라서 제외
  if (typeof m?.id === "string" && m.id.startsWith("local:")) return false;
  return true;
}

function startEdit(m: any) {
  if (!canEditOrDelete(m)) return;
  editingId.value = m.id;
  editingText.value = m.content ?? "";
}
function cancelEdit() {
  editingId.value = "";
  editingText.value = "";
}
function submitEdit(m: any) {
  if (!store.activeRoomId) return;
  const v = editingText.value.trim();
  if (!v) return;
  store.editMessage(store.activeRoomId, m.id, v);
  cancelEdit();
}

function confirmDelete(m: any) {
  if (!canEditOrDelete(m)) return;
  deleteTarget.value = m;
  deleteConfirmOpen.value = true;
}
function closeDeleteConfirm() {
  deleteConfirmOpen.value = false;
  deleteTarget.value = null;
}
function submitDeleteConfirm() {
  if (!store.activeRoomId || !deleteTarget.value) return;
  store.deleteMessage(store.activeRoomId, deleteTarget.value.id);
  closeDeleteConfirm();
}

function openRenameRoom() {
  if (!store.activeRoomId) return;
  renameRoomTitle.value = store.activeRoom?.title ?? "";
  renameRoomOpen.value = true;
}
function closeRenameRoom() {
  renameRoomOpen.value = false;
}
function submitRenameRoom() {
  if (!store.activeRoomId) return;
  const t = renameRoomTitle.value.trim();
  if (!t) return;
  store.renameRoom(store.activeRoomId, t);
  renameRoomOpen.value = false;
}

function openDeleteRoom() {
  if (!store.activeRoomId) return;
  deleteRoomOpen.value = true;
}
function closeDeleteRoom() {
  deleteRoomOpen.value = false;
}
function submitDeleteRoom() {
  if (!store.activeRoomId) return;
  const rid = store.activeRoomId;
  store.deleteRoom(rid);
  deleteRoomOpen.value = false;
}

function scrollToBottom() {
  if (!scroller.value) return;
  scroller.value.scrollTop = scroller.value.scrollHeight;
}

async function send() {
  if (!store.activeRoomId || !text.value.trim()) return;
  const content = text.value.trim();
  store.sendMessage(store.activeRoomId, content);
  if (isJarvisTrigger(content)) {
    store.askJarvis(store.activeRoomId, stripJarvisPrefix(content));
  }
  text.value = "";
  await nextTick();
  scrollToBottom();
}

function askJarvisQuick() {
  if (!store.activeRoomId) return;
  jarvisPrompt.value = "";
  jarvisOpen.value = true;
}

function closeJarvis() {
  jarvisOpen.value = false;
}

function submitJarvis() {
  if (!store.activeRoomId) return;
  const p = jarvisPrompt.value.trim();
  if (!p) return;
  jarvisOpen.value = false;
  store.askJarvis(store.activeRoomId, p);
}

function openInvite() {
  inviteQuery.value = "";
  selectedColleagueIds.value = [];
  inviteOpen.value = true;
}

function closeInvite() {
  inviteOpen.value = false;
}

function submitInvite() {
  // 아직 시스템에 동료/초대 데이터가 없으니 UI만 우선.
  // 추후: store.inviteToRoom(store.activeRoomId, selectedColleagueIds.value)
  inviteOpen.value = false;
}

async function startShare() {
  if (!store.activeRoomId) return;
  try {
    await store.startScreenShare(store.activeRoomId);
  } catch (e: any) {
    alert(e?.message ?? "화면 공유를 시작할 수 없습니다.");
  }
}

function stopShare() {
  store.stopScreenShare(store.activeRoomId);
}

watch(
  () => store.activeMessages.length,
  async () => {
    await nextTick();
    scrollToBottom();
  }
);

watch(
  () => store.screenShareRemote,
  async (s) => {
    await nextTick();
    const show = store.screenShareRoomId === store.activeRoomId ? s : null;
    if (remoteVideo.value) (remoteVideo.value as any).srcObject = show ?? null;
  },
  { immediate: true }
);

watch(
  () => store.screenShareLocal,
  async (s) => {
    await nextTick();
    const show = store.screenShareRoomId === store.activeRoomId ? s : null;
    if (localVideo.value) (localVideo.value as any).srcObject = show ?? null;
  },
  { immediate: true }
);

watch(
  () => store.activeRoomId,
  async () => {
    await nextTick();
    const remote = store.screenShareRoomId === store.activeRoomId ? store.screenShareRemote : null;
    const local = store.screenShareRoomId === store.activeRoomId ? store.screenShareLocal : null;
    if (remoteVideo.value) (remoteVideo.value as any).srcObject = remote ?? null;
    if (localVideo.value) (localVideo.value as any).srcObject = local ?? null;
  }
);
</script>
