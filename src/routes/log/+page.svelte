<script lang="ts">
	import { logEntries, gameState } from '$lib/stores/gameStore';
	import { formatTimestamp } from '$lib/utils/format';

	let logs = $derived($logEntries);
	let state = $derived($gameState);

	function getSourceName(sourceId: string | undefined): string {
		if (!sourceId || !state) return '';
		const player = state.players.find((p) => p.playerId === sourceId);
		return player?.playerName ?? '';
	}
</script>

<div class="log-page">
	<h1>Game Log</h1>
	<p class="subtitle">Life changes & commander damage history</p>

	{#if logs.length === 0}
		<div class="empty">
			<p>No log entries yet. Start a game to see life changes here.</p>
		</div>
	{:else}
		<div class="log-table-wrapper">
			<table class="log-table">
				<thead>
					<tr>
						<th>Time</th>
						<th>Player</th>
						<th>Type</th>
						<th>Value</th>
						<th>Source</th>
					</tr>
				</thead>
				<tbody>
					{#each logs as entry (entry.id)}
						<tr class="animate-fade-in">
							<td class="time">{formatTimestamp(entry.timestamp)}</td>
							<td class="player">{entry.playerName}</td>
							<td class="type">
								{#if entry.type === 'commander_damage'}
									<span class="badge cmd">CMD</span>
								{:else}
									<span class="badge life">LIFE</span>
								{/if}
							</td>
							<td class="value" class:gain={entry.value > 0} class:loss={entry.value < 0}>
								{entry.value > 0 ? '+' : ''}{entry.value}
							</td>
							<td class="source">
								{#if entry.sourcePlayerId}
									{getSourceName(entry.sourcePlayerId)}
								{:else}
									—
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.log-page {
		padding-top: var(--space-lg);
	}

	h1 {
		font-size: 1.8rem;
		font-weight: 800;
	}

	.subtitle {
		color: var(--color-text-secondary);
		margin-top: var(--space-xs);
		margin-bottom: var(--space-xl);
		font-size: 0.9rem;
	}

	.empty {
		text-align: center;
		padding: var(--space-2xl);
		color: var(--color-text-secondary);
	}

	.log-table-wrapper {
		overflow-x: auto;
		border-radius: var(--radius-md);
	}

	.log-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.log-table th {
		text-align: left;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		position: sticky;
		top: 0;
	}

	.log-table td {
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--color-surface-elevated);
	}

	.time {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.player {
		font-weight: 600;
	}

	.badge {
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.badge.life {
		background: rgba(55, 66, 250, 0.2);
		color: var(--color-info);
	}

	.badge.cmd {
		background: rgba(233, 69, 96, 0.2);
		color: var(--color-primary);
	}

	.value {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.value.gain {
		color: var(--color-success);
	}

	.value.loss {
		color: var(--color-danger);
	}

	.source {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}
</style>

