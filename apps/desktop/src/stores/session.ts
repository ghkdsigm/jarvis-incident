import { defineStore } from "pinia";
import { createRoom, devLogin, fetchRoomMembers, fetchRooms, fetchMessages, addRoomMembers, type RoomMemberDto } from "../api/http";
import { WsClient } from "../api/ws";
import type { MessageDto } from "@jarvis/shared";

const LS_AUTOLOGIN = "jarvis.desktop.autologin";
const LS_DEVCREDS = "jarvis.desktop.devCreds";
const LS_AUTH = "jarvis.desktop.auth";
const LS_PINNED_ROOMS = "jarvis.desktop.pinnedRooms";

type DevCreds = { email: string; name: string };

// ---- Incoming message sound (no asset file; generate a short beep) ----
let beepCtx: AudioContext | null = null;
let lastBeepAt = 0;
async function playIncomingBeep(durationMs = 1500) {
  const now = Date.now();
  // throttle to avoid spam (e.g., bursts of messages)
  if (now - lastBeepAt < 1200) return;
  lastBeepAt = now;

  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
    if (!Ctx) return;
    if (!beepCtx) beepCtx = new Ctx();
    if (beepCtx.state === "suspended") {
      await beepCtx.resume().catch(() => {
        /* ignore */
      });
    }

    const osc = beepCtx.createOscillator();
    const gain = beepCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880; // A5-ish

    const t0 = beepCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);

    osc.connect(gain);
    gain.connect(beepCtx.destination);
    osc.start(t0);
    osc.stop(t0 + durationMs / 1000 + 0.02);
  } catch {
    // ignore (autoplay 정책/기기 문제 등)
  }
}

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

    roomMembersByRoom: {} as Record<string, RoomMemberDto[]>,
    roomMembersLoadingByRoom: {} as Record<string, boolean>,

    // Room ordering
    // - "move to top" acts like pin: pinned rooms stay above non-pinned rooms
    pinnedRoomIds: [] as string[],

    // Screen share (single active room)
    screenShareMode: "idle" as "idle" | "sharing" | "viewing",
    screenShareLocal: null as MediaStream | null,
    screenShareRemote: null as MediaStream | null,
    screenShareRoomId: "" as string,
    rtcPc: null as RTCPeerConnection | null,
    rtcPendingIce: [] as any[],

    // 메시지 내용 검색 (좌측 방 목록 검색과 연동, 채팅 패널에서 하이라이트/이동용)
    messageSearchQuery: "" as string,
    messageSearchMatchCountByRoom: {} as Record<string, number>,

    // 채팅방별 읽지 않음 개수 (다른 방에서 새 메시지 도착 시 증가, 해당 방 열면 0으로 초기화)
    unreadCountByRoom: {} as Record<string, number>,

    // 개인 질문: 팝업 내 답변용 (requestId, 스트리밍 content, 완료 여부)
    personalJarvisRequestId: "" as string,
    personalJarvisContent: "" as string,
    personalJarvisDone: false as boolean
  }),
  getters: {
    activeMessages(state): MessageDto[] {
      return state.messagesByRoom[state.activeRoomId] ?? [];
    },
    activeRoom(state): any | null {
      return state.rooms.find((r) => r.id === state.activeRoomId) ?? null;
    },
    totalUnread(state): number {
      const byRoom = state.unreadCountByRoom ?? {};
      return Object.values(byRoom).reduce((sum, n) => sum + (typeof n === "number" ? n : 0), 0);
    }
  },
  actions: {
    applyRoomOrdering(preferRoomId?: string) {
      if (!this.rooms.length) return;
      const pinnedIds = (this.pinnedRoomIds ?? []).filter(Boolean);
      const roomById = new Map<string, any>(this.rooms.map((r) => [r.id, r]));

      const pinned: any[] = [];
      for (const id of pinnedIds) {
        const r = roomById.get(id);
        if (r) pinned.push(r);
      }
      const pinnedSet = new Set(pinned.map((r) => r.id));

      let rest = this.rooms.filter((r) => !pinnedSet.has(r.id));
      const ts = (r: any) => new Date(r?.lastMessageAt || r?.createdAt || 0).getTime();
      rest = [...rest].sort((a, b) => ts(b) - ts(a)); // newest first
      if (preferRoomId) {
        const idx = rest.findIndex((r) => r.id === preferRoomId);
        if (idx > 0) {
          const [picked] = rest.splice(idx, 1);
          rest = [picked, ...rest];
        }
      }

      this.rooms = [...pinned, ...rest];

      // keep pinned list clean (drop deleted/left rooms)
      const nextPinned = pinned.map((r) => r.id);
      if (nextPinned.join("|") !== pinnedIds.filter((id) => roomById.has(id)).join("|")) {
        this.pinnedRoomIds = nextPinned;
        try {
          localStorage.setItem(LS_PINNED_ROOMS, JSON.stringify(this.pinnedRoomIds));
        } catch {
          // ignore
        }
      }
    },

    loadPinnedRooms() {
      try {
        const raw = localStorage.getItem(LS_PINNED_ROOMS);
        const parsed = raw ? (JSON.parse(raw) as unknown) : null;
        this.pinnedRoomIds = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
      } catch {
        this.pinnedRoomIds = [];
      }
    },

    persistPinnedRooms() {
      try {
        localStorage.setItem(LS_PINNED_ROOMS, JSON.stringify(this.pinnedRoomIds ?? []));
      } catch {
        // ignore
      }
    },

    setMessageSearchResults(query: string, matchCountByRoom: Record<string, number>) {
      this.messageSearchQuery = query;
      this.messageSearchMatchCountByRoom = matchCountByRoom ?? {};
    },

    clearMessageSearch() {
      this.messageSearchQuery = "";
      this.messageSearchMatchCountByRoom = {};
    },

    incrementUnread(roomId: string) {
      if (!roomId) return;
      const prev = this.unreadCountByRoom[roomId] ?? 0;
      this.unreadCountByRoom = { ...this.unreadCountByRoom, [roomId]: prev + 1 };
    },

    async initAuth() {
      if (this.authReady) return;
      this.loadPinnedRooms();
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

      // Try restore auth first (keep login on refresh)
      try {
        const raw = localStorage.getItem(LS_AUTH);
        const parsed = raw ? (JSON.parse(raw) as { token?: string; user?: any }) : null;
        if (parsed?.token && parsed?.user) {
          this.token = parsed.token;
          this.user = parsed.user;

          this.ws = new WsClient();
          this.ws.connect(this.token);
          this.ws.onEvent((evt: any) => this.handleEvent(evt));
          this.ws.onOpen(() => {
            if (this.activeRoomId) this.ws?.send({ type: "room.join", roomId: this.activeRoomId });
          });

          // Validate token by loading rooms; if it fails, fall back to autologin/manual login.
          try {
            await this.reloadRooms();
            this.authReady = true;
            return;
          } catch {
            this.logout();
          }
        }
      } catch {
        // ignore restore errors
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

      try {
        localStorage.setItem(LS_AUTH, JSON.stringify({ token, user }));
      } catch {
        // ignore
      }
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
      try {
        localStorage.removeItem(LS_AUTH);
      } catch {
        // ignore
      }
      this.rooms = [];
      this.activeRoomId = "";
      this.messagesByRoom = {};
      this.joinedByRoom = {};
      this.unreadCountByRoom = {};
      this.pinnedRoomIds = [];
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

    async loadMoreMessages(roomId: string, take = 50): Promise<MessageDto[]> {
      if (!this.token) return [];
      const existing = this.messagesByRoom[roomId] ?? [];
      if (existing.length === 0) return [];
      const firstMessage = existing[0];
      const newMessages = await fetchMessages(this.token, roomId, take, firstMessage.id);
      if (newMessages.length > 0) {
        this.messagesByRoom[roomId] = [...newMessages, ...existing];
        return newMessages;
      }
      return [];
    },

    async ensureRoomMembers(roomId: string): Promise<RoomMemberDto[]> {
      if (!this.token) return this.roomMembersByRoom[roomId] ?? [];
      const existing = this.roomMembersByRoom[roomId];
      if (existing && existing.length) return existing;
      if (this.roomMembersLoadingByRoom[roomId]) return this.roomMembersByRoom[roomId] ?? [];

      this.roomMembersLoadingByRoom = { ...this.roomMembersLoadingByRoom, [roomId]: true };
      try {
        const members = await fetchRoomMembers(this.token, roomId);
        this.roomMembersByRoom = { ...this.roomMembersByRoom, [roomId]: members };
        return members;
      } finally {
        this.roomMembersLoadingByRoom = { ...this.roomMembersLoadingByRoom, [roomId]: false };
      }
    },

    pushLocal(roomId: string, msg: MessageDto) {
      const list = this.messagesByRoom[roomId] ?? [];
      this.messagesByRoom[roomId] = [...list, msg];
      const at = msg?.createdAt;
      if (at) {
        this.rooms = this.rooms.map((r) => (r.id === roomId ? { ...r, lastMessageAt: at } : r));
        this.applyRoomOrdering();
      }
    },

    async reloadRooms() {
      if (!this.token) return;
      this.rooms = await fetchRooms(this.token);
      this.applyRoomOrdering();
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
      this.unreadCountByRoom = { ...this.unreadCountByRoom, [roomId]: 0 };
      this.ws.send({ type: "room.join", roomId });
      const msgs = await fetchMessages(this.token, roomId);
      this.messagesByRoom[roomId] = msgs;
    },

    async createRoomAndOpen(title?: string) {
      if (!this.token) return;
      const created = await createRoom(this.token, { title: title?.trim() || "New Room", type: "group" });
      // refresh list (server returns memberships)
      this.rooms = await fetchRooms(this.token);
      // new room should appear at top (but below pinned rooms)
      this.applyRoomOrdering(created.id);
      await this.openRoom(created.id);
    },

    sendMessage(roomId: string, content: string) {
      if (!this.ws) return;
      if (!this.joinedByRoom[roomId]) {
        this.ws.send({ type: "room.join", roomId });
      }

      const clientTempId = `local:${Date.now()}`;
      // optimistic append so user sees it immediately
      this.pushLocal(roomId, {
        id: clientTempId,
        roomId,
        senderType: "user",
        senderUserId: this.user?.id ?? null,
        content,
        createdAt: new Date().toISOString()
      });
      this.ws.send({ type: "message.send", roomId, content, clientTempId });
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

    moveRoomToTop(roomId: string) {
      const id = String(roomId || "");
      if (!id) return;
      const next = (this.pinnedRoomIds ?? []).filter((x) => x !== id);
      next.unshift(id);
      this.pinnedRoomIds = next;
      this.persistPinnedRooms();
      this.applyRoomOrdering();
    },

    unpinRoom(roomId: string) {
      const id = String(roomId || "");
      if (!id) return;
      this.pinnedRoomIds = (this.pinnedRoomIds ?? []).filter((x) => x !== id);
      this.persistPinnedRooms();
      this.applyRoomOrdering();
    },

    leaveRoom(roomId: string) {
      if (!this.ws) return;
      this.ws.send({ type: "room.leave", roomId });
    },

    async addMembersToRoom(roomId: string, userIds: string[]) {
      if (!this.token || !roomId || !userIds.length) return;
      try {
        await addRoomMembers(this.token, roomId, userIds);
        // 참가자 리스트 무효화 (다음 로드 시 갱신)
        if (this.roomMembersByRoom[roomId]) {
          delete this.roomMembersByRoom[roomId];
        }
      } catch (e) {
        console.error("Failed to add members:", e);
        throw e;
      }
    },

    askJarvis(roomId: string, prompt: string, isPersonal = false) {
      if (!this.ws) return;
      if (!this.joinedByRoom[roomId]) {
        this.ws.send({ type: "room.join", roomId });
      }
      if (isPersonal) {
        const requestId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        this.personalJarvisRequestId = requestId;
        this.personalJarvisContent = "";
        this.personalJarvisDone = false;
        this.ws.send({ type: "jarvis.request", roomId, prompt, isPersonal: true, requestId });
      } else {
        this.ws.send({ type: "jarvis.request", roomId, prompt });
      }
    },

    clearPersonalJarvisResponse() {
      this.personalJarvisRequestId = "";
      this.personalJarvisContent = "";
      this.personalJarvisDone = false;
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
      if (evt.type === "room.added") {
        const room = evt.payload?.room as any | undefined;
        const roomId = String(room?.id ?? "");
        if (!roomId) return;

        const exists = this.rooms.some((r) => r.id === roomId);
        this.rooms = exists ? this.rooms.map((r) => (r.id === roomId ? { ...r, ...room } : r)) : [...this.rooms, room];
        this.applyRoomOrdering(roomId);

        // 새로 추가된 방은 자동으로 구독(join)해서, 내가 리스트 새로고침을 안 해도 메시지 이벤트를 받도록 한다.
        // joinedByRoom: undefined = never joined; false = join pending; true = joined
        // Only send join when we haven't attempted yet.
        if (this.ws && this.joinedByRoom[roomId] == null) {
          this.joinedByRoom[roomId] = false;
          this.ws.send({ type: "room.join", roomId });
        }
        // unread map 초기화
        if (this.unreadCountByRoom[roomId] == null) {
          this.unreadCountByRoom = { ...this.unreadCountByRoom, [roomId]: 0 };
        }
        return;
      }

      if (evt.type === "room.joined") {
        const roomId = evt.payload?.roomId as string | undefined;
        if (roomId) this.joinedByRoom[roomId] = true;
        return;
      }

      if (evt.type === "room.left") {
        const p = evt.payload as { roomId: string };
        if (!p?.roomId) return;
        const roomId = p.roomId;

        this.rooms = this.rooms.filter((r) => r.id !== roomId);
        if (this.pinnedRoomIds?.includes(roomId)) {
          this.pinnedRoomIds = this.pinnedRoomIds.filter((x) => x !== roomId);
          this.persistPinnedRooms();
        }
        // keep reactivity by replacing objects
        const { [roomId]: _m, ...restM } = this.messagesByRoom;
        this.messagesByRoom = restM;
        const { [roomId]: _j, ...restJ } = this.joinedByRoom;
        this.joinedByRoom = restJ;
        const { [roomId]: _u, ...restU } = this.unreadCountByRoom;
        this.unreadCountByRoom = restU;

        if (this.activeRoomId === roomId) {
          this.activeRoomId = "";
          if (this.rooms.length) this.openRoom(this.rooms[0].id);
        }
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

        // 방 목록에 없는 roomId면(=나를 새로 추가했는데 클라가 모르던 방), 즉시 목록을 갱신한다.
        if (!this.rooms.some((r) => r.id === m.roomId)) {
          // 즉시 방 목록을 갱신하여 Teams처럼 자동으로 채팅방이 추가되도록 함
          this.reloadRooms().catch(() => {
            /* ignore */
          });
        }

        // bot.done: replace streaming stub so we don't show the same bot reply twice
        if (evt.type === "bot.done") {
          const last = list[list.length - 1];
          const isStreamingStub = last && last.senderType === "bot" && typeof last.id === "string" && last.id.startsWith("stream:");
          if (isStreamingStub) {
            const next = [...list.slice(0, -1), m];
            this.messagesByRoom[m.roomId] = next;
            const at = m?.createdAt;
            if (at) {
              this.rooms = this.rooms.map((r) => (r.id === m.roomId ? { ...r, lastMessageAt: at } : r));
              this.applyRoomOrdering();
            }
            if (m.roomId !== this.activeRoomId) {
              this.incrementUnread(m.roomId);
              playIncomingBeep();
            }
            return;
          }
        }

        // Prefer deterministic reconciliation when server echoes clientTempId
        const tempId = (m as any).clientTempId as string | undefined;
        if (tempId) {
          const idx = list.findIndex((x) => x.id === tempId);
          if (idx >= 0) {
            const next = [...list];
            next[idx] = m;
            this.messagesByRoom[m.roomId] = next;
            const at = m?.createdAt;
            if (at) {
              this.rooms = this.rooms.map((r) => (r.id === m.roomId ? { ...r, lastMessageAt: at } : r));
              this.applyRoomOrdering();
            }
            return;
          }
        }

        // Fallback: best-effort de-dupe by matching the last optimistic message
        const last = list[list.length - 1];
        const lastLooksLocal = !!last && typeof last.id === "string" && last.id.startsWith("local:") && last.senderType === "user";
        if (lastLooksLocal && last.content === m.content) this.messagesByRoom[m.roomId] = [...list.slice(0, -1), m];
        else this.messagesByRoom[m.roomId] = [...list, m];
        const at = m?.createdAt;
        if (at) {
          this.rooms = this.rooms.map((r) => (r.id === m.roomId ? { ...r, lastMessageAt: at } : r));
          this.applyRoomOrdering();
        }
        if (m.roomId !== this.activeRoomId && !(m.senderType === "user" && m.senderUserId === this.user?.id)) {
          this.incrementUnread(m.roomId);
          playIncomingBeep();
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
        const roomId = p.roomId;
        this.rooms = this.rooms.filter((r) => r.id !== roomId);
        const { [roomId]: _u, ...restU } = this.unreadCountByRoom;
        this.unreadCountByRoom = restU;
        if (this.pinnedRoomIds?.includes(roomId)) {
          this.pinnedRoomIds = this.pinnedRoomIds.filter((x) => x !== roomId);
          this.persistPinnedRooms();
        }
        if (this.activeRoomId === roomId) {
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

      if (evt.type === "bot.personal.stream") {
        const p = evt.payload as { requestId: string; chunk: string };
        if (p.requestId === this.personalJarvisRequestId) {
          this.personalJarvisContent += p.chunk;
        }
        return;
      }

      if (evt.type === "bot.personal.done") {
        const p = evt.payload as { requestId: string; content: string };
        if (p.requestId === this.personalJarvisRequestId) {
          this.personalJarvisContent = p.content;
          this.personalJarvisDone = true;
          this.personalJarvisRequestId = "";
        }
        return;
      }

      if (evt.type === "room.member.added") {
        const p = evt.payload as { roomId: string; userId: string; userName: string };
        if (!p?.roomId || !p?.userName) return;

        // 시스템 메시지 생성
        const systemMsg: MessageDto = {
          id: `sys:member-added:${p.roomId}:${p.userId}:${Date.now()}`,
          roomId: p.roomId,
          senderType: "system",
          senderUserId: null,
          content: `${p.userName}가 추가되었습니다.`,
          createdAt: new Date().toISOString()
        };
        const list = this.messagesByRoom[p.roomId] ?? [];
        // 반응성을 위해 새 배열 생성
        this.messagesByRoom = { ...this.messagesByRoom, [p.roomId]: [...list, systemMsg] };

        // 참가자 리스트 업데이트 (로드된 경우)
        if (this.roomMembersByRoom[p.roomId]) {
          // 새 멤버가 이미 있는지 확인
          const existing = this.roomMembersByRoom[p.roomId].find((m) => m.id === p.userId);
          if (!existing) {
            // 임시 멤버 객체 생성 (실제 데이터는 다음 로드 시 갱신)
            const tempMember: RoomMemberDto = {
              id: p.userId,
              name: p.userName,
              email: "",
              isOnline: false,
              lastSeenAt: null,
              team: "",
              role: "",
              tags: []
            };
            this.roomMembersByRoom = {
              ...this.roomMembersByRoom,
              [p.roomId]: [...this.roomMembersByRoom[p.roomId], tempMember]
            };
          }
        } else {
          // 로드되지 않은 경우 무효화 (다음 로드 시 갱신)
          // roomMembersByRoom은 그대로 두고 membersCount만 업데이트
        }

        // 방의 참가자 수 업데이트
        const room = this.rooms.find((r) => r.id === p.roomId);
        if (room) {
          const currentCount = room.membersCount ?? room._count?.members ?? 0;
          this.rooms = this.rooms.map((r) =>
            r.id === p.roomId ? { ...r, membersCount: currentCount + 1 } : r
          );
        }

        return;
      }

      if (evt.type === "room.member.removed") {
        const p = evt.payload as { roomId: string; userId: string; userName: string };
        if (!p?.roomId || !p?.userName) return;

        // 시스템 메시지 생성
        const systemMsg: MessageDto = {
          id: `sys:member-removed:${p.roomId}:${p.userId}:${Date.now()}`,
          roomId: p.roomId,
          senderType: "system",
          senderUserId: null,
          content: `${p.userName}님이 채팅방을 나갔습니다.`,
          createdAt: new Date().toISOString()
        };
        const list = this.messagesByRoom[p.roomId] ?? [];
        // 반응성을 위해 새 객체 생성
        this.messagesByRoom = { ...this.messagesByRoom, [p.roomId]: [...list, systemMsg] };

        // 참가자 리스트에서 제거
        if (this.roomMembersByRoom[p.roomId]) {
          const filtered = this.roomMembersByRoom[p.roomId].filter((m) => m.id !== p.userId);
          this.roomMembersByRoom = { ...this.roomMembersByRoom, [p.roomId]: filtered };
        }

        // 방의 참가자 수 업데이트
        const room = this.rooms.find((r) => r.id === p.roomId);
        if (room) {
          const currentCount = room.membersCount ?? room._count?.members ?? 0;
          this.rooms = this.rooms.map((r) =>
            r.id === p.roomId ? { ...r, membersCount: Math.max(0, currentCount - 1) } : r
          );
        }

        return;
      }
    }
  }
});
