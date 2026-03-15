/** Format seconds → MM:SS or HH:MM:SS */
export function formatTime(totalSeconds: number): string {
	if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = Math.floor(totalSeconds % 60);
	const mm = String(m).padStart(2, '0');
	const ss = String(s).padStart(2, '0');
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Format epoch ms → HH:MM:SS locale string */
export function formatTimestamp(ts: number): string {
	return new Date(ts).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
}

/** Simple unique ID */
export function uid(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

