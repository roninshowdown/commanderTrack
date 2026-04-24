/* ============================================
   Audio Feedback — Web Audio API tones
   ============================================ */

const SOUNDS = {
	gain: [523.25, 659.25],
	loss: [329.63, 261.63],
	critical: [880, 0, 880],
	turnEnd: [440, 554.37, 659.25]
} as const;

const SOUND_PREFS_KEY = 'ct_sound_prefs';

export interface SoundPreferences {
	activeReactive: boolean;
	lifeGainLoss: boolean;
}

const DEFAULT_PREFS: SoundPreferences = {
	activeReactive: true,
	lifeGainLoss: true
};

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

export function getSoundPreferences(): SoundPreferences {
	try {
		const raw = localStorage.getItem(SOUND_PREFS_KEY);
		if (!raw) return { ...DEFAULT_PREFS };
		const parsed = JSON.parse(raw) as Partial<SoundPreferences>;
		return {
			activeReactive: parsed.activeReactive ?? DEFAULT_PREFS.activeReactive,
			lifeGainLoss: parsed.lifeGainLoss ?? DEFAULT_PREFS.lifeGainLoss
		};
	} catch {
		return { ...DEFAULT_PREFS };
	}
}

export function setSoundPreferences(next: SoundPreferences): void {
	localStorage.setItem(SOUND_PREFS_KEY, JSON.stringify(next));
}

export const playGainSound = () => { if (getSoundPreferences().lifeGainLoss) playSeq(SOUNDS.gain); };
export const playLossSound = () => { if (getSoundPreferences().lifeGainLoss) playSeq(SOUNDS.loss); };
export const playCriticalSound = () => { if (getSoundPreferences().activeReactive) playSeq(SOUNDS.critical); };
export const playTurnEndSound = () => { if (getSoundPreferences().activeReactive) playSeq(SOUNDS.turnEnd); };

