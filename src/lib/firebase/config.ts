/* ============================================
   Firebase — Lazy singleton initialisation
   All Firebase modules are dynamically imported
   to comply with REQ-EXT-009.
   ============================================ */

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID
};

/* ─── App (lazy) ─── */
let _app: import('firebase/app').FirebaseApp;
let _appReady: Promise<import('firebase/app').FirebaseApp> | null = null;

async function ensureApp(): Promise<import('firebase/app').FirebaseApp> {
	if (_app) return _app;
	if (_appReady) return _appReady;
	_appReady = import('firebase/app').then((mod) => {
		_app = !mod.getApps().length ? mod.initializeApp(firebaseConfig) : mod.getApps()[0];
		return _app;
	});
	return _appReady;
}

export async function getFirebaseApp(): Promise<import('firebase/app').FirebaseApp> {
	return ensureApp();
}

/* ─── Auth (lazy) ─── */
let _auth: import('firebase/auth').Auth;
let _authReady: Promise<import('firebase/auth').Auth> | null = null;

export function getFirebaseAuth(): import('firebase/auth').Auth {
	if (_auth) return _auth;
	throw new Error('Call await ensureFirebaseAuth() before using getFirebaseAuth() synchronously.');
}

export async function ensureFirebaseAuth(): Promise<import('firebase/auth').Auth> {
	if (_auth) return _auth;
	if (_authReady) return _authReady;
	_authReady = (async () => {
		const [mod, app] = await Promise.all([import('firebase/auth'), ensureApp()]);
		_auth = mod.getAuth(app);
		return _auth;
	})();
	return _authReady;
}

/* ─── Firestore (lazy) ─── */
const FIRESTORE_DB_ID = 'default';

let _db: import('firebase/firestore').Firestore;
let _dbReady: Promise<import('firebase/firestore').Firestore> | null = null;

export function getFirebaseDb(): import('firebase/firestore').Firestore {
	if (_db) return _db;
	throw new Error('Call await ensureFirebaseDb() before using getFirebaseDb() synchronously.');
}

export async function ensureFirebaseDb(): Promise<import('firebase/firestore').Firestore> {
	if (_db) return _db;
	if (_dbReady) return _dbReady;
	_dbReady = (async () => {
		const [mod, app] = await Promise.all([import('firebase/firestore'), ensureApp()]);
		_db = mod.getFirestore(app, FIRESTORE_DB_ID);
		return _db;
	})();
	return _dbReady;
}

/* ─── Storage (lazy) ─── */
let _storage: import('firebase/storage').FirebaseStorage;
let _storageReady: Promise<import('firebase/storage').FirebaseStorage> | null = null;

export function getFirebaseStorage(): import('firebase/storage').FirebaseStorage {
	if (_storage) return _storage;
	throw new Error('Call await ensureFirebaseStorage() before using getFirebaseStorage() synchronously.');
}

export async function ensureFirebaseStorage(): Promise<import('firebase/storage').FirebaseStorage> {
	if (_storage) return _storage;
	if (_storageReady) return _storageReady;
	_storageReady = (async () => {
		const [mod, app] = await Promise.all([import('firebase/storage'), ensureApp()]);
		_storage = mod.getStorage(app);
		return _storage;
	})();
	return _storageReady;
}

