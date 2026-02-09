import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./styles.css";
import { initTheme } from "./theme";

// 검정 화면(마운트 실패) 디버깅을 위해 렌더러 단계 에러를 콘솔에 남깁니다.
// main.cjs에서 console-message를 메인 로그로도 전달합니다.
window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("[renderer][error]", e.error ?? e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("[renderer][unhandledrejection]", (e as PromiseRejectionEvent).reason);
});

initTheme("dark");
createApp(App).use(createPinia()).mount("#app");
