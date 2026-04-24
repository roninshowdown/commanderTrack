/* ============================================
   Firebase Data Service (Firestore)
   ============================================ */

import {
	collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, setDoc,
	query, where, orderBy,
	type DocumentData, type Firestore
} from 'firebase/firestore';
import { ensureFirebaseDb } from '$lib/firebase/config';
import type { Player, Deck, GameRecord, LogEntry, AccountProfile, CommanderZone, ActiveGameData, AnalyticsEventV2 } from '$lib/models/types';
import type { DataService } from './data-service.interface';
import { logger } from '$lib/services/logger';

function withTimeout<T>(p: Promise<T>, ms = 8000, label = 'Firestore'): Promise<T> {
	return Promise.race([
		p,
		new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out (${ms}ms)`)), ms))
	]).catch((e) => {
		logger.warn('firebase-data.withTimeout', `${label} operation failed`, e);
		throw e;
	});
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
	async deleteGameRecord(id: string): Promise<void> {
		const db = await this.db();
		const logsQ = query(collection(db, 'gameLogs'), where('gameId', '==', id));
		const logsSnap = await withTimeout(getDocs(logsQ));
		for (const l of logsSnap.docs) await withTimeout(deleteDoc(l.ref));
		const eventsQ = query(collection(db, 'analyticsEventsV2'), where('gameId', '==', id));
		const eventsSnap = await withTimeout(getDocs(eventsQ));
		for (const e of eventsSnap.docs) await withTimeout(deleteDoc(e.ref));
		await withTimeout(deleteDoc(doc(db, 'games', id)));
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

	/* ── Analytics V2 Events ── */
	async addAnalyticsEventV2(entry: Omit<AnalyticsEventV2, 'id'>): Promise<string> {
		const r = await withTimeout(addDoc(await this.col('analyticsEventsV2'), entry));
		return r.id;
	}
	async getAnalyticsEventsV2ForGame(gameId: string): Promise<AnalyticsEventV2[]> {
		const q = query(await this.col('analyticsEventsV2'), where('gameId', '==', gameId));
		const snap = await withTimeout(getDocs(q));
		return snap.docs
			.map((d) => ({ id: d.id, ...d.data() }) as AnalyticsEventV2)
			.sort((a, b) => b.timestamp - a.timestamp);
	}
	async getAnalyticsEventsV2ForZone(zoneId: string): Promise<AnalyticsEventV2[]> {
		const q = query(await this.col('analyticsEventsV2'), where('zoneId', '==', zoneId));
		const snap = await withTimeout(getDocs(q));
		return snap.docs
			.map((d) => ({ id: d.id, ...d.data() }) as AnalyticsEventV2)
			.sort((a, b) => b.timestamp - a.timestamp);
	}

	/* ── Account Profiles ── */
	async getAccountProfile(uid: string): Promise<AccountProfile | null> {
		const snap = await withTimeout(getDoc(doc(await this.db(), 'profiles', uid)));
		return snap.exists() ? (snap.data() as AccountProfile) : null;
	}
	async upsertAccountProfile(uid: string, data: AccountProfile): Promise<void> {
		await withTimeout(setDoc(doc(await this.db(), 'profiles', uid), data, { merge: true }));
	}

	/* ── Commander Zones ── */
	async createZone(zone: Omit<CommanderZone, 'id'>): Promise<string> {
		const r = await withTimeout(addDoc(await this.col('zones'), zone));
		return r.id;
	}
	async getZone(id: string): Promise<CommanderZone | null> {
		const snap = await withTimeout(getDoc(doc(await this.db(), 'zones', id)));
		return snap.exists() ? ({ id: snap.id, ...snap.data() } as CommanderZone) : null;
	}
	async getAllZones(): Promise<CommanderZone[]> {
		const snap = await withTimeout(getDocs(await this.col('zones')));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommanderZone);
	}
	async getZonesForUser(uid: string): Promise<CommanderZone[]> {
		const q = query(await this.col('zones'), where('memberIds', 'array-contains', uid));
		const snap = await withTimeout(getDocs(q));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CommanderZone);
	}
	async updateZone(id: string, data: Partial<Omit<CommanderZone, 'id'>>): Promise<void> {
		await withTimeout(updateDoc(doc(await this.db(), 'zones', id), data as DocumentData));
	}
	async deleteZone(id: string): Promise<void> {
		const db = await this.db();
		// Cascade-delete games in this zone
		const gamesQ = query(collection(db, 'games'), where('zoneId', '==', id));
		const gamesSnap = await withTimeout(getDocs(gamesQ));
		for (const g of gamesSnap.docs) {
			// Delete logs for each game
			const logsQ = query(collection(db, 'gameLogs'), where('gameId', '==', g.id));
			const logsSnap = await withTimeout(getDocs(logsQ));
			for (const l of logsSnap.docs) await deleteDoc(l.ref);
			const eventsQ = query(collection(db, 'analyticsEventsV2'), where('gameId', '==', g.id));
			const eventsSnap = await withTimeout(getDocs(eventsQ));
			for (const e of eventsSnap.docs) await deleteDoc(e.ref);
			await deleteDoc(g.ref);
		}
		await deleteDoc(doc(db, 'zones', id));
	}

	/* ── Active Game Persistence ── */
	async saveActiveGame(uid: string, data: ActiveGameData): Promise<void> {
		await withTimeout(setDoc(doc(await this.db(), 'activeGames', uid), data as DocumentData));
	}
	async getActiveGame(uid: string): Promise<ActiveGameData | null> {
		const snap = await withTimeout(getDoc(doc(await this.db(), 'activeGames', uid)));
		return snap.exists() ? (snap.data() as ActiveGameData) : null;
	}
	async deleteActiveGame(uid: string): Promise<void> {
		await withTimeout(deleteDoc(doc(await this.db(), 'activeGames', uid)));
	}

	/* ── Zone-scoped queries ── */
	async getGameRecordsForZone(zoneId: string): Promise<GameRecord[]> {
		const q = query(await this.col('games'), where('zoneId', '==', zoneId), orderBy('createdAt', 'desc'));
		const snap = await withTimeout(getDocs(q));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as GameRecord);
	}
	async getLogEntriesForZone(zoneId: string): Promise<LogEntry[]> {
		const q = query(await this.col('gameLogs'), where('zoneId', '==', zoneId), orderBy('timestamp', 'desc'));
		const snap = await withTimeout(getDocs(q));
		return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LogEntry);
	}
}

