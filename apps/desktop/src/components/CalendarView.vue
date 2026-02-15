<template>
  <div class="h-full flex flex-col min-h-0" :class="theme === 'dark' ? 'bg-zinc-900' : 'bg-gray-100'">
    <!-- 상단: 캘린더 일정 등록 버튼만 노출 (화면공유/동료추가/회의 불러오기 영역 대체) -->
    <div class="border-b t-border flex items-center justify-between gap-2 px-3 py-2 shrink-0" :class="theme === 'dark' ? 'bg-zinc-800' : 'bg-white'">
      <div class="text-sm font-semibold" :class="theme === 'dark' ? 'text-white' : 'text-black'">캘린더</div>
      <button
        type="button"
        class="px-3 py-2 text-sm rounded t-btn-primary inline-flex items-center gap-2"
        @click="openAddEventModal"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        캘린더 일정 등록
      </button>
    </div>

    <!-- TimeTree 스타일 월간 캘린더 -->
    <div class="flex-1 min-h-0 overflow-auto p-4">
      <div class="max-w-4xl mx-auto">
        <!-- 월 네비게이션 -->
        <div class="flex items-center justify-between mb-4">
          <button
            type="button"
            class="h-9 w-9 inline-flex items-center justify-center rounded t-btn-secondary"
            aria-label="이전 달"
            @click="prevMonth"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <div class="relative" ref="yearMonthDropdownRef">
            <button
              type="button"
              class="px-3 py-2 rounded inline-flex items-center gap-1.5 text-lg font-bold tabular-nums min-w-[140px] justify-center transition-colors"
              :class="theme === 'dark' ? 'text-white hover:bg-zinc-700' : 'text-[#262626] hover:bg-gray-200'"
              aria-haspopup="listbox"
              :aria-expanded="yearMonthDropdownOpen"
              @click.stop="yearMonthDropdownOpen = !yearMonthDropdownOpen"
            >
              {{ displayYear }}년 {{ displayMonth + 1 }}월
              <svg
                class="w-5 h-5 shrink-0 transition-transform"
                :class="yearMonthDropdownOpen ? 'rotate-180' : ''"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <div
              v-show="yearMonthDropdownOpen"
              class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 rounded-lg border t-border shadow-lg py-3 px-4 min-w-[200px]"
              :class="theme === 'dark' ? 'bg-zinc-800' : 'bg-white'"
              role="listbox"
            >
              <div class="flex gap-3 items-end">
                <div class="flex-1">
                  <label class="block text-xs font-medium mb-1" :class="theme === 'dark' ? 'text-gray-400' : 'text-gray-500'"></label>
                  <select
                    v-model.number="pickerYear"
                    class="w-full h-9 px-2 rounded border t-border t-input text-sm"
                    @change="applyYearMonth"
                  >
                    <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
                  </select>
                </div>
                <div class="flex-1">
                  <label class="block text-xs font-medium mb-1" :class="theme === 'dark' ? 'text-gray-400' : 'text-gray-500'"></label>
                  <select
                    v-model.number="pickerMonth"
                    class="w-full h-9 px-2 rounded border t-border t-input text-sm"
                    @change="applyYearMonth"
                  >
                    <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                class="w-full mt-3 py-2 text-sm rounded t-btn-primary"
                @click="applyYearMonthAndClose"
              >
                적용
              </button>
            </div>
          </div>

          <button
            type="button"
            class="h-9 w-9 inline-flex items-center justify-center rounded t-btn-secondary"
            aria-label="다음 달"
            @click="nextMonth"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <!-- 요일 헤더 (일~토) -->
        <div class="grid grid-cols-7 gap-px mb-1">
          <div
            v-for="d in weekDays"
            :key="d"
            class="py-2 text-center text-xs font-semibold rounded"
            :class="theme === 'dark' ? 'text-gray-400' : 'text-gray-600'"
          >
            {{ d }}
          </div>
        </div>

        <!-- 날짜 그리드 -->
        <div class="grid grid-cols-7 gap-px rounded-lg border t-border overflow-hidden" :class="theme === 'dark' ? 'bg-zinc-800' : 'bg-white'">
          <div
            v-for="cell in calendarCells"
            :key="cell.key"
            class="min-h-[100px] flex flex-col p-1.5 rounded-sm transition-colors"
            :class="[
              cell.isCurrentMonth
                ? (theme === 'dark' ? 'bg-zinc-900 hover:bg-zinc-800' : 'bg-white hover:bg-gray-50')
                : (theme === 'dark' ? 'bg-zinc-800/50 text-gray-500' : 'bg-gray-100 text-gray-400'),
              cell.isToday ? 'ring-1 ring-[#00AD50] ring-inset' : ''
            ]"
            @dblclick="openAddEventModalForDate(cell.dateKey)"
          >
            <div
              class="text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full"
              :class="
                cell.isToday
                  ? 'bg-[#00AD50] text-white'
                  : cell.holiday
                    ? 'text-red-500 font-semibold'
                    : cell.isCurrentMonth
                      ? (theme === 'dark' ? 'text-white' : 'text-[#262626]')
                      : ''
              "
              :title="cell.holiday ? cell.holiday.name : ''"
            >
              {{ cell.day }}
            </div>
            <div class="flex-1 space-y-0.5 overflow-hidden">
              <!-- 공휴일 표시 -->
              <div
                v-if="cell.holiday && cell.isCurrentMonth"
                class="w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate block bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium"
                :title="cell.holiday.name"
              >
                {{ cell.holiday.name }}
              </div>
              <!-- 일정 표시 -->
              <button
                v-for="evt in cell.events"
                :key="evt.id"
                type="button"
                class="w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate block border-l-2"
                :style="{ borderLeftColor: evt.color, background: evt.color + '20', color: evt.color }"
                :title="evt.title"
                @click.stop="openDetail(evt)"
              >
                {{ evt.title }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 일정 등록/수정 모달 -->
    <CommonModal
      :open="eventModalOpen"
      :title="editingEvent ? '일정 수정' : '일정 등록'"
      :closeOnBackdrop="true"
      panel-class="max-w-md"
      @close="closeEventModal"
    >
      <form class="space-y-4" @submit.prevent="submitEvent">
        <div>
          <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-gray-300' : 'text-[#262626]'">제목</label>
          <input
            v-model="form.title"
            type="text"
            class="w-full h-10 px-3 rounded border t-border t-input"
            placeholder="일정 제목"
            required
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-gray-300' : 'text-[#262626]'">시작일</label>
            <input
              v-model="form.start"
              type="date"
              class="w-full h-10 px-3 rounded border t-border t-input"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" :class="theme === 'dark' ? 'text-gray-300' : 'text-[#262626]'">종료일</label>
            <input
              v-model="form.end"
              type="date"
              class="w-full h-10 px-3 rounded border t-border t-input"
              required
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-2" :class="theme === 'dark' ? 'text-gray-300' : 'text-[#262626]'">색상</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="c in calendarStore.defaultColors"
              :key="c"
              type="button"
              class="w-8 h-8 rounded-full transition-all relative"
              :class="form.color === c ? 'border-2 border-[#262626] dark:border-white scale-110 ring-2 ring-offset-2 ring-[#262626] dark:ring-white' : 'border-0'"
              :style="{ backgroundColor: c }"
              :aria-label="'색상 ' + c"
              @click="form.color = c"
            >
              <svg
                v-if="form.color === c"
                class="w-4 h-4 absolute inset-0 m-auto"
                :class="theme === 'dark' ? 'text-white' : 'text-[#262626]'"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button type="button" class="px-3 py-2 text-sm rounded t-btn-secondary" @click="closeEventModal">
            취소
          </button>
          <button
            type="button"
            class="px-3 py-2 text-sm rounded t-btn-primary"
            @click="submitEvent"
          >
            {{ editingEvent ? '수정' : '등록' }}
          </button>
        </div>
      </template>
    </CommonModal>

    <!-- 일정 상세(삭제) 모달 -->
    <CommonModal
      :open="detailModalOpen"
      title="일정"
      :closeOnBackdrop="true"
      panel-class="max-w-sm"
      @close="detailModalOpen = false"
    >
      <template v-if="selectedEvent">
        <div class="space-y-2">
          <div class="text-sm font-medium" :class="theme === 'dark' ? 'text-white' : 'text-[#262626]'">{{ selectedEvent.title }}</div>
          <div class="text-xs t-text-muted">
            {{ formatDateRange(selectedEvent.start, selectedEvent.end) }}
          </div>
          <div class="flex gap-2 mt-3">
            <div class="w-4 h-4 rounded-full shrink-0" :style="{ backgroundColor: selectedEvent.color }" />
            <span class="text-xs t-text-muted">색상</span>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            type="button"
            class="px-3 py-2 text-sm rounded text-[#FB4F4F] border border-[#FB4F4F] hover:bg-[#FB4F4F]/10"
            @click="deleteSelectedEvent"
          >
            삭제
          </button>
          <button
            type="button"
            class="px-3 py-2 text-sm rounded t-btn-primary"
            @click="openEditEventModal"
          >
            수정
          </button>
          <button type="button" class="px-3 py-2 text-sm rounded t-btn-secondary" @click="detailModalOpen = false">
            닫기
          </button>
        </div>
      </template>
    </CommonModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useThemeStore } from "../stores/theme";
import { useCalendarStore, type CalendarEvent } from "../stores/calendar";
import { useSessionStore } from "../stores/session";
import CommonModal from "./ui/CommonModal.vue";
import { fetchHolidays, type HolidayInfo } from "../api/http";

const themeStore = useThemeStore();
const theme = computed(() => themeStore.theme);
const calendarStore = useCalendarStore();
const sessionStore = useSessionStore();

const currentDate = ref(new Date());
const displayYear = computed(() => currentDate.value.getFullYear());
const displayMonth = computed(() => currentDate.value.getMonth()); // 0-based

const yearMonthDropdownRef = ref<HTMLElement | null>(null);
const yearMonthDropdownOpen = ref(false);
const pickerYear = ref(displayYear.value);
const pickerMonth = ref(displayMonth.value + 1); // 1-12 for UI
const thisYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 21 }, (_, i) => thisYear - 10 + i);

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

