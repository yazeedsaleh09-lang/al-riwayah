"use client";

import { useEffect, useRef, useState } from "react";
import type { WarehousePhase } from "@al-riwayah/game-engine";

type PhaseTone = "talk" | "silence" | "ballot" | "waiting";
type CommunicationMode = "talk" | "silence" | "waiting";

interface PhaseMessage {
  title: string;
  instruction: string;
  modeLabel: string;
  icon: string;
  tone: PhaseTone;
  communicationMode: CommunicationMode;
}

const PHASE_MESSAGES: Readonly<Record<WarehousePhase, PhaseMessage>> = {
  STORY_BUILDING: {
    title: "تكلموا الآن",
    instruction: "اتفقوا مع بعض على تفاصيل الرواية.",
    modeLabel: "الكلام مطلوب",
    icon: "◉",
    tone: "talk",
    communicationMode: "talk",
  },
  STORY_REVIEW: {
    title: "راجعوا الرواية معًا",
    instruction:
      "اقرأوا الملخص، واسألوا عن أي تفصيلة غير واضحة. اضغط «فهمت الرواية» عندما تكون مستعدًا.",
    modeLabel: "الكلام مسموح",
    icon: "◉",
    tone: "talk",
    communicationMode: "talk",
  },
  SILENT_PHASE_INTRO: {
    title: "من هنا يبدأ الصمت",
    instruction: "لا تقرأ سؤالك بصوت مرتفع، ولا تساعد أحدًا. كل واحد يجاوب من فهمه للرواية.",
    modeLabel: "الصمت مطلوب",
    icon: "×",
    tone: "silence",
    communicationMode: "silence",
  },
  CHAPTER_CONTEXT: {
    title: "اقرأوا الدليل بصمت",
    instruction: "اقرأ دليل الفصل على شاشتك، ثم ابدأ سؤالك من دون نقاش.",
    modeLabel: "الصمت مستمر",
    icon: "×",
    tone: "silence",
    communicationMode: "silence",
  },
  SILENT_ANSWERING: {
    title: "إجابة سرية — ممنوع النقاش",
    instruction: "اختر إجابتك لحالك. لا تعرض شاشتك، ولا تقول سؤالك أو إجابتك.",
    modeLabel: "الصمت والإجابة السرية",
    icon: "×",
    tone: "silence",
    communicationMode: "silence",
  },
  WAITING_FOR_ANSWERS: {
    title: "استمروا في الصمت",
    instruction: "بانتظار بقية اللاعبين. لا تناقشون الأسئلة حتى يبدأ الكشف.",
    modeLabel: "انتظار صامت",
    icon: "…",
    tone: "waiting",
    communicationMode: "silence",
  },
  ISSUE_REVEAL: {
    title: "الحين تكلموا",
    instruction: "هذه أقوى مشكلة في روايتكم. اقرأوها وناقشوها معًا.",
    modeLabel: "الكلام مطلوب",
    icon: "◉",
    tone: "talk",
    communicationMode: "talk",
  },
  OPEN_DISCUSSION: {
    title: "ناقشوا الحل",
    instruction: "عندكم وقت مفتوح لتفهمون المشكلة وتقررون كيف تعدلون الرواية.",
    modeLabel: "الكلام مطلوب",
    icon: "◉",
    tone: "talk",
    communicationMode: "talk",
  },
  PATCH_BALLOT: {
    title: "اختيار سري — لا تقول ترتيبك",
    instruction: "رتّب الترقيعات من الأفضل إلى الأضعف حسب رأيك. لا تكشف اختيارك حتى ينتهي الجميع.",
    modeLabel: "تصويت فردي سري — الصمت مطلوب",
    icon: "✓",
    tone: "ballot",
    communicationMode: "silence",
  },
  PATCH_RESOLUTION: {
    title: "القرار الجماعي",
    instruction: "هذا التعديل أصبح جزءًا من روايتكم.",
    modeLabel: "الكلام مسموح",
    icon: "◉",
    tone: "talk",
    communicationMode: "talk",
  },
  STORY_UPDATE: {
    title: "راجعوا التعديل معًا",
    instruction: "هذه روايتكم بعد التعديل. تأكدوا أن الجميع فهمها قبل الفصل التالي.",
    modeLabel: "الكلام مسموح",
    icon: "◉",
    tone: "talk",
    communicationMode: "talk",
  },
  RESULT_CALCULATION: {
    title: "نحسب النتيجة",
    instruction: "نراجع الإجابات والأدلة قبل عرض النتيجة العامة.",
    modeLabel: "انتظار النتيجة",
    icon: "…",
    tone: "waiting",
    communicationMode: "waiting",
  },
  RESULT_REVEAL: {
    title: "النتيجة — تكلموا",
    instruction: "النتيجة عامة ومبنية على ما حدث في روايتكم.",
    modeLabel: "الكلام مسموح",
    icon: "◉",
    tone: "talk",
    communicationMode: "talk",
  },
};

export function WarehousePhaseBanner({ phase }: { phase: WarehousePhase }) {
  const message = PHASE_MESSAGES[phase];
  const priorMode = useRef<CommunicationMode | null>(null);
  const interstitialTimeout = useRef<number | null>(null);
  const [interstitial, setInterstitial] = useState<string | null>(null);

  useEffect(() => {
    const previous = priorMode.current;
    priorMode.current = message.communicationMode;
    if (
      previous === null ||
      previous === message.communicationMode ||
      message.communicationMode === "waiting" ||
      previous === "waiting"
    ) {
      return;
    }

    const text =
      message.communicationMode === "talk"
        ? "الآن تقدرون تتكلمون"
        : "الآن كل واحد يجاوب لحاله — بدون كلام";
    setInterstitial(text);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(message.communicationMode === "talk" ? 24 : [18, 28, 18]);
    }
    if (interstitialTimeout.current !== null) {
      window.clearTimeout(interstitialTimeout.current);
    }
    interstitialTimeout.current = window.setTimeout(() => {
      interstitialTimeout.current = null;
      setInterstitial(null);
    }, 2_000);
  }, [message.communicationMode, phase]);

  useEffect(
    () => () => {
      if (interstitialTimeout.current !== null) {
        window.clearTimeout(interstitialTimeout.current);
      }
    },
    [],
  );

  return (
    <>
      <section
        className="warehouse-phase-banner"
        data-testid="warehouse-phase-banner"
        data-tone={message.tone}
        aria-live="assertive"
        aria-atomic="true"
      >
        <span className="warehouse-phase-banner__icon" aria-hidden="true">
          {message.icon}
        </span>
        <div className="warehouse-phase-banner__copy">
          <strong>{message.title}</strong>
          <p>{message.instruction}</p>
        </div>
        <span className="warehouse-phase-banner__mode">{message.modeLabel}</span>
      </section>
      {interstitial && (
        <div
          className="warehouse-phase-interstitial"
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          data-testid="warehouse-phase-interstitial"
        >
          <span aria-hidden="true">{message.icon}</span>
          <strong>{interstitial}</strong>
        </div>
      )}
    </>
  );
}
