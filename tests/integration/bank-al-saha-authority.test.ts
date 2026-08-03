import { describe, expect, it } from "vitest";
import {
  deriveBankScoreChecks,
  type BankMatchState,
  type BankPublicView,
} from "@al-riwayah/game-engine";
import {
  BANK_AL_SAHA_CASE_ID,
  bankAlSahaV1,
  validateBankAlSahaCase,
} from "@al-riwayah/content";
import { RoomManager, type BankManagerIntent } from "@al-riwayah/server";
import { makeClock, readyAndStart, type TestPlayer } from "./driver";

type BankServerPublicView = Omit<BankPublicView, "matchId">;
interface BankServerPrivateView {
  question: { id: string; options: readonly { id: string }[] } | null;
  lockedAnswer: { optionId: string } | null;
  lockedVote: "movement" | "identity" | null;
}

function createBankRoom(manager: RoomManager, count: 4 | 5 | 6) {
  const host = manager.createRoom({
    hostName: "سعود",
    caseId: BANK_AL_SAHA_CASE_ID,
    ip: "172.20.0.1",
  });
  if (!host.ok) throw new Error(host.error.code);
  const players: TestPlayer[] = [
    { id: host.data.playerId, token: host.data.recoveryToken, isHost: true },
  ];
  for (let index = 1; index < count; index += 1) {
    const joined = manager.joinRoom({
      code: host.data.roomCode,
      name: ["يزيد", "فهد", "راكان", "نواف", "جود"][index - 1]!,
      ip: `172.20.0.${index + 1}`,
    });
    if (!joined.ok) throw new Error(joined.error.code);
    players.push({
      id: joined.data.playerId,
      token: joined.data.recoveryToken,
      isHost: false,
    });
  }
  return { code: host.data.roomCode, players };
}

function send(
  manager: RoomManager,
  code: string,
  playerId: string,
  sequence: number,
  intent: BankManagerIntent,
) {
  return manager.gameIntent({
    code,
    playerId,
    requestId: `bank:${sequence}`,
    phaseRevision: manager.publicView(code)!.phaseRevision,
    intent,
  });
}

function lockStory(manager: RoomManager, code: string) {
  const state = manager.getRoom(code)!.match as BankMatchState;
  let sequence = 0;
  for (const assignment of state.storyAssignments) {
    const [factId, targetPlayerId] = assignment.factKey.split(":");
    const result = send(manager, code, assignment.ownerPlayerId, sequence++, {
      type: "BANK_STORY_LOCK",
      playerId: assignment.ownerPlayerId,
      factId: factId as Extract<BankManagerIntent, { type: "BANK_STORY_LOCK" }>["factId"],
      optionId: assignment.options[0]!.id,
      ...(targetPlayerId ? { targetPlayerId } : {}),
    });
    expect(result.ok).toBe(true);
  }
  expect(manager.publicView(code)?.phase).toBe("FIRST_QUESTION");
}

function answerCurrentQuestions(
  manager: RoomManager,
  code: string,
  players: readonly TestPlayer[],
  sequenceStart: number,
  optionIndexes: number | readonly number[] = 0,
) {
  let sequence = sequenceStart;
  for (const [playerIndex, player] of players.entries()) {
    const view = manager.privateView(code, player.id) as BankServerPrivateView;
    expect(view.question).not.toBeNull();
    if (view.lockedAnswer) continue;
    const outcome = send(manager, code, player.id, sequence++, {
      type: "BANK_ANSWER",
      playerId: player.id,
      questionId: view.question!.id,
      optionId:
        view.question!.options[
          typeof optionIndexes === "number" ? optionIndexes : optionIndexes[playerIndex]!
        ]!.id,
    });
    expect(outcome.ok).toBe(true);
  }
}

