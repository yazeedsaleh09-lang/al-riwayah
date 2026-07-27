"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { createRoom } from "@/lib/game-client";
import type { ConnectionStage } from "@/lib/game-client";
import { publicCaseSummaries } from "@al-riwayah/content";

const ERROR_AR: Record<string, string> = {
  NAME_INVALID: "الاسم غير صالح",
  RATE_LIMITED: "محاولات كثيرة — انتظر شوي",
  SERVER_UNAVAILABLE: "خادم اللعبة ما استجاب خلال دقيقة. انتظر شوي وجرّب مرة ثانية.",
};

const STAGE_AR: Partial<Record<ConnectionStage, string>> = {
  waking: "نوقّظ خادم اللعبة… أول تشغيل ممكن يأخذ قرابة دقيقة.",
  connecting: "الخادم جاهز. نثبّت الاتصال الآمن…",
  retrying: "الخادم ما زال يجهّز نفسه — مستمرين بالمحاولة.",
  ready: "تم الاتصال. ننشئ الغرفة الآن…",
};

export function CreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [extended, setExtended] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ConnectionStage>("idle");
  const firstCase = publicCaseSummaries()[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 1) {
      setError("اكتب اسمك أول");
      return;
    }
    setBusy(true);
    try {
      const session = await createRoom(
        { displayName: name.trim(), settings: { extendedPlanning: extended } },
        setStage,
      );
      router.push(`/room/${session.roomCode}`);
    } catch (err) {
      setError(ERROR_AR[(err as Error).message] ?? "صار خطأ، جرّب مرة ثانية");
      setBusy(false);
      setStage("idle");
    }
  };

  return (
    <main className="form-shell" id="main">
      <div className="form-card">
        <div style={{ marginBottom: "var(--space-6)" }}>
          <Wordmark />
        </div>
        <h1>أنشئ غرفة</h1>
        <p style={{ color: "var(--muted)" }}>أنت لاعب مثل الكل. بعد الإنشاء شارك الرمز مع الشلة.</p>

        {firstCase && (
          <div className="card" style={{ marginBottom: "var(--space-4)" }}>
            <span className="stamp">القضية</span>
            <p style={{ margin: "var(--space-3) 0 0", fontWeight: 700 }}>{firstCase.title.ar}</p>
            <p className="mono" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {firstCase.playerCounts[0]}–{firstCase.playerCounts.at(-1)} لاعبين
            </p>
          </div>
        )}

        <form onSubmit={submit}>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {busy && stage !== "idle" && (
            <p className="connection-status" role="status" aria-live="polite">
              {STAGE_AR[stage]}
            </p>
          )}
          <div className="field">
            <label htmlFor="name">اسمك</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoComplete="off"
              placeholder="مثال: نواف"
            />
          </div>
          <div className="field">
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={extended}
                onChange={(e) => setExtended(e.target.checked)}
                style={{ width: 22, height: 22 }}
              />
              تخطيط ممتد (وقت أطول للتخطيط)
            </label>
          </div>
          <button className="btn btn--evidence btn--full" type="submit" disabled={busy}>
            {busy ? "لحظة، نجهّزها…" : "أنشئ الغرفة"}
          </button>
        </form>
        <p style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
          <Link href="/play">عندك رمز؟ ادخل هنا</Link>
        </p>
      </div>
    </main>
  );
}
