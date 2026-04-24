<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	onMount(() => goto('/log', { replaceState: true }));
</script>
<div class="loading">Redirecting…</div>
<style>.loading{padding:2rem;text-align:center;color:var(--color-text-muted)}</style>
