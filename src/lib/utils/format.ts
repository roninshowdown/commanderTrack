/** Format seconds into MM:SS or HH:MM:SS */
export function formatTime(totalSeconds: number): string {
	if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;

	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.floor(totalSeconds % 60);

	const mm = String(minutes).padStart(2, '0');
	const ss = String(seconds).padStart(2, '0');

	if (hours > 0) {
		return `${hours}:${mm}:${ss}`;
	}
	return `${mm}:${ss}`;
}

/** Format a timestamp to locale time string */
export function formatTimestamp(ts: number): string {
	return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Generate a simple unique ID */
export function uid(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

