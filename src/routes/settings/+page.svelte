<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
</script>

<div class="settings-page">
	<h1>Settings</h1>
	<div class="settings-list">
		<a href="/settings/sounds" class="settings-item">
			<div>
				<strong>Sounds</strong>
				<span>Toggle gameplay sound categories</span>
			</div>
			<Icon name="chevron-down" size={16} />
		</a>
		<a href="/share" class="settings-item">
			<div>
				<strong>Share App</strong>
				<span>QR code to open Commander Track</span>
			</div>
			<Icon name="qr" size={16} />
		</a>
		<button class="settings-item" disabled>
			<div>
				<strong>More coming soon...</strong>
				<span>Additional preferences will be added</span>
			</div>
			<Icon name="settings" size={16} />
		</button>
	</div>
</div>

<style>
	.settings-page{display:flex;flex-direction:column;gap:var(--space-lg);padding:var(--space-lg)}
	.settings-page h1{font-size:1.2rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
	.settings-list{display:flex;flex-direction:column;gap:var(--space-sm)}
	.settings-item{display:flex;align-items:center;justify-content:space-between;gap:var(--space-md);padding:var(--space-md);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-lg);text-decoration:none;color:var(--color-text)}
	.settings-item strong{display:block;font-size:.85rem;letter-spacing:.04em;text-transform:uppercase}
	.settings-item span{display:block;font-size:.72rem;color:var(--color-text-muted)}
	.settings-item:disabled{opacity:.75}
</style>

