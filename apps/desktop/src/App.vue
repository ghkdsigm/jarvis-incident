<template>
  <div class="w-screen h-screen flex flex-col">
    <TopBar />
    <div class="flex-1 grid grid-cols-12 min-h-0">
      <aside class="col-span-4 border-r border-zinc-800 min-h-0">
        <RoomList />
      </aside>
      <main class="col-span-8 min-h-0">
        <ChatPanel />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import TopBar from "./components/TopBar.vue";
import RoomList from "./components/RoomList.vue";
import ChatPanel from "./components/ChatPanel.vue";
</script>
