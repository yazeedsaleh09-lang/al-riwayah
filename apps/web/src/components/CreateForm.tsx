"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
  waking: "نصحّي الخادم…",
  connecting: "نجهّز الجلسة…",
  retrying: "الخادم ما رد للحين. نحاول مرة ثانية…",
  ready: "تم الاتصال.",
};

export function CreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [extended, setExtended] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ConnectionStage>("idle");
  const nameRef = useRef<HTMLInputElement>(null);
  const [nameInvalid, setNameInvalid] = useState(false);
  const firstCase = publicCaseSummaries()[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNameInvalid(false);
    if (name.trim().length < 1) {
      setError("اكتب اسمك أول");
      setNameInvalid(true);
      nameRef.current?.focus();
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
      <div className="form-surface">
        <header className="form-surface__header">
          <Wordmark />
          <Link href="/" className="text-link">العودة للرئيسية</Link>
        </header>

        <div className="form-surface__grid">
          <section className="form-surface__intro">
            <p className="section-label">غرفة جديدة</p>
            <h1>افتحوا ملف الرواية.</h1>
            <p>أنت لاعب مثل الكل. بعد الإنشاء نعطيك رمزًا قصيرًا تشاركه مع الشلة.</p>
            {firstCase && (
              <div className="form-case">
                <span className="mono">CASE / 001</span>
                <div>
                  <small>القضية</small>
                  <strong>{firstCase.title.ar}</strong>
                </div>
                <span>{firstCase.playerCounts[0]}–{firstCase.playerCounts.at(-1)} لاعبين</span>
              </div>
            )}
          </section>

          <section className="form-panel">
            <div className="form-panel__status">
              <span className={`status-dot ${busy ? "is-busy" : ""}`} aria-hidden />
              <span>{busy ? STAGE_AR[stage] : "جاهزين نبدأ."}</span>
            </div>
            <form onSubmit={submit}>
              {error && <p id="create-error" className="form-error" role="alert">{error}</p>}
              {busy && stage !== "idle" && (
                <p className="visually-hidden" role="status" aria-live="polite">
                  {STAGE_AR[stage]}
                </p>
              )}
              <div className="field">
                <label htmlFor="name">اسمك داخل الغرفة</label>
                <input
                  ref={nameRef}
                  id="name"
                  name="displayName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="مثال: نواف…"
                  aria-invalid={nameInvalid}
                  aria-describedby={nameInvalid ? "create-error name-help" : "name-help"}
                />
                <span id="name-help" className="field__help">هذا الاسم يظهر للشلة في هذه الجلسة فقط.</span>
              </div>
              <div className="field field--check">
                <label>
                  <input
                    type="checkbox"
                    checked={extended}
                    onChange={(e) => setExtended(e.target.checked)}
                  />
                  <span>
                    <strong>تخطيط ممتد</strong>
                    <small>وقت أطول للاتفاق قبل التحقيق</small>
                  </span>
                </label>
              </div>
              <button className="btn btn--primary btn--full" type="submit" disabled={busy}>
                {busy ? "نجهّز الجلسة…" : "أنشئ الغرفة"}
              </button>
            </form>
            <Link href="/join" className="form-panel__alternate">عندك رمز؟ ادخل غرفة موجودة</Link>
          </section>
        </div>
      </div>
    </main>
  );
}
