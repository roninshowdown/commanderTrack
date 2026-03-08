/* ============================================
   Firebase Data Service
   Wraps Firestore calls behind DataService interface
   ============================================ */

import {
	collection,
	doc,
	getDocs,
	getDoc,
	updateDoc,
	deleteDoc,
	addDoc,
	query,
	where,
	orderBy,
	type DocumentData
} from 'firebase/firestore';
import { getFirebaseDb } from '$lib/firebase/config';
import type { Player, Deck, GameRecord, LogEntry } from '$lib/models/types';
import type { DataService } from './data-service.interface';

export class FirebaseDataService implements DataService {
	/* ─── Players ─── */

	async getPlayers(): Promise<Player[]> {
		const snap = await getDocs(collection(getFirebaseDb(), 'players'));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
	}

	async getPlayer(id: string): Promise<Player | null> {
		const snap = await getDoc(doc(getFirebaseDb(), 'players', id));
		return snap.exists() ? ({ id: snap.id, ...snap.data() } as Player) : null;
	}

	async createPlayer(player: Omit<Player, 'id'>): Promise<string> {
		const ref = await addDoc(collection(getFirebaseDb(), 'players'), player);
		return ref.id;
	}

	async updatePlayer(id: string, data: Partial<Omit<Player, 'id'>>): Promise<void> {
		await updateDoc(doc(getFirebaseDb(), 'players', id), data as DocumentData);
	}

	async deletePlayer(id: string): Promise<void> {
		const decks = await this.getDecksForPlayer(id);
		for (const deck of decks) {
			await deleteDoc(doc(getFirebaseDb(), 'decks', deck.id));
		}
		await deleteDoc(doc(getFirebaseDb(), 'players', id));
	}

	/* ─── Decks ─── */

	async getDecks(): Promise<Deck[]> {
		const snap = await getDocs(collection(getFirebaseDb(), 'decks'));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck);
	}

	async getDecksForPlayer(playerId: string): Promise<Deck[]> {
		const q = query(collection(getFirebaseDb(), 'decks'), where('playerId', '==', playerId));
		const snap = await getDocs(q);
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck);
	}

	async createDeck(deck: Omit<Deck, 'id'>): Promise<string> {
		const ref = await addDoc(collection(getFirebaseDb(), 'decks'), deck);
		return ref.id;
	}

	async updateDeck(id: string, data: Partial<Omit<Deck, 'id'>>): Promise<void> {
		await updateDoc(doc(getFirebaseDb(), 'decks', id), data as DocumentData);
	}

	async deleteDeck(id: string): Promise<void> {
		await deleteDoc(doc(getFirebaseDb(), 'decks', id));
	}

	/* ─── Game Records ─── */

	async saveGameRecord(record: Omit<GameRecord, 'id'>): Promise<string> {
		const ref = await addDoc(collection(getFirebaseDb(), 'games'), record);
		return ref.id;
	}

	async getGameRecords(): Promise<GameRecord[]> {
		const q = query(collection(getFirebaseDb(), 'games'), orderBy('createdAt', 'desc'));
		const snap = await getDocs(q);
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRecord);
	}

	async updateGameRecord(id: string, data: Partial<Omit<GameRecord, 'id'>>): Promise<void> {
		await updateDoc(doc(getFirebaseDb(), 'games', id), data as DocumentData);
	}

	/* ─── Log Entries ─── */

	async addLogEntry(entry: Omit<LogEntry, 'id'>): Promise<string> {
		const ref = await addDoc(collection(getFirebaseDb(), 'gameLogs'), entry);
		return ref.id;
	}

	async getLogEntriesForGame(gameId: string): Promise<LogEntry[]> {
		const q = query(
			collection(getFirebaseDb(), 'gameLogs'),
			where('gameId', '==', gameId),
			orderBy('timestamp', 'desc')
		);
		const snap = await getDocs(q);
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LogEntry);
	}

	async getAllLogEntries(): Promise<LogEntry[]> {
		const q = query(collection(getFirebaseDb(), 'gameLogs'), orderBy('timestamp', 'desc'));
		const snap = await getDocs(q);
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LogEntry);
	}
}

