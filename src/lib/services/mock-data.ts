/* ============================================
   Mock Data Generator
   Provides realistic test data for debug mode
   ============================================ */

import type { Player, Deck, GameRecord, LogEntry, MtgColor } from '$lib/models/types';
import { uid } from '$lib/utils/format';

const MOCK_PLAYERS: Omit<Player, 'id'>[] = [
	{
		name: 'Alice',
		imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
	},
	{
		name: 'Bob',
		imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
	},
	{
		name: 'Charlie',
		imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'
	},
	{
		name: 'Diana',
		imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana'
	},
	{
		name: 'Ethan',
		imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan'
	},
	{
		name: 'Fiona',
		imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fiona'
	}
];

const MOCK_COMMANDERS = [
	{ name: 'Atraxa, Praetors\' Voice', colors: ['white', 'blue', 'black', 'green'] as MtgColor[], imageUrl: 'https://cards.scryfall.io/normal/front/d/0/d0d33d52-3d28-4635-b985-51e126289259.jpg' },
	{ name: 'Edgar Markov', colors: ['white', 'black', 'red'] as MtgColor[], imageUrl: 'https://cards.scryfall.io/normal/front/8/d/8d94b8ec-ecda-43c8-a60e-1ba33e6a54a4.jpg' },
	{ name: 'The Ur-Dragon', colors: ['white', 'blue', 'black', 'red', 'green'] as MtgColor[], imageUrl: 'https://cards.scryfall.io/normal/front/7/e/7e78b70b-0c67-4f14-8ad7-c9f8e3f59743.jpg' },
	{ name: 'Yuriko, the Tiger\'s Shadow', colors: ['blue', 'black'] as MtgColor[], imageUrl: 'https://cards.scryfall.io/normal/front/3/b/3bd81ae6-e628-447a-a36b-597e63ede295.jpg' },
	{ name: 'Kaalia of the Vast', colors: ['white', 'black', 'red'] as MtgColor[], imageUrl: 'https://cards.scryfall.io/normal/front/a/0/a0cc9eaf-c8d9-4da2-8fd8-8d423a02a3a8.jpg' },
	{ name: 'Muldrotha, the Gravetide', colors: ['blue', 'black', 'green'] as MtgColor[], imageUrl: 'https://cards.scryfall.io/normal/front/c/6/c654c834-d0e7-42bb-bd3f-1f6fbedd4bc0.jpg' },
	{ name: 'Nekusar, the Mindrazer', colors: ['blue', 'black', 'red'] as MtgColor[], imageUrl: 'https://cards.scryfall.io/normal/front/3/f/3f7f2417-12de-4e57-9714-d878880a1208.jpg' },
	{ name: 'Zur the Enchanter', colors: ['white', 'blue', 'black'] as MtgColor[], imageUrl: 'https://cards.scryfall.io/normal/front/2/5/253e19db-28a1-4909-b235-e02631a38c35.jpg' },
	{ name: 'Omnath, Locus of Creation', colors: ['white', 'blue', 'red', 'green'] as MtgColor[], imageUrl: 'https://cards.scryfall.io/normal/front/4/e/4e4fb50c-a81f-44d3-93c5-fa9a0b37f617.jpg' },
	{ name: 'Krenko, Mob Boss', colors: ['red'] as MtgColor[], imageUrl: 'https://cards.scryfall.io/normal/front/c/d/cd9fec9d-23c8-4d35-97c1-9499527198fb.jpg' }
];

export function generateMockPlayers(): Player[] {
	return MOCK_PLAYERS.map((p) => ({
		...p,
		id: uid()
	}));
}

export function generateMockDecks(players: Player[]): Deck[] {
	const decks: Deck[] = [];

	// Give each player 1-3 decks
	players.forEach((player, playerIndex) => {
		const deckCount = Math.floor(Math.random() * 3) + 1;
		for (let i = 0; i < deckCount; i++) {
			const commanderIndex = (playerIndex * 3 + i) % MOCK_COMMANDERS.length;
			const commander = MOCK_COMMANDERS[commanderIndex];
			decks.push({
				id: uid(),
				playerId: player.id,
				commanderName: commander.name,
				commanderImageUrl: commander.imageUrl,
				colors: commander.colors
			});
		}
	});

	return decks;
}

export function generateMockGameRecords(players: Player[], decks: Deck[], count: number = 10): GameRecord[] {
	const records: GameRecord[] = [];
	const now = Date.now();

	for (let i = 0; i < count; i++) {
		// Random 2-6 players per game
		const playerCount = Math.floor(Math.random() * 5) + 2;
		const gamePlayers = [...players].sort(() => Math.random() - 0.5).slice(0, playerCount);

		const playerIds = gamePlayers.map(p => p.id);
		const deckIds = playerIds.map(pid => {
			const playerDecks = decks.filter(d => d.playerId === pid);
			return playerDecks[Math.floor(Math.random() * playerDecks.length)]?.id ?? '';
		});

		// Random winner
		const winnerId = Math.random() > 0.2 ? playerIds[Math.floor(Math.random() * playerIds.length)] : null;

		// Game happened 0-30 days ago
		const daysAgo = Math.floor(Math.random() * 30);
		const createdAt = now - (daysAgo * 24 * 60 * 60 * 1000);
		const finishedAt = createdAt + (Math.random() * 90 * 60 * 1000); // 30-120 min games

		records.push({
			id: uid(),
			playerIds,
			deckIds,
			maxLife: 40,
			timerVariant: Math.random() > 0.5 ? 'A' : 'B',
			winnerId,
			createdAt,
			finishedAt
		});
	}

	return records.sort((a, b) => b.createdAt - a.createdAt);
}

export function generateMockLogEntries(gameRecords: GameRecord[], players: Player[]): LogEntry[] {
	const logs: LogEntry[] = [];

	gameRecords.forEach(game => {
		// Generate 20-50 log entries per game
		const entryCount = Math.floor(Math.random() * 30) + 20;
		const gameDuration = (game.finishedAt ?? game.createdAt) - game.createdAt;

		for (let i = 0; i < entryCount; i++) {
			const playerId = game.playerIds[Math.floor(Math.random() * game.playerIds.length)];
			const player = players.find(p => p.id === playerId);
			if (!player) continue;

			const type: 'life' | 'commander_damage' = Math.random() > 0.8 ? 'commander_damage' : 'life';
			const value = Math.random() > 0.5
				? Math.floor(Math.random() * 5) + 1  // gain
				: -(Math.floor(Math.random() * 8) + 1); // loss

			const sourcePlayerId = type === 'commander_damage' && game.playerIds.length > 1
				? game.playerIds.find(id => id !== playerId)
				: undefined;

			const timestamp = game.createdAt + (gameDuration * i / entryCount);

			logs.push({
				id: uid(),
				gameId: game.id,
				playerId,
				playerName: player.name,
				value,
				type,
				sourcePlayerId,
				timestamp
			});
		}
	});

	return logs.sort((a, b) => b.timestamp - a.timestamp);
}

export interface MockDataSet {
	players: Player[];
	decks: Deck[];
	gameRecords: GameRecord[];
	logEntries: LogEntry[];
}

export function generateFullMockDataSet(): MockDataSet {
	const players = generateMockPlayers();
	const decks = generateMockDecks(players);
	const gameRecords = generateMockGameRecords(players, decks, 15);
	const logEntries = generateMockLogEntries(gameRecords, players);

	return {
		players,
		decks,
		gameRecords,
		logEntries
	};
}

