<template>
  <div class="h-full flex flex-col min-h-0">
    <div class="p-3 border-b t-border">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate">{{ store.activeRoom?.title ?? "No room" }}</div>
          <div class="text-xs t-text-subtle font-mono truncate">{{ store.activeRoomId }}</div>
        </div>
        <div v-if="store.activeRoomId" class="flex items-center gap-2 shrink-0">
          <button
            class="h-8 w-8 inline-flex items-center justify-center rounded t-btn-secondary"
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
            class="h-8 w-8 inline-flex items-center justify-center rounded t-btn-secondary text-[#FB4F4F]"
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

    <div v-if="store.activeRoomId" class="p-3 border-b t-border t-surface space-y-2">
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs t-text-muted">
          화면 공유:
          <span class="t-text">
            {{ store.screenShareRoomId === store.activeRoomId ? store.screenShareMode : "idle" }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="openInvite">
            + 동료추가
          </button>
          <button
            class="px-2 py-1 text-xs rounded t-btn-secondary"
            :disabled="store.screenShareMode === 'sharing' && store.screenShareRoomId === store.activeRoomId"
            @click="startShare"
          >
            화면 공유 시작
          </button>
          <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="stopShare">중지</button>
        </div>
      </div>

      <div
        v-if="store.screenShareRoomId === store.activeRoomId && (store.screenShareRemote || store.screenShareLocal)"
        class="grid grid-cols-2 gap-2"
      >
        <div class="space-y-1">
          <div class="text-[11px] t-text-subtle">상대 화면</div>
          <video
            ref="remoteVideo"
            class="w-full h-40 bg-black rounded border t-border object-contain"
            autoplay
            playsinline
          />
        </div>
        <div class="space-y-1">
          <div class="text-[11px] t-text-subtle">내 화면(프리뷰)</div>
          <video
            ref="localVideo"
            class="w-full h-40 bg-black rounded border t-border object-contain"
            autoplay
            muted
            playsinline
          />
        </div>
      </div>
    </div>

    <div ref="scroller" class="flex-1 overflow-auto p-3 space-y-2 t-surface" :style="{ opacity: String(chatOpacity) }">
      <div v-for="m in store.activeMessages" :key="m.id" class="w-full">
        <div class="flex" :class="bubbleWrapClass(m)">
          <div class="max-w-[72%] min-w-0">
            <div class="text-[11px] t-text-subtle flex items-center gap-2" :class="metaClass(m)">
              <span class="font-mono">{{ labelFor(m) }}</span>
              <span>{{ new Date(m.createdAt).toLocaleTimeString() }}</span>
              <span v-if="isDeleted(m)" class="t-text-faint">삭제됨</span>
            </div>

            <div
              class="group mt-1 rounded-2xl border px-3 py-2 text-sm whitespace-pre-wrap break-words"
              :class="bubbleClass(m)"
            >
              <template v-if="editingId === m.id">
                <textarea
                  v-model="editingText"
                  class="w-full min-h-[72px] px-2 py-1 text-sm rounded t-input t-input-strong"
                />
                <div class="mt-2 flex items-center justify-end gap-2">
                  <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="cancelEdit">취소</button>
                  <button
                    class="px-2 py-1 text-xs rounded t-btn-primary disabled:opacity-50"
                    :disabled="!editingText.trim().length"
                    @click="submitEdit(m)"
                  >
                    저장
                  </button>
                </div>
              </template>
              <template v-else>
                <div :class="isDeleted(m) ? 'italic t-text-muted' : ''">
                  {{ isDeleted(m) ? "(삭제된 메시지)" : m.content }}
                </div>

                <div
                  v-if="canEditOrDelete(m)"
                  class="mt-2 hidden group-hover:flex items-center justify-end gap-2"
                >
                  <button class="px-2 py-1 text-xs rounded t-btn-secondary" @click="startEdit(m)">수정</button>
                  <button class="px-2 py-1 text-xs rounded t-btn-danger" @click="confirmDelete(m)">
                    삭제
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-3 border-t t-border t-surface">
      <div class="mb-2 flex items-center gap-3">
        <button
          class="px-3 py-2 text-sm rounded t-btn-secondary inline-flex items-center gap-2"
          :class="isListening ? 't-btn-primary' : ''"
          type="button"
          title="경청하기 (마이크)"
          @click="toggleListening"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0">
            <path
              d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M19 11a7 7 0 0 1-14 0"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12 18v3"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M8 21h8"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="whitespace-nowrap">{{ isListening ? "경청 중" : "경청하기" }}</span>
          <span v-if="isListening" class="inline-flex items-end gap-0.5 h-4 ml-1">
            <span
              v-for="i in 5"
              :key="i"
              class="w-1 rounded-sm"
              :style="{
                height: micBarHeight(i),
                background: 'currentColor',
                opacity: 0.9
              }"
            />
          </span>
        </button>

        <div class="flex items-center gap-3 ml-auto w-[46%] max-w-[560px] min-w-[320px]">
          <div class="text-xs t-text-subtle shrink-0">Opacity</div>
          <input
            v-model.number="chatOpacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="flex-1 chat-opacity-range"
            aria-label="채팅 투명도 조절"
          />
          <div class="text-xs t-text-muted w-10 text-right tabular-nums">{{ Math.round(chatOpacity * 100) }}%</div>
          <button
            class="px-2 py-1 text-xs rounded t-btn-secondary"
            title="투명도 초기화"
            @click="resetOpacity"
          >
            Reset
          </button>
        </div>
      </div>
      <div class="flex gap-2">
        <input
          v-model="text"
          class="flex-1 px-3 py-2 text-sm rounded t-input"
          placeholder="메시지 입력 (예: 자비스야 궁금하다 ...)"
          @keydown.enter="send"
        />
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="send">전송</button>
        <button
          class="px-3 py-2 text-sm rounded t-btn-primary inline-flex items-center gap-1.5"
          title="AI에게 질문하기"
          @click="askJarvisQuick"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="shrink-0">
            <circle cx="12" cy="3" r="1" fill="currentColor" />
            <path
              d="M12 4v2"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <rect
              x="6"
              y="6"
              width="12"
              height="12"
              rx="3"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M10 12h.01" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" />
            <path d="M14 12h.01" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" />
            <path
              d="M9 15h6"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="sr-only">AI 질문</span>
        </button>
      </div>
      <div class="mt-2 flex items-center gap-2 text-xs t-text-muted">
        <span>트리거: 메시지가 '자비스야'로 시작하면 자동 호출</span>
      </div>
    </div>
  </div>

  <CommonModal :open="jarvisOpen" title="자비스에게 질문" @close="closeJarvis">
    <div class="space-y-3">
      <div class="text-xs t-text-muted">질문</div>
      <textarea
        v-model="jarvisPrompt"
        ref="jarvisTextarea"
        class="w-full min-h-[120px] px-3 py-2 text-sm rounded t-input"
        placeholder="예: 이 에러 로그 원인 분석해줘..."
      />

      <div class="space-y-1">
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs t-text-muted">자주 묻는 질문</div>
          <div class="text-[11px] t-text-subtle">좌우로 드래그</div>
        </div>
        <div class="flex items-center gap-2 overflow-x-auto flex-nowrap py-1 -mx-1 px-1 cursor-grab active:cursor-grabbing">
          <button
            v-for="s in jarvisSuggestions"
            :key="s.key"
            type="button"
            class="text-[11px] px-3 py-1 rounded-full border t-chip whitespace-nowrap"
            @click="applyJarvisSuggestion(s.prompt)"
          >
            #{{ s.label }}
          </button>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeJarvis">취소</button>
        <button class="px-3 py-2 text-sm rounded t-btn-primary" @click="submitJarvis">
          질문
        </button>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="inviteOpen" title="동료 초대" @close="closeInvite">
    <div class="space-y-3">
      <div class="space-y-1">
        <div class="text-xs t-text-muted">검색</div>
        <input
          v-model="inviteQuery"
          class="w-full px-3 py-2 text-sm rounded t-input"
          placeholder="이름/팀/태그로 검색"
        />
      </div>

      <div class="max-h-[360px] overflow-auto rounded border t-border">
        <label
          v-for="c in filteredColleagues"
          :key="c.id"
          class="flex items-center gap-3 px-3 py-2 cursor-pointer border-b t-border last:border-b-0 t-row"
        >
          <input v-model="selectedColleagueIds" class="t-accent" type="checkbox" :value="c.id" />

          <div class="w-10 h-10 rounded-full t-avatar flex items-center justify-center text-xs">
            {{ c.name.slice(0, 1) }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 min-w-0">
              <div class="text-xs t-text-muted truncate">{{ c.team }}</div>
              <div class="text-sm font-medium truncate">{{ c.name }}</div>
              <div class="text-xs t-text-subtle shrink-0">{{ c.role }}</div>
            </div>
            <div class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="t in c.tags"
                :key="t"
                class="text-[11px] px-2 py-0.5 rounded-full border t-chip"
              >
                {{ t }}
              </span>
            </div>
          </div>
        </label>

        <div v-if="!filteredColleagues.length" class="p-3 text-xs t-text-subtle">검색 결과가 없습니다.</div>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs t-text-subtle">선택: {{ selectedColleagueIds.length }}명</div>
        <div class="flex items-center gap-2">
          <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeInvite">취소</button>
          <button
            class="px-3 py-2 text-sm rounded t-btn-primary disabled:opacity-50"
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
    <div class="text-sm">이 메시지를 삭제할까요?</div>
    <div class="mt-2 text-xs t-text-subtle">삭제 후에는 메시지가 “(삭제된 메시지)”로 표시됩니다.</div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeDeleteConfirm">취소</button>
        <button class="px-3 py-2 text-sm rounded t-btn-danger" @click="submitDeleteConfirm">
          삭제
        </button>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="renameRoomOpen" title="채팅방 이름 변경" @close="closeRenameRoom">
    <div class="space-y-2">
      <div class="text-xs t-text-muted">새 이름</div>
      <input
        v-model="renameRoomTitle"
        class="w-full px-3 py-2 text-sm rounded t-input"
        placeholder="예: Incident 대응"
        @keydown.enter="submitRenameRoom"
      />
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeRenameRoom">취소</button>
        <button
          class="px-3 py-2 text-sm rounded t-btn-primary disabled:opacity-50"
          :disabled="!renameRoomTitle.trim().length"
          @click="submitRenameRoom"
        >
          저장
        </button>
      </div>
    </template>
  </CommonModal>

  <CommonModal :open="deleteRoomOpen" title="채팅방 삭제" @close="closeDeleteRoom">
    <div class="text-sm">이 채팅방을 삭제할까요?</div>
    <div class="mt-2 text-xs t-text-subtle">삭제하면 방/메시지가 모두 제거됩니다. (Owner만 가능)</div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeDeleteRoom">취소</button>
        <button class="px-3 py-2 text-sm rounded t-btn-danger" @click="submitDeleteRoom">
          삭제
        </button>
      </div>
    </template>
  </CommonModal>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { isJarvisTrigger, stripJarvisPrefix } from "@jarvis/shared";
import CommonModal from "./ui/CommonModal.vue";

const store = useSessionStore();
const text = ref("");
const scroller = ref<HTMLDivElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);
const localVideo = ref<HTMLVideoElement | null>(null);

