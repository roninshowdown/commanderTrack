<script lang="ts">
	import { authUser } from '$lib/firebase/auth';
	import { isDebugMode } from '$lib/utils/env';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { userZones, currentZone } from '$lib/stores/zoneStore';
	import { hasActiveGame, activeZoneId, restoreActiveGame } from '$lib/stores/gameStore';
	import { onMount } from 'svelte';

	const devMode = isDebugMode();
	let user = $derived($authUser);
	let myZones = $derived($userZones);
	let zone = $derived($currentZone);
	let hasGame = $derived($hasActiveGame);
	let gameZoneId = $derived($activeZoneId);
	let checkingGame: boolean = $state(false);

	onMount(async () => {
		if (user?.uid && !hasGame) {
			checkingGame = true;
			await restoreActiveGame(user.uid);
			checkingGame = false;
		}
	});
</script>

<div class="home">
	<div class="hero animate-fade-in">
		<div class="logo-ring"><img src="/icon-512.png" alt="Commander Track" class="app-icon" /></div>
		<h1 class="title">COMMANDER<br /><span class="accent">TRACK</span></h1>
		<p class="subtitle">LIFE · TIMER · ANALYTICS</p>
	</div>

	{#if !myZones.length}
		<!-- ── No zone landing page ── -->
		<div class="landing animate-fade-in">
			<p class="landing-msg">Join or create a <strong>Commander Zone</strong> to start tracking games with your play group.</p>
			<a href="/zones" class="card card--primary">
				<div class="card-icon"><Icon name="play" size={28} /></div>
				<div class="card-text"><span class="card-lbl">GET STARTED</span><span class="card-desc">Create or join a zone</span></div>
			</a>
			<a href="/profile" class="card">
				<div class="card-icon"><Icon name="user" size={24} /></div>
				<div class="card-text"><span class="card-lbl">PROFILE</span><span class="card-desc">Avatar & decks</span></div>
			</a>
		</div>
	{:else}
		<!-- ── Zone-active navigation ── -->
		{#if hasGame && gameZoneId && gameZoneId !== zone?.id}
			<div class="resume-banner animate-fade-in">
				<Icon name="swords" size={16} color="var(--color-warning)" />
				<span>You have an active game in another zone.</span>
				<button class="resume-link" onclick={() => goto('/game')}>Resume →</button>
			</div>
		{/if}

		<nav class="grid animate-fade-in">
			{#if hasGame}
				<a href="/game" class="card card--primary">
					<div class="card-icon"><Icon name="swords" size={28} /></div>
					<div class="card-text"><span class="card-lbl">RESUME GAME</span><span class="card-desc">Continue your match</span></div>
				</a>
			{:else}
				<a href="/setup" class="card card--primary">
					<div class="card-icon"><Icon name="play" size={28} /></div>
					<div class="card-text"><span class="card-lbl">NEW GAME</span><span class="card-desc">Start tracking</span></div>
				</a>
			{/if}
			<a href="/log" class="card">
				<div class="card-icon"><Icon name="chart" size={24} /></div>
				<div class="card-text"><span class="card-lbl">ANALYTICS</span><span class="card-desc">Stats, rankings & charts</span></div>
			</a>
		</nav>
	{/if}
</div>

<style>
	.home{display:flex;flex-direction:column;align-items:center;gap:var(--space-xl);padding-top:var(--space-lg);min-height:80dvh}
	.hero{text-align:center;display:flex;flex-direction:column;align-items:center}
	.logo-ring{width:96px;height:96px;border-radius:var(--radius-xl);display:flex;align-items:center;justify-content:center;margin-bottom:var(--space-md);overflow:hidden}
	.app-icon{width:100%;height:100%;object-fit:contain;border-radius:var(--radius-xl);filter:drop-shadow(0 0 12px rgba(232,25,59,.45))}
	.title{font-size:1.6rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;line-height:1.15}
	.accent{color:var(--color-primary);text-shadow:0 0 20px rgba(232,25,59,.5)}
	.subtitle{margin-top:var(--space-sm);font-size:.65rem;font-weight:700;letter-spacing:.25em;color:var(--color-text-muted);text-transform:uppercase}
	.landing{display:flex;flex-direction:column;gap:var(--space-sm);width:100%;max-width:400px}
	.landing-msg{text-align:center;color:var(--color-text-muted);font-size:.85rem;margin-bottom:var(--space-sm);line-height:1.5}
	.landing-msg strong{color:var(--color-secondary)}
	.resume-banner{display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm) var(--space-md);background:rgba(255,171,0,.1);border:1px solid rgba(255,171,0,.3);border-radius:var(--radius-lg);font-size:.75rem;color:var(--color-warning);width:100%;max-width:400px}
	.resume-link{color:var(--color-secondary);font-weight:800;font-size:.75rem;margin-left:auto;white-space:nowrap}
	.grid{display:flex;flex-direction:column;gap:var(--space-sm);width:100%;max-width:400px}
	.card{display:flex;align-items:center;gap:var(--space-md);padding:var(--space-md) var(--space-lg);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg);text-decoration:none;color:var(--color-text);transition:all var(--transition-fast)}
	.card:hover{border-color:var(--neon-red);box-shadow:var(--glow-primary);transform:translateY(-1px)}
	.card--primary{grid-column:1/-1;background:var(--color-primary-dim);border-color:var(--neon-red);box-shadow:var(--glow-primary);padding:var(--space-lg)}
	.card--primary .card-icon{color:var(--color-primary)}
	.card-icon{flex-shrink:0;color:var(--color-secondary);opacity:.85}
	.card-text{display:flex;flex-direction:column;gap:2px}
	.card-lbl{font-weight:800;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase}
	.card-desc{font-size:.65rem;color:var(--color-text-muted)}
</style>

