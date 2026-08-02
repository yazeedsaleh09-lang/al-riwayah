import type { WarehousePublicView } from "@al-riwayah/game-engine";
import { useDeadlineExpired } from "./DeadlineRing";

type WarehousePublicWithClock = WarehousePublicView & { serverTime: number };

export function WarehouseDisconnectedPanel({
  pub,
  isHost,
  busy,
  run,
  skipPlayer,
}: {
  pub: WarehousePublicWithClock;
  isHost: boolean;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  skipPlayer: (playerId: string) => Promise<unknown>;
}) {
  const disconnected = pub.players.filter((player) => !player.connected && !player.skipped);
  if (disconnected.length === 0) return null;
  return (
    <section className="warehouse-disconnect" data-testid="warehouse-disconnect">
      <h2>لاعب منقطع</h2>
      <p>نحفظ حالته. بعد 90 ثانية يقبل الخادم تجاوز المضيف بدون اختراع إجابة.</p>
      {disconnected.map((player) => (
        <DisconnectedPlayer
          key={player.id}
          player={player}
          serverTime={pub.serverTime}
          isHost={isHost}
          busy={busy}
          onSkip={() => run(() => skipPlayer(player.id))}
        />
      ))}
    </section>
  );
}

function DisconnectedPlayer({
  player,
  serverTime,
  isHost,
  busy,
  onSkip,
}: {
  player: WarehousePublicView["players"][number];
  serverTime: number;
  isHost: boolean;
  busy: boolean;
  onSkip: () => Promise<void>;
}) {
  const { expired: canSkip, seconds } = useDeadlineExpired(
    player.disconnectedAt === null ? null : player.disconnectedAt + 90_000,
    serverTime,
  );
  return (
    <div>
      <span>
        {player.name}
        {!canSkip && seconds !== null ? ` · التجاوز بعد ${seconds} ث` : ""}
      </span>
      {isHost && (
        <button type="button" disabled={busy || !canSkip} onClick={onSkip}>
          تجاوز اللاعب المنقطع
        </button>
      )}
    </div>
  );
}
