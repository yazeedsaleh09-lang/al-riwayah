import { describe, it, expect } from "vitest";
import { toPublicView, toPrivateView } from "@al-riwayah/game-engine";
import { missingPayrollEnvelopeV1 as CASE } from "../src/index";
import { buildState, ans } from "./util";

// The distinctive detail string of the Wi-Fi private evidence — used to prove it
// never leaks into a public view or another player's private view.
const WIFI_DETAIL = CASE.privateEvidencePool.find((e) => e.id === "pe.own_device_wifi")!.detail.ar;

describe("view redaction (SEC-001..004)", () => {
  const state = buildState(CASE, {
    phase: "INTERROGATION_GAPS",
    privateEvidenceByPlayer: { p1: ["pe.own_device_wifi"], p2: ["pe.receipt_2339"], p3: ["pe.vehicle_camera"], p4: ["pe.security_voice"] },
    questionsByPlayer: {
      p1: { instanceId: "i-p1", questionId: "q.gaps.storage_visit", tag: "storage_visit", family: "gaps", prompt: { ar: "سؤال ١" }, options: [{ id: "o1", label: { ar: "نعم" }, normalized: "yes" }] },
      p2: { instanceId: "i-p2", questionId: "q.gaps.saw_vehicle", tag: "saw_vehicle", family: "gaps", prompt: { ar: "سؤال ٢-سري" }, options: [{ id: "o2", label: { ar: "لا" }, normalized: "no" }] },
    },
    answers: [ans("p1", "storage_visit", "no")],
    answeredThisPhase: ["p1"],
    detectedContradictions: [
      {
        ruleId: "candidate.hidden",
        category: "EVIDENCE_COLLISION",
        severity: 20,
        narrativeImportance: 1,
        involvedPlayers: ["p1"],
        params: {},
        playerParams: [],
        explanation: { ar: "CANDIDATE_MARKER_SHOULD_NOT_LEAK" },
      },
    ],
  });

  it("SEC-001: public view contains no private evidence text", () => {
    const pub = toPublicView(state, CASE, "ABCD", 1_000_000);
    const json = JSON.stringify(pub);
    expect(json).not.toContain(WIFI_DETAIL);
  });

  it("SEC-001: public view has no answers or score-ledger keys", () => {
    const pub = toPublicView(state, CASE, "ABCD", 1_000_000) as Record<string, unknown>;
    expect("answers" in pub).toBe(false);
    expect("scoreLedger" in pub).toBe(false);
    expect("privateEvidenceByPlayer" in pub).toBe(false);
    expect("detectedContradictions" in pub).toBe(false);
  });

  it("SEC-003: unreleased contradiction candidates never appear in the public view", () => {
    const pub = toPublicView(state, CASE, "ABCD", 1_000_000);
    expect(JSON.stringify(pub)).not.toContain("CANDIDATE_MARKER_SHOULD_NOT_LEAK");
    expect(pub.releasedContradiction).toBeNull();
  });

  it("SEC-004: no result before verdict", () => {
    const pub = toPublicView(state, CASE, "ABCD", 1_000_000);
    expect(pub.result).toBeNull();
  });

  it("SEC-002: a player's private view holds only their own evidence and question", () => {
    const p1View = toPrivateView(state, CASE, "p1");
    const json = JSON.stringify(p1View);
    // p1 sees their own Wi-Fi evidence detail...
    expect(json).toContain(WIFI_DETAIL);
    // ...but never player 2's question.
    expect(json).not.toContain("سؤال ٢-سري");
    expect(p1View.currentQuestion?.instanceId).toBe("i-p1");

    // p2's view must not contain p1's Wi-Fi evidence.
    const p2View = toPrivateView(state, CASE, "p2");
    expect(JSON.stringify(p2View)).not.toContain(WIFI_DETAIL);
  });

  it("locked answer is reflected without exposing others", () => {
    const p1View = toPrivateView(state, CASE, "p1");
    expect(p1View.answerLocked).toBe(true);
    expect(p1View.submittedOptionId).toBe("opt.no");
  });
});
