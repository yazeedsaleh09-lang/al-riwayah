"use client";

import { useEffect, useRef, useState } from "react";

export function useDeadlineExpired(deadlineAt: number | null, serverTime: number) {
  const [, force] = useState(0);
  const anchor = useRef({
    deadlineAt,
    serverTime,
    receivedAt: Date.now(),
  });

  if (
    anchor.current.deadlineAt !== deadlineAt ||
    anchor.current.serverTime !== serverTime
  ) {
    anchor.current = {
      deadlineAt,
      serverTime,
      receivedAt: Date.now(),
    };
  }

  useEffect(() => {
    if (deadlineAt === null) return;
    const id = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [deadlineAt]);

  if (deadlineAt === null) {
    return { expired: false, seconds: null };
  }

  const calibratedNow =
    anchor.current.serverTime + (Date.now() - anchor.current.receivedAt);
  const remainingMs = Math.max(0, deadlineAt - calibratedNow);
  const seconds = Math.ceil(remainingMs / 1000);

  return { expired: seconds === 0, seconds };
}

/** Countdown display calibrated to server time. Never drives phase change —
 * the server transition is authoritative. Includes a text alternative. */
export function DeadlineRing({
  deadlineAt,
  serverTime,
}: {
  deadlineAt: number | null;
  serverTime: number;
}) {
  const { expired, seconds } = useDeadlineExpired(deadlineAt, serverTime);
  if (seconds === null) return null;
  const urgent = seconds <= 5;

  return (
    <span
      className={`deadline-ring ${urgent ? "is-urgent" : ""} ${expired ? "is-expired" : ""}`}
      role="timer"
      aria-live="off"
      aria-label={expired ? "انتهى وقت الإجابة" : `الوقت المتبقي ${seconds} ثانية`}
    >
      {expired ? "انتهى" : seconds}
    </span>
  );
}
