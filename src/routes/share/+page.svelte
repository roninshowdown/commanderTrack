<script lang="ts">
	let appUrl = $state('https://commander-track.web.app');
	if (typeof window !== 'undefined' && window.location?.origin) {
		appUrl = window.location.origin;
	}
	let qrUrl = $derived(`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(appUrl)}`);
</script>

<div class="share-page">
	<h1>Share App</h1>
	<p>Scan to open Commander Track instantly.</p>
	<div class="qr-wrap">
		<img src={qrUrl} alt="Commander Track QR Code" class="qr" />
	</div>
	<div class="url">{appUrl}</div>
</div>

<style>
	.share-page{display:flex;flex-direction:column;align-items:center;gap:var(--space-md);padding-top:var(--space-md)}
	h1{font-size:1.2rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--color-secondary)}
	p{font-size:.8rem;color:var(--color-text-muted)}
	.qr-wrap{padding:var(--space-md);background:#fff;border-radius:var(--radius-lg)}
	.qr{width:min(72vw,320px);height:auto;display:block}
	.url{font-family:var(--font-mono);font-size:.72rem;color:var(--color-text-muted);word-break:break-all;text-align:center}
</style>

