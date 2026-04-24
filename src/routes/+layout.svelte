<script lang="ts">
	import '../app.css';
	import '$lib/utils/debug';
	import { authUser, signInWithGoogle, signInWithEmail, registerWithEmail, signOut } from '$lib/firebase/auth';
	import { isDebugMode } from '$lib/utils/env';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { userZones, currentZone, currentZoneId, loadUserZones, switchZone, resetZoneStore } from '$lib/stores/zoneStore';
	import { getDataService } from '$lib/services/data-service';

	authUser.init();

	let { children } = $props();

	const devMode = isDebugMode();
	let user = $derived($authUser);
	let currentPath = $derived($page.url.pathname);
	let isHome = $derived(currentPath === '/');
	let isAuthenticated = $derived(!!user || devMode);
	let myZones = $derived($userZones);
	let zone = $derived($currentZone);
	let curZoneId = $derived($currentZoneId);

	let isGamePage = $derived(currentPath === '/game');

	/* Zone-free pages (don't require an active zone) */
	let isZoneFreePage = $derived(
		currentPath === '/zones' || currentPath === '/profile' || currentPath === '/'
	);

	/* Email/Password login state */
	let email: string = $state('');
	let password: string = $state('');
	let authMode: 'signin' | 'register' = $state('signin');
	let authError: string | null = $state(null);
	let authBusy: boolean = $state(false);

	/* Avatar dropdown */
	let showAvatarDropdown: boolean = $state(false);
	let showZoneDropdown: boolean = $state(false);
	let profileImageUrl: string = $state('');

	/* Load zones when user changes */
	$effect(() => {
		if (user?.uid) {
			loadUserZones(user.uid);
		}
	});

	$effect(() => {
		(async () => {
			if (!user?.uid) {
				profileImageUrl = '';
				return;
			}
			try {
				const ds = await getDataService();
				const profile = await ds.getAccountProfile(user.uid);
				profileImageUrl = profile?.imageUrl ?? '';
			} catch {
				profileImageUrl = '';
			}
		})();
	});

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

	async function handleSignOut() {
		showAvatarDropdown = false;
		resetZoneStore();
		await signOut();
	}


	function handleZoneSwitch(zoneId: string) {
		switchZone(zoneId);
		showZoneDropdown = false;
		// Force full refresh so zone-scoped pages re-run their loading logic.
		if (typeof window !== 'undefined') {
			window.location.reload();
		}
	}

	function closeDropdowns() {
		showAvatarDropdown = false;
		showZoneDropdown = false;
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="app-shell" class:force-rotated={isGamePage} role="presentation" onclick={closeDropdowns}>
	{#if !isAuthenticated}
		<!-- ── Login Screen ── -->
		<div class="login-shell">
			<div class="login-card animate-fade-in">
				<div class="login-hero">
					<div class="logo-ring"><img src="/icon-512.png" alt="Commander Track" class="login-logo" /></div>
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
		<header class="top-bar animate-fade-in" class:landscape-hide={isGamePage}>
			{#if !isHome}
				<a href="/" class="back-btn"><Icon name="back" size={20} /><span>Menu</span></a>
			{:else}
				<div></div>
			{/if}

			<div class="header-right">
				{#if devMode}<span class="dev-badge">DEV</span>{/if}

				<!-- Zone tag -->
				{#if zone}
					<div class="zone-tag-wrap">
						<button class="zone-tag" onclick={(e) => { e.stopPropagation(); showZoneDropdown = !showZoneDropdown; }}>
							{zone.name}
						</button>
						{#if showZoneDropdown}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div class="dropdown zone-dropdown" role="presentation" onclick={(e) => e.stopPropagation()}>
								{#each myZones as z (z.id)}
									<button class="dropdown-item" class:active={z.id === curZoneId} onclick={() => handleZoneSwitch(z.id)}>
										{z.name}
										{#if z.id === curZoneId}<span class="check">✓</span>{/if}
									</button>
								{/each}
								<div class="dropdown-divider"></div>
							<button class="dropdown-item" onclick={() => { showZoneDropdown = false; goto('/zones'); }}>
								<Icon name="settings" size={14} /> Edit
							</button>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Avatar -->
				<div class="avatar-wrap">
					<button class="avatar-btn" onclick={(e) => { e.stopPropagation(); showAvatarDropdown = !showAvatarDropdown; }}>
						{#if profileImageUrl || user?.photoURL}
							<img src={profileImageUrl || user?.photoURL} alt="" class="avatar-img" />
						{:else}
							<Icon name="user" size={20} color="var(--color-text-muted)" />
						{/if}
					</button>
					{#if showAvatarDropdown}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div class="dropdown avatar-dropdown" role="presentation" onclick={(e) => e.stopPropagation()}>
						<div class="dropdown-header">
							{user?.email ?? user?.displayName ?? 'Player'}
						</div>
						<div class="dropdown-divider"></div>
						<button class="dropdown-item" onclick={() => { showAvatarDropdown = false; goto('/profile'); }}>
							<Icon name="user" size={14} /> Profile
						</button>
						<button class="dropdown-item" onclick={handleSignOut}>
							<Icon name="sign-out" size={14} /> Sign Out
						</button>
						</div>
					{/if}
				</div>
			</div>
		</header>

		<main class="app-main" class:has-header={true} class:game-page={isGamePage}>
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
	.login-logo { width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-lg); }
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

	/* ── Header right ── */
	.header-right { display: flex; align-items: center; gap: var(--space-sm); }

	/* ── Avatar ── */
	.avatar-wrap { position: relative; }
	.avatar-btn { width: 36px; height: 36px; border-radius: var(--radius-full); overflow: hidden; border: 2px solid var(--color-surface-elevated); display: flex; align-items: center; justify-content: center; background: var(--color-surface); transition: all var(--transition-fast); min-height: unset; }
	.avatar-btn:hover { border-color: var(--neon-cyan); }
	.avatar-img { width: 100%; height: 100%; object-fit: cover; }

	/* ── Zone tag ── */
	.zone-tag-wrap { position: relative; }
	.zone-tag { padding: 4px 12px; border-radius: var(--radius-full); background: var(--color-primary-dim); color: var(--color-primary-light); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--neon-red); transition: all var(--transition-fast); min-height: unset; white-space: nowrap; }
	.zone-tag:hover { box-shadow: var(--glow-primary); }

	/* ── Dropdowns ── */
	.dropdown { position: absolute; top: calc(100% + 8px); right: 0; min-width: 200px; background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); z-index: 200; overflow: hidden; animation: fade-in 0.15s ease; }
	.dropdown-header { padding: var(--space-sm) var(--space-md); font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.dropdown-divider { height: 1px; background: var(--color-surface-elevated); }
	.dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: var(--space-sm) var(--space-md); font-size: 0.8rem; font-weight: 600; color: var(--color-text); transition: background var(--transition-fast); text-align: left; min-height: 40px; }
	.dropdown-item:hover { background: var(--color-surface-hover); }
	.dropdown-item.active { color: var(--color-secondary); }
	.check { margin-left: auto; color: var(--color-success); }

	/* ── Main ── */
	.app-main { flex: 1; padding: var(--space-md); padding-bottom: calc(var(--space-lg) + env(safe-area-inset-bottom, 0px)); max-width: 600px; margin: 0 auto; width: 100%; overflow-x: hidden; }
	.app-main.has-header { padding-top: var(--space-sm); }
	.app-main.game-page { max-width: 100%; }

	/* ── Mobile: rotate only in game mode ── */
	@media (max-width: 768px) {
		.app-shell.force-rotated {
			width: 100dvh;
			height: 100dvw;
			transform: rotate(90deg);
			transform-origin: left top;
			position: fixed;
			top: 0;
			left: 100dvw;
			overflow: hidden;
			min-height: unset;
			flex-direction: column;
		}
		.app-shell.force-rotated .top-bar {
			padding-top: var(--space-sm);
			flex-shrink: 0;
		}
		.app-shell.force-rotated .top-bar.landscape-hide { display: none; }
		.app-shell.force-rotated .app-main {
			max-width: 100%;
			padding: var(--space-sm);
			padding-bottom: env(safe-area-inset-right, 0px);
			overflow-y: auto;
			overflow-x: hidden;
			-webkit-overflow-scrolling: touch;
		}
		.app-shell.force-rotated .app-main.game-page {
			padding: 2px;
			padding-bottom: env(safe-area-inset-right, 0px);
			overflow: hidden;
			height: 100%;
			display: flex;
			flex-direction: column;
		}
	}
</style>

