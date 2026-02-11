import type { SpecPacket, SpecPacketValidation } from "./types";

const REQUIRED_TOP_KEYS: (keyof SpecPacket)[] = [
  "project",
  "scope",
  "roles",
  "entities",
  "pages",
  "api",
  "policies"
];

const PROJECT_KEYS = ["name", "repo", "stack"] as const;
const SCOPE_KEYS = ["goal", "mvp", "outOfScope"] as const;
const STACK_KEYS = ["frontend", "backend", "db", "orm"] as const;
const POLICIES_KEYS = ["softDelete", "auditLog"] as const;

function collectMissing(obj: unknown, path: string, keys: readonly string[]): string[] {
  const missing: string[] = [];
  if (!obj || typeof obj !== "object") {
    missing.push(path || "root");
    return missing;
  }
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    if (!(k in o) || o[k] === undefined) missing.push(path ? `${path}.${k}` : k);
  }
  return missing;
}

/**
 * Minimal schema validation: required top-level keys and nested required keys.
 * Returns list of missing key paths.
 */
export function validateSpecPacket(spec: unknown): SpecPacketValidation {
  const missingKeys: string[] = [];

  if (!spec || typeof spec !== "object") {
    return { valid: false, missingKeys: ["root"] };
  }

  const s = spec as Record<string, unknown>;

  for (const key of REQUIRED_TOP_KEYS) {
    if (!(key in s) || s[key] === undefined) missingKeys.push(key);
  }

  if (s.project && typeof s.project === "object") {
    missingKeys.push(...collectMissing(s.project, "project", PROJECT_KEYS));
    const stack = (s.project as Record<string, unknown>).stack;
    if (stack && typeof stack === "object") {
      missingKeys.push(...collectMissing(stack, "project.stack", STACK_KEYS));
    }
  }

  if (s.scope && typeof s.scope === "object") {
    missingKeys.push(...collectMissing(s.scope, "scope", SCOPE_KEYS));
  }

  if (s.policies && typeof s.policies === "object") {
    missingKeys.push(...collectMissing(s.policies, "policies", POLICIES_KEYS));
  }

  if (!Array.isArray(s.roles)) missingKeys.push("roles");
  if (!Array.isArray(s.pages)) missingKeys.push("pages");
  if (!Array.isArray(s.api)) missingKeys.push("api");

  return {
    valid: missingKeys.length === 0,
    missingKeys
  };
}
