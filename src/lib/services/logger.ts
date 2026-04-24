/* ============================================
   Structured Logger (client-side ring buffer)
   ============================================ */

export type LogLevel = 'error' | 'warn' | 'info';

export interface AppLogEntry {
	id: string;
	timestamp: number;
	level: LogLevel;
	source: string;
	message: string;
	context?: unknown;
}

const LOG_KEY = 'ct_log';
const LOG_EVENT = 'ct-log-updated';
const LOG_CAP = 500;

function canUseStorage(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function toErrorContext(value: unknown): unknown {
	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
			stack: value.stack
		};
	}
	return value;
}

function readLogs(): AppLogEntry[] {
	if (!canUseStorage()) return [];
	try {
		const raw = localStorage.getItem(LOG_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as AppLogEntry[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function writeLogs(entries: AppLogEntry[]): void {
	if (!canUseStorage()) return;
	try {
		localStorage.setItem(LOG_KEY, JSON.stringify(entries));
		window.dispatchEvent(new CustomEvent(LOG_EVENT));
	} catch {
		// Ignore storage failures to avoid recursive logging during quota errors.
	}
}

function createEntry(level: LogLevel, source: string, message: string, context?: unknown): AppLogEntry {
	return {
		id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		timestamp: Date.now(),
		level,
		source,
		message,
		...(context === undefined ? {} : { context: toErrorContext(context) })
	};
}

function append(level: LogLevel, source: string, message: string, context?: unknown): void {
	const entry = createEntry(level, source, message, context);
	const next = [entry, ...readLogs()].slice(0, LOG_CAP);
	writeLogs(next);

	if (import.meta.env.DEV) {
		const args = [`[${source}] ${message}`, context];
		if (level === 'error') console.error(...args);
		else if (level === 'warn') console.warn(...args);
		else console.info(...args);
	}
}

export const logger = {
	info(source: string, message: string, context?: unknown): void {
		append('info', source, message, context);
	},
	warn(source: string, message: string, context?: unknown): void {
		append('warn', source, message, context);
	},
	error(source: string, message: string, context?: unknown): void {
		append('error', source, message, context);
	},
	getAll(): AppLogEntry[] {
		return readLogs();
	},
	clear(): void {
		if (!canUseStorage()) return;
		localStorage.removeItem(LOG_KEY);
		window.dispatchEvent(new CustomEvent(LOG_EVENT));
	},
	toJson(): string {
		return JSON.stringify(readLogs(), null, 2);
	},
	subscribe(callback: () => void): () => void {
		if (typeof window === 'undefined') return () => undefined;
		const handler = () => callback();
		window.addEventListener(LOG_EVENT, handler);
		return () => window.removeEventListener(LOG_EVENT, handler);
	}
};

export { LOG_KEY, LOG_CAP };
