import type {
  PulseReportDto,
  SpecPacket,
  SpecPacketEntity,
  SpecPacketPage,
  SpecPacketApi,
  SpecPacketScope,
  SpecPacketPolicies
} from "./types";

const TBD = "TBD";

/** Split section text into lines/bullets, then trim; filter empty */
function sectionToLines(s: string | undefined): string[] {
  if (!s || typeof s !== "string") return [];
  return s
    .split(/\n|[,;]/)
    .map((x) => x.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

/** Extract role-like tokens from people section */
function extractRoles(people: string | undefined): string[] {
  const lines = sectionToLines(people);
  if (lines.length > 0) return lines;
  return [TBD];
}

/** Build scope from summary, tasks, ideas, techIssues, aiSuggestions */
function buildScope(pulse: PulseReportDto): SpecPacketScope {
  const goal = pulse.summary?.trim() || TBD;
  const mvp: string[] = [];
  const outOfScope: string[] = [];

  sectionToLines(pulse.sections.tasks).forEach((t) => mvp.push(t));
  sectionToLines(pulse.sections.ideas).forEach((i) => mvp.push(i));
  pulse.aiSuggestions?.forEach((s) => mvp.push(s));

  sectionToLines(pulse.sections.techIssues).forEach((t) => outOfScope.push(t));
  if (outOfScope.length === 0) outOfScope.push("(기술 이슈 없음 또는 TBD)");

  return { goal, mvp: mvp.length ? mvp : [TBD], outOfScope };
}

/** Build entities from tasks/ideas (minimal Task, Idea with status-like enums) */
function buildEntities(pulse: PulseReportDto): Record<string, SpecPacketEntity> {
  const entities: Record<string, SpecPacketEntity> = {};

  const hasTasks = sectionToLines(pulse.sections.tasks).length > 0;
  const hasIdeas = sectionToLines(pulse.sections.ideas).length > 0;

  if (hasTasks || !hasIdeas) {
    entities.Task = {
      fields: { id: "string", title: "string", status: "string", createdAt: "string" },
      relations: {},
      enums: { status: ["todo", "in_progress", "done"] }
    };
  }
  if (hasIdeas || !hasTasks) {
    entities.Idea = {
      fields: { id: "string", title: "string", status: "string", createdAt: "string" },
      relations: {},
      enums: { status: ["draft", "review", "accepted"] }
    };
  }
  if (Object.keys(entities).length === 0) {
    entities.Task = {
      fields: { id: "string", title: "string", status: "string" },
      enums: { status: ["todo", "done"] }
    };
  }

  return entities;
}

/** Default pages from common CRUD + dashboard */
function buildPages(pulse: PulseReportDto): SpecPacketPage[] {
  const entities = buildEntities(pulse);
  const entityNames = Object.keys(entities);
  const pages: SpecPacketPage[] = [
    { route: "/", type: "dashboard", components: ["Dashboard"], actions: ["refresh"] }
  ];
  entityNames.forEach((e) => {
    pages.push({ route: `/${e.toLowerCase()}s`, type: "list", entity: e, actions: ["create", "view"] });
    pages.push({ route: `/${e.toLowerCase()}s/:id`, type: "detail", entity: e, actions: ["edit", "delete"] });
    pages.push({ route: `/${e.toLowerCase()}s/new`, type: "form", entity: e, actions: ["submit"] });
  });
  return pages;
}

/** Minimal API from entities */
function buildApi(pulse: PulseReportDto): SpecPacketApi[] {
  const entities = buildEntities(pulse);
  const base: SpecPacketApi[] = [
    { method: "GET", path: "/api/health", auth: false, res: { ok: "boolean" }, errors: [] }
  ];
  Object.keys(entities).forEach((e) => {
    const name = e.toLowerCase();
    base.push({ method: "GET", path: `/api/${name}s`, auth: true, res: {}, errors: ["401", "500"] });
    base.push({ method: "GET", path: `/api/${name}s/:id`, auth: true, res: {}, errors: ["404", "401"] });
    base.push({ method: "POST", path: `/api/${name}s`, auth: true, req: {}, res: {}, errors: ["400", "401"] });
    base.push({ method: "PATCH", path: `/api/${name}s/:id`, auth: true, req: {}, res: {}, errors: ["400", "404"] });
    base.push({ method: "DELETE", path: `/api/${name}s/:id`, auth: true, errors: ["404", "401"] });
  });
  return base;
}

/** Policies from decisions section (soft delete / audit / multi-tenant hints) */
function buildPolicies(pulse: PulseReportDto): SpecPacketPolicies {
  const decisions = (pulse.sections.decisions ?? "").toLowerCase();
  return {
    softDelete: decisions.includes("삭제") || decisions.includes("soft") ? true : false,
    auditLog: decisions ? ["createdAt", "updatedAt"] : [],
    multiTenant: undefined
  };
}

/** Collect TBD items for Open Questions */
function collectTbdList(pulse: PulseReportDto, spec: SpecPacket): string[] {
  const tbd: string[] = [];
  if (!spec.project.name || spec.project.name === TBD) tbd.push("프로젝트 이름");
  if (!spec.project.repo || spec.project.repo === TBD) tbd.push("저장소 URL");
  if (!spec.scope.goal || spec.scope.goal === TBD) tbd.push("목표(Goal) 상세");
  if (spec.scope.mvp.length === 0 || (spec.scope.mvp.length === 1 && spec.scope.mvp[0] === TBD))
    tbd.push("MVP 범위");
  if (spec.roles.length === 0 || (spec.roles.length === 1 && spec.roles[0] === TBD)) tbd.push("역할/사용자");
  return tbd;
}

/**
 * Convert Pulse report (structured DTO) to SpecPacket + TBD list.
 * Section mapping: people→roles, tasks/ideas→entities+scope.mvp, techIssues→outOfScope, decisions→policies.
 */
export function buildSpecPacket(pulse: PulseReportDto): SpecPacket {
  const roles = extractRoles(pulse.sections.people);
  const scope = buildScope(pulse);
  const entities = buildEntities(pulse);
  const pages = buildPages(pulse);
  const api = buildApi(pulse);
  const policies = buildPolicies(pulse);

  return {
    project: {
      name: TBD,
      repo: TBD,
      stack: { frontend: TBD, backend: TBD, db: TBD, orm: TBD }
    },
    scope,
    roles,
    entities,
    pages,
    api,
    policies
  };
}

export function buildTbdList(pulse: PulseReportDto, spec: SpecPacket): string[] {
  return collectTbdList(pulse, spec);
}
