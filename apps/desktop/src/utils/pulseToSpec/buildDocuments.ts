import type { SpecPacket, SpecPacketResult } from "./types";

function escapeMd(s: string): string {
  return String(s ?? "").replace(/\|/g, "\\|");
}

/** PRD.md: problem, goal, MVP, Non-MVP, users, terminology. Open Questions from tbdList. */
export function buildPRD(spec: SpecPacket, tbdList: string[]): string {
  const openQuestions =
    tbdList.length > 0
      ? "\n## Open Questions\n\n" + tbdList.map((q) => `- ${q}`).join("\n") + "\n\n---\n\n"
      : "";

  return (
    openQuestions +
    `# PRD

## 문제 / 배경
TBD (Pulse 요약 기반으로 보완)

## 목표
${spec.scope.goal}

## MVP
${spec.scope.mvp.map((m) => `- ${escapeMd(m)}`).join("\n")}

## Non-MVP (Out of Scope)
${spec.scope.outOfScope.map((o) => `- ${escapeMd(o)}`).join("\n")}

## 유저 / 역할
${spec.roles.map((r) => `- ${escapeMd(r)}`).join("\n")}

## 용어 정의
| 용어 | 설명 |
|------|------|
| (Pulse 기반으로 보완) | TBD |
`
  );
}

/** UX_FLOW.md: 화면 목록, 라우팅, 플로우, 상태, 예외 */
export function buildUXFlow(spec: SpecPacket): string {
  const routes = spec.pages.map((p) => `| ${p.route} | ${p.type} | ${p.entity ?? "-"} | ${(p.actions ?? []).join(", ") || "-"} |`).join("\n");
  return `# UX Flow

## 화면 목록
| route | type | entity | actions |
|-------|------|--------|---------|
${routes}

## 라우팅
- 대시보드: \`/\`
- 목록/상세/폼: 위 표 참조

## 플로우
TBD (Pulse 결정 사항 기반으로 보완)

## 상태
- 엔티티별 status enum: DB_SCHEMA 참조

## 예외
- 404: 라우트 없음
- 401: 비인가
`;
}

/** API_SPEC.md: endpoint, request, response, error, auth */
export function buildAPISpec(spec: SpecPacket): string {
  const rows = spec.api
    .map(
      (a) =>
        `| ${a.method} | ${a.path} | ${a.auth ? "Y" : "N"} | ${JSON.stringify(a.req ?? {})} | ${JSON.stringify(a.res ?? {})} | ${(a.errors ?? []).join(", ")} |`
    )
    .join("\n");
  return `# API Spec

## 엔드포인트
| method | path | auth | req | res | errors |
|--------|------|------|-----|-----|--------|
${rows}

## 공통
- 인증: \`Authorization: Bearer <token>\`
- 에러: 4xx/5xx JSON body
`;
}

/** DB_SCHEMA.md: entities, fields, relations, indexes, enum, 삭제 정책 */
export function buildDBSchema(spec: SpecPacket): string {
  const entityBlocks = Object.entries(spec.entities).map(([name, e]) => {
    const fields = Object.entries(e.fields)
      .map(([f, t]) => `| ${f} | ${t} |`)
      .join("\n");
    const enums = e.enums
      ? "\n**Enums:**\n" +
        Object.entries(e.enums)
          .map(([k, v]) => `- ${k}: ${v.join(", ")}`)
          .join("\n")
      : "";
    const relations = e.relations && Object.keys(e.relations).length
      ? "\n**Relations:** " + JSON.stringify(e.relations)
      : "";
    return `### ${name}\n| field | type |\n|-------|------|\n${fields}${enums}${relations}`;
  });

  return `# DB Schema

## 엔티티
${entityBlocks.join("\n\n")}

## 인덱스
TBD (필요 시 추가)

## 삭제 정책
- softDelete: ${spec.policies.softDelete}
- auditLog: ${spec.policies.auditLog.join(", ") || "없음"}
`;
}

/** DECISIONS.md: 결정 사항, 근거, 날짜, 영향 범위 */
export function buildDecisions(pulse: { sections: { decisions?: string } }, spec: SpecPacket): string {
  const raw = pulse.sections.decisions?.trim() || "TBD";
  const lines = raw.split(/\n/).filter(Boolean).map((l) => l.trim());
  const list = lines.length ? lines.map((l) => `- ${escapeMd(l)}`) : ["- (Pulse 결정 사항 없음)"];
  return `# Decisions

## 결정 사항
${list.join("\n")}

## 근거 / 날짜 / 영향 범위
- 정책: softDelete=${spec.policies.softDelete}, auditLog=${spec.policies.auditLog.join(", ") || "없음"}
- (날짜·영향 범위는 Pulse 기반으로 보완)
`;
}

/** Build all documents from spec + pulse (for decisions text). */
export function buildAllDocuments(
  spec: SpecPacket,
  tbdList: string[],
  pulse: { sections: { decisions?: string } }
): SpecPacketResult["documents"] {
  return {
    PRD: buildPRD(spec, tbdList),
    UX_FLOW: buildUXFlow(spec),
    API_SPEC: buildAPISpec(spec),
    DB_SCHEMA: buildDBSchema(spec),
    DECISIONS: buildDecisions(pulse, spec)
  };
}
