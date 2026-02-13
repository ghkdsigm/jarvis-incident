import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./styles.css";
import { useThemeStore } from "./stores/theme";

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
useThemeStore(pinia).init();
app.mount("#app");