const DELETED_PLACEHOLDER = "(삭제된 메시지)";
const LS_CHAT_OPACITY = "jarvis.desktop.chatOpacity";

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

const chatOpacity = ref<number>(1);
try {
  const raw = localStorage.getItem(LS_CHAT_OPACITY);
  if (raw != null) chatOpacity.value = clamp01(Number(raw));
} catch {
  // ignore
}

watch(
  chatOpacity,
  (v) => {
    const next = clamp01(v);
    if (next !== v) chatOpacity.value = next;
    try {
      localStorage.setItem(LS_CHAT_OPACITY, String(next));
    } catch {
      // ignore
    }
  },
  { flush: "post" }
);

function resetOpacity() {
  chatOpacity.value = 1;
}

const jarvisOpen = ref(false);
const jarvisPrompt = ref("");
const jarvisTextarea = ref<HTMLTextAreaElement | null>(null);

const jarvisSuggestions = [
  { key: "brief_summary", label: "전체 요약", prompt: "전체 내용을 간단하게 요약해줘" },
  { key: "recent_summary", label: "최근 대화 요약", prompt: "최근 대화 내용을 요약해줘" },
  { key: "teams_alarm_10m", label: "10분 뒤 알람", prompt: "10분 뒤에 팀즈로 알람 줘" },
  { key: "rm_links", label: "RM 링크", prompt: "관련 RM 링크 찾아줘" },
  { key: "best_internal_reco", label: "사내 인력 추천", prompt: "대화 맥락으로 봤을때 가장 최적의 사내 인력 추천좀 해줄래?" },
  { key: "latest_news", label: "최신 뉴스", prompt: "관련 최신 내용 뉴스를 찾아줘" }
] as const;

