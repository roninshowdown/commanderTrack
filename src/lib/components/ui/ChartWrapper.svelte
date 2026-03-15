<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	Chart.register(...registerables);

	interface Props {
		type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar';
		data: any;
		options?: any;
		height?: number;
	}

	let { type, data, options = {}, height = 250 }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;
	let lastDataJson = '';
	let lastType = '';

	const defaultOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				labels: {
					color: 'rgba(224, 223, 230, 0.7)', // --color-text mapped
					font: { size: 11 },
					padding: 12,
					usePointStyle: true,
					pointStyleWidth: 8
				}
			}
		},
		scales: {
			x: {
				ticks: { color: 'rgba(122, 122, 150, 0.8)' },   // --color-text-secondary mapped
				grid: { color: 'rgba(26, 26, 40, 0.6)' }         // --color-surface-elevated mapped
			},
			y: {
				ticks: { color: 'rgba(122, 122, 150, 0.8)' },
				grid: { color: 'rgba(26, 26, 40, 0.6)' }
			}
		}
	};

	function mergeOptions(a: any, b: any): any {
		const result = { ...a };
		for (const key of Object.keys(b)) {
			if (b[key] && typeof b[key] === 'object' && !Array.isArray(b[key])) {
				result[key] = mergeOptions(a[key] || {}, b[key]);
			} else {
				result[key] = b[key];
			}
		}
		return result;
	}

	onMount(() => {
		createChart();
	});

	onDestroy(() => {
		chart?.destroy();
		chart = null;
	});

	function createChart() {
		if (chart) chart.destroy();
		const isPieType = type === 'pie' || type === 'doughnut';
		const mergedOpts = isPieType
			? mergeOptions({ ...defaultOptions, scales: undefined }, options)
			: mergeOptions(defaultOptions, options);

		chart = new Chart(canvas, {
			type,
			data: structuredClone(data),
			options: mergedOpts
		});
	}

	$effect(() => {
		// Only recreate chart when data or type actually changes
		const dataJson = JSON.stringify(data);
		const currentType = type;
		if (canvas && data && (dataJson !== lastDataJson || currentType !== lastType)) {
			lastDataJson = dataJson;
			lastType = currentType;
			createChart();
		}
	});
</script>

<div class="chart-container" style="height:{height}px">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-container {
		position: relative;
		width: 100%;
		background: var(--color-surface);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
	}
</style>

