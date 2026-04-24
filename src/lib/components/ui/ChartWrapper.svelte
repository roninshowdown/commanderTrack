<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	Chart.register(...registerables);

	interface ChartPointClick {
		label: string;
		value: number;
		datasetLabel: string;
	}

	interface Props {
		type: string;
		data: any;
		height?: number;
		options?: any;
		onPointClick?: (point: ChartPointClick) => void;
	}
	let { type, data, height = 200, options = {}, onPointClick }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;
	let mounted = false;

	function render() {
		if (!canvas || !data) return;
		if (chart) { chart.destroy(); chart = null; }
		chart = new Chart(canvas, {
			type: type as any,
			data,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { labels: { color: '#7a7a96', font: { size: 11 } } }
				},
				scales: type === 'doughnut' ? {} : {
					x: { ticks: { color: '#4a4a64', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
					y: { ticks: { color: '#4a4a64', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
				},
				onClick: (_event: unknown, elements: Array<{ datasetIndex: number; index: number }>) => {
					if (!onPointClick || !elements.length || !chart) return;
					const el = elements[0];
					const ds = chart.data.datasets[el.datasetIndex] as { label?: string; data?: unknown[] };
					onPointClick({
						label: String(chart.data.labels?.[el.index] ?? ''),
						value: Number(ds?.data?.[el.index] ?? 0),
						datasetLabel: ds?.label ?? ''
					});
				}
				,
				...options
			}
		});
	}

	onMount(() => {
		mounted = true;
		render();
	});
	onDestroy(() => { chart?.destroy(); chart = null; });

	$effect(() => {
		// re-render when data or type changes (but skip initial — onMount handles it)
		void data;
		void type;
		void options;
		void onPointClick;
		if (mounted) {
			tick().then(render);
		}
	});
</script>

<div class="chart-wrapper" style:height="{height}px">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-wrapper { position: relative; width: 100%; }
</style>

