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
