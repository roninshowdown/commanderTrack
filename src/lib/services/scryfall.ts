import type { MtgColor } from '$lib/models/types';

const SCRYFALL_API = 'https://api.scryfall.com';

interface ScryfallCard {
	name: string;
	image_uris?: {
		normal: string;
		art_crop: string;
		small: string;
		large: string;
	};
	card_faces?: Array<{
		image_uris?: {
			normal: string;
			art_crop: string;
			small: string;
			large: string;
		};
	}>;
	colors?: string[];
	color_identity?: string[];
}

interface ScryfallSearchResult {
	imageUrl: string;
	colors: MtgColor[];
	name: string;
}

const COLOR_MAP: Record<string, MtgColor> = {
	W: 'white',
	U: 'blue',
	B: 'black',
	R: 'red',
	G: 'green'
};

function mapColors(scryfallColors: string[]): MtgColor[] {
	return scryfallColors
		.map((c) => COLOR_MAP[c])
		.filter((c): c is MtgColor => c !== undefined);
}

function getImageUrl(card: ScryfallCard): string {
	if (card.image_uris) {
		return card.image_uris.art_crop;
	}
	// Double-faced cards
	if (card.card_faces?.[0]?.image_uris) {
		return card.card_faces[0].image_uris.art_crop;
	}
	return '';
}

/**
 * Search for a commander card by name using Scryfall fuzzy search.
 * Returns image URL and colors if found.
 */
export async function searchCommander(name: string): Promise<ScryfallSearchResult | null> {
	if (!name.trim()) return null;

	try {
		const response = await fetch(
			`${SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(name.trim())}`
		);

		if (!response.ok) return null;

		const card: ScryfallCard = await response.json();

		return {
			name: card.name,
			imageUrl: getImageUrl(card),
			colors: mapColors(card.color_identity ?? card.colors ?? [])
		};
	} catch {
		return null;
	}
}

/**
 * Autocomplete card names for search input.
 */
export async function autocompleteCardName(query: string): Promise<string[]> {
	if (query.length < 2) return [];

	try {
		const response = await fetch(
			`${SCRYFALL_API}/cards/autocomplete?q=${encodeURIComponent(query)}`
		);

		if (!response.ok) return [];

		const data = await response.json();
		return data.data ?? [];
	} catch {
		return [];
	}
}

