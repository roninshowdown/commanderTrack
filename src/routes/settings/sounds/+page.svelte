<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getSoundPreferences, setSoundPreferences } from '$lib/utils/sounds';

	let prefs = $state(getSoundPreferences());

	function toggleActiveReactive() {
		prefs = { ...prefs, activeReactive: !prefs.activeReactive };
		setSoundPreferences(prefs);
	}

	function toggleLifeGainLoss() {
		prefs = { ...prefs, lifeGainLoss: !prefs.lifeGainLoss };
		setSoundPreferences(prefs);
	}
</script>

<div class="sounds-page">
	<div class="header">
		<a href="/settings" class="back"><Icon name="back" size={20} /></a>
		<h1>Sounds</h1>
	</div>

	<div class="list">
		<button class="item" onclick={toggleActiveReactive}>
			<div><strong>Player Active/Reactive</strong><span>Turn and priority related sounds</span></div>
			<span class:enabled={prefs.activeReactive}>{prefs.activeReactive ? 'ON' : 'OFF'}</span>
		</button>
		<button class="item" onclick={toggleLifeGainLoss}>
			<div><strong>Life Gain/Loss</strong><span>Life and commander damage sounds</span></div>
			<span class:enabled={prefs.lifeGainLoss}>{prefs.lifeGainLoss ? 'ON' : 'OFF'}</span>
		</button>
		<button class="item" disabled>
			<div><strong>More coming soon...</strong><span>More sound categories will follow</span></div>
			<Icon name="settings" size={16} />
		</button>
	</div>
</div>

<style>
	.sounds-page{display:flex;flex-direction:column;gap:var(--space-lg);padding:var(--space-lg)}
	.header{display:flex;align-items:center;gap:var(--space-md)}
	.header h1{font-size:1.2rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
	.back{color:var(--color-text-muted);display:flex;align-items:center}
	.list{display:flex;flex-direction:column;gap:var(--space-sm)}
	.item{display:flex;align-items:center;justify-content:space-between;gap:var(--space-md);padding:var(--space-md);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg);text-align:left;color:var(--color-text)}
	.item strong{display:block;font-size:.84rem;text-transform:uppercase;letter-spacing:.04em}
	.item span{display:block;font-size:.72rem;color:var(--color-text-muted)}
	.item > span{font-family:var(--font-mono);font-size:.8rem;color:var(--color-danger)}
	.item > span.enabled{color:var(--color-success)}
</style>

