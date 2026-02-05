<template>
  <div class="h-full flex flex-col min-h-0">
    <div class="p-3 border-b border-zinc-800">
      <div v-if="!store.token" class="space-y-2">
        <div class="text-sm text-zinc-300">개발 로그인</div>
        <input v-model="email" class="w-full px-3 py-2 text-sm rounded bg-zinc-900 border border-zinc-800" placeholder="email" />
        <input v-model="name" class="w-full px-3 py-2 text-sm rounded bg-zinc-900 border border-zinc-800" placeholder="name" />
        <button class="w-full px-3 py-2 text-sm rounded bg-emerald-600 hover:bg-emerald-500" @click="login">
          로그인
        </button>
      </div>

      <div v-else class="flex items-center justify-between">
        <div class="text-xs text-zinc-400">{{ store.user?.email }}</div>
        <div class="flex items-center gap-2">
          <button class="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700" @click="createRoom">
            방 만들기
          </button>
          <button class="px-2 py-1 text-xs rounded bg-zinc-800 hover:bg-zinc-700" @click="store.reloadRooms">
            새로고침
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <div v-if="store.token && !store.rooms.length" class="p-3 text-xs text-zinc-500">
        방이 없습니다. 우측 상단의 '방 만들기'로 생성하세요.
      </div>
      <button
        v-for="r in store.rooms"
        :key="r.id"
        class="w-full text-left px-3 py-2 border-b border-zinc-900 hover:bg-zinc-900"
        :class="store.activeRoomId === r.id ? 'bg-zinc-900/70' : ''"
        @click="store.openRoom(r.id)"
      >
        <div class="text-sm font-medium">{{ r.title }}</div>
        <div class="text-xs text-zinc-500">{{ r.type }} · {{ r.id.slice(0, 8) }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useSessionStore } from "../stores/session";

const store = useSessionStore();
const email = ref("dev1@local");
const name = ref("Dev 1");

async function login() {
  await store.login(email.value, name.value);
}

async function createRoom() {
  const title = prompt("방 이름");
  if (!title) return;
  await store.createRoomAndOpen(title);
}
</script>
