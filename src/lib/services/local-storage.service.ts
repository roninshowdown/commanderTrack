/* ============================================
   LocalStorage Data Service
   Full CRUD backed by browser localStorage
   Used when Firebase is not configured
   ============================================ */

import type { Player, Deck, GameRecord, LogEntry } from '$lib/models/types';
import type { DataService } from './data-service.interface';
import { uid } from '$lib/utils/format';
import { generateFullMockDataSet } from './mock-data';

const KEYS = {
	players: 'ct_players',
	decks: 'ct_decks',
	games: 'ct_games',
	logs: 'ct_logs',
	mockDataInitialized: 'ct_mock_initialized'
} as const;

function load<T>(key: string): T[] {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function save<T>(key: string, data: T[]): void {
	localStorage.setItem(key, JSON.stringify(data));
}

function isDebugMode(): boolean {
	return import.meta.env.VITE_DEBUG_MODE === 'true';
}

export class LocalStorageService implements DataService {
	constructor() {
		// Auto-initialize mock data in debug mode (only once)
		if (isDebugMode() && !localStorage.getItem(KEYS.mockDataInitialized)) {
			this.initializeMockData();
		}
	}

	private initializeMockData(): void {
		console.log('🎮 DEBUG MODE: Initializing mock data...');
		const mockData = generateFullMockDataSet();

		save(KEYS.players, mockData.players);
		save(KEYS.decks, mockData.decks);
		save(KEYS.games, mockData.gameRecords);
		save(KEYS.logs, mockData.logEntries);

		localStorage.setItem(KEYS.mockDataInitialized, 'true');

		console.log('✅ Mock data loaded:', {
			players: mockData.players.length,
			decks: mockData.decks.length,
			games: mockData.gameRecords.length,
			logs: mockData.logEntries.length
		});
	}

	/* ─── Players ─── */
	// ...existing code...

	async getPlayers(): Promise<Player[]> {
		return load<Player>(KEYS.players);
	}

	async getPlayer(id: string): Promise<Player | null> {
		const players = load<Player>(KEYS.players);
		return players.find((p) => p.id === id) ?? null;
	}

	async createPlayer(player: Omit<Player, 'id'>): Promise<string> {
		const players = load<Player>(KEYS.players);
		const id = uid();
		players.push({ ...player, id });
		save(KEYS.players, players);
		return id;
	}

	async updatePlayer(id: string, data: Partial<Omit<Player, 'id'>>): Promise<void> {
		const players = load<Player>(KEYS.players);
		const idx = players.findIndex((p) => p.id === id);
		if (idx !== -1) {
			players[idx] = { ...players[idx], ...data };
			save(KEYS.players, players);
		}
	}

	async deletePlayer(id: string): Promise<void> {
		// Delete all decks belonging to this player
		const decks = load<Deck>(KEYS.decks).filter((d) => d.playerId !== id);
		save(KEYS.decks, decks);

		const players = load<Player>(KEYS.players).filter((p) => p.id !== id);
		save(KEYS.players, players);
	}

	/* ─── Decks ─── */

	async getDecks(): Promise<Deck[]> {
		return load<Deck>(KEYS.decks);
	}

	async getDecksForPlayer(playerId: string): Promise<Deck[]> {
		return load<Deck>(KEYS.decks).filter((d) => d.playerId === playerId);
	}

	async createDeck(deck: Omit<Deck, 'id'>): Promise<string> {
		const decks = load<Deck>(KEYS.decks);
		const id = uid();
		decks.push({ ...deck, id });
		save(KEYS.decks, decks);
		return id;
	}

	async updateDeck(id: string, data: Partial<Omit<Deck, 'id'>>): Promise<void> {
		const decks = load<Deck>(KEYS.decks);
		const idx = decks.findIndex((d) => d.id === id);
		if (idx !== -1) {
			decks[idx] = { ...decks[idx], ...data };
			save(KEYS.decks, decks);
		}
	}

	async deleteDeck(id: string): Promise<void> {
		const decks = load<Deck>(KEYS.decks).filter((d) => d.id !== id);
		save(KEYS.decks, decks);
	}

	/* ─── Game Records ─── */

	async saveGameRecord(record: Omit<GameRecord, 'id'>): Promise<string> {
		const games = load<GameRecord>(KEYS.games);
		const id = uid();
		games.unshift({ ...record, id });
		save(KEYS.games, games);
		return id;
	}

	async getGameRecords(): Promise<GameRecord[]> {
		return load<GameRecord>(KEYS.games).sort((a, b) => b.createdAt - a.createdAt);
	}

	async updateGameRecord(id: string, data: Partial<Omit<GameRecord, 'id'>>): Promise<void> {
		const games = load<GameRecord>(KEYS.games);
		const idx = games.findIndex((g) => g.id === id);
		if (idx !== -1) {
			games[idx] = { ...games[idx], ...data };
			save(KEYS.games, games);
		}
	}

	/* ─── Log Entries ─── */

	async addLogEntry(entry: Omit<LogEntry, 'id'>): Promise<string> {
		const logs = load<LogEntry>(KEYS.logs);
		const id = uid();
		logs.unshift({ ...entry, id });
		save(KEYS.logs, logs);
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

