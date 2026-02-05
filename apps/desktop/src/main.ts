import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./styles.css";
import { initTheme } from "./theme";

initTheme("dark");
createApp(App).use(createPinia()).mount("#app");
