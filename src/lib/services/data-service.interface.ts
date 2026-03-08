/* ============================================
   Data Service Interface
   Common contract for Firebase and LocalStorage
   ============================================ */

import type { Player, Deck, GameRecord, LogEntry } from '$lib/models/types';

export interface DataService {
	/* Players */
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
}

