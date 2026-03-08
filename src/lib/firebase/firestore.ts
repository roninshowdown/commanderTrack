import {
	collection,
	doc,
	getDocs,
	getDoc,
	setDoc,
	updateDoc,
	deleteDoc,
	addDoc,
	query,
	where,
	orderBy,
	type DocumentData
} from 'firebase/firestore';
import { getFirebaseDb } from './config';
import type { Player, Deck, GameRecord, LogEntry } from '$lib/models/types';

/* ─── Players ─── */

export async function getPlayers(): Promise<Player[]> {
	const snap = await getDocs(collection(getFirebaseDb(), 'players'));
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
}

export async function getPlayer(id: string): Promise<Player | null> {
	const snap = await getDoc(doc(getFirebaseDb(), 'players', id));
	return snap.exists() ? ({ id: snap.id, ...snap.data() } as Player) : null;
}

export async function createPlayer(player: Omit<Player, 'id'>): Promise<string> {
	const ref = await addDoc(collection(getFirebaseDb(), 'players'), player);
	return ref.id;
}

export async function updatePlayer(id: string, data: Partial<Omit<Player, 'id'>>): Promise<void> {
	await updateDoc(doc(getFirebaseDb(), 'players', id), data as DocumentData);
}

export async function deletePlayer(id: string): Promise<void> {
	// Also delete all decks belonging to this player
	const decks = await getDecksForPlayer(id);
	for (const deck of decks) {
		await deleteDoc(doc(getFirebaseDb(), 'decks', deck.id));
	}
	await deleteDoc(doc(getFirebaseDb(), 'players', id));
}

/* ─── Decks ─── */

export async function getDecks(): Promise<Deck[]> {
	const snap = await getDocs(collection(getFirebaseDb(), 'decks'));
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck);
}

export async function getDecksForPlayer(playerId: string): Promise<Deck[]> {
	const q = query(collection(getFirebaseDb(), 'decks'), where('playerId', '==', playerId));
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck);
}

export async function createDeck(deck: Omit<Deck, 'id'>): Promise<string> {
	const ref = await addDoc(collection(getFirebaseDb(), 'decks'), deck);
	return ref.id;
}

export async function updateDeck(id: string, data: Partial<Omit<Deck, 'id'>>): Promise<void> {
	await updateDoc(doc(getFirebaseDb(), 'decks', id), data as DocumentData);
}

export async function deleteDeck(id: string): Promise<void> {
	await deleteDoc(doc(getFirebaseDb(), 'decks', id));
}

/* ─── Game Records ─── */

export async function saveGameRecord(record: Omit<GameRecord, 'id'>): Promise<string> {
	const ref = await addDoc(collection(getFirebaseDb(), 'games'), record);
	return ref.id;
}

export async function getGameRecords(): Promise<GameRecord[]> {
	const q = query(collection(getFirebaseDb(), 'games'), orderBy('createdAt', 'desc'));
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRecord);
}

export async function updateGameRecord(id: string, data: Partial<Omit<GameRecord, 'id'>>): Promise<void> {
	await updateDoc(doc(getFirebaseDb(), 'games', id), data as DocumentData);
}

/* ─── Log Entries ─── */

export async function addLogEntry(entry: Omit<LogEntry, 'id'>): Promise<string> {
	const ref = await addDoc(collection(getFirebaseDb(), 'gameLogs'), entry);
	return ref.id;
}

export async function getLogEntriesForGame(gameId: string): Promise<LogEntry[]> {
	const q = query(
		collection(getFirebaseDb(), 'gameLogs'),
		where('gameId', '==', gameId),
		orderBy('timestamp', 'desc')
	);
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LogEntry);
}

export async function getAllLogEntries(): Promise<LogEntry[]> {
	const q = query(collection(getFirebaseDb(), 'gameLogs'), orderBy('timestamp', 'desc'));
	const snap = await getDocs(q);
	return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LogEntry);
}

