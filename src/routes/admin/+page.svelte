<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { isDebugMode } from '$lib/utils/env';
	const devMode = isDebugMode();
</script>

<div class="admin-page">
	<h1>ADMIN</h1>
	<p class="desc">Manage your players and decks {#if devMode}<span class="pill">DEV</span>{/if}</p>
	<div class="grid">
		<a href="/admin/players" class="card"><Icon name="user" size={32} color="var(--color-secondary)" /><span class="lbl">PLAYERS</span><span class="sub">Add, edit, remove</span></a>
		<a href="/admin/decks" class="card"><Icon name="deck" size={32} color="var(--color-secondary)" /><span class="lbl">DECKS</span><span class="sub">Commander decks</span></a>
	</div>
</div>

<style>
	.admin-page{padding-top:var(--space-md)}
	h1{font-size:1.4rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary)}
	.desc{color:var(--color-text-muted);font-size:.8rem;margin-top:var(--space-xs);margin-bottom:var(--space-xl);display:flex;align-items:center;gap:var(--space-xs)}
	.pill{padding:2px 8px;border-radius:var(--radius-full);background:rgba(0,229,255,.12);color:var(--color-secondary);font-size:.7rem;font-weight:700}
	.grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm)}
	.card{display:flex;flex-direction:column;align-items:center;gap:var(--space-sm);padding:var(--space-xl) var(--space-lg);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-xl);text-decoration:none;color:var(--color-text);transition:all var(--transition-fast);text-align:center}
	.card:hover{border-color:var(--neon-cyan);box-shadow:var(--glow-cyan);transform:translateY(-2px)}
	.lbl{font-size:.85rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
	.sub{font-size:.7rem;color:var(--color-text-muted)}
</style>

