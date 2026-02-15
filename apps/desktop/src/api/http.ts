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

export async function fetchMessages(token: string, roomId: string, take = 80, beforeId?: string): Promise<any[]> {
  const url = new URL(`${API_BASE}/rooms/${roomId}/messages`);
  url.searchParams.set("take", String(take));
  if (beforeId) {
    url.searchParams.set("beforeId", beforeId);
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Messages failed: ${res.status}`);
  return await res.json();
}

export type RoomMemberDto = {
  id: string;
  email: string;
  name: string;
  role: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  department: string | null;
  avatarUrl: string | null;
  joinedAt: string;
};

export async function fetchRoomMembers(token: string, roomId: string): Promise<RoomMemberDto[]> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/members`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Room members failed: ${res.status}`);
  return await res.json();
}

export async function addRoomMembers(
  token: string,
  roomId: string,
  userIds: string[]
): Promise<{ ok: boolean; added: number; skipped: number }> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/members`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ userIds })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Add members failed: ${res.status}`);
  }
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
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    const detail = body?.message ? `: ${body.message}` : "";
    throw new Error(`Create card failed (${res.status})${detail}`);
  }
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

/** Brain Pulse 리포트: 채팅·아이디어 카드·지식 그래프 기반 전문 분석 리포트 + AI 인텔리전스 제안 */
export type PulseReportSections = {
  executiveInsight?: string;
  problemDefinition?: string;
  causalAnalysis?: string;
  impactMatrix?: string;
  opportunities?: string;
  actionItems?: string;
  techConsiderations?: string;
  orgConsiderations?: string;
  riskAnalysis?: string;
  nextSteps?: string;
  people?: string;
  chat?: string;
  documents?: string;
  tasks?: string;
  ideas?: string;
  problems?: string;
  complaints?: string;
  techIssues?: string;
  decisions?: string;
};
export type PulseReportDto = {
  summary: string;
  sections: PulseReportSections;
  aiSuggestions: string[];
  generatedAt: string;
};

/** 저장된 Brain Pulse 리포트 조회 (없으면 null) */
export async function getPulseReport(
  token: string,
  roomId: string
): Promise<PulseReportDto | null> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/pulse-report`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Pulse report fetch failed: ${res.status}`);
  }
  return await res.json();
}

export async function generatePulseReport(
  token: string,
  roomId: string
): Promise<PulseReportDto> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/pulse-report`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Pulse report failed: ${res.status}`);
  }
  return await res.json();
}

/** 지난 회의록 요약해서 현재 방에 가져오기 (선택한 이전 방의 최근 약 1주일 메시지를 요약해 봇 메시지로 등록) */
export async function importMeetingSummary(
  token: string,
  targetRoomId: string,
  sourceRoomId: string
): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/rooms/${targetRoomId}/import-meeting-summary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sourceRoomId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Import failed: ${res.status}`);
  }
  return await res.json();
}

/** 오늘의 아이디어 영감: 채팅방 주제 기준 네이버 뉴스 최신 3건 */
export type RoomNewsItemDto = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  imageUrl?: string | null;
};

export async function fetchRoomNews(
  token: string,
  roomId: string
): Promise<{ items: RoomNewsItemDto[] }> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/news`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `News fetch failed: ${res.status}`);
  }
  return await res.json();
}

/** 뉴스 검색: 사용자가 요청한 query로 검색 */
export async function searchRoomNews(
  token: string,
  roomId: string,
  q: string
): Promise<{ items: RoomNewsItemDto[] }> {
  const query = String(q ?? "").trim();
  if (!query) return { items: [] };
  const url = new URL(`${API_BASE}/rooms/${roomId}/news/search`);
  url.searchParams.set("q", query);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `News search failed: ${res.status}`);
  }
  return await res.json();
}

/** 한국 공공데이터포털 특일 정보 API (서버 프록시를 통해 호출) */
export type HolidayInfo = {
  date: string; // YYYY-MM-DD 형식
  name: string; // 공휴일 명칭
  isHoliday: boolean; // 공공기관 휴일여부
  dateKind: string; // 특일정보의 분류
};

export async function fetchHolidays(token: string, year: number, month?: number): Promise<HolidayInfo[]> {
  const url = new URL(`${API_BASE}/holidays`);
  url.searchParams.set("year", String(year));
  if (month !== undefined) {
    url.searchParams.set("month", String(month));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Holiday API failed: ${res.status}`);
  }
  return await res.json();
}

/** 음성 인식 (서버 기반 Whisper API) */
export async function transcribeAudio(
  token: string,
  audioBlob: Blob
): Promise<{ text: string; language?: string }> {
  // Blob을 base64로 변환 (FileReader 사용하여 스택 오버플로우 방지)
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // data:audio/webm;base64,xxx 형식에서 base64 부분만 추출
      const result = reader.result as string;
      const base64Data = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const res = await fetch(`${API_BASE}/speech/transcribe`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: base64,
      mimeType: audioBlob.type || "audio/webm"
    })
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Transcription failed: ${res.status}`);
  }
  return await res.json();
}

/** 캘린더 일정 타입 */
export type CalendarEventDto = {
  id: string;
  title: string;
  start: string; // ISO date or datetime
  end: string;
  color: string;
  createdAt: string;
};

/** 캘린더 일정 목록 조회 */
export async function fetchCalendarEvents(token: string): Promise<CalendarEventDto[]> {
  const res = await fetch(`${API_BASE}/calendar/events`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Fetch calendar events failed: ${res.status}`);
  }
  return await res.json();
}

/** 캘린더 일정 생성 */
export async function createCalendarEvent(
  token: string,
  input: { title: string; start: string; end: string; color?: string }
): Promise<CalendarEventDto> {
  const res = await fetch(`${API_BASE}/calendar/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Create calendar event failed: ${res.status}`);
  }
  return await res.json();
}

/** 캘린더 일정 수정 */
export async function updateCalendarEvent(
  token: string,
  eventId: string,
  input: { title?: string; start?: string; end?: string; color?: string }
): Promise<CalendarEventDto> {
  const res = await fetch(`${API_BASE}/calendar/events/${eventId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Update calendar event failed: ${res.status}`);
  }
  return await res.json();
}

/** 캘린더 일정 삭제 */
export async function deleteCalendarEvent(token: string, eventId: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/calendar/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Delete calendar event failed: ${res.status}`);
  }
  return await res.json();
}