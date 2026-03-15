<script lang="ts">
	import { authUser, signIn, signOut } from '$lib/firebase/auth';
	import { isFirebaseConfigured } from '$lib/services/data-service';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let user = $derived($authUser);
	const localMode = !isFirebaseConfigured();
</script>

<div class="home-page">
	<!-- Title -->
	<div class="hero animate-fade-in">
		<div class="logo-ring">
			<Icon name="swords" size={44} color="var(--color-primary)" />
		</div>
		<h1 class="title">COMMANDER<br /><span class="title-accent">TRACK</span></h1>
		<p class="subtitle">LIFE · TIMER · ANALYTICS</p>
	</div>

	<!-- Auth -->
	<div class="auth-section animate-fade-in">
		{#if localMode}
			<div class="chip chip-warn">
				<Icon name="monitor" size={14} /> LOCAL MODE
			</div>
		{:else if user}
			<div class="user-row">
				{#if user.photoURL}
					<img src={user.photoURL} alt={user.displayName ?? 'User'} class="avatar" />
				{/if}
				<span class="user-name">{user.displayName ?? 'Player'}</span>
				<button class="link-btn" onclick={signOut}>
					<Icon name="sign-out" size={14} /> Sign Out
				</button>
			</div>
		{:else}
			<Button variant="primary" size="lg" fullWidth onclick={signIn}>
				{#snippet children()}<Icon name="sign-in" size={16} /> SIGN IN{/snippet}
			</Button>
		{/if}
	</div>

	<!-- Main nav grid -->
	<nav class="nav-grid animate-fade-in">
		<a href="/setup" class="nav-card nav-card--primary">
			<div class="nav-card-icon"><Icon name="play" size={28} /></div>
			<div class="nav-card-content">
				<span class="nav-card-label">NEW GAME</span>
				<span class="nav-card-desc">Start tracking</span>
			</div>
		</a>
		<a href="/game" class="nav-card">
			<div class="nav-card-icon"><Icon name="swords" size={24} /></div>
			<div class="nav-card-content">
				<span class="nav-card-label">GAME</span>
				<span class="nav-card-desc">Current match</span>
			</div>
		</a>
		<a href="/log" class="nav-card">
			<div class="nav-card-icon"><Icon name="chart" size={24} /></div>
			<div class="nav-card-content">
				<span class="nav-card-label">ANALYTICS</span>
				<span class="nav-card-desc">Stats & charts</span>
			</div>
		</a>
		<a href="/rank" class="nav-card">
			<div class="nav-card-icon"><Icon name="trophy" size={24} /></div>
			<div class="nav-card-content">
				<span class="nav-card-label">RANKINGS</span>
				<span class="nav-card-desc">Leaderboard</span>
			</div>
		</a>
		<a href="/admin" class="nav-card">
			<div class="nav-card-icon"><Icon name="settings" size={24} /></div>
			<div class="nav-card-content">
				<span class="nav-card-label">ADMIN</span>
				<span class="nav-card-desc">Players & decks</span>
			</div>
		</a>
	</nav>
</div>

<style>
	.home-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xl);
		padding-top: calc(env(safe-area-inset-top, 0px) + var(--space-2xl));
		min-height: 100dvh;
	}

	/* Hero */
	.hero {
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.logo-ring {
		width: 80px;
		height: 80px;
		border-radius: var(--radius-xl);
		border: 2px solid var(--neon-red);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: var(--space-md);
		box-shadow: var(--glow-primary);
		background: var(--color-primary-dim);
		animation: neon-flicker 6s infinite;
	}

	.title {
		font-family: var(--font-display);
		font-size: 1.6rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		line-height: 1.15;
		color: var(--color-text);
	}

	.title-accent {
		color: var(--color-primary);
		text-shadow: 0 0 20px rgba(232, 25, 59, 0.5);
	}

	.subtitle {
		margin-top: var(--space-sm);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.25em;
		color: var(--color-text-muted);
		text-transform: uppercase;
	}

	/* Auth */
	.auth-section {
		width: 100%;
		max-width: 340px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: var(--radius-full);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
	}

	.chip-warn {
		background: rgba(255, 171, 0, 0.12);
		color: var(--color-warning);
		border: 1px solid rgba(255, 171, 0, 0.25);
	}

	.user-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-surface-elevated);
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-full);
	}

	.user-name {
		flex: 1;
		font-weight: 600;
		font-size: 0.85rem;
	}

	.link-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.7rem;
		color: var(--color-text-muted);
		font-weight: 600;
		letter-spacing: 0.04em;
		min-height: auto;
		padding: var(--space-xs);
	}

	/* Nav grid */
	.nav-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-sm);
		width: 100%;
		max-width: 400px;
	}

	.nav-card {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--color-text);
		transition: all var(--transition-fast);
	}

	.nav-card:hover {
		border-color: var(--neon-red);
		box-shadow: var(--glow-primary);
		transform: translateY(-1px);
	}

	.nav-card--primary {
		grid-column: 1 / -1;
		background: var(--color-primary-dim);
		border-color: var(--neon-red);
		box-shadow: var(--glow-primary);
		padding: var(--space-lg);
	}

	.nav-card--primary .nav-card-icon {
		color: var(--color-primary);
	}

	.nav-card-icon {
		flex-shrink: 0;
		color: var(--color-secondary);
		opacity: 0.85;
	}

	.nav-card-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-card-label {
		font-weight: 800;
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.nav-card-desc {
		font-size: 0.65rem;
		color: var(--color-text-muted);
	}
</style>

