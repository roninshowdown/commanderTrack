/* ============================================
   Data Service — Unified entry point
   Firebase in production, localStorage only in debug.
   ============================================ */

import type { DataService } from './data-service.interface';
import { LocalStorageService } from './local-storage.service';
import { isDebugMode } from '$lib/utils/env';

let _instance: DataService | null = null;
let _initPromise: Promise<DataService> | null = null;

/** True when real Firebase credentials are present */
export function isFirebaseConfigured(): boolean {
	const key = import.meta.env.VITE_FIREBASE_API_KEY;
	return !!key && key !== 'your-api-key' && !key.startsWith('your-');
}

/**
 * Async singleton getter.
 * - Firebase configured → FirebaseDataService (lazy-loaded)
 * - Debug mode w/o Firebase → LocalStorageService
 * - Otherwise → error (prod requires Firebase)
 */
export async function getDataService(): Promise<DataService> {
	if (_instance) return _instance;
	if (_initPromise) return _initPromise;

	_initPromise = (async () => {
		if (isFirebaseConfigured()) {
			try {
				const mod = await Promise.race([
					import('./firebase-data.service'),
					new Promise<never>((_, r) => setTimeout(() => r(new Error('Firebase load timeout')), 5000))
				]);
				_instance = new (mod as { FirebaseDataService: new () => DataService }).FirebaseDataService();
			} catch (e) {
				console.warn('[data-service] Firebase failed, falling back to localStorage:', e);
				_instance = new LocalStorageService();
			}
		} else if (isDebugMode()) {
			_instance = new LocalStorageService();
		} else {
			throw new Error('Firebase configuration required in production. Set VITE_FIREBASE_API_KEY or enable debug mode.');
		}
		return _instance;
	})();

	return _initPromise;
}

/**
 * Sync getter for fire-and-forget writes during gameplay.
 */
export function getDataServiceSync(): DataService {
	if (_instance) return _instance;
	if (isFirebaseConfigured()) return new LocalStorageService(); // temp fallback while async init
	if (isDebugMode()) {
		_instance = new LocalStorageService();
		return _instance;
	}
	throw new Error('Firebase configuration required in production.');
}

