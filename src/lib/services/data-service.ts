/* ============================================
   Data Service — Unified entry point
   Auto-detects Firebase config; falls back to
   localStorage when credentials are missing.
   ============================================ */

import type { DataService } from './data-service.interface';
import { LocalStorageService } from './local-storage.service';

let _instance: DataService | null = null;

/** Returns true when real Firebase credentials are present */
export function isFirebaseConfigured(): boolean {
	const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
	return !!apiKey && apiKey !== 'your-api-key' && !apiKey.startsWith('your-');
}

/**
 * Get the singleton DataService instance.
 * - If Firebase is configured → FirebaseDataService (lazy-loaded)
 * - Otherwise → LocalStorageService (works offline, no login needed)
 */
export async function getDataService(): Promise<DataService> {
	if (_instance) return _instance;

	if (isFirebaseConfigured()) {
		// Dynamic import so Firebase SDK is never loaded when not needed
		const { FirebaseDataService } = await import('./firebase-data.service');
		_instance = new FirebaseDataService();
	} else {
		_instance = new LocalStorageService();
	}

	return _instance;
}

/**
 * Synchronous getter — returns the instance if already initialised,
 * otherwise falls back to LocalStorageService immediately.
 * Handy for call-sites that cannot be async.
 */
export function getDataServiceSync(): DataService {
	if (_instance) return _instance;
	// Safe fallback — will be replaced on first async call if Firebase is configured
	_instance = new LocalStorageService();
	return _instance;
}

