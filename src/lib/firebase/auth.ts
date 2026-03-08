import { writable, type Readable } from 'svelte/store';
import { isFirebaseConfigured } from '$lib/services/data-service';

/* ─── Local dev user (used when Firebase is not configured) ─── */

export interface LocalUser {
	uid: string;
	displayName: string | null;
	email: string | null;
	photoURL: string | null;
}

const LOCAL_DEV_USER: LocalUser = {
	uid: 'local-dev-user',
	displayName: 'Local Player',
	email: 'dev@localhost',
	photoURL: null
};

/* ─── Auth store ─── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthUser = LocalUser | any; // `any` = Firebase User when available

function createAuthStore(): Readable<AuthUser | null> & { init: () => void } {
	const { subscribe, set } = writable<AuthUser | null>(null);
	let initialized = false;

	return {
		subscribe,
		init() {
			if (initialized) return;
			initialized = true;

			if (!isFirebaseConfigured()) {
				// No Firebase → auto-sign-in as local dev user
				set(LOCAL_DEV_USER);
				return;
			}

			// Firebase configured → use real auth
			import('firebase/auth').then(({ onAuthStateChanged }) => {
				import('$lib/firebase/config').then(({ getFirebaseAuth }) => {
					onAuthStateChanged(getFirebaseAuth(), (user) => set(user));
				});
			});
		}
	};
}

export const authUser = createAuthStore();

export async function signIn(): Promise<void> {
	if (!isFirebaseConfigured()) {
		// Local dev: just set the local user (no-op if already set)
		authUser.init();
		return;
	}

	const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
	const { getFirebaseAuth } = await import('$lib/firebase/config');
	await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
}

export async function signOut(): Promise<void> {
	if (!isFirebaseConfigured()) {
		// Local dev: nothing to sign out from
		return;
	}

	const { signOut: firebaseSignOut } = await import('firebase/auth');
	const { getFirebaseAuth } = await import('$lib/firebase/config');
	await firebaseSignOut(getFirebaseAuth());
}

