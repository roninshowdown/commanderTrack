/* ============================================
   LocalStorage Data Service
   ============================================ */

import type { Player, Deck, GameRecord, LogEntry } from '$lib/models/types';
import type { DataService } from './data-service.interface';
import { uid } from '$lib/utils/format';
import { isDebugMode } from '$lib/utils/env';

const KEYS = {
	players: 'ct_players',
	decks: 'ct_decks',
	games: 'ct_games',
	logs: 'ct_logs',
	mockInit: 'ct_mock_initialized'
} as const;

function load<T>(key: string): T[] {
	try {
		return JSON.parse(localStorage.getItem(key) ?? '[]');
	} catch {
		return [];
	}
}

function save<T>(key: string, data: T[]): void {
	localStorage.setItem(key, JSON.stringify(data));
}

export class LocalStorageService implements DataService {
	constructor() {
		if (isDebugMode() && !localStorage.getItem(KEYS.mockInit)) {
			this.seedMockData();
		}
	}

	private async seedMockData(): Promise<void> {
		const { generateFullMockDataSet } = await import('./mock-data');
		const mock = generateFullMockDataSet();
		save(KEYS.players, mock.players);
		save(KEYS.decks, mock.decks);
		save(KEYS.games, mock.gameRecords);
		save(KEYS.logs, mock.logEntries);
		localStorage.setItem(KEYS.mockInit, 'true');
		console.log('✅ Mock data seeded', {
			players: mock.players.length,
			decks: mock.decks.length,
			games: mock.gameRecords.length,
			logs: mock.logEntries.length
		});
	}

	/* ── Players ── */
	async getPlayers(): Promise<Player[]> {
		return load<Player>(KEYS.players);
	}
	async getPlayer(id: string): Promise<Player | null> {
		return load<Player>(KEYS.players).find((p) => p.id === id) ?? null;
	}
	async createPlayer(player: Omit<Player, 'id'>): Promise<string> {
		const list = load<Player>(KEYS.players);
		const id = uid();
		list.push({ ...player, id });
		save(KEYS.players, list);
		return id;
	}
	async updatePlayer(id: string, data: Partial<Omit<Player, 'id'>>): Promise<void> {
		const list = load<Player>(KEYS.players);
		const idx = list.findIndex((p) => p.id === id);
		if (idx !== -1) {
			list[idx] = { ...list[idx], ...data };
			save(KEYS.players, list);
		}
	}
	async deletePlayer(id: string): Promise<void> {
		save(KEYS.decks, load<Deck>(KEYS.decks).filter((d) => d.playerId !== id));
		save(KEYS.players, load<Player>(KEYS.players).filter((p) => p.id !== id));
	}

	/* ── Decks ── */
	async getDecks(): Promise<Deck[]> {
		return load<Deck>(KEYS.decks);
	}
	async getDecksForPlayer(playerId: string): Promise<Deck[]> {
		return load<Deck>(KEYS.decks).filter((d) => d.playerId === playerId);
	}
	async createDeck(deck: Omit<Deck, 'id'>): Promise<string> {
		const list = load<Deck>(KEYS.decks);
		const id = uid();
		list.push({ ...deck, id });
		save(KEYS.decks, list);
		return id;
	}
	async updateDeck(id: string, data: Partial<Omit<Deck, 'id'>>): Promise<void> {
		const list = load<Deck>(KEYS.decks);
		const idx = list.findIndex((d) => d.id === id);
		if (idx !== -1) {
			list[idx] = { ...list[idx], ...data };
			save(KEYS.decks, list);
		}
	}
	async deleteDeck(id: string): Promise<void> {
		save(KEYS.decks, load<Deck>(KEYS.decks).filter((d) => d.id !== id));
	}

	/* ── Game Records ── */
	async saveGameRecord(record: Omit<GameRecord, 'id'>): Promise<string> {
		const list = load<GameRecord>(KEYS.games);
		const id = uid();
		list.unshift({ ...record, id });
		save(KEYS.games, list);
		return id;
	}
	async getGameRecords(): Promise<GameRecord[]> {
		return load<GameRecord>(KEYS.games).sort((a, b) => b.createdAt - a.createdAt);
	}
	async updateGameRecord(id: string, data: Partial<Omit<GameRecord, 'id'>>): Promise<void> {
		const list = load<GameRecord>(KEYS.games);
		const idx = list.findIndex((g) => g.id === id);
		if (idx !== -1) {
			list[idx] = { ...list[idx], ...data };
			save(KEYS.games, list);
		}
	}

	/* ── Log Entries ── */
	async addLogEntry(entry: Omit<LogEntry, 'id'>): Promise<string> {
		const list = load<LogEntry>(KEYS.logs);
		const id = uid();
		list.unshift({ ...entry, id });
		save(KEYS.logs, list);
		return id;
	}
	async getLogEntriesForGame(gameId: string): Promise<LogEntry[]> {
		return load<LogEntry>(KEYS.logs)
			.filter((l) => l.gameId === gameId)
			.sort((a, b) => b.timestamp - a.timestamp);
	}
	async getAllLogEntries(): Promise<LogEntry[]> {
		return load<LogEntry>(KEYS.logs).sort((a, b) => b.timestamp - a.timestamp);
	}
}

