import { z } from "zod";

export const WsClientHelloSchema = z.object({
  type: z.literal("client.hello"),
  token: z.string()
});

export const WsJoinRoomSchema = z.object({
  type: z.literal("room.join"),
  roomId: z.string()
});

export const WsSendMessageSchema = z.object({
  type: z.literal("message.send"),
  roomId: z.string(),
  clientTempId: z.string().optional(),
  content: z.string().min(1)
});

export const WsEditMessageSchema = z.object({
  type: z.literal("message.edit"),
  roomId: z.string(),
  messageId: z.string(),
  content: z.string().min(1)
});

export const WsDeleteMessageSchema = z.object({
  type: z.literal("message.delete"),
  roomId: z.string(),
  messageId: z.string()
});

export const WsJarvisRequestSchema = z.object({
  type: z.literal("jarvis.request"),
  roomId: z.string(),
  messageId: z.string().optional(),
  prompt: z.string().min(1)
});

export const WsRoomRenameSchema = z.object({
  type: z.literal("room.rename"),
  roomId: z.string(),
  title: z.string().min(1)
});

export const WsRoomDeleteSchema = z.object({
  type: z.literal("room.delete"),
  roomId: z.string()
});

export const WsRtcOfferSchema = z.object({
  type: z.literal("rtc.offer"),
  roomId: z.string(),
  sdp: z.any()
});

export const WsRtcAnswerSchema = z.object({
  type: z.literal("rtc.answer"),
  roomId: z.string(),
  sdp: z.any()
});

export const WsRtcIceSchema = z.object({
  type: z.literal("rtc.ice"),
  roomId: z.string(),
  candidate: z.any()
});

export const WsRtcHangupSchema = z.object({
  type: z.literal("rtc.hangup"),
  roomId: z.string()
});

export const WsClientMessageSchema = z.discriminatedUnion("type", [
  WsClientHelloSchema,
  WsJoinRoomSchema,
  WsSendMessageSchema,
  WsEditMessageSchema,
  WsDeleteMessageSchema,
  WsJarvisRequestSchema,
  WsRoomRenameSchema,
  WsRoomDeleteSchema,
  WsRtcOfferSchema,
  WsRtcAnswerSchema,
  WsRtcIceSchema,
  WsRtcHangupSchema
]);

export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;

export const WsServerMessageSchema = z.object({
  type: z.string(),
  payload: z.any()
});
export type WsServerMessage = z.infer<typeof WsServerMessageSchema>;

export type RoomEvent =
  | { type: "message.new"; payload: MessageDto }
  | { type: "message.updated"; payload: MessageDto }
  | { type: "message.deleted"; payload: { roomId: string; messageId: string } }
  | { type: "bot.stream"; payload: { requestId: string; roomId: string; chunk: string } }
  | { type: "bot.done"; payload: MessageDto }
  | { type: "room.joined"; payload: { roomId: string } }
  | { type: "room.updated"; payload: { roomId: string; title: string } }
  | { type: "room.deleted"; payload: { roomId: string } }
  | { type: "rtc.offer"; payload: { roomId: string; fromUserId: string; sdp: any } }
  | { type: "rtc.answer"; payload: { roomId: string; fromUserId: string; sdp: any } }
  | { type: "rtc.ice"; payload: { roomId: string; fromUserId: string; candidate: any } }
  | { type: "rtc.hangup"; payload: { roomId: string; fromUserId: string } }
  | { type: "error"; payload: { message: string; code?: string } };

export const MessageDtoSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  senderType: z.enum(["user", "bot", "system"]),
  senderUserId: z.string().nullable().optional(),
  content: z.string(),
  createdAt: z.string()
});
export type MessageDto = z.infer<typeof MessageDtoSchema>;

export function isJarvisTrigger(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.startsWith("자비스야")) return true;
  if (t.includes("자비스야 궁금하다")) return true;
  return false;
}

export function stripJarvisPrefix(text: string): string {
  const t = text.trim();
  if (t.startsWith("자비스야")) return t.replace(/^자비스야\s*/u, "").trim();
  return t.replace(/자비스야 궁금하다\s*/u, "").trim();
}