// 공휴일 데이터
const holidays = ref<HolidayInfo[]>([]);
const holidaysByDate = computed(() => {
  const map: Record<string, HolidayInfo> = {};
  holidays.value.forEach((h) => {
    map[h.date] = h;
  });
  return map;
});

// 공휴일 데이터 로드
async function loadHolidays(year: number, month: number) {
  if (!sessionStore.token) {
    holidays.value = [];
    return;
  }
  try {
    const data = await fetchHolidays(sessionStore.token, year, month + 1); // month는 0-based이므로 +1
    holidays.value = data; // 서버에서 이미 필터링됨
  } catch (error) {
    console.error("Failed to load holidays:", error);
    holidays.value = [];
  }
}

function syncPickerFromCurrent() {
  pickerYear.value = displayYear.value;
  pickerMonth.value = displayMonth.value + 1;
}

function applyYearMonth() {
  currentDate.value = new Date(pickerYear.value, pickerMonth.value - 1);
}

function applyYearMonthAndClose() {
  applyYearMonth();
  yearMonthDropdownOpen.value = false;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const calendarCells = computed(() => {
  const year = displayYear.value;
  const month = displayMonth.value;
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay();
  const daysInMonth = last.getDate();

  const cells: { key: string; day: number; dateKey: string; isCurrentMonth: boolean; isToday: boolean; events: CalendarEvent[]; holiday: HolidayInfo | null }[] = [];
  const eventsByDate = calendarStore.eventsByDate;

  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  const startOffset = startDow;
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevLast = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = 0; i < totalCells; i++) {
    let day: number;
    let dateKey: string;
    let isCurrentMonth: boolean;
    if (i < startOffset) {
      day = prevLast - startOffset + i + 1;
      dateKey = toDateKey(new Date(prevYear, prevMonth, day));
      isCurrentMonth = false;
    } else if (i < startOffset + daysInMonth) {
      day = i - startOffset + 1;
      dateKey = toDateKey(new Date(year, month, day));
      isCurrentMonth = true;
    } else {
      day = i - startOffset - daysInMonth + 1;
      dateKey = toDateKey(new Date(year, month + 1, day));
      isCurrentMonth = false;
    }
    const todayKey = toDateKey(new Date());
    const holiday = holidaysByDate.value[dateKey] || null;
    cells.push({
      key: dateKey,
      day,
      dateKey,
      isCurrentMonth,
      isToday: dateKey === todayKey,
      events: eventsByDate[dateKey] ?? [],
      holiday
    });
  }
  return cells;
});

