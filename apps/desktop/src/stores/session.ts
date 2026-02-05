import { defineStore } from "pinia";
import { createRoom, devLogin, fetchRooms, fetchMessages } from "../api/http";
import { WsClient } from "../api/ws";
import type { MessageDto } from "@jarvis/shared";

const LS_AUTOLOGIN = "jarvis.desktop.autologin";
const LS_DEVCREDS = "jarvis.desktop.devCreds";

type DevCreds = { email: string; name: string };

export const useSessionStore = defineStore("session", {
  state: () => ({
    authReady: false as boolean,
    autoLoginEnabled: false as boolean,
    savedEmail: "" as string,
    savedName: "" as string,

    token: "" as string,
    user: null as any,
    rooms: [] as any[],
    activeRoomId: "" as string,
    messagesByRoom: {} as Record<string, MessageDto[]>,
    joinedByRoom: {} as Record<string, boolean>,
    ws: null as WsClient | null,

    // Screen share (single active room)
    screenShareMode: "idle" as "idle" | "sharing" | "viewing",
    screenShareLocal: null as MediaStream | null,
    screenShareRemote: null as MediaStream | null,
    screenShareRoomId: "" as string,
    rtcPc: null as RTCPeerConnection | null,
    rtcPendingIce: [] as any[]
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
    async initAuth() {
      if (this.authReady) return;
      try {
        const rawAuto = localStorage.getItem(LS_AUTOLOGIN);
        this.autoLoginEnabled = rawAuto === "1";
      } catch {
        this.autoLoginEnabled = false;
      }

      try {
        const raw = localStorage.getItem(LS_DEVCREDS);
        const parsed = raw ? (JSON.parse(raw) as DevCreds) : null;
        this.savedEmail = parsed?.email ?? "";
        this.savedName = parsed?.name ?? "";
      } catch {
        this.savedEmail = "";
        this.savedName = "";
      }

      if (this.autoLoginEnabled && this.savedEmail && this.savedName) {
        try {
          await this.login(this.savedEmail, this.savedName);
        } catch {
          // ignore autologin failures; user will login manually
        }
      }

      this.authReady = true;
    },

    async loginDev(email: string, name: string, remember: boolean) {
      this.autoLoginEnabled = remember;
      try {
        localStorage.setItem(LS_AUTOLOGIN, remember ? "1" : "0");
      } catch {
        // ignore
      }

      if (remember) {
        this.savedEmail = email;
        this.savedName = name;
        try {
          localStorage.setItem(LS_DEVCREDS, JSON.stringify({ email, name } satisfies DevCreds));
        } catch {
          // ignore
        }
      } else {
        this.savedEmail = "";
        this.savedName = "";
        try {
          localStorage.removeItem(LS_DEVCREDS);
        } catch {
          // ignore
        }
      }

      await this.login(email, name);
    },

    async login(email: string, name: string) {
      const { token, user } = await devLogin(email, name);
      this.token = token;
      this.user = user;

      this.ws = new WsClient();
      this.ws.connect(token);
      this.ws.onEvent((evt: any) => this.handleEvent(evt));
      this.ws.onOpen(() => {
        if (this.activeRoomId) this.ws?.send({ type: "room.join", roomId: this.activeRoomId });
      });
      await this.reloadRooms();
    },

    logout() {
      try {
        // best-effort close socket if exists
        (this.ws as any)?.ws?.close?.();
      } catch {
        // ignore
      }
      this.ws = null;
      this.token = "";
      this.user = null;
      this.rooms = [];
      this.activeRoomId = "";
      this.messagesByRoom = {};
      this.joinedByRoom = {};
      this.cleanupRtc(true);
    },

    async ensureRoomMessages(roomId: string, take = 200): Promise<MessageDto[]> {
      if (!this.token) return this.messagesByRoom[roomId] ?? [];
      const existing = this.messagesByRoom[roomId];
      if (existing && existing.length >= take) return existing;
      const msgs = await fetchMessages(this.token, roomId, take);
      this.messagesByRoom[roomId] = msgs;
      return msgs;
    },

    pushLocal(roomId: string, msg: MessageDto) {
      const list = this.messagesByRoom[roomId] ?? [];
      this.messagesByRoom[roomId] = [...list, msg];
    },

    async reloadRooms() {
      if (!this.token) return;
      this.rooms = await fetchRooms(this.token);
      if (!this.activeRoomId && this.rooms.length) {
        await this.openRoom(this.rooms[0].id);
      }
      if (!this.rooms.length) {
        await this.createRoomAndOpen("General");
      }
    },

    async openRoom(roomId: string) {
      if (!this.token || !this.ws) return;

      // If screen share is tied to another room, keep it scoped.
      // - If I'm sharing and I leave the room, stop sharing (and notify others).
      // - If I'm only viewing, just cleanup locally (do NOT hangup remotely).
      if (this.screenShareRoomId && this.screenShareRoomId !== roomId) {
        if (this.screenShareMode === "sharing") {
          this.stopScreenShare(this.screenShareRoomId);
        } else {
          this.cleanupRtc(true);
        }
      }

      this.activeRoomId = roomId;
      this.joinedByRoom[roomId] = false;
      this.ws.send({ type: "room.join", roomId });
      const msgs = await fetchMessages(this.token, roomId);
      this.messagesByRoom[roomId] = msgs;
    },

    async createRoomAndOpen(title?: string) {
      if (!this.token) return;
      const created = await createRoom(this.token, { title: title?.trim() || "New Room", type: "group" });
      // refresh list (server returns memberships)
      this.rooms = await fetchRooms(this.token);
      await this.openRoom(created.id);
    },

    sendMessage(roomId: string, content: string) {
      if (!this.ws) return;
      if (!this.joinedByRoom[roomId]) {
        this.ws.send({ type: "room.join", roomId });
      }

      // optimistic append so user sees it immediately
      this.pushLocal(roomId, {
        id: `local:${Date.now()}`,
        roomId,
        senderType: "user",
        senderUserId: this.user?.id ?? null,
        content,
        createdAt: new Date().toISOString()
      });
      this.ws.send({ type: "message.send", roomId, content });
    },

    editMessage(roomId: string, messageId: string, content: string) {
      if (!this.ws) return;
      if (!this.joinedByRoom[roomId]) this.ws.send({ type: "room.join", roomId });
      this.ws.send({ type: "message.edit", roomId, messageId, content });
      // optimistic update (server will broadcast too)
      const list = this.messagesByRoom[roomId] ?? [];
      const idx = list.findIndex((m) => m.id === messageId);
      if (idx >= 0) {
        const next = [...list];
        next[idx] = { ...next[idx], content };
        this.messagesByRoom[roomId] = next;
      }
    },

    deleteMessage(roomId: string, messageId: string) {
      if (!this.ws) return;
      if (!this.joinedByRoom[roomId]) this.ws.send({ type: "room.join", roomId });
      this.ws.send({ type: "message.delete", roomId, messageId });
      // optimistic delete (server will broadcast too)
      const list = this.messagesByRoom[roomId] ?? [];
      const idx = list.findIndex((m) => m.id === messageId);
      if (idx >= 0) {
        const next = [...list];
        next[idx] = { ...next[idx], content: "(삭제된 메시지)" };
        this.messagesByRoom[roomId] = next;
      }
    },

    renameRoom(roomId: string, title: string) {
      if (!this.ws) return;
      this.ws.send({ type: "room.rename", roomId, title });
      // optimistic
      this.rooms = this.rooms.map((r) => (r.id === roomId ? { ...r, title } : r));
    },

    deleteRoom(roomId: string) {
      if (!this.ws) return;
      this.ws.send({ type: "room.delete", roomId });
      // optimistic (server will also broadcast)
      this.rooms = this.rooms.filter((r) => r.id !== roomId);
      if (this.activeRoomId === roomId) {
        this.activeRoomId = "";
      }
    },

    askJarvis(roomId: string, prompt: string) {
      if (!this.ws) return;
      if (!this.joinedByRoom[roomId]) {
        this.ws.send({ type: "room.join", roomId });
      }
      this.ws.send({ type: "jarvis.request", roomId, prompt });
    },

    ensureRtcPc(roomId: string) {
      if (this.rtcPc && this.screenShareRoomId === roomId) return this.rtcPc;

      // cleanup previous
      this.cleanupRtc(false);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });

      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        if (!this.ws) return;
        const rid = this.screenShareRoomId || roomId;
        this.ws.send({ type: "rtc.ice", roomId: rid, candidate: e.candidate } as any);
      };

      pc.ontrack = (e) => {
        const [stream] = e.streams;
        if (stream) {
          this.screenShareRemote = stream;
          if (this.screenShareMode === "idle") this.screenShareMode = "viewing";
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
          // don't aggressively cleanup; allow reconnect by user
        }
      };

      this.rtcPc = pc;
      this.screenShareRoomId = roomId;
      this.rtcPendingIce = [];
      return pc;
    },

    async startScreenShare(roomId?: string) {
      const rid = roomId || this.activeRoomId;
      if (!rid || !this.ws) return;
      if (!this.joinedByRoom[rid]) this.ws.send({ type: "room.join", roomId: rid });

      const pc = this.ensureRtcPc(rid);

      // get display stream
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      this.screenShareLocal = stream;
      this.screenShareMode = "sharing";

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      // if user stops sharing via browser UI
      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare(rid);
        };
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.ws.send({ type: "rtc.offer", roomId: rid, sdp: pc.localDescription } as any);
    },

    stopScreenShare(roomId?: string) {
      const rid = roomId || this.screenShareRoomId || this.activeRoomId;
      if (this.ws && rid) {
        this.ws.send({ type: "rtc.hangup", roomId: rid } as any);
      }
      this.cleanupRtc(true);
    },

    cleanupRtc(clearRemote: boolean) {
      try {
        this.rtcPc?.close();
      } catch {
        // ignore
      }
      this.rtcPc = null;
      this.rtcPendingIce = [];

      if (this.screenShareLocal) {
        for (const t of this.screenShareLocal.getTracks()) t.stop();
      }
      this.screenShareLocal = null;

      if (clearRemote) this.screenShareRemote = null;
      this.screenShareMode = this.screenShareRemote && !clearRemote ? "viewing" : "idle";
      if (clearRemote) this.screenShareRoomId = "";
    },

    handleEvent(evt: any) {
      if (evt.type === "room.joined") {
        const roomId = evt.payload?.roomId as string | undefined;
        if (roomId) this.joinedByRoom[roomId] = true;
        return;
      }

      if (evt.type === "rtc.offer") {
        const p = evt.payload as { roomId: string; fromUserId: string; sdp: any };
        if (!p?.roomId || !this.ws) return;
        if (p.roomId !== this.activeRoomId) return;
        if (p.fromUserId && this.user?.id && p.fromUserId === this.user.id) return;
        const pc = this.ensureRtcPc(p.roomId);
        this.screenShareMode = "viewing";
        this.screenShareRoomId = p.roomId;
        Promise.resolve()
          .then(async () => {
            await pc.setRemoteDescription(new RTCSessionDescription(p.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            // flush pending ice
            for (const c of this.rtcPendingIce) {
              try {
                await pc.addIceCandidate(c);
              } catch {
                // ignore
              }
            }
            this.rtcPendingIce = [];
            this.ws?.send({ type: "rtc.answer", roomId: p.roomId, sdp: pc.localDescription } as any);
          })
          .catch(() => {
            this.pushLocal(this.activeRoomId, {
              id: `sys:${Date.now()}`,
              roomId: this.activeRoomId,
              senderType: "system",
              senderUserId: null,
              content: "에러: SCREENSHARE_OFFER_FAILED",
              createdAt: new Date().toISOString()
            });
          });
        return;
      }

      if (evt.type === "rtc.answer") {
        const p = evt.payload as { roomId: string; fromUserId: string; sdp: any };
        if (p?.roomId !== this.activeRoomId) return;
        if (p?.fromUserId && this.user?.id && p.fromUserId === this.user.id) return;
        if (!this.rtcPc || this.screenShareRoomId !== p.roomId) return;
        Promise.resolve()
          .then(async () => {
            await this.rtcPc!.setRemoteDescription(new RTCSessionDescription(p.sdp));
            // flush pending ice
            for (const c of this.rtcPendingIce) {
              try {
                await this.rtcPc!.addIceCandidate(c);
              } catch {
                // ignore
              }
            }
            this.rtcPendingIce = [];
          })
          .catch(() => {
            this.pushLocal(this.activeRoomId, {
              id: `sys:${Date.now()}`,
              roomId: this.activeRoomId,
              senderType: "system",
              senderUserId: null,
              content: "에러: SCREENSHARE_ANSWER_FAILED",
              createdAt: new Date().toISOString()
            });
          });
        return;
      }

      if (evt.type === "rtc.ice") {
        const p = evt.payload as { roomId: string; fromUserId: string; candidate: any };
        if (p?.roomId !== this.activeRoomId) return;
        if (p?.fromUserId && this.user?.id && p.fromUserId === this.user.id) return;
        if (!p?.candidate) return;
        if (!this.rtcPc || this.screenShareRoomId !== p.roomId) {
          // store until pc is ready
          this.rtcPendingIce.push(new RTCIceCandidate(p.candidate));
          return;
        }
        const cand = new RTCIceCandidate(p.candidate);
        if (!this.rtcPc.remoteDescription) {
          this.rtcPendingIce.push(cand);
          return;
        }
        this.rtcPc.addIceCandidate(cand).catch(() => {
          // ignore
        });
        return;
      }

      if (evt.type === "rtc.hangup") {
        const p = evt.payload as { roomId: string; fromUserId: string };
        if (p?.roomId !== this.activeRoomId) return;
        if (p?.fromUserId && this.user?.id && p.fromUserId === this.user.id) return;
        // remote stopped sharing; keep local share if we are sharing
        if (this.screenShareMode !== "sharing") {
          this.cleanupRtc(true);
        } else {
          this.screenShareRemote = null;
          this.screenShareMode = "sharing";
        }
        return;
      }

      if (evt.type === "error") {
        const message = (evt.payload?.message as string | undefined) ?? "UNKNOWN_ERROR";
        const roomId = this.activeRoomId || "";
        if (roomId) {
          this.pushLocal(roomId, {
            id: `sys:${Date.now()}`,
            roomId,
            senderType: "system",
            senderUserId: null,
            content: `에러: ${message}`,
            createdAt: new Date().toISOString()
          });
        }
        return;
      }

      if (evt.type === "message.new" || evt.type === "bot.done") {
        const m = evt.payload as MessageDto;
        const list = this.messagesByRoom[m.roomId] ?? [];
        const last = list[list.length - 1];
        const lastLooksLocal =
          !!last && typeof last.id === "string" && last.id.startsWith("local:") && last.senderType === "user";
        // best-effort de-dupe: replace last optimistic message if it matches
        if (lastLooksLocal && last.content === m.content) {
          this.messagesByRoom[m.roomId] = [...list.slice(0, -1), m];
        } else {
          this.messagesByRoom[m.roomId] = [...list, m];
        }
        return;
      }

      if (evt.type === "message.updated") {
        const m = evt.payload as MessageDto;
        const list = this.messagesByRoom[m.roomId] ?? [];
        const idx = list.findIndex((x) => x.id === m.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = m;
          this.messagesByRoom[m.roomId] = next;
        } else {
          this.messagesByRoom[m.roomId] = [...list, m];
        }
        return;
      }

      if (evt.type === "message.deleted") {
        const p = evt.payload as { roomId: string; messageId: string };
        const list = this.messagesByRoom[p.roomId] ?? [];
        const idx = list.findIndex((x) => x.id === p.messageId);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = { ...next[idx], content: "(삭제된 메시지)" } as any;
          this.messagesByRoom[p.roomId] = next;
        }
        return;
      }

      if (evt.type === "room.updated") {
        const p = evt.payload as { roomId: string; title: string };
        this.rooms = this.rooms.map((r) => (r.id === p.roomId ? { ...r, title: p.title } : r));
        return;
      }

      if (evt.type === "room.deleted") {
        const p = evt.payload as { roomId: string };
        this.rooms = this.rooms.filter((r) => r.id !== p.roomId);
        if (this.activeRoomId === p.roomId) {
          this.activeRoomId = "";
          // best-effort: open first remaining room
          if (this.rooms.length) this.openRoom(this.rooms[0].id);
        }
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