async function applyJarvisSuggestion(prompt: string) {
  jarvisPrompt.value = prompt;
  await nextTick();
  jarvisTextarea.value?.focus();
}

function openJarvisWithPrompt(prompt: string) {
  if (!store.activeRoomId) return;
  jarvisPrompt.value = prompt;
  jarvisOpen.value = true;
}

// ---- Listening (Mic + Speech-to-text) ----
const isListening = ref(false);
const micLevel = ref(0); // 0..1
const micPhase = ref(0);

let micStream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let rafId: number | null = null;

let recognition: any | null = null;
const listeningTextFinal = ref("");
const listeningTextInterim = ref("");

function micBarHeight(i: number) {
  const v = Math.max(0, Math.min(1, micLevel.value));
  const wave = Math.sin(micPhase.value + i * 1.15) * 0.5 + 0.5; // 0..1
  const px = 4 + v * (10 + 6 * wave);
  return `${Math.round(px)}px`;
}

function stopMicMeter() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  micLevel.value = 0;
}

async function startMicMeter(stream: MediaStream) {
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;

  const src = audioCtx.createMediaStreamSource(stream);
  src.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  const tick = () => {
    if (!analyser) return;
    analyser.getByteTimeDomainData(data);

    // RMS 계산으로 "주파수처럼" 움직이는 레벨
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const x = (data[i] - 128) / 128;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / data.length);
    micLevel.value = Math.max(0, Math.min(1, rms * 3.5));
    micPhase.value += 0.22;
    rafId = requestAnimationFrame(tick);
  };
  tick();
}

