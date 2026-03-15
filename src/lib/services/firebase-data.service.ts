/* ============================================
   Firebase Data Service (Firestore)
   ============================================ */

import {
	collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
	query, where, orderBy, type DocumentData, type Firestore
} from 'firebase/firestore';
import { ensureFirebaseDb } from '$lib/firebase/config';
import type { Player, Deck, GameRecord, LogEntry } from '$lib/models/types';
import type { DataService } from './data-service.interface';

function withTimeout<T>(p: Promise<T>, ms = 8000, label = 'Firestore'): Promise<T> {
	return Promise.race([
		p,
		new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out (${ms}ms)`)), ms))
	]);
}

export class FirebaseDataService implements DataService {
	private _db: Firestore | null = null;

	private async db(): Promise<Firestore> {
		if (!this._db) this._db = await ensureFirebaseDb();
		return this._db;
	}

	private async col(name: string) {
		return collection(await this.db(), name);
	}

	/* ── Players ── */
	async getPlayers(): Promise<Player[]> {
		const snap = await withTimeout(getDocs(await this.col('players')));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
	}
	async getPlayer(id: string): Promise<Player | null> {
		const snap = await withTimeout(getDoc(doc(await this.db(), 'players', id)));
		return snap.exists() ? ({ id: snap.id, ...snap.data() } as Player) : null;
	}
	async createPlayer(player: Omit<Player, 'id'>): Promise<string> {
		const r = await withTimeout(addDoc(await this.col('players'), player));
		return r.id;
	}
	async updatePlayer(id: string, data: Partial<Omit<Player, 'id'>>): Promise<void> {
		await withTimeout(updateDoc(doc(await this.db(), 'players', id), data as DocumentData));
	}
	async deletePlayer(id: string): Promise<void> {
		const db = await this.db();
		const decks = await this.getDecksForPlayer(id);
		for (const d of decks) await deleteDoc(doc(db, 'decks', d.id));
		await deleteDoc(doc(db, 'players', id));
	}

	/* ── Decks ── */
	async getDecks(): Promise<Deck[]> {
		const snap = await withTimeout(getDocs(await this.col('decks')));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck);
	}
	async getDecksForPlayer(playerId: string): Promise<Deck[]> {
		const q = query(await this.col('decks'), where('playerId', '==', playerId));
		const snap = await withTimeout(getDocs(q));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Deck);
	}
	async createDeck(deck: Omit<Deck, 'id'>): Promise<string> {
		const r = await withTimeout(addDoc(await this.col('decks'), deck));
		return r.id;
	}
	async updateDeck(id: string, data: Partial<Omit<Deck, 'id'>>): Promise<void> {
		await withTimeout(updateDoc(doc(await this.db(), 'decks', id), data as DocumentData));
	}
	async deleteDeck(id: string): Promise<void> {
		await withTimeout(deleteDoc(doc(await this.db(), 'decks', id)));
	}

	/* ── Game Records ── */
	async saveGameRecord(record: Omit<GameRecord, 'id'>): Promise<string> {
		const r = await withTimeout(addDoc(await this.col('games'), record));
		return r.id;
	}
	async getGameRecords(): Promise<GameRecord[]> {
		const q = query(await this.col('games'), orderBy('createdAt', 'desc'));
		const snap = await withTimeout(getDocs(q));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRecord);
	}
	async updateGameRecord(id: string, data: Partial<Omit<GameRecord, 'id'>>): Promise<void> {
		await withTimeout(updateDoc(doc(await this.db(), 'games', id), data as DocumentData));
	}

	/* ── Log Entries ── */
	async addLogEntry(entry: Omit<LogEntry, 'id'>): Promise<string> {
		const r = await withTimeout(addDoc(await this.col('gameLogs'), entry));
		return r.id;
	}
	async getLogEntriesForGame(gameId: string): Promise<LogEntry[]> {
		const q = query(await this.col('gameLogs'), where('gameId', '==', gameId), orderBy('timestamp', 'desc'));
		const snap = await withTimeout(getDocs(q));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LogEntry);
	}
	async getAllLogEntries(): Promise<LogEntry[]> {
		const q = query(await this.col('gameLogs'), orderBy('timestamp', 'desc'));
		const snap = await withTimeout(getDocs(q));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LogEntry);
	}
}

