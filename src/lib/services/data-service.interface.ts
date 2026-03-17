/* ============================================
   Data Service Interface
   ============================================ */

import type { Player, Deck, GameRecord, LogEntry, AccountProfile, CommanderZone, ActiveGameData } from '$lib/models/types';

export interface DataService {
	/* Players (legacy — kept for compatibility, returns all profiles) */
	getPlayers(): Promise<Player[]>;
	getPlayer(id: string): Promise<Player | null>;
	createPlayer(player: Omit<Player, 'id'>): Promise<string>;
	updatePlayer(id: string, data: Partial<Omit<Player, 'id'>>): Promise<void>;
	deletePlayer(id: string): Promise<void>;

	/* Decks */
	getDecks(): Promise<Deck[]>;
	getDecksForPlayer(playerId: string): Promise<Deck[]>;
	createDeck(deck: Omit<Deck, 'id'>): Promise<string>;
	updateDeck(id: string, data: Partial<Omit<Deck, 'id'>>): Promise<void>;
	deleteDeck(id: string): Promise<void>;

	/* Game Records */
	saveGameRecord(record: Omit<GameRecord, 'id'>): Promise<string>;
	getGameRecords(): Promise<GameRecord[]>;
	updateGameRecord(id: string, data: Partial<Omit<GameRecord, 'id'>>): Promise<void>;

	/* Log Entries */
	addLogEntry(entry: Omit<LogEntry, 'id'>): Promise<string>;
	getLogEntriesForGame(gameId: string): Promise<LogEntry[]>;
	getAllLogEntries(): Promise<LogEntry[]>;

	/* Account Profiles */
	getAccountProfile(uid: string): Promise<AccountProfile | null>;
	upsertAccountProfile(uid: string, data: AccountProfile): Promise<void>;

	/* Commander Zones */
	createZone(zone: Omit<CommanderZone, 'id'>): Promise<string>;
	getZone(id: string): Promise<CommanderZone | null>;
	getAllZones(): Promise<CommanderZone[]>;
	getZonesForUser(uid: string): Promise<CommanderZone[]>;
	updateZone(id: string, data: Partial<Omit<CommanderZone, 'id'>>): Promise<void>;
	deleteZone(id: string): Promise<void>;

	/* Active Game Persistence */
	saveActiveGame(uid: string, data: ActiveGameData): Promise<void>;
	getActiveGame(uid: string): Promise<ActiveGameData | null>;
	deleteActiveGame(uid: string): Promise<void>;

	/* Zone-scoped queries */
	getGameRecordsForZone(zoneId: string): Promise<GameRecord[]>;
	getLogEntriesForZone(zoneId: string): Promise<LogEntry[]>;
}

