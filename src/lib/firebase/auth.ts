/* ============================================
   Auth Store — Google + Email/Password + Debug bypass
   ============================================ */

import { writable, type Readable } from 'svelte/store';
import { isDebugMode } from '$lib/utils/env';
import { isFirebaseConfigured } from '$lib/services/data-service';
import { logger } from '$lib/services/logger';

/* ─── Local dev user ─── */

export interface LocalUser {
	uid: string;
	displayName: string | null;
	email: string | null;
	photoURL: string | null;
}

const LOCAL_DEV_USER: LocalUser = {
	uid: 'local-dev-user',
	displayName: 'Dev Player',
	email: 'dev@localhost',
	photoURL: null
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthUser = LocalUser | any;

/* ─── Reactive store ─── */

function createAuthStore(): Readable<AuthUser | null> & {
	init: () => void;
	set: (u: AuthUser | null) => void;
} {
	const { subscribe, set } = writable<AuthUser | null>(null);
	let initialized = false;

	return {
		subscribe,
		set,
		init() {
			if (initialized) return;
			initialized = true;

			if (isDebugMode()) {
				set(LOCAL_DEV_USER);
				ensureProfile(LOCAL_DEV_USER.uid, null);
				return;
			}

			if (!isFirebaseConfigured()) {
				logger.error('auth.init', 'Firebase config missing while auth is required');
				set(null);
				return;
			}

			(async () => {
				try {
					const [{ onAuthStateChanged }, { ensureFirebaseAuth }] = await Promise.all([
						import('firebase/auth'),
						import('$lib/firebase/config')
					]);
					const auth = await ensureFirebaseAuth();
					onAuthStateChanged(auth, (user) => {
						set(user);
						if (user) ensureProfile(user.uid, user.photoURL);
					});
				} catch (e) {
									logger.error('auth.init', 'Failed to initialize Firebase Auth', e);
					set(null);
				}
			})();
		}
	};
}

/** Create profile on first login (image only, no name) */
async function ensureProfile(uid: string, photoURL: string | null): Promise<void> {
	try {
		const { getDataService } = await import('$lib/services/data-service');
		const ds = await getDataService();
		const existing = await ds.getAccountProfile(uid);
		if (!existing) {
			await ds.upsertAccountProfile(uid, { imageUrl: photoURL ?? undefined });
			logger.info('auth.ensureProfile', 'Created profile on first login', { uid });
		}
	} catch (e) {
		logger.warn('auth.ensureProfile', 'Failed to ensure profile', e);
	}
}

export const authUser = createAuthStore();

/* ─── Sign-in helpers ─── */

export async function signInWithGoogle(): Promise<void> {
	if (isDebugMode()) {
		authUser.set(LOCAL_DEV_USER);
		return;
	}
	const [{ signInWithPopup, GoogleAuthProvider }, { ensureFirebaseAuth }] = await Promise.all([
		import('firebase/auth'),
		import('$lib/firebase/config')
	]);
	const auth = await ensureFirebaseAuth();
	await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
	if (isDebugMode()) {
		authUser.set(LOCAL_DEV_USER);
		return;
	}
	const [{ signInWithEmailAndPassword }, { ensureFirebaseAuth }] = await Promise.all([
		import('firebase/auth'),
		import('$lib/firebase/config')
	]);
	const auth = await ensureFirebaseAuth();
	await signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email: string, password: string): Promise<void> {
	if (isDebugMode()) {
		authUser.set(LOCAL_DEV_USER);
		return;
	}
	const [{ createUserWithEmailAndPassword }, { ensureFirebaseAuth }] = await Promise.all([
		import('firebase/auth'),
		import('$lib/firebase/config')
	]);
	const auth = await ensureFirebaseAuth();
	await createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut(): Promise<void> {
	if (isDebugMode()) {
		authUser.set(null);
		return;
	}
	const [{ signOut: fbSignOut }, { ensureFirebaseAuth }] = await Promise.all([
		import('firebase/auth'),
		import('$lib/firebase/config')
	]);
	const auth = await ensureFirebaseAuth();
	await fbSignOut(auth);
}

