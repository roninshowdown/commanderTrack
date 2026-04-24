/* ============================================
   LocalStorage Data Service
   ============================================ */

import type { Player, Deck, GameRecord, LogEntry, AccountProfile, CommanderZone, ActiveGameData, AnalyticsEventV2 } from '$lib/models/types';
import type { DataService } from './data-service.interface';
import { uid } from '$lib/utils/format';
import { isDebugMode } from '$lib/utils/env';
import { logger } from '$lib/services/logger';

const KEYS = {
	players: 'ct_players',
	decks: 'ct_decks',
	games: 'ct_games',
	logs: 'ct_logs',
	profiles: 'ct_profiles',
	zones: 'ct_zones',
	activeGames: 'ct_activeGames',
	analyticsEventsV2: 'ct_analytics_events_v2',
	mockInit: 'ct_mock_initialized'
} as const;

function load<T>(key: string): T[] {
	try {
		return JSON.parse(localStorage.getItem(key) ?? '[]');
	} catch (e) {
		logger.warn('local-storage.load', `Failed to parse localStorage key "${key}"`, e);
		return [];
	}
}

function save<T>(key: string, data: T[]): void {
	try {
		localStorage.setItem(key, JSON.stringify(data));
	} catch (e) {
		logger.warn('local-storage.save', `Failed to write localStorage key "${key}"`, e);
	}
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
		logger.info('local-storage.seedMockData', 'Mock data seeded', {
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
	async deleteGameRecord(id: string): Promise<void> {
		save(KEYS.games, load<GameRecord>(KEYS.games).filter((g) => g.id !== id));
		save(KEYS.logs, load<LogEntry>(KEYS.logs).filter((l) => l.gameId !== id));
		save(KEYS.analyticsEventsV2, load<AnalyticsEventV2>(KEYS.analyticsEventsV2).filter((e) => e.gameId !== id));
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

	/* ── Analytics V2 Events ── */
	async addAnalyticsEventV2(entry: Omit<AnalyticsEventV2, 'id'>): Promise<string> {
		const list = load<AnalyticsEventV2>(KEYS.analyticsEventsV2);
		const id = uid();
		list.unshift({ ...entry, id });
		save(KEYS.analyticsEventsV2, list);
		return id;
	}
	async getAnalyticsEventsV2ForGame(gameId: string): Promise<AnalyticsEventV2[]> {
		return load<AnalyticsEventV2>(KEYS.analyticsEventsV2)
			.filter((e) => e.gameId === gameId)
			.sort((a, b) => b.timestamp - a.timestamp);
	}
	async getAnalyticsEventsV2ForZone(zoneId: string): Promise<AnalyticsEventV2[]> {
		return load<AnalyticsEventV2>(KEYS.analyticsEventsV2)
			.filter((e) => e.zoneId === zoneId)
			.sort((a, b) => b.timestamp - a.timestamp);
	}

	/* ── Account Profiles ── */
	async getAccountProfile(uid_: string): Promise<AccountProfile | null> {
		const map = loadMap<AccountProfile>(KEYS.profiles);
		return map[uid_] ?? null;
	}
	async upsertAccountProfile(uid_: string, data: AccountProfile): Promise<void> {
		const map = loadMap<AccountProfile>(KEYS.profiles);
		map[uid_] = { ...map[uid_], ...data };
		saveMap(KEYS.profiles, map);
	}

	/* ── Commander Zones ── */
	async createZone(zone: Omit<CommanderZone, 'id'>): Promise<string> {
		const list = load<CommanderZone>(KEYS.zones);
		const id = uid();
		list.push({ ...zone, id });
		save(KEYS.zones, list);
		return id;
	}
	async getZone(id: string): Promise<CommanderZone | null> {
		return load<CommanderZone>(KEYS.zones).find((z) => z.id === id) ?? null;
	}
	async getAllZones(): Promise<CommanderZone[]> {
		return load<CommanderZone>(KEYS.zones);
	}
	async getZonesForUser(uid_: string): Promise<CommanderZone[]> {
		return load<CommanderZone>(KEYS.zones).filter((z) => z.memberIds.includes(uid_));
	}
	async updateZone(id: string, data: Partial<Omit<CommanderZone, 'id'>>): Promise<void> {
		const list = load<CommanderZone>(KEYS.zones);
		const idx = list.findIndex((z) => z.id === id);
		if (idx !== -1) {
			list[idx] = { ...list[idx], ...data };
			save(KEYS.zones, list);
		}
	}
	async deleteZone(id: string): Promise<void> {
		save(KEYS.zones, load<CommanderZone>(KEYS.zones).filter((z) => z.id !== id));
		save(KEYS.games, load<GameRecord>(KEYS.games).filter((g) => g.zoneId !== id));
		save(KEYS.logs, load<LogEntry>(KEYS.logs).filter((l) => l.zoneId !== id));
		save(KEYS.analyticsEventsV2, load<AnalyticsEventV2>(KEYS.analyticsEventsV2).filter((e) => e.zoneId !== id));
	}

	/* ── Active Game Persistence ── */
	async saveActiveGame(uid_: string, data: ActiveGameData): Promise<void> {
		const map = loadMap<ActiveGameData>(KEYS.activeGames);
		map[uid_] = data;
		saveMap(KEYS.activeGames, map);
	}
	async getActiveGame(uid_: string): Promise<ActiveGameData | null> {
		const map = loadMap<ActiveGameData>(KEYS.activeGames);
		return map[uid_] ?? null;
	}
	async deleteActiveGame(uid_: string): Promise<void> {
		const map = loadMap<ActiveGameData>(KEYS.activeGames);
		delete map[uid_];
		saveMap(KEYS.activeGames, map);
	}

	/* ── Zone-scoped queries ── */
	async getGameRecordsForZone(zoneId: string): Promise<GameRecord[]> {
		return load<GameRecord>(KEYS.games)
			.filter((g) => g.zoneId === zoneId)
			.sort((a, b) => b.createdAt - a.createdAt);
	}
	async getLogEntriesForZone(zoneId: string): Promise<LogEntry[]> {
		return load<LogEntry>(KEYS.logs)
			.filter((l) => l.zoneId === zoneId)
			.sort((a, b) => b.timestamp - a.timestamp);
	}
}

/* ── Map helpers for keyed storage (profiles, activeGames) ── */
function loadMap<T>(key: string): Record<string, T> {
	try {
		return JSON.parse(localStorage.getItem(key) ?? '{}');
	} catch (e) {
		logger.warn('local-storage.loadMap', `Failed to parse localStorage map key "${key}"`, e);
		return {};
	}
}
function saveMap<T>(key: string, data: Record<string, T>): void {
	try {
		localStorage.setItem(key, JSON.stringify(data));
	} catch (e) {
		logger.warn('local-storage.saveMap', `Failed to write localStorage map key "${key}"`, e);
	}
}

