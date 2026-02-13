import { defineStore } from "pinia";

const LS_CALENDAR_EVENTS = "jarvis.desktop.calendar.events";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date or datetime
  end: string;
  color: string;
  createdAt: string;
}

const DEFAULT_COLORS = [
  "#00694D", // Deep Green
  "#00AD50", // Green
  "#78C046", // Light Green
  "#4CBC26",
  "#00CE7D", // Success
  "#006FF1", // Information
  "#FB4F4F"  // Error/Accent
];

function loadEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(LS_CALENDAR_EVENTS);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveEvents(events: CalendarEvent[]) {
  try {
    localStorage.setItem(LS_CALENDAR_EVENTS, JSON.stringify(events));
  } catch {
    // ignore
  }
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const useCalendarStore = defineStore("calendar", {
  state: () => ({
    events: loadEvents() as CalendarEvent[]
  }),

  getters: {
    defaultColors: () => DEFAULT_COLORS,

    eventsByDate(): Record<string, CalendarEvent[]> {
      const map: Record<string, CalendarEvent[]> = {};
      for (const e of this.events) {
        const start = e.start.slice(0, 10);
        const end = e.end.slice(0, 10);
        const startD = parseDateKey(start).getTime();
        const endD = parseDateKey(end).getTime();
        for (let t = startD; t <= endD; t += 86400000) {
          const key = toDateKey(new Date(t));
          if (!map[key]) map[key] = [];
          map[key].push(e);
        }
      }
      return map;
    }
  },

  actions: {
    addEvent(event: Omit<CalendarEvent, "id" | "createdAt">): CalendarEvent {
      const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const created: CalendarEvent = {
        ...event,
        id,
        createdAt: new Date().toISOString()
      };
      this.events.push(created);
      saveEvents(this.events);
      return created;
    },

    updateEvent(id: string, patch: Partial<Pick<CalendarEvent, "title" | "start" | "end" | "color">>) {
      const i = this.events.findIndex((e) => e.id === id);
      if (i === -1) return;
      this.events[i] = { ...this.events[i], ...patch };
      saveEvents(this.events);
    },

    deleteEvent(id: string) {
      this.events = this.events.filter((e) => e.id !== id);
      saveEvents(this.events);
    },

    getEventsForMonth(year: number, month: number): CalendarEvent[] {
      const monthStart = new Date(year, month, 1).getTime();
      const monthEnd = new Date(year, month + 1, 0).getTime() + 86400000 - 1;
      return this.events.filter((e) => {
        const eStart = new Date(e.start.slice(0, 10)).getTime();
        const eEnd = new Date(e.end.slice(0, 10)).getTime() + 86400000 - 1;
        return eStart <= monthEnd && eEnd >= monthStart;
      });
    }
  }
});
