import type { RoomEvent, WsClientMessage } from "@jarvis/shared";

const WS_BASE = import.meta.env.VITE_WS_BASE as string;

export class WsClient {
  private ws: WebSocket | null = null;
  private token: string = "";
  private handlers: Array<(evt: RoomEvent) => void> = [];

  connect(token: string) {
    this.token = token;
    const url = `${WS_BASE}?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(url);

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

  onEvent(handler: (evt: RoomEvent) => void) {
    this.handlers.push(handler);
  }

  send(msg: WsClientMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }
}
