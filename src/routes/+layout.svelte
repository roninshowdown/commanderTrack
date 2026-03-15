<script lang="ts">
	import '../app.css';
	import '$lib/utils/debug';
	import { authUser, signInWithGoogle, signInWithEmail, registerWithEmail } from '$lib/firebase/auth';
	import { isDebugMode } from '$lib/utils/env';
	import { page } from '$app/stores';
	import Icon from '$lib/components/ui/Icon.svelte';

	authUser.init();

	let { children } = $props();

	const devMode = isDebugMode();
	let user = $derived($authUser);
	let currentPath = $derived($page.url.pathname);
	let isHome = $derived(currentPath === '/');
	let isAuthenticated = $derived(!!user || devMode);

	/* Email/Password login state */
	let email: string = $state('');
	let password: string = $state('');
	let authMode: 'signin' | 'register' = $state('signin');
	let authError: string | null = $state(null);
	let authBusy: boolean = $state(false);

	async function handleGoogleSignIn() {
		authError = null;
		authBusy = true;
		try { await signInWithGoogle(); } catch (e: any) { authError = e?.message ?? 'Google sign-in failed'; }
		finally { authBusy = false; }
	}

	async function handleEmailAuth() {
		authError = null;
		authBusy = true;
		try {
			if (authMode === 'signin') await signInWithEmail(email, password);
			else await registerWithEmail(email, password);
		} catch (e: any) { authError = e?.message ?? 'Authentication failed'; }
		finally { authBusy = false; }
	}
</script>

<div class="app-shell">
	{#if !isAuthenticated}
		<!-- ── Login Screen (first thing user sees) ── -->
		<div class="login-shell">
			<div class="login-card animate-fade-in">
				<div class="login-hero">
					<div class="logo-ring"><Icon name="swords" size={36} color="var(--color-primary)" /></div>
					<h1>Commander Track</h1>
					<p class="login-sub">Please sign in to continue</p>
				</div>

				<button class="login-btn primary" onclick={handleGoogleSignIn} disabled={authBusy}>
					<Icon name="sign-in" size={14} /> Sign in with Google
				</button>

				<div class="divider"><span>or</span></div>

				<form class="login-form" onsubmit={(e) => { e.preventDefault(); handleEmailAuth(); }}>
					<input type="email" placeholder="Email" bind:value={email} required disabled={authBusy} />
					<input type="password" placeholder="Password" bind:value={password} required disabled={authBusy} />
					<button type="submit" class="login-btn secondary" disabled={authBusy}>
						{authMode === 'signin' ? 'Sign in with Email' : 'Create Account'}
					</button>
				</form>

				<button class="toggle-link" onclick={() => (authMode = authMode === 'signin' ? 'register' : 'signin')}>
					{authMode === 'signin' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
				</button>

				{#if authError}<div class="auth-error">{authError}</div>{/if}
			</div>
		</div>
	{:else}
		<!-- ── Authenticated shell ── -->
		{#if !isHome}
			<header class="top-bar animate-fade-in">
				<a href="/" class="back-btn"><Icon name="back" size={20} /><span>Menu</span></a>
				{#if devMode}<span class="dev-badge">DEV MODE</span>{/if}
			</header>
		{/if}
		<main class="app-main" class:has-header={!isHome}>
			{@render children()}
		</main>
	{/if}
</div>

<style>
	.app-shell { display: flex; flex-direction: column; min-height: 100dvh; }

	/* ── Login ── */
	.login-shell { display: flex; align-items: center; justify-content: center; min-height: 100dvh; padding: var(--space-lg); }
	.login-card { max-width: 420px; width: 100%; background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-xl); padding: var(--space-xl); display: flex; flex-direction: column; gap: var(--space-md); box-shadow: var(--shadow-lg); }
	.login-hero { display: flex; flex-direction: column; align-items: center; gap: var(--space-sm); text-align: center; }
	.login-hero h1 { font-size: 1.3rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
	.login-sub { font-size: 0.8rem; color: var(--color-text-muted); }
	.logo-ring { width: 64px; height: 64px; border-radius: var(--radius-xl); border: 2px solid var(--neon-red); display: flex; align-items: center; justify-content: center; box-shadow: var(--glow-primary); background: var(--color-primary-dim); animation: neon-flicker 6s infinite; }
	.login-btn { width: 100%; padding: var(--space-sm) var(--space-md); border-radius: var(--radius-lg); font-weight: 800; font-size: 0.8rem; letter-spacing: 0.04em; display: flex; justify-content: center; align-items: center; gap: 8px; transition: all var(--transition-fast); border: 1px solid transparent; }
	.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
	.login-btn.primary { background: var(--color-primary); color: white; border-color: var(--color-primary-light); }
	.login-btn.secondary { background: var(--color-secondary); color: #04151f; }
	.divider { text-align: center; color: var(--color-text-muted); font-size: 0.75rem; }
	.login-form { display: flex; flex-direction: column; gap: var(--space-sm); }
	.login-form input { width: 100%; }
	.toggle-link { background: none; border: none; color: var(--color-secondary); font-weight: 700; font-size: 0.75rem; cursor: pointer; text-align: center; }
	.auth-error { color: var(--color-danger); font-size: 0.8rem; text-align: center; }

	/* ── Top bar ── */
	.top-bar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: var(--space-sm) var(--space-md); padding-top: calc(var(--space-sm) + env(safe-area-inset-top, 0px)); background: rgba(10,10,15,0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid var(--color-surface-elevated); }
	.back-btn { display: flex; align-items: center; gap: 6px; color: var(--color-primary); text-decoration: none; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.04em; text-transform: uppercase; padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-sm); transition: all var(--transition-fast); min-height: 44px; }
	.back-btn:hover { background: var(--color-primary-dim); }
	.dev-badge { padding: 4px 8px; border-radius: var(--radius-full); background: rgba(0,229,255,0.12); color: var(--color-secondary); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; }

	/* ── Main ── */
	.app-main { flex: 1; padding: var(--space-md); padding-bottom: calc(var(--space-lg) + env(safe-area-inset-bottom, 0px)); max-width: 600px; margin: 0 auto; width: 100%; overflow-x: hidden; }
	.app-main.has-header { padding-top: var(--space-sm); }
</style>