function startSpeechRecognition() {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return;

  recognition = new Ctor();
  recognition.lang = "ko-KR";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const t = (r?.[0]?.transcript ?? "").trim();
      if (!t) continue;
      if (r.isFinal) listeningTextFinal.value += (listeningTextFinal.value ? " " : "") + t;
      else interim += (interim ? " " : "") + t;
    }
    listeningTextInterim.value = interim.trim();
  };

  recognition.onerror = () => {
    // 권한/환경에 따라 실패할 수 있음. 마이크 레벨 표시는 계속 유지.
  };

  try {
    recognition.start();
  } catch {
    // start()가 중복 호출되면 예외가 날 수 있음
  }
}

function stopSpeechRecognition() {
  if (!recognition) return;
  try {
    recognition.stop();
  } catch {
    // ignore
  }
  recognition = null;
}

function getListeningText() {
  const v = [listeningTextFinal.value.trim(), listeningTextInterim.value.trim()].filter(Boolean).join(" ").trim();
  return v;
}

async function startListening() {
  if (isListening.value) return;
  listeningTextFinal.value = "";
  listeningTextInterim.value = "";

  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  await startMicMeter(micStream);
  startSpeechRecognition();
  isListening.value = true;
}

async function stopListeningAndOpenJarvis() {
  if (!isListening.value) return;
  isListening.value = false;

  stopSpeechRecognition();
  stopMicMeter();

  try {
    micStream?.getTracks().forEach((t) => t.stop());
  } catch {
    // ignore
  }
  micStream = null;

  try {
    await audioCtx?.close();
  } catch {
    // ignore
  }
  audioCtx = null;
  analyser = null;

  openJarvisWithPrompt(getListeningText());
  await nextTick();
  jarvisTextarea.value?.focus();
}

async function toggleListening() {
  try {
    if (isListening.value) await stopListeningAndOpenJarvis();
    else await startListening();
  } catch (e: any) {
    // 권한 거부 등
    isListening.value = false;
    stopSpeechRecognition();
    stopMicMeter();
    try {
      micStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    micStream = null;
    alert(e?.message ?? "마이크를 사용할 수 없습니다.");
  }
}

onBeforeUnmount(() => {
  // 뷰 전환 시 마이크가 남지 않도록 정리
  if (isListening.value) {
    // fire and forget
    stopListeningAndOpenJarvis();
  } else {
    stopSpeechRecognition();
    stopMicMeter();
    try {
      micStream?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    micStream = null;
    audioCtx?.close().catch(() => undefined);
    audioCtx = null;
    analyser = null;
  }
});

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
  if (isMine(m)) return "t-bubble-me";
  if (isBot(m)) return "t-bubble-bot";
  if (isOtherUser(m)) return "t-bubble-other";
  return "t-bubble-system";
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
  openJarvisWithPrompt("");
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

<style scoped>
.chat-opacity-range {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 9999px;
  background: var(--range-track);
  outline: none;
  cursor: pointer;
}

.chat-opacity-range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 9999px;
  background: var(--range-track);
}

.chat-opacity-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  margin-top: -4px; /* center thumb on 4px track */
  border-radius: 9999px;
  background: var(--range-thumb);
  border: 2px solid var(--range-thumb-border);
}

.chat-opacity-range::-moz-range-track {
  height: 4px;
  border-radius: 9999px;
  background: var(--range-track);
}

.chat-opacity-range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: var(--range-thumb);
  border: 2px solid var(--range-thumb-border);
}
</style>
