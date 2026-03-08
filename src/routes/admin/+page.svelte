<script lang="ts">
	import { authUser } from '$lib/firebase/auth';
	import { isFirebaseConfigured } from '$lib/services/data-service';
	import Button from '$lib/components/ui/Button.svelte';

	const localMode = !isFirebaseConfigured();
	let user = $derived($authUser);
	let hasAccess = $derived(localMode || !!user);
</script>

<div class="admin-page">
	<h1>Admin</h1>
	<p class="description">Manage your players and decks</p>

	{#if hasAccess}
		<div class="admin-grid">
			<a href="/admin/players" class="admin-card">
				<span class="card-icon">👤</span>
				<span class="card-title">Players</span>
				<span class="card-desc">Add, edit, or remove players</span>
			</a>
			<a href="/admin/decks" class="admin-card">
				<span class="card-icon">🃏</span>
				<span class="card-title">Decks</span>
				<span class="card-desc">Manage commander decks</span>
			</a>
		</div>
	{:else}
		<div class="auth-required">
			<p>Please sign in to access admin features.</p>
			<a href="/">
				<Button variant="primary">
					{#snippet children()}Go to Home{/snippet}
				</Button>
			</a>
		</div>
	{/if}
</div>

<style>
	.admin-page {
		padding-top: var(--space-lg);
	}

	h1 {
		font-size: 1.8rem;
		font-weight: 800;
	}

	.description {
		color: var(--color-text-secondary);
		margin-top: var(--space-xs);
		margin-bottom: var(--space-xl);
	}

	.admin-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.admin-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-xl);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--color-text);
		transition: all var(--transition-fast);
	}

	.admin-card:hover {
		background: var(--color-surface-elevated);
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.card-icon {
		font-size: 2.5rem;
	}

	.card-title {
		font-size: 1.2rem;
		font-weight: 700;
	}

	.card-desc {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.auth-required {
		text-align: center;
		padding: var(--space-2xl);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}

	.auth-required p {
		color: var(--color-text-secondary);
	}
</style>

