<script lang="ts">
	import { authUser, signIn, signOut } from '$lib/firebase/auth';
	import { isFirebaseConfigured } from '$lib/services/data-service';
	import Button from '$lib/components/ui/Button.svelte';

	let user = $derived($authUser);
	const localMode = !isFirebaseConfigured();
</script>

<div class="home-page">
	<div class="hero animate-fade-in">
		<div class="logo">⚔️</div>
		<h1>Commander Track</h1>
		<p class="subtitle">Magic the Gathering Life & Timer Tracker</p>
	</div>

	<div class="auth-section animate-fade-in">
		{#if localMode}
			<div class="local-mode-badge">
				<span>🖥️ Local Dev Mode</span>
				<p>Data stored in browser localStorage</p>
			</div>
		{:else if user}
			<div class="user-info">
				{#if user.photoURL}
					<img src={user.photoURL} alt={user.displayName ?? 'User'} class="avatar" />
				{/if}
				<div>
					<p class="user-name">{user.displayName ?? 'Player'}</p>
					<p class="user-email">{user.email}</p>
				</div>
			</div>
			<Button variant="ghost" size="sm" onclick={signOut}>
				{#snippet children()}Sign Out{/snippet}
			</Button>
		{:else}
			<Button variant="primary" size="lg" fullWidth onclick={signIn}>
				{#snippet children()}🔑 Sign in with Google{/snippet}
			</Button>
			<p class="auth-hint">Sign in to save players, decks, and game history</p>
		{/if}
	</div>

	<div class="quick-actions animate-fade-in">
		<a href="/setup" class="action-card">
			<span class="action-icon">🎮</span>
			<span class="action-label">New Game</span>
			<span class="action-desc">Start tracking life & timer</span>
		</a>
		<a href="/admin" class="action-card">
			<span class="action-icon">⚙️</span>
			<span class="action-label">Admin</span>
			<span class="action-desc">Manage players & decks</span>
		</a>
		<a href="/log" class="action-card">
			<span class="action-icon">📋</span>
			<span class="action-label">Game Log</span>
			<span class="action-desc">View life change history</span>
		</a>
		<a href="/rank" class="action-card">
			<span class="action-icon">🏆</span>
			<span class="action-label">Rankings</span>
			<span class="action-desc">Player & deck stats</span>
		</a>
	</div>
</div>

<style>
	.home-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xl);
		padding-top: var(--space-2xl);
	}

	.hero {
		text-align: center;
	}

	.logo {
		font-size: 4rem;
		margin-bottom: var(--space-md);
	}

	h1 {
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.subtitle {
		color: var(--color-text-secondary);
		font-size: 0.95rem;
		margin-top: var(--space-xs);
	}

	.auth-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		max-width: 320px;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		width: 100%;
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
	}

	.user-name {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.user-email {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.auth-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		text-align: center;
	}

	.local-mode-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-md) var(--space-lg);
		background: var(--color-surface);
		border: 1px dashed var(--color-warning);
		border-radius: var(--radius-md);
		width: 100%;
		text-align: center;
	}

	.local-mode-badge span {
		font-weight: 700;
		color: var(--color-warning);
	}

	.local-mode-badge p {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.quick-actions {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
		width: 100%;
		max-width: 400px;
	}

	.action-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-lg);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--color-text);
		transition: all var(--transition-fast);
		text-align: center;
	}

	.action-card:hover {
		background: var(--color-surface-elevated);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.action-icon {
		font-size: 2rem;
	}

	.action-label {
		font-weight: 700;
		font-size: 0.9rem;
	}

	.action-desc {
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}
</style>