function playBankToRanking(
  manager: RoomManager,
  code: string,
  players: readonly TestPlayer[],
  clock: { t: number },
  repairId: "movement" | "identity",
  forensicOptionIndexes: number | readonly number[] = 0,
  firstOptionIndexes: number | readonly number[] = 0,
) {
  clock.t += 1_000;
  manager.tick();
  lockStory(manager, code);
  answerCurrentQuestions(manager, code, players, 100, firstOptionIndexes);
  expect(manager.publicView(code)?.phase).toBe("ISSUE_REVEAL");
  clock.t += 1_000;
  manager.tick();
  expect(manager.publicView(code)?.phase).toBe("REPAIR_VOTE");
  for (const [index, player] of players.entries()) {
    if (manager.publicView(code)?.phase !== "REPAIR_VOTE") break;
    expect(
      send(manager, code, player.id, 200 + index, {
        type: "BANK_REPAIR_VOTE",
        playerId: player.id,
        repairId,
      }).ok,
    ).toBe(true);
  }
  expect(manager.publicView(code)?.phase).toBe("STORY_UPDATE");
  clock.t += 1_000;
  manager.tick();
  expect(manager.publicView(code)?.phase).toBe("FORENSIC_QUESTION");
  answerCurrentQuestions(manager, code, players, 300, forensicOptionIndexes);
  expect(manager.publicView(code)?.phase).toBe("GROUP_VERDICT");
  clock.t += 1_000;
  manager.tick();
  expect(manager.publicView(code)?.phase).toBe("PLAYER_RANKING");
}

