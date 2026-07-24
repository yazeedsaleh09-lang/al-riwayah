"use client";

/**
 * Original synthesized audio cues (Web Audio API). No media files — every cue is
 * generated at runtime, so there are no licensing concerns (DESIGN_SYSTEM.md:
 * original or correctly licensed only). Sound never carries exclusive info,
 * never autoplays before a user gesture, and always respects the mute pref.
 */
import { getSound } from "./prefs";

export type Cue = "join" | "ready" | "lock" | "warn" | "contradiction" | "patch" | "evidence" | "verdict";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

const RECIPES: Record<Cue, { f: number; f2?: number; type: OscillatorType; dur: number; gain: number }> = {
  join: { f: 520, f2: 660, type: "sine", dur: 0.14, gain: 0.06 },
  ready: { f: 660, type: "triangle", dur: 0.1, gain: 0.06 },
  lock: { f: 200, f2: 120, type: "square", dur: 0.12, gain: 0.05 },
  warn: { f: 440, type: "sawtooth", dur: 0.09, gain: 0.05 },
  contradiction: { f: 150, f2: 90, type: "sawtooth", dur: 0.28, gain: 0.07 },
  patch: { f: 400, f2: 560, type: "triangle", dur: 0.18, gain: 0.06 },
  evidence: { f: 720, f2: 480, type: "sine", dur: 0.16, gain: 0.05 },
  verdict: { f: 330, f2: 495, type: "triangle", dur: 0.4, gain: 0.07 },
};

/** Play a cue if sound is enabled. Safe to call from any user-gesture handler. */
export function playCue(cue: Cue): void {
  if (!getSound()) return;
  const ac = audio();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const r = RECIPES[cue];
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = r.type;
  osc.frequency.setValueAtTime(r.f, now);
  if (r.f2) osc.frequency.linearRampToValueAtTime(r.f2, now + r.dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(r.gain, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + r.dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + r.dur + 0.02);
}
