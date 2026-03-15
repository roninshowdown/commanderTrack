<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	Chart.register(...registerables);

	interface Props { type: string; data: any; height?: number; }
	let { type, data, height = 200 }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	function render() {
		if (chart) chart.destroy();
		if (!canvas || !data) return;
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
				}
			}
		});
	}

	onMount(render);
	onDestroy(() => chart?.destroy());

	$effect(() => {
		// re-render when data or type changes
		void data;
		void type;
		render();
	});
</script>

<div class="chart-wrapper" style:height="{height}px">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-wrapper { position: relative; width: 100%; }
</style>

