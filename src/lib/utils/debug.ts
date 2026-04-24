/* ============================================
   Debug Utilities — attached to window in dev
   ============================================ */

import { isDebugMode } from './env';

function logDebugInfo(): void {
	const keys = ['ct_players', 'ct_decks', 'ct_games', 'ct_logs', 'ct_log'] as const;
	const counts: Record<string, number> = {};
	for (const k of keys) {
		try {
			const parsed = JSON.parse(localStorage.getItem(k) ?? '[]');
			counts[k] = Array.isArray(parsed) ? parsed.length : Object.keys(parsed ?? {}).length;
		} catch {
			counts[k] = 0;
		}
	}
	console.table(counts);
}

function clearMockData(): void {
	['ct_players', 'ct_decks', 'ct_games', 'ct_logs', 'ct_log', 'ct_mock_initialized'].forEach((k) =>
		localStorage.removeItem(k)
	);
	console.log('Mock data cleared – reload to regenerate.');
	location.reload();
}

if (typeof window !== 'undefined' && isDebugMode()) {
	console.log('🎮 DEBUG MODE ACTIVE');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(window as any).__debugUtils = { logDebugInfo, clearMockData, isDebugMode };
}

