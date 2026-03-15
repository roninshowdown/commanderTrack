<script lang="ts">
	import type { MtgColor } from '$lib/models/types';

	interface Props {
		color: MtgColor;
		size?: number;
		active?: boolean;
	}

	let { color, size = 24, active = false }: Props = $props();

	const colorMap: Record<MtgColor, { bg: string; fg: string; symbol: string }> = {
		white: { bg: '#f9faf4', fg: '#9c8c5c', symbol: '☼' },
		blue: { bg: '#0e68ab', fg: '#c4e1f5', symbol: '●' },
		black: { bg: '#150b00', fg: '#b8a88a', symbol: '✦' },
		red: { bg: '#d3202a', fg: '#ffd4d4', symbol: '◆' },
		green: { bg: '#00733e', fg: '#c8f0d8', symbol: '⬡' }
	};

	const info = $derived(colorMap[color]);
</script>

<span
	class="color-pip"
	class:active
	style="width:{size}px; height:{size}px;"
	title={color}
>
	<svg width={size} height={size} viewBox="0 0 24 24">
		<circle cx="12" cy="12" r="10" fill={info.bg} stroke={info.fg} stroke-width="1.5" />
		{#if color === 'white'}
			<!-- Sun rays -->
			<circle cx="12" cy="12" r="3.5" fill="none" stroke={info.fg} stroke-width="1.5" />
			{#each [0,45,90,135,180,225,270,315] as angle}
				<line
					x1={12 + 5.5 * Math.cos(angle * Math.PI / 180)}
					y1={12 + 5.5 * Math.sin(angle * Math.PI / 180)}
					x2={12 + 7 * Math.cos(angle * Math.PI / 180)}
					y2={12 + 7 * Math.sin(angle * Math.PI / 180)}
					stroke={info.fg}
					stroke-width="1.2"
				/>
			{/each}
		{:else if color === 'blue'}
			<!-- Water drop -->
			<path d="M12 6c-3 4-5 6-5 8.5a5 5 0 0010 0c0-2.5-2-4.5-5-8.5z" fill={info.fg} fill-opacity="0.8" />
		{:else if color === 'black'}
			<!-- Skull simplified -->
			<circle cx="12" cy="11" r="5" fill={info.fg} fill-opacity="0.8" />
			<circle cx="10" cy="10" r="1.2" fill={info.bg} />
			<circle cx="14" cy="10" r="1.2" fill={info.bg} />
			<path d="M10 14l1-1h2l1 1" fill="none" stroke={info.bg} stroke-width="0.8" />
		{:else if color === 'red'}
			<!-- Fire -->
			<path d="M12 5c-1 3-4 5-4 8a4 4 0 008 0c0-3-3-5-4-8z" fill={info.fg} fill-opacity="0.85" />
			<path d="M12 10c-.5 1.5-2 2.5-2 4a2 2 0 004 0c0-1.5-1.5-2.5-2-4z" fill={info.bg} fill-opacity="0.5" />
		{:else if color === 'green'}
			<!-- Tree/leaf -->
			<path d="M12 4c-3 0-6 3-6 7 0 3 2 5 4 6v3h4v-3c2-1 4-3 4-6 0-4-3-7-6-7z" fill={info.fg} fill-opacity="0.8" />
			<line x1="12" y1="10" x2="12" y2="17" stroke={info.bg} stroke-width="1" />
		{/if}
	</svg>
</span>

<style>
	.color-pip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: all 150ms ease;
		cursor: pointer;
		border: 2px solid transparent;
		overflow: hidden;
	}

	.color-pip.active {
		border-color: var(--color-primary);
		box-shadow: 0 0 8px rgba(233, 69, 96, 0.4);
	}
</style>

