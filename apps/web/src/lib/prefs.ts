"use client";

/**
 * User presentation preferences (sound + motion). Persisted in localStorage and
 * applied to the document root so CSS can honor a manual reduced-motion override
 * in addition to the OS `prefers-reduced-motion` media query.
 */

export type MotionPref = "auto" | "reduced" | "full";

const SOUND_KEY = "alr:sound";
const MOTION_KEY = "alr:motion";

export function getSound(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem(SOUND_KEY) !== "off";
}

export function setSound(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

export function getMotion(): MotionPref {
  if (typeof localStorage === "undefined") return "auto";
  return (localStorage.getItem(MOTION_KEY) as MotionPref) ?? "auto";
}

export function applyMotion(pref: MotionPref): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (pref === "auto") root.removeAttribute("data-motion");
  else root.setAttribute("data-motion", pref);
}

export function setMotion(pref: MotionPref): void {
  try {
    localStorage.setItem(MOTION_KEY, pref);
  } catch {
    /* ignore */
  }
  applyMotion(pref);
}
