/* ============================================
   Audio Feedback — Web Audio API tones
   ============================================ */

const SOUNDS = {
	gain: [523.25, 659.25],
	loss: [329.63, 261.63],
	critical: [880, 0, 880],
	turnEnd: [440, 554.37, 659.25]
} as const;

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
	if (!ctx) ctx = new AudioContext();
	return ctx;
}

function playTone(freq: number, dur: number, start: number): void {
	if (freq === 0) return;
	const c = getCtx();
	const osc = c.createOscillator();
	const gain = c.createGain();
	osc.type = 'sine';
	osc.frequency.value = freq;
	gain.gain.setValueAtTime(0.1, start);
	gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
	osc.connect(gain).connect(c.destination);
	osc.start(start);
	osc.stop(start + dur);
}

function playSeq(freqs: readonly number[]): void {
	const c = getCtx();
	const now = c.currentTime;
	const note = 0.12;
	freqs.forEach((f, i) => playTone(f, note, now + i * note));
}

export const playGainSound = () => playSeq(SOUNDS.gain);
export const playLossSound = () => playSeq(SOUNDS.loss);
export const playCriticalSound = () => playSeq(SOUNDS.critical);
export const playTurnEndSound = () => playSeq(SOUNDS.turnEnd);

