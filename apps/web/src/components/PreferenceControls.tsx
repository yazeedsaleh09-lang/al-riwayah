"use client";

import { useEffect, useState } from "react";
import { applyMotion, getMotion, getSound, setMotion, setSound, type MotionPref } from "@/lib/prefs";

/** Compact mute + reduced-motion toggles. Always available (accessibility). */
export function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const [sound, setSoundState] = useState(true);
  const [motion, setMotionState] = useState<MotionPref>("auto");

  useEffect(() => {
    setSoundState(getSound());
    setMotionState(getMotion());
    applyMotion(getMotion());
  }, []);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundState(next);
  };
  const toggleMotion = () => {
    const next: MotionPref = motion === "reduced" ? "full" : "reduced";
    setMotion(next);
    setMotionState(next);
  };

  return (
    <div className="prefs" role="group" aria-label="تفضيلات العرض">
      <button
        type="button"
        className="prefs__btn"
        aria-pressed={!sound}
        aria-label={sound ? "كتم الصوت" : "تشغيل الصوت"}
        onClick={toggleSound}
        title={sound ? "كتم الصوت" : "تشغيل الصوت"}
      >
        <svg aria-hidden viewBox="0 0 24 24" width="19" height="19" fill="none">
          <path d="M5 10v4h3l4 3V7l-4 3H5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          {sound ? (
            <>
              <path d="M15 9.2c.9.8 1.3 1.7 1.3 2.8s-.4 2-1.3 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M17.7 6.8c1.6 1.5 2.3 3.2 2.3 5.2s-.7 3.7-2.3 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d="m15.2 9.2 4.6 5.6M19.8 9.2l-4.6 5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </>
          )}
        </svg>
        {!compact && <span className="visually-hidden">{sound ? "الصوت مفعّل" : "الصوت مكتوم"}</span>}
      </button>
      <button
        type="button"
        className="prefs__btn"
        aria-pressed={motion === "reduced"}
        aria-label={motion === "reduced" ? "تفعيل الحركة" : "تقليل الحركة"}
        onClick={toggleMotion}
        title={motion === "reduced" ? "تفعيل الحركة" : "تقليل الحركة"}
      >
        <svg aria-hidden viewBox="0 0 24 24" width="19" height="19" fill="none">
          {motion === "reduced" ? (
            <>
              <path d="M9 7v10M15 7v10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </>
          ) : (
            <path d="M3.5 13c2.2-5.4 4.7 3 7-2.4s4.6 3 7-1.5 3.4-.1 3.4-.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </svg>
        <span className="visually-hidden">
          {motion === "reduced" ? "الحركة مقلّلة" : "الحركة مفعّلة"}
        </span>
      </button>
    </div>
  );
}
