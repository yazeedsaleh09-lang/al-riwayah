import { describe, expect, it } from "vitest";
import type { WarehousePrivateView } from "@al-riwayah/game-engine";
import { RoomManager, buildServer, redact } from "@al-riwayah/server";
import type { WarehouseManagerIntent } from "@al-riwayah/server";
import { displayNameSchema } from "@al-riwayah/protocol";
import { createRoomWithPlayers, makeClock, readyAndStart } from "../integration/driver";

function advanceToQuestions(
  manager: RoomManager,
  code: string,
  players: ReturnType<typeof createRoomWithPlayers>["players"],
): void {
  let requestId = 0;
  const send = (playerId: string, intent: WarehouseManagerIntent) => {
    const result = manager.gameIntent({
      code,
      playerId,
      requestId: `security:${requestId++}`,
      phaseRevision: manager.publicView(code)!.phaseRevision,
      intent,
    });
    if (!result.ok) throw new Error(result.error.code);
  };
  send(players[0]!.id, {
    type: "WAREHOUSE_STORY_SUBMIT",
    playerId: players[0]!.id,
  });
  for (const player of players) {
    send(player.id, { type: "WAREHOUSE_STORY_REVIEW", playerId: player.id });
  }
  for (const player of players) {
    send(player.id, {
      type: "WAREHOUSE_START_QUESTION",
      playerId: player.id,
    });
  }
  send(players[0]!.id, {
    type: "WAREHOUSE_ADVANCE",
    playerId: players[0]!.id,
  });
}

describe("Warehouse secrecy and security", () => {
  it("publishes count-only progress and never another player's private question", () => {
    const { now } = makeClock();
    const manager = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(manager, 4);
    readyAndStart(manager, code, players);
    advanceToQuestions(manager, code, players);

    const privateViews = players.map(
      (player) => manager.privateView(code, player.id)! as WarehousePrivateView,
    );
    const first = privateViews[0]!;
    const accepted = manager.gameIntent({
      code,
      playerId: players[0]!.id,
      requestId: "first-answer",
      phaseRevision: manager.publicView(code)!.phaseRevision,
      intent: {
        type: "WAREHOUSE_ANSWER",
        playerId: players[0]!.id,
        questionInstanceId: first.question!.instanceId,
        optionId: first.question!.options[0]!.id,
      },
    });
    expect(accepted.ok).toBe(true);

    const publicPayload = JSON.stringify(manager.publicView(code));
    expect(manager.publicView(code)).toMatchObject({
      progress: { required: 4, answersLocked: 1 },
      result: null,
    });
    for (const privateView of privateViews) {
      expect(publicPayload).not.toContain(privateView.question!.instanceId);
      for (const other of privateViews.filter(
        (candidate) => candidate.playerId !== privateView.playerId,
      )) {
        expect(JSON.stringify(privateView)).not.toContain(other.question!.instanceId);
      }
    }
    for (const forbiddenKey of [
      "questionAssignments",
      "lockedAnswers",
      "rankedBallots",
      "eventLedger",
      "disconnectedAtByPlayer",
      "recoveryToken",
      "sessionHash",
    ]) {
      expect(publicPayload).not.toContain(forbiddenKey);
    }
  });

  it("rejects invalid options and conflicting idempotency replays without mutation", () => {
    const { now } = makeClock();
    const manager = new RoomManager({ now });
    const { code, players } = createRoomWithPlayers(manager, 4);
    readyAndStart(manager, code, players);
    advanceToQuestions(manager, code, players);
    const player = players[0]!;
    const privateView = manager.privateView(code, player.id)! as WarehousePrivateView;
    const revision = manager.publicView(code)!.phaseRevision;
    const base = {
      type: "WAREHOUSE_ANSWER" as const,
      playerId: player.id,
      questionInstanceId: privateView.question!.instanceId,
    };

    expect(
      manager.gameIntent({
        code,
        playerId: player.id,
        requestId: "invalid-option",
        phaseRevision: revision,
        intent: { ...base, optionId: "not-an-option" },
      }).ok,
    ).toBe(false);
    expect((manager.privateView(code, player.id)! as WarehousePrivateView).lockedAnswer).toBeNull();

    const firstOption = privateView.question!.options[0]!.id;
    const secondOption = privateView.question!.options[1]?.id ?? firstOption;
    const firstIntent = { ...base, optionId: firstOption };
    expect(
      manager.gameIntent({
        code,
        playerId: player.id,
        requestId: "locked-answer",
        phaseRevision: revision,
        intent: firstIntent,
      }).ok,
    ).toBe(true);
    expect(
      manager.gameIntent({
        code,
        playerId: player.id,
        requestId: "locked-answer",
        phaseRevision: revision,
        intent: firstIntent,
      }).ok,
    ).toBe(true);
    expect(
      manager.gameIntent({
        code,
        playerId: player.id,
        requestId: "locked-answer",
        phaseRevision: revision,
        intent: { ...base, optionId: secondOption },
      }).ok,
    ).toBe(false);
    expect(
      (manager.privateView(code, player.id)! as WarehousePrivateView).lockedAnswer
        ?.fact.value,
    ).toBe(privateView.question!.options[0]!.value);
  });

  it("rate-limits join-code scans", () => {
    const manager = new RoomManager({ now: makeClock().now });
    const attempts = Array.from({ length: 25 }, () =>
      manager.joinRoom({ code: "ZZZZ", name: "x", ip: "5.5.5.5" }),
    );
    expect(attempts.some((result) => !result.ok && result.error.code === "RATE_LIMITED")).toBe(true);
  });

  it("rejects markup names at the schema boundary", () => {
    expect(displayNameSchema.safeParse("<script>alert(1)</script>").success).toBe(false);
    expect(displayNameSchema.safeParse("نواف").success).toBe(true);
  });

  it("redacts tokens, evidence, answers, names, and room codes from logs", () => {
    const output = redact({
      recoveryToken: "secret-token",
      roomCode: "ABCD",
      displayName: "نواف",
      answers: [{ optionId: "x" }],
      nested: { privateEvidence: { detail: "leak" }, safe: 42 },
    }) as Record<string, unknown>;
    expect(output.recoveryToken).toBe("[REDACTED]");
    expect(output.roomCode).toBe("[REDACTED]");
    expect(output.displayName).toBe("[REDACTED]");
    expect(output.answers).toBe("[REDACTED]");
    expect((output.nested as Record<string, unknown>).privateEvidence).toBe("[REDACTED]");
    expect((output.nested as Record<string, unknown>).safe).toBe(42);
  });

  it("keeps debug routes unavailable and requires explicit production CORS", async () => {
    const built = await buildServer({
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: 0,
      CORS_ORIGIN: "https://play.example.test",
      ROOM_TTL_MS: 60_000,
      ROOM_MAX_LIFETIME_MS: 600_000,
      PHASE_DURATION_SCALE: 1,
    });
    expect((await built.app.inject({ method: "GET", url: "/debug/rooms" })).statusCode).toBe(404);
    expect((await built.app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    built.stopTimers();
    await built.app.close();

    await expect(
      buildServer({
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: 0,
        CORS_ORIGIN: "*",
        ROOM_TTL_MS: 60_000,
        ROOM_MAX_LIFETIME_MS: 600_000,
        PHASE_DURATION_SCALE: 1,
      }),
    ).rejects.toThrow("explicit CORS_ORIGIN");
  });
});
