<script lang="ts">
	import type { MtgColor } from '$lib/models/types';

	interface Props { color: MtgColor; size?: number; }
	let { color, size = 32 }: Props = $props();

	const symbolMap: Record<MtgColor, string> = {
		white: 'W',
		blue: 'U',
		black: 'B',
		red: 'R',
		green: 'G'
	};

	let src = $derived(`https://svgs.scryfall.io/card-symbols/${symbolMap[color]}.svg`);
</script>

<span class="mana-icon" style:width="{size}px" style:height="{size}px">
	<img src={src} alt={color} width={size} height={size} loading="lazy" />
</span>

<style>
	.mana-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.mana-icon img { width: 100%; height: 100%; display: block; }
</style>

