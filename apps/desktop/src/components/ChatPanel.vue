<template>
  <div class="h-full flex flex-col min-h-0">
    <div class="p-3 border-b border-zinc-800">
      <div class="text-sm font-semibold">{{ store.activeRoom?.title ?? "No room" }}</div>
      <div class="text-xs text-zinc-500">{{ store.activeRoomId }}</div>
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
      <div v-for="m in store.activeMessages" :key="m.id" class="max-w-full">
        <div class="text-xs text-zinc-500 flex items-center gap-2">
          <span class="font-mono">{{ m.senderType }}</span>
          <span>{{ new Date(m.createdAt).toLocaleTimeString() }}</span>
        </div>
        <pre class="whitespace-pre-wrap break-words text-sm bg-zinc-900 border border-zinc-800 rounded p-2">{{ m.content }}</pre>
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
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { isJarvisTrigger, stripJarvisPrefix } from "@jarvis/shared";

const store = useSessionStore();
const text = ref("");
const scroller = ref<HTMLDivElement | null>(null);
const remoteVideo = ref<HTMLVideoElement | null>(null);
const localVideo = ref<HTMLVideoElement | null>(null);

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
  const p = prompt("자비스에게 질문");
  if (!p) return;
  store.askJarvis(store.activeRoomId, p);
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
