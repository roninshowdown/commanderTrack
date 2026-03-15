/* ============================================
   Scryfall API — Card search & autocomplete
   ============================================ */

import type { MtgColor } from '$lib/models/types';

const API = 'https://api.scryfall.com';

interface ScryfallCard {
	name: string;
	image_uris?: { art_crop: string };
	card_faces?: Array<{ image_uris?: { art_crop: string } }>;
	colors?: string[];
	color_identity?: string[];
}

export interface ScryfallResult {
	name: string;
	imageUrl: string;
	colors: MtgColor[];
}

const COLOR_MAP: Record<string, MtgColor> = { W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green' };

function mapColors(raw: string[]): MtgColor[] {
	return raw.map((c) => COLOR_MAP[c]).filter((c): c is MtgColor => !!c);
}

function imageUrl(card: ScryfallCard): string {
	return card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop ?? '';
}

export async function searchCommander(name: string): Promise<ScryfallResult | null> {
	if (!name.trim()) return null;
	try {
		const res = await fetch(`${API}/cards/named?fuzzy=${encodeURIComponent(name.trim())}`);
		if (!res.ok) return null;
		const card: ScryfallCard = await res.json();
		return { name: card.name, imageUrl: imageUrl(card), colors: mapColors(card.color_identity ?? card.colors ?? []) };
	} catch {
		return null;
	}
}

export async function autocompleteCardName(q: string): Promise<string[]> {
	if (q.length < 2) return [];
	try {
		const res = await fetch(`${API}/cards/autocomplete?q=${encodeURIComponent(q)}`);
		if (!res.ok) return [];
		return ((await res.json()).data as string[]) ?? [];
	} catch {
		return [];
	}
}

