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
        onClick={toggleSound}
        title={sound ? "كتم الصوت" : "تشغيل الصوت"}
      >
        <span aria-hidden>{sound ? "🔊" : "🔇"}</span>
        {!compact && <span className="visually-hidden">{sound ? "الصوت مفعّل" : "الصوت مكتوم"}</span>}
      </button>
      <button
        type="button"
        className="prefs__btn"
        aria-pressed={motion === "reduced"}
        onClick={toggleMotion}
        title={motion === "reduced" ? "تفعيل الحركة" : "تقليل الحركة"}
      >
        <span aria-hidden>{motion === "reduced" ? "⏸" : "〜"}</span>
        <span className="visually-hidden">
          {motion === "reduced" ? "الحركة مقلّلة" : "الحركة مفعّلة"}
        </span>
      </button>
    </div>
  );
}
