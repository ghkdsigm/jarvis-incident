import { defineStore } from "pinia";
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEventDto
} from "../api/http.js";
import { useSessionStore } from "./session.js";

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
  "#FB4F4F", // Error/Accent
  "#FF6B6B", // Coral Red
  "#FF8C42", // Orange
  "#FFB800", // Yellow
  "#9B59B6", // Purple
  "#E91E63", // Pink
  "#2196F3", // Blue
  "#00BCD4", // Cyan
  "#4CAF50", // Green
  "#8BC34A", // Light Green
  "#FFC107", // Amber
  "#FF9800", // Deep Orange
  "#795548", // Brown
  "#607D8B"  // Blue Grey
];

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
    events: [] as CalendarEvent[],
    loading: false
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
    async loadEvents() {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) {
        this.events = [];
        return;
      }

      this.loading = true;
      try {
        const events = await fetchCalendarEvents(sessionStore.token);
        this.events = events;
      } catch (error) {
        console.error("Failed to load calendar events:", error);
        this.events = [];
      } finally {
        this.loading = false;
      }
    },

    async addEvent(event: Omit<CalendarEvent, "id" | "createdAt">): Promise<CalendarEvent> {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) {
        throw new Error("Not authenticated");
      }

      const created = await createCalendarEvent(sessionStore.token, {
        title: event.title,
        start: event.start,
        end: event.end,
        color: event.color
      });

      this.events.push(created);
      return created;
    },

    async updateEvent(id: string, patch: Partial<Pick<CalendarEvent, "title" | "start" | "end" | "color">>) {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) {
        throw new Error("Not authenticated");
      }

      const updated = await updateCalendarEvent(sessionStore.token, id, patch);
      const i = this.events.findIndex((e) => e.id === id);
      if (i !== -1) {
        this.events[i] = updated;
      }
    },

    async deleteEvent(id: string) {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) {
        throw new Error("Not authenticated");
      }

      await deleteCalendarEvent(sessionStore.token, id);
      this.events = this.events.filter((e) => e.id !== id);
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
