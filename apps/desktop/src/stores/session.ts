import { defineStore } from "pinia";
import { devLogin, fetchRooms, fetchMessages } from "../api/http";
import { WsClient } from "../api/ws";
import type { MessageDto } from "@jarvis/shared";

export const useSessionStore = defineStore("session", {
  state: () => ({
    token: "" as string,
    user: null as any,
    rooms: [] as any[],
    activeRoomId: "" as string,
    messagesByRoom: {} as Record<string, MessageDto[]>,
    ws: null as WsClient | null
  }),
  getters: {
    activeMessages(state): MessageDto[] {
      return state.messagesByRoom[state.activeRoomId] ?? [];
    },
    activeRoom(state): any | null {
      return state.rooms.find((r) => r.id === state.activeRoomId) ?? null;
    }
  },
  actions: {
    async login(email: string, name: string) {
      const { token, user } = await devLogin(email, name);
      this.token = token;
      this.user = user;

      this.ws = new WsClient();
      this.ws.connect(token);
      this.ws.onEvent((evt: any) => this.handleEvent(evt));
      await this.reloadRooms();
    },

    async reloadRooms() {
      if (!this.token) return;
      this.rooms = await fetchRooms(this.token);
      if (!this.activeRoomId && this.rooms.length) {
        await this.openRoom(this.rooms[0].id);
      }
    },

    async openRoom(roomId: string) {
      if (!this.token || !this.ws) return;
      this.activeRoomId = roomId;
      this.ws.send({ type: "room.join", roomId });
      const msgs = await fetchMessages(this.token, roomId);
      this.messagesByRoom[roomId] = msgs;
    },

    sendMessage(roomId: string, content: string) {
      if (!this.ws) return;
      this.ws.send({ type: "message.send", roomId, content });
    },

    askJarvis(roomId: string, prompt: string) {
      if (!this.ws) return;
      this.ws.send({ type: "jarvis.request", roomId, prompt });
    },

    handleEvent(evt: any) {
      if (evt.type === "message.new" || evt.type === "bot.done") {
        const m = evt.payload as MessageDto;
        const list = this.messagesByRoom[m.roomId] ?? [];
        this.messagesByRoom[m.roomId] = [...list, m];
        return;
      }

      if (evt.type === "bot.stream") {
        const p = evt.payload as { requestId: string; roomId: string; chunk: string };
        const list = this.messagesByRoom[p.roomId] ?? [];
        const last = list[list.length - 1];
        const isStreamingStub = last && last.senderType === "bot" && last.id.startsWith("stream:");
        if (isStreamingStub) {
          last.content += p.chunk;
          this.messagesByRoom[p.roomId] = [...list.slice(0, -1), last];
        } else {
          const stub: MessageDto = {
            id: `stream:${p.requestId}`,
            roomId: p.roomId,
            senderType: "bot",
            senderUserId: null,
            content: p.chunk,
            createdAt: new Date().toISOString()
          };
          this.messagesByRoom[p.roomId] = [...list, stub];
        }
        return;
      }
    }
  }
});
