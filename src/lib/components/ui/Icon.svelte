<script lang="ts">
	/**
	 * Lightweight SVG icon set. Each name maps to one or more <path> elements.
	 */
	interface Props { name: string; size?: number; color?: string; }
	let { name, size = 20, color = 'currentColor' }: Props = $props();

	const paths: Record<string, string> = {
		play: 'M6 4l12 8-12 8z',
		pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
		next: 'M4 4l10 8-10 8zM16 4h4v16h-4z',
		swords: 'M3 3l7 7m4 4l7 7M21 3l-7 7m-4 4l-7 7M12 12l2-2m-2 2l-2 2',
		settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
		user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
		trophy: 'M6 9V2h12v7a6 6 0 01-12 0zM2 2h4M18 2h4M6 12v3h12v-3M9 21h6M12 15v6',
		chart: 'M18 20V10M12 20V4M6 20v-6',
		deck: 'M4 4h16v16H4zM4 9h16M9 4v16',
		edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
		trash: 'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2',
		search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35',
		back: 'M19 12H5M12 19l-7-7 7-7',
		'sign-in': 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3',
		'sign-out': 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
		skull: 'M12 2a8 8 0 00-8 8c0 3.3 2 6.2 5 7.5V20h6v-2.5c3-1.3 5-4.2 5-7.5a8 8 0 00-8-8zM9 13a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM15 13a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
		crosshair: 'M12 22a10 10 0 100-20 10 10 0 000 20zM22 12h-4M6 12H2M12 6V2M12 22v-4',
		dice: 'M4 4h16v16H4zM9 9h.01M15 9h.01M9 15h.01M15 15h.01',
		'return': 'M9 10l-5 5 5 5M20 4v7a4 4 0 01-4 4H4',
		flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
		crown: 'M2 20h20L18 8l-4 4-2-6-2 6-4-4z',
		monitor: 'M2 3h20v14H2zM8 21h8M12 17v4',
		globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
		'line-chart': 'M3 3v18h18M7 16l4-8 4 4 6-10',
		'bar-chart': 'M12 20V10M18 20V4M6 20v-4',
		'pie-chart': 'M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z',
	};
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke={color}
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if paths[name]}
		<path d={paths[name]} />
	{/if}
</svg>

