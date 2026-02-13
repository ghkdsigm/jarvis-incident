<template>
  <div class="relative w-screen h-screen overflow-hidden">
    <!-- Background video -->
    <video
      class="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      :src="bgVideo"
      autoplay
      loop
      muted
      playsinline
      preload="auto"
    />
    <!-- Scrim for readability -->
    <div class="absolute inset-0 bg-black/45" />

    <div class="relative z-10 w-full h-full flex items-center justify-center">
      <div class="w-full max-w-md p-6 rounded-xl border t-border t-topbar shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg t-btn-primary flex items-center justify-center text-white font-bold">DW</div>
            <div>
              <div class="text-lg font-semibold" :class="theme === 'dark' ? 'text-white' : 'text-black'">DW-BRAIN</div>
              <div class="text-xs t-text-muted">로그인 후 채팅방으로 이동합니다</div>
            </div>
          </div>

          <button
            class="h-8 w-8 inline-flex items-center justify-center rounded border transition-colors t-btn-secondary"
            :title="theme === 'dark' ? '라이트 모드' : '다크 모드'"
            aria-label="테마 전환"
            @click="onToggleTheme"
          >
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
        </div>

        <div class="mt-6 space-y-3">
          <div class="space-y-1">
            <div class="text-xs">이메일</div>
            <input
              v-model="email"
              class="w-full px-3 py-2 text-sm rounded t-input t-input-strong"
              placeholder="dev1@local"
              autocomplete="username"
            />
          </div>

          <div class="space-y-1">
            <div class="text-xs">이름</div>
            <input
              v-model="name"
              class="w-full px-3 py-2 text-sm rounded t-input t-input-strong"
              placeholder="Dev 1"
              autocomplete="name"
            />
          </div>

          <label class="flex items-center gap-2 text-sm select-none">
            <input v-model="autoLogin" type="checkbox" class="t-accent" />
            자동로그인
          </label>

          <div v-if="errorText" class="text-xs text-[#FB4F4F]">{{ errorText }}</div>

          <button
            class="w-full h-10 text-sm rounded t-btn-secondary disabled:opacity-60 inline-flex items-center justify-center gap-2"
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
            class="w-full h-10 text-sm rounded t-btn-primary disabled:opacity-60"
            :disabled="loading || !email.trim() || !name.trim()"
            @click="submit"
          >
            {{ loading ? "로그인 중..." : "로그인" }}
          </button>
        </div>

        <div class="mt-4 text-[11px] text-gray-400">
          현재는 개발 로그인(dev auth)만 연결되어 있어요.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useSessionStore } from "../stores/session";
import { getActiveTheme, toggleTheme, type ThemeMode } from "../theme";
import bgVideo from "../assets/video/global.mp4";

const store = useSessionStore();

const email = ref(store.savedEmail || "dev1@local");
const name = ref(store.savedName || "Dev 1");
const autoLogin = ref(store.autoLoginEnabled);

const loading = ref(false);
const errorText = ref("");
const theme = ref<ThemeMode>("dark");
theme.value = getActiveTheme();

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

function onToggleTheme() {
  themeStore.toggle();
}
</script>

