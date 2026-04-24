<script lang="ts">
	import { onMount } from 'svelte';
	import { logger, type AppLogEntry, type LogLevel } from '$lib/services/logger';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let logs: AppLogEntry[] = $state([]);
	let levelFilter: 'all' | LogLevel = $state('all');
	let sourceFilter: string = $state('');
	let copyState: 'idle' | 'done' | 'error' = $state('idle');

	const filteredLogs = $derived.by(() => {
		const src = sourceFilter.trim().toLowerCase();
		return logs.filter((entry) => {
			const levelOk = levelFilter === 'all' || entry.level === levelFilter;
			const sourceOk = src.length === 0 || entry.source.toLowerCase().includes(src);
			return levelOk && sourceOk;
		});
	});

	function loadLogs(): void {
		logs = logger.getAll();
	}

	onMount(() => {
		loadLogs();
		return logger.subscribe(loadLogs);
	});

	function formatTimestamp(ts: number): string {
		return new Date(ts).toLocaleString();
	}

	async function copyJson(): Promise<void> {
		try {
			await navigator.clipboard.writeText(logger.toJson());
			copyState = 'done';
		} catch {
			copyState = 'error';
		}
		setTimeout(() => {
			copyState = 'idle';
		}, 1500);
	}

	function clearLogs(): void {
		if (!confirm('Clear structured logs?')) return;
		logger.clear();
	}
</script>

<section class="log-viewer">
	<div class="hdr">
		<h2>Debug Logs</h2>
		<div class="actions">
			<Button variant="ghost" size="sm" onclick={copyJson}>
				{#snippet children()}<Icon name="copy" size={14} /> Copy JSON{/snippet}
			</Button>
			<Button variant="danger" size="sm" onclick={clearLogs}>
				{#snippet children()}Clear{/snippet}
			</Button>
		</div>
	</div>
	<div class="filters">
		<label>
			<span>Level</span>
			<select bind:value={levelFilter}>
				<option value="all">All</option>
				<option value="error">Error</option>
				<option value="warn">Warn</option>
				<option value="info">Info</option>
			</select>
		</label>
		<label>
			<span>Source</span>
			<input type="text" bind:value={sourceFilter} placeholder="e.g. gameStore" />
		</label>
	</div>
	{#if copyState === 'done'}<p class="copy-note ok">Copied logs as JSON.</p>{/if}
	{#if copyState === 'error'}<p class="copy-note err">Clipboard copy failed.</p>{/if}

	<div class="table-wrap">
		<table>
			<thead>
				<tr><th>Time</th><th>Level</th><th>Source</th><th>Message</th></tr>
			</thead>
			<tbody>
				{#if !filteredLogs.length}
					<tr><td colspan="4" class="empty">No log entries match the current filters.</td></tr>
				{:else}
					{#each filteredLogs as entry (entry.id)}
						<tr>
							<td>{formatTimestamp(entry.timestamp)}</td>
							<td><span class="lvl" class:error={entry.level === 'error'} class:warn={entry.level === 'warn'} class:info={entry.level === 'info'}>{entry.level}</span></td>
							<td>{entry.source}</td>
							<td>
								<div>{entry.message}</div>
								{#if entry.context !== undefined}
									<pre>{JSON.stringify(entry.context, null, 2)}</pre>
								{/if}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
</section>

<style>
	.log-viewer { margin-top: var(--space-xl); padding: var(--space-md); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-lg); background: var(--color-surface); display: flex; flex-direction: column; gap: var(--space-sm); }
	.hdr { display: flex; align-items: center; justify-content: space-between; gap: var(--space-sm); }
	.hdr h2 { font-size: .8rem; font-weight: 800; color: var(--color-warning); letter-spacing: .08em; text-transform: uppercase; }
	.actions { display: flex; gap: var(--space-xs); }
	.filters { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm); }
	.filters label { display: flex; flex-direction: column; gap: 4px; }
	.filters span { font-size: .7rem; color: var(--color-text-secondary); font-weight: 700; }
	.copy-note { font-size: .72rem; }
	.copy-note.ok { color: var(--color-success); }
	.copy-note.err { color: var(--color-danger); }
	.table-wrap { max-height: 280px; overflow: auto; border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-md); }
	table { width: 100%; border-collapse: collapse; font-size: .72rem; }
	th, td { padding: 8px; text-align: left; border-bottom: 1px solid var(--color-surface-elevated); vertical-align: top; }
	th { position: sticky; top: 0; background: var(--color-surface-elevated); z-index: 1; }
	.empty { text-align: center; color: var(--color-text-muted); }
	.lvl { display: inline-block; padding: 2px 6px; border-radius: var(--radius-full); text-transform: uppercase; font-size: .62rem; font-weight: 800; letter-spacing: .04em; }
	.lvl.error { color: var(--color-danger); background: rgba(255, 23, 68, 0.12); }
	.lvl.warn { color: var(--color-warning); background: rgba(255, 171, 0, 0.12); }
	.lvl.info { color: var(--color-secondary); background: rgba(0, 229, 255, 0.12); }
	pre { margin-top: 4px; padding: 6px; border-radius: var(--radius-sm); background: rgba(0, 0, 0, 0.25); color: var(--color-text-secondary); white-space: pre-wrap; word-break: break-word; }

	@media (max-width: 768px) {
		.filters { grid-template-columns: 1fr; }
	}
</style>

