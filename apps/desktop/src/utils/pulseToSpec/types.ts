/** Spec Packet schema (machine-readable structured spec) */
export type SpecPacketStack = {
  frontend: string;
  backend: string;
  db: string;
  orm: string;
};

export type SpecPacketProject = {
  name: string;
  repo: string;
  stack: SpecPacketStack;
};

export type SpecPacketScope = {
  goal: string;
  mvp: string[];
  outOfScope: string[];
};

export type SpecPacketEntity = {
  fields: Record<string, string>;
  relations?: Record<string, string | string[]>;
  enums?: Record<string, string[]>;
};

export type SpecPacketPage = {
  route: string;
  type: "list" | "detail" | "form" | "dashboard";
  entity?: string;
  components?: string[];
  actions?: string[];
};

export type SpecPacketApi = {
  method: string;
  path: string;
  auth: boolean;
  req?: Record<string, unknown>;
  res?: Record<string, unknown>;
  errors?: string[];
};

export type SpecPacketPolicies = {
  softDelete: boolean;
  auditLog: string[];
  multiTenant?: boolean;
};

export type SpecPacket = {
  project: SpecPacketProject;
  scope: SpecPacketScope;
  roles: string[];
  entities: Record<string, SpecPacketEntity>;
  pages: SpecPacketPage[];
  api: SpecPacketApi[];
  policies: SpecPacketPolicies;
};

/** Pulse report section keys (from API) */
export type PulseReportSections = {
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

/** Result of converting Pulse report to spec + documents */
export type SpecPacketResult = {
  specPacket: SpecPacket;
  documents: {
    PRD: string;
    UX_FLOW: string;
    API_SPEC: string;
    DB_SCHEMA: string;
    DECISIONS: string;
  };
  tbdList: string[];
};

/** Validation result for spec packet */
export type SpecPacketValidation = {
  valid: boolean;
  missingKeys: string[];
};
