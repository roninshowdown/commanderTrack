/* ============================================
   Zone Store — Commander Zone state management
   ============================================ */

import { writable, derived, get } from 'svelte/store';
import type { CommanderZone, Player, Deck, AccountProfile } from '$lib/models/types';
import { getDataService } from '$lib/services/data-service';

const CURRENT_ZONE_KEY = 'ct_currentZoneId';

/* ── Internal stores ── */
const _zones = writable<CommanderZone[]>([]);
const _currentZoneId = writable<string | null>(localStorage.getItem(CURRENT_ZONE_KEY));

/* ── Public derived ── */
export const userZones = derived(_zones, ($z) => $z);
export const currentZoneId = derived(_currentZoneId, ($id) => $id);
export const currentZone = derived([_zones, _currentZoneId], ([$zones, $id]) =>
	$zones.find((z) => z.id === $id) ?? null
);

/* ── Actions ── */

export async function loadUserZones(uid: string): Promise<void> {
	try {
		const ds = await getDataService();
		const zones = await ds.getZonesForUser(uid);
		_zones.set(zones);
		// Auto-select first zone if current is invalid
		const curId = get(_currentZoneId);
		if (!curId || !zones.find((z) => z.id === curId)) {
			const first = zones[0]?.id ?? null;
			_currentZoneId.set(first);
			if (first) localStorage.setItem(CURRENT_ZONE_KEY, first);
			else localStorage.removeItem(CURRENT_ZONE_KEY);
		}
	} catch (e) {
		console.warn('[zoneStore] Failed to load zones:', e);
	}
}

export function switchZone(zoneId: string): void {
	_currentZoneId.set(zoneId);
	localStorage.setItem(CURRENT_ZONE_KEY, zoneId);
}

export async function createZone(
	uid: string,
	name: string,
	displayName: string,
	password?: string
): Promise<string | null> {
	const zones = get(_zones);
	if (zones.length >= 5) return null; // silent limit
	try {
		const ds = await getDataService();
		const id = await ds.createZone({
			name,
			password: password || undefined,
			creatorId: uid,
			memberIds: [uid],
			members: {
				[uid]: { displayName, role: 'creator', joinedAt: Date.now() }
			},
			createdAt: Date.now()
		});
		await loadUserZones(uid);
		switchZone(id);
		return id;
	} catch (e) {
		console.warn('[zoneStore] Failed to create zone:', e);
		return null;
	}
}

export async function joinZone(
	uid: string,
	zoneId: string,
	displayName: string
): Promise<boolean> {
	const zones = get(_zones);
	if (zones.length >= 5) return false; // silent limit
	try {
		const ds = await getDataService();
		const zone = await ds.getZone(zoneId);
		if (!zone) return false;
		if (zone.memberIds.length >= 20) return false; // member cap
		if (zone.memberIds.includes(uid)) return false; // already member
		// Check display name uniqueness within zone
		const nameLower = displayName.toLowerCase();
		const nameTaken = Object.values(zone.members).some(
			(m) => m.displayName.toLowerCase() === nameLower
		);
		if (nameTaken) return false;
		const updatedMembers = {
			...zone.members,
			[uid]: { displayName, role: 'member' as const, joinedAt: Date.now() }
		};
		await ds.updateZone(zoneId, {
			memberIds: [...zone.memberIds, uid],
			members: updatedMembers
		});
		await loadUserZones(uid);
		switchZone(zoneId);
		return true;
	} catch (e) {
		console.warn('[zoneStore] Failed to join zone:', e);
		return false;
	}
}

export async function leaveZone(uid: string, zoneId: string): Promise<boolean> {
	try {
		const ds = await getDataService();
		const zone = await ds.getZone(zoneId);
		if (!zone) return false;
		if (zone.creatorId === uid) return false; // creator cannot leave
		const updatedMembers = { ...zone.members };
		delete updatedMembers[uid];
		await ds.updateZone(zoneId, {
			memberIds: zone.memberIds.filter((id) => id !== uid),
			members: updatedMembers
		});
		// If leaving current zone, switch away
		if (get(_currentZoneId) === zoneId) {
			localStorage.removeItem(CURRENT_ZONE_KEY);
			_currentZoneId.set(null);
		}
		await loadUserZones(uid);
		return true;
	} catch (e) {
		console.warn('[zoneStore] Failed to leave zone:', e);
		return false;
	}
}

export async function deleteZone(uid: string, zoneId: string): Promise<boolean> {
	try {
		const ds = await getDataService();
		const zone = await ds.getZone(zoneId);
		if (!zone || zone.creatorId !== uid) return false;
		await ds.deleteZone(zoneId);
		if (get(_currentZoneId) === zoneId) {
			localStorage.removeItem(CURRENT_ZONE_KEY);
			_currentZoneId.set(null);
		}
		await loadUserZones(uid);
		return true;
	} catch (e) {
		console.warn('[zoneStore] Failed to delete zone:', e);
		return false;
	}
}

/** Build Player view models from zone membership + account profiles */
export async function getPlayersInZone(zoneId: string): Promise<Player[]> {
	const ds = await getDataService();
	const zone = await ds.getZone(zoneId);
	if (!zone) return [];
	const players: Player[] = [];
	for (const uid of zone.memberIds) {
		const profile = await ds.getAccountProfile(uid);
		const memberInfo = zone.members[uid];
		if (memberInfo) {
			players.push({
				id: uid,
				name: memberInfo.displayName,
				imageUrl: profile?.imageUrl
			});
		}
	}
	return players;
}

/** Get all decks belonging to members of a zone */
export async function getDecksInZone(zoneId: string): Promise<Deck[]> {
	const ds = await getDataService();
	const zone = await ds.getZone(zoneId);
	if (!zone) return [];
	const allDecks: Deck[] = [];
	for (const uid of zone.memberIds) {
		const decks = await ds.getDecksForPlayer(uid);
		allDecks.push(...decks);
	}
	return allDecks;
}

export function resetZoneStore(): void {
	_zones.set([]);
	_currentZoneId.set(null);
	localStorage.removeItem(CURRENT_ZONE_KEY);
}

/** Remove a member from a zone (creator-only). */
export async function removeMemberFromZone(
	callerUid: string,
	zoneId: string,
	targetUid: string
): Promise<boolean> {
	try {
		const ds = await getDataService();
		const zone = await ds.getZone(zoneId);
		if (!zone) return false;
		if (zone.creatorId !== callerUid) return false; // only creator
		if (targetUid === zone.creatorId) return false; // cannot remove creator
		if (!zone.memberIds.includes(targetUid)) return false;
		const updatedMembers = { ...zone.members };
		delete updatedMembers[targetUid];
		await ds.updateZone(zoneId, {
			memberIds: zone.memberIds.filter((id) => id !== targetUid),
			members: updatedMembers
		});
		await loadUserZones(callerUid);
		return true;
	} catch (e) {
		console.warn('[zoneStore] Failed to remove member:', e);
		return false;
	}
}