watch(yearMonthDropdownOpen, (open) => {
  if (open) syncPickerFromCurrent();
});

// 월이 변경될 때마다 공휴일 로드
watch([displayYear, displayMonth], ([year, month]) => {
  loadHolidays(year, month);
}, { immediate: true });

function onDocClick(e: MouseEvent) {
  const el = yearMonthDropdownRef.value;
  if (el && !el.contains(e.target as Node)) yearMonthDropdownOpen.value = false;
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
  calendarStore.loadEvents();
});
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
});

function prevMonth() {
  currentDate.value = new Date(displayYear.value, displayMonth.value - 1);
}
function nextMonth() {
  currentDate.value = new Date(displayYear.value, displayMonth.value + 1);
}

const eventModalOpen = ref(false);
const detailModalOpen = ref(false);
const editingEvent = ref<CalendarEvent | null>(null);
const selectedEvent = ref<CalendarEvent | null>(null);

const form = ref({
  title: "",
  start: "",
  end: "",
  color: "#00694D"
});

function openAddEventModal() {
  editingEvent.value = null;
  const today = toDateKey(new Date());
  form.value = {
    title: "",
    start: today,
    end: today,
    color: calendarStore.defaultColors[0]
  };
  eventModalOpen.value = true;
}

function openAddEventModalForDate(dateKey: string) {
  editingEvent.value = null;
  form.value = {
    title: "",
    start: dateKey,
    end: dateKey,
    color: calendarStore.defaultColors[0]
  };
  eventModalOpen.value = true;
}

