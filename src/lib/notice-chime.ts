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

export function playChime() {
    const ctx = context();
    if (!ctx || ctx.state !== "running") return;
    const start = ctx.currentTime;
    [523.25, 659.25].forEach((frequency, index) => {
        const tone = ctx.createOscillator();
        const level = ctx.createGain();
        const at = start + index * 0.12;
        tone.type = "sine";
        tone.frequency.value = frequency;
        level.gain.setValueAtTime(0.0001, at);
        level.gain.exponentialRampToValueAtTime(0.05, at + 0.02);
        level.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
        tone.connect(level);
        level.connect(ctx.destination);
        tone.start(at);
        tone.stop(at + 0.3);
    });
}
