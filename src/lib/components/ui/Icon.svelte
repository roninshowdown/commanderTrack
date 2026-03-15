<script lang="ts">
	interface Props {
		name: string;
		size?: number;
		color?: string;
		class?: string;
	}

	let { name, size = 20, color = 'currentColor', class: className = '' }: Props = $props();
</script>

<svg
	class="icon {className}"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke={color}
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'home'}
		<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
	{:else if name === 'setup' || name === 'gamepad'}
		<rect x="2" y="6" width="20" height="12" rx="3" />
		<circle cx="8" cy="12" r="2" fill={color} stroke="none" />
		<circle cx="16" cy="10" r="1.2" fill={color} stroke="none" />
		<circle cx="16" cy="14" r="1.2" fill={color} stroke="none" />
		<circle cx="14" cy="12" r="1.2" fill={color} stroke="none" />
		<circle cx="18" cy="12" r="1.2" fill={color} stroke="none" />
	{:else if name === 'swords' || name === 'game'}
		<path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
		<path d="M13 19l6-6" />
		<path d="M16 16l4 4" />
		<path d="M19 21l2-2" />
		<path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
		<path d="M11 5l-6 6" />
		<path d="M8 8L4 4" />
		<path d="M5 3L3 5" />
	{:else if name === 'settings' || name === 'admin'}
		<circle cx="12" cy="12" r="3" />
		<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
	{:else if name === 'log' || name === 'clipboard'}
		<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
		<rect x="8" y="2" width="8" height="4" rx="1" />
		<line x1="8" y1="10" x2="16" y2="10" />
		<line x1="8" y1="14" x2="16" y2="14" />
		<line x1="8" y1="18" x2="12" y2="18" />
	{:else if name === 'trophy' || name === 'rank'}
		<path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2" />
		<path d="M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2" />
		<path d="M6 3h12v7a6 6 0 01-12 0V3z" />
		<path d="M9 16h6" />
		<path d="M12 16v5" />
		<path d="M8 21h8" />
	{:else if name === 'user' || name === 'player'}
		<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
		<circle cx="12" cy="7" r="4" />
	{:else if name === 'cards' || name === 'deck'}
		<rect x="3" y="4" width="14" height="17" rx="2" />
		<path d="M7 1h10a2 2 0 012 2v14" />
	{:else if name === 'skull'}
		<circle cx="9" cy="10" r="1.5" fill={color} stroke="none" />
		<circle cx="15" cy="10" r="1.5" fill={color} stroke="none" />
		<path d="M12 2a8 8 0 00-6 13.3V18a1 1 0 001 1h2v-2h2v2h2v-2h2v2h2a1 1 0 001-1v-2.7A8 8 0 0012 2z" />
	{:else if name === 'key'}
		<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
	{:else if name === 'dice'}
		<rect x="3" y="3" width="18" height="18" rx="3" />
		<circle cx="8" cy="8" r="1.2" fill={color} stroke="none" />
		<circle cx="16" cy="8" r="1.2" fill={color} stroke="none" />
		<circle cx="12" cy="12" r="1.2" fill={color} stroke="none" />
		<circle cx="8" cy="16" r="1.2" fill={color} stroke="none" />
		<circle cx="16" cy="16" r="1.2" fill={color} stroke="none" />
	{:else if name === 'flag'}
		<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
		<line x1="4" y1="22" x2="4" y2="15" />
	{:else if name === 'finish'}
		<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill={color} fill-opacity="0.15" />
		<line x1="4" y1="22" x2="4" y2="15" />
	{:else if name === 'edit' || name === 'pencil'}
		<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
		<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
	{:else if name === 'delete' || name === 'trash'}
		<polyline points="3 6 5 6 21 6" />
		<path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
	{:else if name === 'search'}
		<circle cx="11" cy="11" r="8" />
		<line x1="21" y1="21" x2="16.65" y2="16.65" />
	{:else if name === 'plus'}
		<line x1="12" y1="5" x2="12" y2="19" />
		<line x1="5" y1="12" x2="19" y2="12" />
	{:else if name === 'minus'}
		<line x1="5" y1="12" x2="19" y2="12" />
	{:else if name === 'pause'}
		<rect x="6" y="4" width="4" height="16" rx="1" fill={color} stroke="none" />
		<rect x="14" y="4" width="4" height="16" rx="1" fill={color} stroke="none" />
	{:else if name === 'play'}
		<polygon points="5 3 19 12 5 21 5 3" fill={color} stroke="none" />
	{:else if name === 'next' || name === 'skip-forward'}
		<polygon points="5 4 15 12 5 20 5 4" fill={color} stroke="none" />
		<line x1="19" y1="5" x2="19" y2="19" stroke-width="2.5" />
	{:else if name === 'back' || name === 'arrow-left'}
		<line x1="19" y1="12" x2="5" y2="12" />
		<polyline points="12 19 5 12 12 5" />
	{:else if name === 'return'}
		<polyline points="9 14 4 9 9 4" />
		<path d="M20 20v-7a4 4 0 00-4-4H4" />
	{:else if name === 'close' || name === 'x'}
		<line x1="18" y1="6" x2="6" y2="18" />
		<line x1="6" y1="6" x2="18" y2="18" />
	{:else if name === 'chart' || name === 'bar-chart'}
		<line x1="18" y1="20" x2="18" y2="10" stroke-width="2.5" />
		<line x1="12" y1="20" x2="12" y2="4" stroke-width="2.5" />
		<line x1="6" y1="20" x2="6" y2="14" stroke-width="2.5" />
	{:else if name === 'line-chart'}
		<polyline points="22 12 18 8 13 13 9 9 2 16" />
		<line x1="2" y1="20" x2="22" y2="20" />
	{:else if name === 'pie-chart'}
		<path d="M21.21 15.89A10 10 0 118 2.83" />
		<path d="M22 12A10 10 0 0012 2v10z" fill={color} fill-opacity="0.2" />
	{:else if name === 'monitor'}
		<rect x="2" y="3" width="20" height="14" rx="2" />
		<line x1="8" y1="21" x2="16" y2="21" />
		<line x1="12" y1="17" x2="12" y2="21" />
	{:else if name === 'heart'}
		<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill={color} fill-opacity="0.15" />
	{:else if name === 'shield'}
		<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
	{:else if name === 'crown'}
		<path d="M2 20h20" stroke-width="2" />
		<path d="M4 20l1-11 5 5 2-8 2 8 5-5 1 11" fill={color} fill-opacity="0.15" />
	{:else if name === 'crosshair'}
		<circle cx="12" cy="12" r="10" />
		<line x1="22" y1="12" x2="18" y2="12" />
		<line x1="6" y1="12" x2="2" y2="12" />
		<line x1="12" y1="6" x2="12" y2="2" />
		<line x1="12" y1="22" x2="12" y2="18" />
	{:else if name === 'sign-in'}
		<path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
		<polyline points="10 17 15 12 10 7" />
		<line x1="15" y1="12" x2="3" y2="12" />
	{:else if name === 'sign-out'}
		<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
		<polyline points="16 17 21 12 16 7" />
		<line x1="21" y1="12" x2="9" y2="12" />
	{:else if name === 'globe'}
		<circle cx="12" cy="12" r="10" />
		<line x1="2" y1="12" x2="22" y2="12" />
		<path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
	{:else if name === 'refresh'}
		<polyline points="23 4 23 10 17 10" />
		<path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
	{:else if name === 'timer'}
		<circle cx="12" cy="13" r="8" />
		<line x1="12" y1="9" x2="12" y2="13" />
		<line x1="12" y1="13" x2="15" y2="13" />
		<path d="M9 1h6" />
	{/if}
</svg>

<style>
	.icon {
		display: inline-flex;
		flex-shrink: 0;
		vertical-align: middle;
	}
</style>