function openDetail(evt: CalendarEvent) {
  selectedEvent.value = evt;
  detailModalOpen.value = true;
}

function openEditEventModal() {
  if (!selectedEvent.value) return;
  editingEvent.value = selectedEvent.value;
  form.value = {
    title: selectedEvent.value.title,
    start: selectedEvent.value.start.slice(0, 10),
    end: selectedEvent.value.end.slice(0, 10),
    color: selectedEvent.value.color
  };
  detailModalOpen.value = false;
  eventModalOpen.value = true;
}

function closeEventModal() {
  eventModalOpen.value = false;
  editingEvent.value = null;
}

async function submitEvent() {
  if (!form.value.title.trim() || !form.value.start || !form.value.end) return;
  if (form.value.start > form.value.end) {
    form.value.end = form.value.start;
  }
  try {
    if (editingEvent.value) {
      await calendarStore.updateEvent(editingEvent.value.id, {
        title: form.value.title.trim(),
        start: form.value.start,
        end: form.value.end,
        color: form.value.color
      });
    } else {
      await calendarStore.addEvent({
        title: form.value.title.trim(),
        start: form.value.start,
        end: form.value.end,
        color: form.value.color
      });
    }
    closeEventModal();
  } catch (error) {
    console.error("Failed to save event:", error);
    // TODO: 에러 메시지 표시
  }
}

async function deleteSelectedEvent() {
  if (!selectedEvent.value) return;
  
  const confirmed = window.confirm("일정을 삭제하시겠습니까?");
  if (!confirmed) return;
  
  try {
    await calendarStore.deleteEvent(selectedEvent.value.id);
    detailModalOpen.value = false;
    selectedEvent.value = null;
  } catch (error) {
    console.error("Failed to delete event:", error);
    // TODO: 에러 메시지 표시
  }
}

function formatDateRange(start: string, end: string): string {
  const s = start.slice(0, 10);
  const e = end.slice(0, 10);
  if (s === e) return s;
  return `${s} ~ ${e}`;
}

</script>
