import type { RoomEvent, WsClientMessage } from "@jarvis/shared";

const WS_BASE = import.meta.env.VITE_WS_BASE as string;

// NOTE:
// `@jarvis/shared`는 dist 타입을 참조하므로 로컬 개발 중에는 빌드 타이밍에 따라
// WsClientMessage가 최신(예: rtc.*)을 포함하지 않을 수 있습니다.
// 데스크톱은 rtc.*를 사용하므로 여기서 전송 타입을 확장합니다.
export type DesktopWsClientMessage =
  | WsClientMessage
  | { type: "rtc.offer"; roomId: string; sdp: any }
  | { type: "rtc.answer"; roomId: string; sdp: any }
  | { type: "rtc.ice"; roomId: string; candidate: any }
  | { type: "rtc.hangup"; roomId: string };

export class WsClient {
  private ws: WebSocket | null = null;
  private token: string = "";
  private handlers: Array<(evt: RoomEvent) => void> = [];
  private openHandlers: Array<() => void> = [];

  connect(token: string) {
    this.token = token;
    const url = `${WS_BASE}?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.openHandlers.forEach((h) => h());
    };

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this.handlers.forEach((h) => h(data as RoomEvent));
      } catch {
        // ignore
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(this.token), 1200);
    };
  }

  onOpen(handler: () => void) {
    this.openHandlers.push(handler);
  }

  onEvent(handler: (evt: RoomEvent) => void) {
    this.handlers.push(handler);
  }

  // Server validates payload with zod; keep client send flexible.
  send(msg: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }
}
