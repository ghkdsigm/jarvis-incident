<template>
  <div class="w-screen h-screen flex items-center justify-center bg-zinc-950">
    <div class="w-full max-w-md p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 shadow-2xl">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-[#00694D] flex items-center justify-center text-white font-bold">DW</div>
        <div>
          <div class="text-lg font-semibold text-zinc-100">DW-Brain</div>
          <div class="text-xs text-zinc-400">로그인 후 채팅방으로 이동합니다</div>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <div class="space-y-1">
          <div class="text-xs text-zinc-300">이메일</div>
          <input
            v-model="email"
            class="w-full px-3 py-2 text-sm rounded bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-[#00AD50]"
            placeholder="dev1@local"
            autocomplete="username"
          />
        </div>

        <div class="space-y-1">
          <div class="text-xs text-zinc-300">이름</div>
          <input
            v-model="name"
            class="w-full px-3 py-2 text-sm rounded bg-zinc-950 border border-zinc-800 focus:outline-none focus:border-[#00AD50]"
            placeholder="Dev 1"
            autocomplete="name"
          />
        </div>

        <label class="flex items-center gap-2 text-sm text-zinc-300 select-none">
          <input v-model="autoLogin" type="checkbox" class="accent-[#00AD50]" />
          자동로그인
        </label>

        <div v-if="errorText" class="text-xs text-[#FB4F4F]">{{ errorText }}</div>

        <button
          class="w-full h-10 text-sm rounded border border-zinc-700 bg-zinc-950 hover:bg-zinc-900 text-zinc-100 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          :disabled="loading"
          @click="ms360Login"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 3h9v9H3V3Z" fill="#F25022" />
            <path d="M12 3h9v9h-9V3Z" fill="#7FBA00" />
            <path d="M3 12h9v9H3v-9Z" fill="#00A4EF" />
            <path d="M12 12h9v9h-9v-9Z" fill="#FFB900" />
          </svg>
          MS360 로그인
        </button>

        <button
          class="w-full h-10 text-sm rounded bg-[#00694D] hover:bg-[#005a42] text-white disabled:opacity-60"
          :disabled="loading || !email.trim() || !name.trim()"
          @click="submit"
        >
          {{ loading ? "로그인 중..." : "로그인" }}
        </button>
      </div>

      <div class="mt-4 text-[11px] text-zinc-500">
        현재는 개발 로그인(dev auth)만 연결되어 있어요.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useSessionStore } from "../stores/session";

const store = useSessionStore();

const email = ref(store.savedEmail || "dev1@local");
const name = ref(store.savedName || "Dev 1");
const autoLogin = ref(store.autoLoginEnabled);

const loading = ref(false);
const errorText = ref("");

function ms360Login() {
  // TODO: MS360(OAuth/Entra ID) 인증 플로우 연결
  errorText.value = "MS360 로그인은 준비중입니다.";
}

async function submit() {
  if (loading.value) return;
  errorText.value = "";
  loading.value = true;
  try {
    await store.loginDev(email.value.trim(), name.value.trim(), autoLogin.value);
  } catch (e: any) {
    errorText.value = e?.message ?? "로그인에 실패했습니다.";
  } finally {
    loading.value = false;
  }
}
</script>

