<script lang="ts">
	import { authUser } from '$lib/firebase/auth';
	import { isFirebaseConfigured } from '$lib/services/data-service';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	const localMode = !isFirebaseConfigured();
	let user = $derived($authUser);
	let hasAccess = $derived(localMode || !!user);
</script>

<div class="admin-page">
	<h1 class="page-title">ADMIN</h1>
	<p class="page-desc">Manage your players and decks</p>

	{#if hasAccess}
		<div class="admin-grid">
			<a href="/admin/players" class="admin-card">
				<span class="card-icon"><Icon name="user" size={32} color="var(--color-secondary)" /></span>
				<span class="card-title">PLAYERS</span>
				<span class="card-desc">Add, edit, or remove</span>
			</a>
			<a href="/admin/decks" class="admin-card">
				<span class="card-icon"><Icon name="deck" size={32} color="var(--color-secondary)" /></span>
				<span class="card-title">DECKS</span>
				<span class="card-desc">Commander decks</span>
			</a>
		</div>
	{:else}
		<div class="auth-required">
			<p>Sign in to access admin features.</p>
			<a href="/">
				<Button variant="primary">
					{#snippet children()}GO HOME{/snippet}
				</Button>
			</a>
		</div>
	{/if}
</div>

<style>
	.admin-page {
		padding-top: var(--space-md);
	}

	.page-title {
		font-size: 1.4rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-primary);
	}

	.page-desc {
		color: var(--color-text-muted);
		font-size: 0.8rem;
		margin-top: var(--space-xs);
		margin-bottom: var(--space-xl);
		letter-spacing: 0.02em;
	}

	.admin-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-sm);
	}

	.admin-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xl) var(--space-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-surface-elevated);
		border-radius: var(--radius-xl);
		text-decoration: none;
		color: var(--color-text);
		transition: all var(--transition-fast);
		text-align: center;
	}

	.admin-card:hover {
		border-color: var(--neon-cyan);
		box-shadow: var(--glow-cyan);
		transform: translateY(-2px);
	}

	.card-icon {
		display: flex;
		justify-content: center;
	}

	.card-title {
		font-size: 0.85rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.card-desc {
		font-size: 0.7rem;
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
