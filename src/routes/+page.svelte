<script lang="ts">
	import { authUser, signOut } from '$lib/firebase/auth';
	import { isDebugMode } from '$lib/utils/env';
	import Icon from '$lib/components/ui/Icon.svelte';

	const devMode = isDebugMode();
	let user = $derived($authUser);
</script>

<div class="home">
	<div class="hero animate-fade-in">
		<div class="logo-ring"><Icon name="swords" size={44} color="var(--color-primary)" /></div>
		<h1 class="title">COMMANDER<br /><span class="accent">TRACK</span></h1>
		<p class="subtitle">LIFE · TIMER · ANALYTICS</p>
	</div>

	<div class="auth-section animate-fade-in">
		{#if user}
			<div class="user-row">
				{#if user.photoURL}<img src={user.photoURL} alt="" class="avatar" />{/if}
				<span class="uname">{user.displayName ?? user.email ?? 'Player'}</span>
				{#if devMode}<span class="chip">DEV MODE</span>{/if}
				<button class="link-btn" onclick={signOut}><Icon name="sign-out" size={14} /> Sign Out</button>
			</div>
		{/if}
	</div>

	<nav class="grid animate-fade-in">
		<a href="/setup" class="card card--primary"><div class="card-icon"><Icon name="play" size={28} /></div><div class="card-text"><span class="card-lbl">NEW GAME</span><span class="card-desc">Start tracking</span></div></a>
		<a href="/game" class="card"><div class="card-icon"><Icon name="swords" size={24} /></div><div class="card-text"><span class="card-lbl">GAME</span><span class="card-desc">Current match</span></div></a>
		<a href="/log" class="card"><div class="card-icon"><Icon name="chart" size={24} /></div><div class="card-text"><span class="card-lbl">ANALYTICS</span><span class="card-desc">Stats & charts</span></div></a>
		<a href="/rank" class="card"><div class="card-icon"><Icon name="trophy" size={24} /></div><div class="card-text"><span class="card-lbl">RANKINGS</span><span class="card-desc">Leaderboard</span></div></a>
		<a href="/admin" class="card"><div class="card-icon"><Icon name="settings" size={24} /></div><div class="card-text"><span class="card-lbl">ADMIN</span><span class="card-desc">Players & decks</span></div></a>
	</nav>
</div>

<style>
	.home{display:flex;flex-direction:column;align-items:center;gap:var(--space-xl);padding-top:calc(env(safe-area-inset-top,0px)+var(--space-2xl));min-height:100dvh}
	.hero{text-align:center;display:flex;flex-direction:column;align-items:center}
	.logo-ring{width:80px;height:80px;border-radius:var(--radius-xl);border:2px solid var(--neon-red);display:flex;align-items:center;justify-content:center;margin-bottom:var(--space-md);box-shadow:var(--glow-primary);background:var(--color-primary-dim);animation:neon-flicker 6s infinite}
	.title{font-size:1.6rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;line-height:1.15}
	.accent{color:var(--color-primary);text-shadow:0 0 20px rgba(232,25,59,.5)}
	.subtitle{margin-top:var(--space-sm);font-size:.65rem;font-weight:700;letter-spacing:.25em;color:var(--color-text-muted);text-transform:uppercase}
	.auth-section{width:100%;max-width:340px}
	.user-row{display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm) var(--space-md);background:var(--color-surface);border-radius:var(--radius-lg);border:1px solid var(--color-surface-elevated)}
	.avatar{width:32px;height:32px;border-radius:var(--radius-full)}
	.uname{flex:1;font-weight:600;font-size:.85rem}
	.chip{padding:4px 8px;border-radius:var(--radius-full);background:rgba(255,171,0,.12);color:var(--color-warning);font-size:.65rem;font-weight:700;letter-spacing:.06em}
	.link-btn{display:flex;align-items:center;gap:4px;font-size:.7rem;color:var(--color-text-muted);font-weight:600;min-height:auto;padding:var(--space-xs)}
	.grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-sm);width:100%;max-width:400px}
	.card{display:flex;align-items:center;gap:var(--space-md);padding:var(--space-md) var(--space-lg);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg);text-decoration:none;color:var(--color-text);transition:all var(--transition-fast)}
	.card:hover{border-color:var(--neon-red);box-shadow:var(--glow-primary);transform:translateY(-1px)}
	.card--primary{grid-column:1/-1;background:var(--color-primary-dim);border-color:var(--neon-red);box-shadow:var(--glow-primary);padding:var(--space-lg)}
	.card--primary .card-icon{color:var(--color-primary)}
	.card-icon{flex-shrink:0;color:var(--color-secondary);opacity:.85}
	.card-text{display:flex;flex-direction:column;gap:2px}
	.card-lbl{font-weight:800;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase}
	.card-desc{font-size:.65rem;color:var(--color-text-muted)}
</style>

