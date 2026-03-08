const SOUNDS = {
	gain: [523.25, 659.25], // C5 → E5
	loss: [329.63, 261.63], // E4 → C4
	critical: [880, 0, 880], // A5 beep
	turnEnd: [440, 554.37, 659.25] // A4 → C#5 → E5
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
	if (!audioCtx) {
		audioCtx = new AudioContext();
	}
	return audioCtx;
}

function playTone(frequency: number, duration: number, startTime: number): void {
	const ctx = getAudioContext();
	if (frequency === 0) return; // silence

	const oscillator = ctx.createOscillator();
	const gainNode = ctx.createGain();

	oscillator.type = 'sine';
	oscillator.frequency.value = frequency;
	gainNode.gain.value = 0.1;

	// Fade out
	gainNode.gain.setValueAtTime(0.1, startTime);
	gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

	oscillator.connect(gainNode);
	gainNode.connect(ctx.destination);

	oscillator.start(startTime);
	oscillator.stop(startTime + duration);
}

function playSequence(frequencies: number[]): void {
	const ctx = getAudioContext();
	const now = ctx.currentTime;
	const noteDuration = 0.12;

	frequencies.forEach((freq, i) => {
		playTone(freq, noteDuration, now + i * noteDuration);
	});
}

export function playGainSound(): void {
	playSequence(SOUNDS.gain);
}

export function playLossSound(): void {
	playSequence(SOUNDS.loss);
}

export function playCriticalSound(): void {
	playSequence(SOUNDS.critical);
}

export function playTurnEndSound(): void {
	playSequence(SOUNDS.turnEnd);
}

