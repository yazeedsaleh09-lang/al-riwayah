"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
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
  waking: "نصحّي الخادم…",
  connecting: "نجهّز الجلسة…",
  retrying: "الخادم ما رد للحين. نحاول مرة ثانية…",
  ready: "تم الاتصال.",
};

export function PlayForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState((params.get("code") ?? "").toUpperCase());
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ConnectionStage>("idle");
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [invalidField, setInvalidField] = useState<"code" | "name" | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInvalidField(null);
    if (!/^[A-Z0-9]{4,6}$/.test(code.trim())) {
      setError("رمز الغرفة غير صحيح");
      setInvalidField("code");
      codeRef.current?.focus();
      return;
    }
    if (name.trim().length < 1) {
      setError("اكتب اسمك");
      setInvalidField("name");
      nameRef.current?.focus();
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
      <div className="form-surface">
        <header className="form-surface__header">
          <Wordmark />
          <Link href="/" className="text-link">العودة للرئيسية</Link>
        </header>

        <div className="form-surface__grid">
          <section className="form-surface__intro">
            <p className="section-label">دخول برمز</p>
            <h1>ارجعوا لنفس الرواية.</h1>
            <p>اكتب الرمز اللي شاركه معك منشئ الغرفة، ثم الاسم اللي بتعرفك فيه الشلة.</p>
          </section>

          <section className="form-panel">
            <div className="form-panel__status">
              <span className={`status-dot ${busy ? "is-busy" : ""}`} aria-hidden />
              <span>{busy ? STAGE_AR[stage] : "جاهزين نربطك بالغرفة."}</span>
            </div>
            <form onSubmit={submit}>
              {error && <p id="join-error" className="form-error" role="alert">{error}</p>}
              {busy && stage !== "idle" && (
                <p className="visually-hidden" role="status" aria-live="polite">
                  {STAGE_AR[stage]}
                </p>
              )}
              <div className="field">
                <label htmlFor="code">رمز الغرفة</label>
                <input
                  ref={codeRef}
                  id="code"
                  name="roomCode"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  className="mono room-code-input"
                  dir="ltr"
                  placeholder="ABCD…"
                  aria-invalid={invalidField === "code"}
                  aria-describedby={invalidField === "code" ? "join-error code-help" : "code-help"}
                />
                <span id="code-help" className="field__help">من ٤ إلى ٦ أحرف أو أرقام.</span>
              </div>
              <div className="field">
                <label htmlFor="pname">اسمك داخل الغرفة</label>
                <input
                  ref={nameRef}
                  id="pname"
                  name="displayName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="مثال: نواف…"
                  aria-invalid={invalidField === "name"}
                  aria-describedby={invalidField === "name" ? "join-error" : undefined}
                />
              </div>
              <button className="btn btn--primary btn--full" type="submit" disabled={busy}>
                {busy ? "نربطك بالغرفة…" : "ادخل الغرفة"}
              </button>
              <p className="hint">ما نطلب بيانات شخصية. اسمك يظهر للشلة داخل هذه الجلسة فقط.</p>
            </form>
            <Link href="/create" className="form-panel__alternate">ما عندكم غرفة؟ افتحوا واحدة</Link>
          </section>
        </div>
      </div>
    </main>
  );
}
