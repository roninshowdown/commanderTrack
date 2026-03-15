<script lang="ts">
	import type { MtgColor } from '$lib/models/types';

	interface Props { color: MtgColor; size?: number; active?: boolean; }
	let { color, size = 20, active = true }: Props = $props();

	const colorMap: Record<MtgColor, string> = {
		white: 'var(--mtg-white)', blue: 'var(--mtg-blue)', black: 'var(--mtg-black)',
		red: 'var(--mtg-red)', green: 'var(--mtg-green)'
	};
</script>

<span
	class="pip"
	class:inactive={!active}
	style:width="{size}px"
	style:height="{size}px"
	style:background={colorMap[color]}
></span>

<style>
	.pip {
		display: inline-block; border-radius: var(--radius-full);
		border: 2px solid rgba(255,255,255,0.25); flex-shrink: 0;
	}
	.inactive { opacity: 0.3; filter: grayscale(1); }
</style>

