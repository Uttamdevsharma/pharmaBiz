/**
 * Hardware & POS confirmation audio beeps powered by Web Audio API.
 * Zero external audio assets required; operates instantly offline.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Play a POS hardware confirmation beep.
 * @param type "success" for pleasant high-pitched barcode scan tone, "error" for warning buzz.
 */
export function playBeep(type: "success" | "error" = "success") {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "success") {
      // Pleasant high-frequency POS register confirmation beep (1760 Hz / A6)
      osc.type = "sine";
      osc.frequency.setValueAtTime(1760, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else {
      // Distinct low buzzer for not found / out of stock / expired
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch (err) {
    console.warn("[playBeep] AudioContext failed:", err);
  }
}

