<script lang="ts">
	import { onMount } from 'svelte';
	import type { CommanderZone } from '$lib/models/types';
	import { authUser } from '$lib/firebase/auth';
	import { isDebugMode } from '$lib/utils/env';
	import { getDataService } from '$lib/services/data-service';
	import {
		userZones, currentZoneId,
		loadUserZones, createZone, joinZone, leaveZone, deleteZone, switchZone,
		removeMemberFromZone
	} from '$lib/stores/zoneStore';
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	const devMode = isDebugMode();
	let user = $derived($authUser);
	let uid = $derived(user?.uid ?? '');
	let myZones = $derived($userZones);
	let curZoneId = $derived($currentZoneId);

	let allZones: CommanderZone[] = $state([]);
	let loading: boolean = $state(true);
	let tab: 'my' | 'browse' | 'create' = $state('my');
	let toast: { message: string; type: 'success' | 'error' } | null = $state(null);

	/* Create form */
	let newZoneName: string = $state('');
	let newZonePassword: string = $state('');
	let newDisplayName: string = $state('');
	let creating: boolean = $state(false);

	/* Join form */
	let joinDisplayName: string = $state('');
	let joinPassword: string = $state('');
	let joiningZoneId: string | null = $state(null);
	let joining: boolean = $state(false);

	/* Expand/collapse members */
	let expandedZoneId: string | null = $state(null);
	let revealedPasswordZoneId: string | null = $state(null);

	function toggleExpand(zoneId: string) {
		if (expandedZoneId === zoneId) {
			expandedZoneId = null;
			if (revealedPasswordZoneId === zoneId) revealedPasswordZoneId = null;
			return;
		}
		expandedZoneId = zoneId;
		if (revealedPasswordZoneId && revealedPasswordZoneId !== zoneId) {
			revealedPasswordZoneId = null;
		}
	}

	function togglePassword(zoneId: string) {
		if (expandedZoneId !== zoneId) return;
		revealedPasswordZoneId = revealedPasswordZoneId === zoneId ? null : zoneId;
	}

	async function handleRemoveMember(zoneId: string, targetUid: string, displayName: string) {
		if (!confirm(`Remove "${displayName}" from this zone?`)) return;
		const ok = await removeMemberFromZone(uid, zoneId, targetUid);
		if (ok) {
			toast = { message: `${displayName} removed`, type: 'success' };
			const ds = await getDataService();
			allZones = await ds.getAllZones();
		} else {
			toast = { message: 'Failed to remove member', type: 'error' };
		}
	}

	onMount(async () => {
		await loadUserZones(uid);
		try {
			const ds = await getDataService();
			allZones = await ds.getAllZones();
		} catch (e) { console.warn('Failed to load zones', e); }
		loading = false;
	});

	let browsableZones = $derived(
		allZones.filter((z) => !z.memberIds.includes(uid))
	);

	async function handleCreate() {
		if (!newZoneName.trim() || !newDisplayName.trim()) return;
		creating = true;
		// Check global uniqueness
		const nameLower = newZoneName.trim().toLowerCase();
		if (allZones.some((z) => z.name.toLowerCase() === nameLower)) {
			toast = { message: 'A zone with that name already exists', type: 'error' };
			creating = false;
			return;
		}
		const id = await createZone(uid, newZoneName.trim(), newDisplayName.trim(), newZonePassword || undefined);
		if (id) {
			toast = { message: 'Zone created!', type: 'success' };
			newZoneName = '';
			newZonePassword = '';
			newDisplayName = '';
			tab = 'my';
			const ds = await getDataService();
			allZones = await ds.getAllZones();
		} else {
			toast = { message: 'Failed to create zone (max 5 zones reached?)', type: 'error' };
		}
		creating = false;
	}

	async function handleJoin(zoneId: string) {
		if (!joinDisplayName.trim()) {
			toast = { message: 'Enter a display name', type: 'error' };
			return;
		}
		const zone = allZones.find((z) => z.id === zoneId);
		if (zone?.password && joinPassword !== zone.password) {
			toast = { message: 'Incorrect password', type: 'error' };
			return;
		}
		joining = true;
		const ok = await joinZone(uid, zoneId, joinDisplayName.trim());
		if (ok) {
			toast = { message: 'Joined!', type: 'success' };
			joiningZoneId = null;
			joinDisplayName = '';
			joinPassword = '';
			tab = 'my';
			const ds = await getDataService();
			allZones = await ds.getAllZones();
		} else {
			toast = { message: 'Failed to join (limit reached, name taken, or zone full)', type: 'error' };
		}
		joining = false;
	}

	async function handleLeave(zoneId: string) {
		if (!confirm('Leave this Commander Zone?')) return;
		const ok = await leaveZone(uid, zoneId);
		if (ok) {
			toast = { message: 'Left zone', type: 'success' };
			const ds = await getDataService();
			allZones = await ds.getAllZones();
		} else {
			toast = { message: 'Cannot leave (you are the creator — delete instead)', type: 'error' };
		}
	}

	async function handleDelete(zoneId: string) {
		if (!confirm('Delete this Commander Zone? All games and stats will be permanently removed.')) return;
		const ok = await deleteZone(uid, zoneId);
		if (ok) {
			toast = { message: 'Zone deleted', type: 'success' };
			const ds = await getDataService();
			allZones = await ds.getAllZones();
		} else {
			toast = { message: 'Failed to delete zone', type: 'error' };
		}
	}

	function startJoinFlow(zoneId: string) {
		joiningZoneId = zoneId;
		joinDisplayName = '';
		joinPassword = '';
	}
