/* ============================================
   Data Service — Unified entry point
   Auto-detects Firebase config; falls back to
   localStorage when credentials are missing.
   ============================================ */

import type { DataService } from './data-service.interface';
import { LocalStorageService } from './local-storage.service';

let _instance: DataService | null = null;
let _initPromise: Promise<DataService> | null = null;

/** Returns true when real Firebase credentials are present */
export function isFirebaseConfigured(): boolean {
	const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
	return !!apiKey && apiKey !== 'your-api-key' && !apiKey.startsWith('your-');
}

/**
 * Get the singleton DataService instance.
 * - If Firebase is configured → FirebaseDataService (lazy-loaded)
 * - Otherwise → LocalStorageService (works offline, no login needed)
 * Falls back to LocalStorageService if Firebase fails to load within 10s.
 */
export async function getDataService(): Promise<DataService> {
	if (_instance) return _instance;
	if (_initPromise) return _initPromise;

	_initPromise = (async () => {
		if (isFirebaseConfigured()) {
			try {
				// Dynamic import with timeout so we never hang
				const importResult = await Promise.race([
					import('./firebase-data.service'),
					new Promise<never>((_, reject) =>
						setTimeout(() => reject(new Error('Firebase load timeout')), 10000)
					)
				]);
				_instance = new (importResult as { FirebaseDataService: new () => DataService }).FirebaseDataService();
			} catch (e) {
				console.warn('Firebase data service failed to load, falling back to localStorage:', e);
				_instance = new LocalStorageService();
			}
		} else {
			_instance = new LocalStorageService();
		}
		return _instance;
	})();

	return _initPromise;
}

/**
 * Synchronous getter — returns the instance if already initialised,
 * otherwise falls back to LocalStorageService immediately.
 * Used only for fire-and-forget persistence in game store callbacks.
 * Does NOT set _instance if Firebase init is pending, to avoid clobbering.
 */
export function getDataServiceSync(): DataService {
	if (_instance) return _instance;
	// Don't set _instance here if Firebase might be configured —
	// the async getDataService() should handle that.
	// Return a temporary LocalStorageService for fire-and-forget writes.
	if (isFirebaseConfigured()) {
		return new LocalStorageService();
	}
	_instance = new LocalStorageService();
	return _instance;
}

