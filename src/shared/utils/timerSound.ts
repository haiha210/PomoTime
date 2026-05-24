type AudioContextConstructor = typeof AudioContext;

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: AudioContextConstructor;
}

let cachedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (cachedContext) {
    return cachedContext;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const Ctor =
    window.AudioContext ||
    (window as WindowWithWebkitAudio).webkitAudioContext ||
    null;

  if (!Ctor) {
    return null;
  }

  try {
    cachedContext = new Ctor();
    return cachedContext;
  } catch {
    return null;
  }
}

function playBeep(ctx: AudioContext, frequencyHz: number, startOffsetSec: number, durationSec: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequencyHz;

  const startAt = ctx.currentTime + startOffsetSec;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationSec + 0.05);
}

export function playPhaseEndChime(): void {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }

  // Three short ascending beeps.
  playBeep(ctx, 660, 0, 0.18);
  playBeep(ctx, 880, 0.22, 0.18);
  playBeep(ctx, 1100, 0.44, 0.28);
}
