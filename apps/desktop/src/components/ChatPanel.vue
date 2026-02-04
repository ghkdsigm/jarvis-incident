<template>
  <div class="h-full flex flex-col min-h-0">
    <div class="p-3 border-b border-zinc-800">
      <div class="text-sm font-semibold">{{ store.activeRoom?.title ?? "No room" }}</div>
      <div class="text-xs text-zinc-500">{{ store.activeRoomId }}</div>
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

watch(
  () => store.activeMessages.length,
  async () => {
    await nextTick();
    scrollToBottom();
  }
);
</script>
