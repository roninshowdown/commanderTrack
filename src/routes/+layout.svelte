<script lang="ts">
	import '../app.css';
	import { authUser } from '$lib/firebase/auth';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	let currentPath = $derived($page.url.pathname);

	onMount(() => {
		authUser.init();
	});

	const navItems = [
		{ href: '/', label: 'Home', icon: '🏠' },
		{ href: '/setup', label: 'Setup', icon: '🎮' },
		{ href: '/game', label: 'Game', icon: '⚔️' },
		{ href: '/admin', label: 'Admin', icon: '⚙️' },
		{ href: '/log', label: 'Log', icon: '📋' },
		{ href: '/rank', label: 'Rank', icon: '🏆' }
	];
</script>

<div class="app-shell">
	<main class="app-main">
		{@render children()}
	</main>

	<nav class="bottom-nav">
		{#each navItems as item}
			<a
				href={item.href}
				class="nav-item"
				class:active={currentPath === item.href}
			>
				<span class="nav-icon">{item.icon}</span>
				<span class="nav-label">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.app-main {
		flex: 1;
		padding: var(--space-md);
		padding-bottom: calc(60px + var(--space-md) + env(safe-area-inset-bottom, 0px));
		max-width: 900px;
		margin: 0 auto;
		width: 100%;
	}

	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-around;
		align-items: center;
		height: 60px;
		background: var(--color-surface);
		border-top: 1px solid var(--color-surface-elevated);
		padding-bottom: env(safe-area-inset-bottom, 0px);
		z-index: 100;
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: var(--space-xs) var(--space-sm);
		color: var(--color-text-muted);
		text-decoration: none;
		transition: color var(--transition-fast);
		border-radius: var(--radius-sm);
		min-width: 56px;
	}

	.nav-item.active {
		color: var(--color-primary);
	}

	.nav-item:hover {
		color: var(--color-text);
	}

	.nav-icon {
		font-size: 1.2rem;
		line-height: 1;
	}

	.nav-label {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>

