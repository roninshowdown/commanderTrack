/* ============================================
   Firebase Storage — Player image uploads
   ============================================ */

import { ensureFirebaseStorage, ensureFirebaseAuth } from '$lib/firebase/config';

/**
 * Upload a player image to Firebase Storage.
 * Returns the public download URL.
 */
export async function uploadPlayerImage(file: File, uidOverride?: string): Promise<string> {
	const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
	const storage = await ensureFirebaseStorage();
	const auth = await ensureFirebaseAuth();
	const uid = uidOverride ?? auth.currentUser?.uid;
	if (!uid) throw new Error('No authenticated user for avatar upload');
	const ext = file.name.split('.').pop() ?? 'png';
	const path = `players/${uid}/${Date.now()}.${ext}`;
	const snap = await uploadBytes(ref(storage, path), file, { contentType: file.type });
	return getDownloadURL(snap.ref);
}

