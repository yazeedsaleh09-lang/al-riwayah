"use client";

import { useEffect, useState } from "react";

/** Countdown display calibrated to server time. Never drives phase change —
 * the server transition is authoritative. Includes a text alternative. */
export function DeadlineRing({
  deadlineAt,
  serverTime,
}: {
  deadlineAt: number | null;
  serverTime: number;
}) {
  const [, force] = useState(0);
  const receivedAt = useState(() => Date.now())[0];

  useEffect(() => {
    if (deadlineAt === null) return;
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [deadlineAt]);

  if (deadlineAt === null) return null;
  const offset = Date.now() - receivedAt;
  const remainingMs = Math.max(0, deadlineAt - serverTime - offset);
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = seconds <= 5;

  return (
    <span
      className={`deadline-ring ${urgent ? "is-urgent" : ""}`}
      role="timer"
      aria-live="off"
      aria-label={`الوقت المتبقي ${seconds} ثانية`}
    >
      {seconds}
    </span>
  );
}
