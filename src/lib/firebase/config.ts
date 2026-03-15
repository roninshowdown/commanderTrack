/* ============================================
   Firebase — Lazy singleton initialisation
   ============================================ */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp;

function ensureApp(): FirebaseApp {
	if (!app) {
		app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
	}
	return app;
}

export function getFirebaseApp(): FirebaseApp {
	return ensureApp();
}

/* ─── Auth (lazy) ─── */
let _auth: import('firebase/auth').Auth;
let _authReady: Promise<import('firebase/auth').Auth> | null = null;

export function getFirebaseAuth(): import('firebase/auth').Auth {
	if (_auth) return _auth;
	/* Fallback: load synchronously if the module was already cached */
	const mod = (globalThis as any).__firebase_auth_mod;
	if (mod) {
		_auth = mod.getAuth(ensureApp());
		return _auth;
	}
	throw new Error('Call await ensureFirebaseAuth() before using getFirebaseAuth() synchronously.');
}

export async function ensureFirebaseAuth(): Promise<import('firebase/auth').Auth> {
	if (_auth) return _auth;
	if (_authReady) return _authReady;
	_authReady = import('firebase/auth').then((mod) => {
		(globalThis as any).__firebase_auth_mod = mod;
		_auth = mod.getAuth(ensureApp());
		return _auth;
	});
	return _authReady;
}

/* ─── Firestore (lazy) ─── */
const FIRESTORE_DB_ID = 'default';

let _db: import('firebase/firestore').Firestore;
let _dbReady: Promise<import('firebase/firestore').Firestore> | null = null;

export function getFirebaseDb(): import('firebase/firestore').Firestore {
	if (_db) return _db;
	const mod = (globalThis as any).__firebase_firestore_mod;
	if (mod) {
		_db = mod.getFirestore(ensureApp(), FIRESTORE_DB_ID);
		return _db;
	}
	throw new Error('Call await ensureFirebaseDb() before using getFirebaseDb() synchronously.');
}

export async function ensureFirebaseDb(): Promise<import('firebase/firestore').Firestore> {
	if (_db) return _db;
	if (_dbReady) return _dbReady;
	_dbReady = import('firebase/firestore').then((mod) => {
		(globalThis as any).__firebase_firestore_mod = mod;
		_db = mod.getFirestore(ensureApp(), FIRESTORE_DB_ID);
		return _db;
	});
	return _dbReady;
}

/* ─── Storage (lazy) ─── */
let _storage: import('firebase/storage').FirebaseStorage;
let _storageReady: Promise<import('firebase/storage').FirebaseStorage> | null = null;

export function getFirebaseStorage(): import('firebase/storage').FirebaseStorage {
	if (_storage) return _storage;
	const mod = (globalThis as any).__firebase_storage_mod;
	if (mod) {
		_storage = mod.getStorage(ensureApp());
		return _storage;
	}
	throw new Error('Call await ensureFirebaseStorage() before using getFirebaseStorage() synchronously.');
}

export async function ensureFirebaseStorage(): Promise<import('firebase/storage').FirebaseStorage> {
	if (_storage) return _storage;
	if (_storageReady) return _storageReady;
	_storageReady = import('firebase/storage').then((mod) => {
		(globalThis as any).__firebase_storage_mod = mod;
		_storage = mod.getStorage(ensureApp());
		return _storage;
	});
	return _storageReady;
}

