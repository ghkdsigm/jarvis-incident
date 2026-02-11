import type { PulseReportDto, SpecPacketResult } from "./types";
import { buildSpecPacket, buildTbdList } from "./buildSpecPacket";
import { buildAllDocuments } from "./buildDocuments";
import { validateSpecPacket } from "./validateSpecPacket";

export type { SpecPacket, SpecPacketResult, SpecPacketValidation, PulseReportDto, PulseReportSections } from "./types";
export { validateSpecPacket };

/**
 * Convert Pulse report to Spec Packet + all MD documents.
 * Reusable from any consumer (component or test).
 */
export function pulseReportToSpecResult(pulse: PulseReportDto): SpecPacketResult {
  const specPacket = buildSpecPacket(pulse);
  const tbdList = buildTbdList(pulse, specPacket);
  const documents = buildAllDocuments(specPacket, tbdList, pulse);
  return { specPacket, documents, tbdList };
}