describe("Bank Al-Saha authoritative room integration", () => {
  it("uses the validated authored case as the runtime question and evidence contract", () => {
    expect(validateBankAlSahaCase(bankAlSahaV1)).toEqual({ ok: true, errors: [] });
    const { clock, now } = makeClock();
    const manager = new RoomManager({
      now,
      disableRateLimits: true,
      phaseDurationScale: 0.01,
      seedFactory: () => "c",
    });
    const { code, players } = createBankRoom(manager, 4);
    readyAndStart(manager, code, players);
    clock.t += 1_000;
    manager.tick();
    lockStory(manager, code);
    for (const [index, player] of players.entries()) {
      const privateView = manager.privateView(code, player.id) as BankServerPrivateView;
      expect(privateView.question?.id).toBe(bankAlSahaV1.questionMatrix[4].first[index]!.id);
    }
    answerCurrentQuestions(manager, code, players, 8_000);
    clock.t += 1_000;
    manager.tick();
    for (const [index, player] of players.entries()) {
      if (manager.publicView(code)?.phase !== "REPAIR_VOTE") break;
      expect(
        send(manager, code, player.id, 8_100 + index, {
          type: "BANK_REPAIR_VOTE",
          playerId: player.id,
          repairId: "movement",
        }).ok,
      ).toBe(true);
    }
    clock.t += 1_000;
    manager.tick();
    const publicView = manager.publicView(code) as BankServerPublicView;
    const evidenceId = bankAlSahaV1.repairBranches.movement.evidenceRequestId;
    expect(publicView.evidence).toMatchObject({
      id: evidenceId,
      timestamp: bankAlSahaV1.evidenceRequests[evidenceId]!.timestamp,
    });
  });

  it.each([4, 5, 6] as const)(
    "completes a canonical %i-player session and replay resets private state",
    (count) => {
      const { clock, now } = makeClock();
      const manager = new RoomManager({
        now,
        disableRateLimits: true,
        phaseDurationScale: 0.01,
        seedFactory: () => `bank-${count}`,
      });
      const { code, players } = createBankRoom(manager, count);
      readyAndStart(manager, code, players);
      expect(manager.publicView(code)).toMatchObject({
        caseId: BANK_AL_SAHA_CASE_ID,
        phase: "OPENING",
      });

      playBankToRanking(manager, code, players, clock, count % 2 ? "identity" : "movement");

      const result = manager.publicView(code) as BankServerPublicView;
      expect(result.verdict).not.toBeNull();
      expect(result.rankings).toHaveLength(count);
      expect(manager.replay({ code, playerId: players[0]!.id }).ok).toBe(true);
      expect(manager.publicView(code)).toMatchObject({ phase: "OPENING", phaseRevision: 0 });
      expect((manager.getRoom(code)!.match as BankMatchState).answers).toEqual([]);
    },
  );

  it.each([
    ["c", "movement", "survived"],
    ["a", "movement", "failed"],
  ] as const)(
    "derives the %s packet's %s branch as a %s group outcome",
    (seed, repairId, expectedOutcome) => {
      const { clock, now } = makeClock();
      const manager = new RoomManager({
        now,
        disableRateLimits: true,
        phaseDurationScale: 0.01,
        seedFactory: () => seed,
      });
      const { code, players } = createBankRoom(manager, 4);
      readyAndStart(manager, code, players);
      playBankToRanking(
        manager,
        code,
        players,
        clock,
        repairId,
        expectedOutcome === "failed" ? 1 : 0,
        expectedOutcome === "failed" ? 1 : 0,
      );
      expect((manager.publicView(code) as BankServerPublicView).verdict?.outcome).toBe(expectedOutcome);
    },
  );

  it("scores authored semantic predicates and preserves packet/link asymmetry", () => {
    const { clock, now } = makeClock();
    const manager = new RoomManager({
      now,
      disableRateLimits: true,
      phaseDurationScale: 0.01,
      seedFactory: () => "c",
    });
    const { code, players } = createBankRoom(manager, 5);
    readyAndStart(manager, code, players);
    // Canonical sample: Yazid contradicts Saud in the first investigation,
    // while Rakan chooses the alley despite the sidewalk camera record.
    playBankToRanking(manager, code, players, clock, "movement", [0, 0, 0, 1, 0], [0, 1, 0, 0, 0]);

    const scores = new Map(
      (manager.publicView(code) as BankServerPublicView).rankings.map(({ playerId, score }) => [
        playerId,
        score,
      ]),
    );
    const checks = deriveBankScoreChecks(manager.getRoom(code)!.match as BankMatchState);
    const weights = {
      firstStoryFit: 25,
      firstLinkedFit: 20,
      forensicRepairFit: 20,
      forensicEvidenceFit: 25,
      forensicLinkedFit: 10,
    } as const;
    const derivedScores = players.map(({ id }) =>
      Math.round(
        Object.entries(weights).reduce(
          (total, [check, weight]) => total + weight * checks[id]![check as keyof typeof weights]!.fit,
          0,
        ),
      ),
    );
    expect(players.map(({ id }) => scores.get(id))).toEqual(derivedScores);
    expect(derivedScores).toEqual([55, 80, 75, 45, 55]);
    expect([...scores.values()].sort((a, b) => (b ?? -1) - (a ?? -1))).toEqual([
      80,
      75,
      55,
      55,
      45,
    ]);
  });

  it("enforces story ownership and authored story options before mutation", () => {
    const { clock, now } = makeClock();
    const manager = new RoomManager({ now, disableRateLimits: true, phaseDurationScale: 0.01 });
    const { code, players } = createBankRoom(manager, 5);
    readyAndStart(manager, code, players);
    clock.t += 1_000;
    manager.tick();
    const state = manager.getRoom(code)!.match as BankMatchState;
    const assignment = state.storyAssignments.find(
      ({ ownerPlayerId }) => ownerPlayerId === players[1]!.id,
    )!;
    const before = state.eventLedger;

    expect(
      send(manager, code, players[0]!.id, 1, {
        type: "BANK_STORY_LOCK",
        playerId: players[0]!.id,
        factId: assignment.factKey as "vehicle_key_holder",
        optionId: assignment.options[0]!.id,
      }),
    ).toMatchObject({ ok: false, error: { code: "ACTION_NOT_ALLOWED" } });
    expect(
      send(manager, code, assignment.ownerPlayerId, 2, {
        type: "BANK_STORY_LOCK",
        playerId: assignment.ownerPlayerId,
        factId: assignment.factKey as "vehicle_key_holder",
        optionId: "future-or-forged-option",
      }),
    ).toMatchObject({ ok: false, error: { code: "ACTION_NOT_ALLOWED" } });
    expect((manager.getRoom(code)!.match as BankMatchState).eventLedger).toEqual(before);
  });

  it("keeps questions, answers, future evidence, and votes private across reconnect", () => {
    const { clock, now } = makeClock();
    const manager = new RoomManager({ now, disableRateLimits: true, phaseDurationScale: 0.01 });
    const { code, players } = createBankRoom(manager, 4);
    readyAndStart(manager, code, players);
    clock.t += 1_000;
    manager.tick();
    lockStory(manager, code);
    const reconnecting = players[1]!;
    const ownQuestion = (manager.privateView(code, reconnecting.id) as BankServerPrivateView).question!;
    manager.bindSocket(code, reconnecting.id, "bank-reconnect-question");
    manager.handleDisconnect("bank-reconnect-question");
    const restored = manager.restore({ recoveryToken: reconnecting.token });
    expect(restored.ok).toBe(true);
    if (!restored.ok) throw new Error(restored.error.code);
    expect((manager.privateView(code, reconnecting.id) as BankServerPrivateView).question?.id).toBe(
      ownQuestion.id,
    );

    const publicJson = JSON.stringify(manager.publicView(code));
    expect(publicJson).not.toContain(ownQuestion.id);
    expect(publicJson).not.toContain("truthPacketId");
    expect(publicJson).not.toContain("matchId");
    const ownPrivateJson = JSON.stringify(manager.privateView(code, reconnecting.id));
    for (const forbidden of ["factKeys", "checks", "normalizedFacts"]) {
      expect(ownPrivateJson).not.toContain(`"${forbidden}"`);
    }
    for (const other of players.filter(({ id }) => id !== reconnecting.id)) {
      const otherQuestion = (manager.privateView(code, other.id) as BankServerPrivateView).question!;
      expect(JSON.stringify(manager.privateView(code, reconnecting.id))).not.toContain(
        otherQuestion.id,
      );
    }

    expect(
      send(manager, code, reconnecting.id, 590, {
        type: "BANK_ANSWER",
        playerId: reconnecting.id,
        questionId: ownQuestion.id,
        optionId: ownQuestion.options[0]!.id,
      }).ok,
    ).toBe(true);
    expect(JSON.stringify(manager.privateView(code, reconnecting.id))).not.toContain(
      "normalizedFacts",
    );

    answerCurrentQuestions(manager, code, players, 600);
    clock.t += 1_000;
    manager.tick();
    expect(
      send(manager, code, reconnecting.id, 700, {
        type: "BANK_REPAIR_VOTE",
        playerId: reconnecting.id,
        repairId: "movement",
      }).ok,
    ).toBe(true);
    manager.bindSocket(code, reconnecting.id, "bank-reconnect-vote");
    manager.handleDisconnect("bank-reconnect-vote");
    expect(manager.restore({ recoveryToken: restored.data.rotatedToken }).ok).toBe(true);
    expect((manager.privateView(code, reconnecting.id) as BankServerPrivateView).lockedVote).toBe(
      "movement",
    );
  });

  it("accepts vote replacement and locks immediately at a strict live majority", () => {
    const { clock, now } = makeClock();
    const manager = new RoomManager({ now, disableRateLimits: true, phaseDurationScale: 0.01 });
    const { code, players } = createBankRoom(manager, 4);
    readyAndStart(manager, code, players);
    clock.t += 1_000;
    manager.tick();
    lockStory(manager, code);
    answerCurrentQuestions(manager, code, players, 400);
    clock.t += 1_000;
    manager.tick();

    const vote = (playerIndex: number, repairId: "movement" | "identity", sequence: number) =>
      send(manager, code, players[playerIndex]!.id, sequence, {
        type: "BANK_REPAIR_VOTE",
        playerId: players[playerIndex]!.id,
        repairId,
      });
    expect(vote(0, "movement", 1000).ok).toBe(true);
    expect(vote(1, "identity", 1001).ok).toBe(true);
    const pendingView = manager.publicView(code) as BankServerPublicView;
    expect(pendingView.phase).toBe("REPAIR_VOTE");
    expect(JSON.stringify(pendingView)).not.toContain('"movement":1');
    expect(vote(1, "movement", 1002).ok).toBe(true);
    expect(manager.publicView(code)?.phase).toBe("REPAIR_VOTE");
    expect(vote(2, "movement", 1003).ok).toBe(true);
    expect(manager.publicView(code)).toMatchObject({ phase: "STORY_UPDATE" });
    const match = manager.getRoom(code)!.match as BankMatchState;
    expect(match.selectedRepairId).toBe("movement");
    expect(match).not.toHaveProperty("voteRound");
    expect(JSON.stringify(match.eventLedger)).not.toContain("round:");
  });
});
