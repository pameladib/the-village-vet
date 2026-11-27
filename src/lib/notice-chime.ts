let audio: AudioContext | null = null;

function context() {
    const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!audio) audio = new Ctx();
    return audio;
}

// Browsers block sound until the person has tapped or typed on the page.
export function armChime() {
    const ctx = context();
    if (ctx && ctx.state === "suspended") void ctx.resume();
}

function strike(ctx: AudioContext, at: number, frequency: number, peak: number, decay: number) {
    const tone = ctx.createOscillator();
    const level = ctx.createGain();
    tone.type = "sine";
    tone.frequency.value = frequency;
    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + 0.012);
    level.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    tone.connect(level);
    level.connect(ctx.destination);
    tone.start(at);
    tone.stop(at + decay + 0.02);
}

// Two high notes with a softer octave above each one, loud enough to hear over the clinic.
export function playChime() {
    const ctx = context();
    if (!ctx || ctx.state !== "running") return;
    const start = ctx.currentTime;
    const notes = [
        { frequency: 1318.51, delay: 0, decay: 0.42, peak: 0.34 },
        { frequency: 1760, delay: 0.14, decay: 0.55, peak: 0.3 },
    ];
    for (const note of notes) {
        const at = start + note.delay;
        strike(ctx, at, note.frequency, note.peak, note.decay);
        strike(ctx, at, note.frequency * 2, note.peak * 0.16, note.decay * 0.5);
    }
}
