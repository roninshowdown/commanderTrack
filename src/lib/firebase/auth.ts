/* ============================================
   Auth Store — Google + Email/Password + Debug bypass
   ============================================ */

import { writable, type Readable } from 'svelte/store';
import { isDebugMode } from '$lib/utils/env';
import { isFirebaseConfigured } from '$lib/services/data-service';

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
				return;
			}

			if (!isFirebaseConfigured()) {
				console.error('[auth] Firebase config missing — auth required in production.');
				set(null);
				return;
			}

			import('firebase/auth').then(({ onAuthStateChanged }) => {
				import('$lib/firebase/config').then(({ ensureFirebaseAuth }) => {
					ensureFirebaseAuth().then((auth) => {
						onAuthStateChanged(auth, (user) => set(user));
					});
				});
			});
		}
	};
}

export const authUser = createAuthStore();

/* ─── Sign-in helpers ─── */

export async function signInWithGoogle(): Promise<void> {
	if (isDebugMode()) {
		authUser.set(LOCAL_DEV_USER);
		return;
	}
	const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
	const { ensureFirebaseAuth } = await import('$lib/firebase/config');
	const auth = await ensureFirebaseAuth();
	await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
	if (isDebugMode()) {
		authUser.set(LOCAL_DEV_USER);
		return;
	}
	const { signInWithEmailAndPassword } = await import('firebase/auth');
	const { ensureFirebaseAuth } = await import('$lib/firebase/config');
	const auth = await ensureFirebaseAuth();
	await signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email: string, password: string): Promise<void> {
	if (isDebugMode()) {
		authUser.set(LOCAL_DEV_USER);
		return;
	}
	const { createUserWithEmailAndPassword } = await import('firebase/auth');
	const { ensureFirebaseAuth } = await import('$lib/firebase/config');
	const auth = await ensureFirebaseAuth();
	await createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut(): Promise<void> {
	if (isDebugMode()) {
		authUser.set(null);
		return;
	}
	const { signOut: fbSignOut } = await import('firebase/auth');
	const { ensureFirebaseAuth } = await import('$lib/firebase/config');
	const auth = await ensureFirebaseAuth();
	await fbSignOut(auth);
}

