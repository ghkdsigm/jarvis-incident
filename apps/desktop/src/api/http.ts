const API_BASE = import.meta.env.VITE_API_BASE as string;

export async function devLogin(email: string, name: string): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_BASE}/auth/dev`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name })
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return await res.json();
}

export async function fetchRooms(token: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/rooms`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Rooms failed: ${res.status}`);
  return await res.json();
}

export async function createRoom(
  token: string,
  input: { title?: string; type?: string; memberUserIds?: string[] } = {}
): Promise<any> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(`Create room failed: ${res.status}`);
  return await res.json();
}

export async function fetchMessages(token: string, roomId: string, take = 80): Promise<any[]> {
  const url = new URL(`${API_BASE}/rooms/${roomId}/messages`);
  url.searchParams.set("take", String(take));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Messages failed: ${res.status}`);
  return await res.json();
}

export async function translateText(
  token: string,
  input: { text: string; targetLang?: string }
): Promise<{ translatedText: string; cached?: boolean }> {
  const res = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(`Translate failed: ${res.status}`);
  return await res.json();
}

export async function fetchUsers(
  token: string,
  q?: string,
  opts?: { includeMe?: boolean }
): Promise<Array<{ id: string; email: string; name: string; isOnline: boolean; lastSeenAt: string | null }>> {
  const url = new URL(`${API_BASE}/users`);
  const qq = (q ?? "").trim();
  if (qq) url.searchParams.set("q", qq);
  if (opts?.includeMe) url.searchParams.set("includeMe", "1");
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Users failed: ${res.status}`);
  return await res.json();
}

export type IdeaCardDto = {
  id: string;
  roomId: string;
  createdBy: string | null;
  sourceMessageId: string | null;
  kind: "manual" | "weekly_ai" | string;
  weekStart: string | null;
  title: string;
  content: any;
  graph: any | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchIdeaCards(token: string, roomId: string, take = 80): Promise<IdeaCardDto[]> {
  const url = new URL(`${API_BASE}/rooms/${roomId}/cards`);
  url.searchParams.set("take", String(take));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Cards failed: ${res.status}`);
  return await res.json();
}

export async function createIdeaCard(
  token: string,
  roomId: string,
  input: { title?: string; content?: any; graph?: any | null; sourceMessageId?: string | null } = {}
): Promise<IdeaCardDto> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/cards`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(`Create card failed: ${res.status}`);
  return await res.json();
}

export async function deleteIdeaCard(token: string, roomId: string, cardId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/cards/${cardId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Delete card failed: ${res.status}`);
  return await res.json();
}

export async function generateWeeklyIdeaCards(
  token: string,
  roomId: string,
  input: { weekStart: string }
): Promise<{ ok: boolean; created: number; reason?: string }> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/cards/generate-weekly`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(`Generate weekly cards failed: ${res.status}`);
  return await res.json();
}

export async function fetchRoomGraph(
  token: string,
  roomId: string,
  input?: { weekStart?: string }
): Promise<{ roomId: string; weekStart: string | null; nodes: any[]; edges: any[] }> {
  const url = new URL(`${API_BASE}/rooms/${roomId}/graph`);
  if (input?.weekStart) url.searchParams.set("weekStart", input.weekStart);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Graph failed: ${res.status}`);
  return await res.json();
}