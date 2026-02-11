import { describe, it, expect } from "vitest";
import { pulseReportToSpecResult, validateSpecPacket } from "../index";
import type { PulseReportDto } from "../types";

/** Pulse 리포트 샘플 1: 미팅 요약 + 태스크/아이디어/결정사항 포함 */
const samplePulse1: PulseReportDto = {
  summary: "프로젝트 알파의 주간 정리: 배포 파이프라인 개선과 모니터링 도입 결정.",
  sections: {
    people: "김팀장(PM), 이개발(백엔드), 박디자인(UX)",
    chat: "배포 이슈와 모니터링 도구 논의.",
    documents: "기술 스펙 v1.2, API 문서.",
    tasks: "CI/CD 개선, 스테이징 환경 구축",
    ideas: "대시보드 추가, 알림 봇 연동",
    problems: "배포 시간이 길다",
    complaints: "문서가 최신이 아님",
    techIssues: "레거시 DB 마이그레이션",
    decisions: "소프트 삭제 적용, 감사 로그 저장"
  },
  aiSuggestions: ["모니터링 대시보드 우선 구현", "API 버저닝 도입 검토", "문서 자동화 파이프라인"],
  generatedAt: "2025-02-11T10:00:00.000Z"
};

/** Pulse 리포트 샘플 2: 최소 정보 (많은 TBD 예상) */
const samplePulse2: PulseReportDto = {
  summary: "짧은 회의.",
  sections: {
    people: "",
    tasks: "할 일 정리",
    ideas: "아이디어 1개"
  },
  aiSuggestions: [],
  generatedAt: "2025-02-11T11:00:00.000Z"
};

describe("pulseToSpec", () => {
  it("sample1: 변환 결과에 필수 키가 존재하고, 스키마 검증을 통과한다", () => {
    const result = pulseReportToSpecResult(samplePulse1);
    expect(result.specPacket).toBeDefined();
    expect(result.documents).toBeDefined();
    expect(Array.isArray(result.tbdList)).toBe(true);

    expect("project" in result.specPacket).toBe(true);
    expect("scope" in result.specPacket).toBe(true);
    expect("roles" in result.specPacket).toBe(true);
    expect("entities" in result.specPacket).toBe(true);
    expect("pages" in result.specPacket).toBe(true);
    expect("api" in result.specPacket).toBe(true);
    expect("policies" in result.specPacket).toBe(true);

    expect(result.specPacket.roles.length >= 1).toBe(true);
    expect(
      result.specPacket.scope.goal.includes("알파") || result.specPacket.scope.goal.length > 0
    ).toBe(true);
    expect(result.specPacket.scope.mvp.length >= 1).toBe(true);
    expect(result.specPacket.scope.outOfScope.length >= 1).toBe(true);
    expect(Object.keys(result.specPacket.entities).length >= 1).toBe(true);
    expect(result.specPacket.pages.length >= 1).toBe(true);
    expect(result.specPacket.api.length >= 1).toBe(true);
    expect(typeof result.specPacket.policies.softDelete).toBe("boolean");
    expect(Array.isArray(result.specPacket.policies.auditLog)).toBe(true);

    const validation = validateSpecPacket(result.specPacket);
    expect(validation.valid).toBe(true);
    expect(validation.missingKeys).toEqual([]);
  });

  it("sample2: 최소 입력으로도 변환이 동작하고, 문서 5개가 생성된다", () => {
    const result = pulseReportToSpecResult(samplePulse2);
    expect(result.specPacket).toBeDefined();
    expect(typeof result.documents.PRD).toBe("string");
    expect(typeof result.documents.UX_FLOW).toBe("string");
    expect(typeof result.documents.API_SPEC).toBe("string");
    expect(typeof result.documents.DB_SCHEMA).toBe("string");
    expect(typeof result.documents.DECISIONS).toBe("string");

    expect(result.documents.PRD.length).toBeGreaterThan(0);
    expect(
      result.documents.PRD.includes("# PRD") || result.documents.PRD.includes("Open Questions")
    ).toBe(true);
    expect(
      result.documents.UX_FLOW.includes("UX Flow") || result.documents.UX_FLOW.includes("route")
    ).toBe(true);
    expect(
      result.documents.API_SPEC.includes("API") || result.documents.API_SPEC.includes("method")
    ).toBe(true);
    expect(
      result.documents.DB_SCHEMA.includes("Schema") || result.documents.DB_SCHEMA.includes("엔티티")
    ).toBe(true);
    expect(
      result.documents.DECISIONS.includes("Decisions") || result.documents.DECISIONS.includes("결정")
    ).toBe(true);
  });

  it("validateSpecPacket: 필수 키가 없으면 valid false 및 missingKeys 반환", () => {
    const empty = validateSpecPacket(null);
    expect(empty.valid).toBe(false);
    expect(empty.missingKeys.length).toBeGreaterThanOrEqual(1);

    const partial = validateSpecPacket({
      project: {},
      scope: {},
      roles: [],
      entities: {},
      pages: [],
      api: [],
      policies: {}
    });
    expect(partial.valid).toBe(false);
    expect(
      partial.missingKeys.some(
        (k) => k.includes("project") || k.includes("scope") || k.includes("policies")
      )
    ).toBe(true);
  });
});