</script>

<div class="zones-page">
	<h1>Commander Zones</h1>

	<div class="tabs">
		<button class="tab" class:active={tab === 'my'} onclick={() => (tab = 'my')}><Icon name="swords" size={14} /> My Zones</button>
		<button class="tab" class:active={tab === 'browse'} onclick={() => (tab = 'browse')}><Icon name="globe" size={14} /> Browse</button>
		<button class="tab" class:active={tab === 'create'} onclick={() => (tab = 'create')}><Icon name="play" size={14} /> Create</button>
	</div>

	{#if loading}
		<div class="empty">Loading…</div>
	{:else if tab === 'my'}
		{#if !myZones.length}
			<div class="empty">You don't belong to any Commander Zone yet. Create one or browse existing zones!</div>
		{:else}
			<div class="list">
				{#each myZones as z (z.id)}
					<div class="zone-card animate-fade-in" class:active-zone={z.id === curZoneId}>
						<div class="zone-info">
							<span class="zone-name">{z.name}</span>
							<span class="zone-meta">
								{z.memberIds.length} member{z.memberIds.length !== 1 ? 's' : ''}
								· {z.members[uid]?.role === 'creator' ? 'Creator' : 'Member'}
								· You: "{z.members[uid]?.displayName ?? '?'}"
							</span>
						</div>
						<div class="zone-actions">
							<button class="expand-btn" onclick={() => toggleExpand(z.id)} title="Show members">
								<Icon name={expandedZoneId === z.id ? 'chevron-up' : 'chevron-down'} size={16} />
							</button>
							{#if z.id !== curZoneId}
								<Button variant="secondary" size="sm" onclick={() => switchZone(z.id)}>{#snippet children()}Select{/snippet}</Button>
							{:else}
								<span class="active-badge">Active</span>
							{/if}
							{#if z.creatorId === uid}
								<Button variant="danger" size="sm" onclick={() => handleDelete(z.id)}>{#snippet children()}<Icon name="trash" size={14} />{/snippet}</Button>
							{:else}
								<Button variant="ghost" size="sm" onclick={() => handleLeave(z.id)}>{#snippet children()}Leave{/snippet}</Button>
							{/if}
						</div>
						{#if expandedZoneId === z.id}
							<div class="member-list">
								{#if z.creatorId === uid}
									<div class="zone-admin-row">
										{#if z.password}
											<Button variant="ghost" size="sm" onclick={() => togglePassword(z.id)}>
												{#snippet children()}<Icon name={revealedPasswordZoneId === z.id ? 'chevron-up' : 'chevron-down'} size={12} /> {revealedPasswordZoneId === z.id ? 'Hide Zone Password' : 'Show Zone Password'}{/snippet}
											</Button>
										{/if}
										{#if z.password && revealedPasswordZoneId === z.id}
											<span class="zone-password">Password: {z.password}</span>
										{/if}
									</div>
								{/if}
								{#each Object.entries(z.members) as [memberUid, info]}
									<div class="member-row">
										<span class="member-name">{info.displayName}</span>
										<span class="member-role">{info.role}</span>
										<div class="member-action">
											{#if z.creatorId === uid && memberUid !== z.creatorId}
												<button class="member-remove" onclick={() => handleRemoveMember(z.id, memberUid, info.displayName)}>
													<Icon name="trash" size={12} color="var(--color-danger)" />
												</button>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

	{:else if tab === 'browse'}
		{#if !browsableZones.length}
			<div class="empty">No zones available to join.</div>
		{:else}
			<div class="list">
				{#each browsableZones as z (z.id)}
					<div class="zone-card animate-fade-in">
						<div class="zone-info">
							<span class="zone-name">{z.name}</span>
							<span class="zone-meta">{z.memberIds.length} member{z.memberIds.length !== 1 ? 's' : ''} {#if z.password}· 🔒{/if}</span>
						</div>
						{#if joiningZoneId === z.id}
							<div class="join-form">
								<input type="text" bind:value={joinDisplayName} placeholder="Join with name" required />
								{#if z.password}
									<input type="password" bind:value={joinPassword} placeholder="Zone password" />
								{/if}
								<div class="join-btns">
									<Button variant="primary" size="sm" onclick={() => handleJoin(z.id)} disabled={joining || !joinDisplayName.trim()}>
										{#snippet children()}{joining ? 'Joining…' : 'Confirm'}{/snippet}
									</Button>
									<Button variant="ghost" size="sm" onclick={() => (joiningZoneId = null)}>{#snippet children()}Cancel{/snippet}</Button>
								</div>
							</div>
						{:else}
							<Button variant="secondary" size="sm" onclick={() => startJoinFlow(z.id)}>{#snippet children()}Join{/snippet}</Button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

	{:else}
		<section class="create-section">
			<div class="field"><label for="cz-name">Zone Name <span class="req">*</span></label>
				<input id="cz-name" type="text" bind:value={newZoneName} placeholder="Friday Night MTG" required />
			</div>
			<div class="field"><label for="cz-pw">Password <span class="opt">(optional)</span></label>
				<input id="cz-pw" type="text" bind:value={newZonePassword} placeholder="Room code" />
			</div>
			<div class="field"><label for="cz-dn">Join with Name <span class="req">*</span></label>
				<input id="cz-dn" type="text" bind:value={newDisplayName} placeholder="Your name in this zone" required />
			</div>
			<Button variant="primary" fullWidth onclick={handleCreate} disabled={creating || !newZoneName.trim() || !newDisplayName.trim()}>
				{#snippet children()}{creating ? 'Creating…' : 'Create Zone'}{/snippet}
			</Button>
		</section>
	{/if}
</div>

{#if toast}<Toast message={toast.message} type={toast.type} onclose={() => (toast = null)} />{/if}

<style>
	.zones-page { padding-top: var(--space-md); }
	h1 { font-size: 1.4rem; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; color: var(--color-primary); margin-bottom: var(--space-md); }
	.empty { text-align: center; padding: var(--space-2xl); color: var(--color-text-muted); font-size: .85rem; }
	.tabs { display: flex; gap: 2px; background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-lg); padding: 3px; margin-bottom: var(--space-md); }
	.tab { flex: 1; padding: var(--space-sm); border-radius: var(--radius-md); font-weight: 700; font-size: .7rem; letter-spacing: .06em; text-transform: uppercase; transition: all var(--transition-fast); color: var(--color-text-muted); display: flex; align-items: center; justify-content: center; gap: 4px; min-height: 44px; }
	.tab.active { background: var(--color-primary); color: white; box-shadow: var(--glow-primary); }
	.list { display: flex; flex-direction: column; gap: var(--space-sm); }
	.zone-card { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-md); background: var(--color-surface); border: 1px solid var(--color-surface-elevated); border-radius: var(--radius-lg); transition: all var(--transition-fast); flex-wrap: wrap; }
	.zone-card:hover { border-color: var(--neon-cyan); }
	.zone-card.active-zone { border-color: rgba(0, 230, 118, .5); box-shadow: var(--glow-success); }
	.zone-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 150px; }
	.zone-name { font-weight: 700; font-size: .9rem; letter-spacing: .03em; }
	.zone-meta { font-size: .65rem; color: var(--color-text-muted); }
	.zone-actions { display: flex; gap: var(--space-xs); align-items: center; }
	.active-badge { padding: 4px 10px; border-radius: var(--radius-full); background: rgba(0, 230, 118, .15); color: var(--color-success); font-size: .65rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
	.expand-btn { width: 32px; height: 32px; min-height: unset; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-full); background: var(--color-surface-elevated); transition: all var(--transition-fast); }
	.expand-btn:hover { background: var(--color-surface-hover); }
	.member-list { width: 100%; display: flex; flex-direction: column; gap: 2px; margin-top: var(--space-xs); padding-top: var(--space-sm); border-top: 1px solid var(--color-surface-elevated); animation: fade-in 0.2s ease; }
	.zone-admin-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-sm); padding: 0 var(--space-sm) var(--space-xs) var(--space-sm); }
	.zone-password { font-size: .66rem; color: var(--color-warning); font-weight: 700; letter-spacing: .02em; background: rgba(255, 171, 0, .08); border: 1px solid rgba(255, 171, 0, .28); border-radius: var(--radius-full); padding: 3px 10px; }
	.member-row { display: flex; align-items: center; gap: var(--space-sm); padding: var(--space-xs) var(--space-sm); border-radius: var(--radius-sm); }
	.member-row:hover { background: var(--color-surface-hover); }
	.member-name { flex: 1; font-size: .75rem; font-weight: 600; }
	.member-role { font-size: .6rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .04em; }
	.member-action { width: 28px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
	.member-remove { width: 28px; height: 28px; min-height: unset; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-full); transition: all var(--transition-fast); }
	.member-remove:hover { background: rgba(255, 23, 68, .15); }
	.join-form { width: 100%; display: flex; flex-direction: column; gap: var(--space-sm); margin-top: var(--space-sm); }
	.join-btns { display: flex; gap: var(--space-sm); }
	.create-section { display: flex; flex-direction: column; gap: var(--space-md); }
	.field { display: flex; flex-direction: column; gap: var(--space-xs); }
	.field label { font-size: .85rem; font-weight: 600; color: var(--color-text-secondary); }
	.req { color: var(--color-primary); }
	.opt { font-weight: 400; font-size: .75rem; color: var(--color-text-muted); }
</style>

