/* ============================================
   Debug Utilities
   Helper functions for debug mode
   ============================================ */

export function isDebugMode(): boolean {
	return import.meta.env.VITE_DEBUG_MODE === 'true';
}

export function clearMockData(): void {
	if (typeof window === 'undefined') return;

	const keys = [
		'ct_players',
		'ct_decks',
		'ct_games',
		'ct_logs',
		'ct_mock_initialized'
	];

	keys.forEach(key => localStorage.removeItem(key));
	console.log('🗑️ Mock data cleared. Reload to regenerate.');
}

export function logDebugInfo(): void {
	if (!isDebugMode()) {
		console.log('Debug mode is OFF. Set VITE_DEBUG_MODE=true in .env');
		return;
	}

	if (typeof window === 'undefined') return;

	const mockInitialized = localStorage.getItem('ct_mock_initialized');
	const playersRaw = localStorage.getItem('ct_players');
	const decksRaw = localStorage.getItem('ct_decks');
	const gamesRaw = localStorage.getItem('ct_games');
	const logsRaw = localStorage.getItem('ct_logs');

	const players = playersRaw ? JSON.parse(playersRaw) : [];
	const decks = decksRaw ? JSON.parse(decksRaw) : [];
	const games = gamesRaw ? JSON.parse(gamesRaw) : [];
	const logs = logsRaw ? JSON.parse(logsRaw) : [];

	console.log('🎮 DEBUG MODE INFO:');
	console.log('Mock Data Initialized:', mockInitialized === 'true');
	console.log('Players:', players.length);
	console.log('Decks:', decks.length);
	console.log('Games:', games.length);
	console.log('Log Entries:', logs.length);
	console.log('\nTo clear and regenerate mock data:');
	console.log('  clearMockData(); location.reload();');
}

// Make utilities available in browser console during debug mode
if (isDebugMode() && typeof window !== 'undefined') {
	(window as any).__debugUtils = {
		clearMockData,
		logDebugInfo,
		isDebugMode
	};

	console.log('🎮 DEBUG MODE ACTIVE');
	console.log('Available utilities: __debugUtils.logDebugInfo(), __debugUtils.clearMockData()');
}

