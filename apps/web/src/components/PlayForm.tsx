"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { joinRoom } from "@/lib/game-client";
import type { ConnectionStage } from "@/lib/game-client";

const ERROR_AR: Record<string, string> = {
  ROOM_NOT_FOUND: "الغرفة غير موجودة",
  ROOM_EXPIRED: "الغرفة انتهت",
  ROOM_FULL: "الغرفة اكتملت",
  MATCH_STARTED: "التحقيق بدأ",
  NAME_TAKEN: "الاسم مستخدم",
  NAME_INVALID: "الاسم غير صالح",
  RATE_LIMITED: "محاولات كثيرة — انتظر شوي",
  SERVER_UNAVAILABLE: "خادم اللعبة ما استجاب خلال دقيقة. انتظر شوي وجرّب مرة ثانية.",
};

const STAGE_AR: Partial<Record<ConnectionStage, string>> = {
  waking: "نوقّظ خادم اللعبة… أول تشغيل ممكن يأخذ قرابة دقيقة.",
  connecting: "الخادم جاهز. نثبّت الاتصال الآمن…",
  retrying: "الخادم ما زال يجهّز نفسه — مستمرين بالمحاولة.",
  ready: "تم الاتصال. ندخّلك الغرفة الآن…",
};

export function PlayForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState((params.get("code") ?? "").toUpperCase());
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ConnectionStage>("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[A-Z0-9]{4,6}$/.test(code.trim())) {
      setError("رمز الغرفة غير صحيح");
      return;
    }
    if (name.trim().length < 1) {
      setError("اكتب اسمك");
      return;
    }
    setBusy(true);
    try {
      const session = await joinRoom({ code: code.trim(), displayName: name.trim() }, setStage);
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
        <h1>ادخل برمز</h1>
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
            <label htmlFor="code">رمز الغرفة</label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoComplete="off"
              inputMode="text"
              className="mono"
              placeholder="ABCD"
              style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "1.4rem" }}
            />
          </div>
          <div className="field">
            <label htmlFor="pname">اسمك</label>
            <input
              id="pname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoComplete="off"
              placeholder="مثال: نواف"
            />
          </div>
          <button className="btn btn--evidence btn--full" type="submit" disabled={busy}>
            {busy ? "ندخّلك…" : "ادخل الغرفة"}
          </button>
          <p className="hint" style={{ marginTop: "var(--space-4)" }}>
            ما نطلب أي بيانات شخصية. اسمك يظهر للشلة فقط داخل الغرفة.
          </p>
        </form>
        <p style={{ marginTop: "var(--space-6)", textAlign: "center" }}>
          <Link href="/create">أو أنشئ غرفة جديدة</Link>
        </p>
      </div>
    </main>
  );
}
