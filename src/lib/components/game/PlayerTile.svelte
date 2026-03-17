<script lang="ts">
	import type { GamePlayerState } from '$lib/models/types';
	import { formatTime } from '$lib/utils/format';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		player: GamePlayerState; playerIndex: number;
		isActive: boolean; isReactive: boolean; isTimerTicking: boolean;
		isPulsing: boolean; isDead: boolean;
		commanderDamageMode: boolean; commanderDamageSource: boolean;
		onlifechange: (amount: number) => void; onclick: () => void;
	}

	let { player, playerIndex, isActive, isReactive, isTimerTicking, isPulsing, isDead, commanderDamageMode, commanderDamageSource, onlifechange, onclick }: Props = $props();

	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let holdTriggered = false;

	function pointerDown(amount: number) {
		holdTriggered = false;
		holdTimer = setTimeout(() => { holdTriggered = true; onlifechange(amount * 10); }, 500);
	}
	function pointerUp(amount: number) {
		if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
		if (!holdTriggered) onlifechange(amount);
		holdTriggered = false;
	}
	function pointerLeave() { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } }
</script>

<div class="tile" class:active={isActive} class:reactive={isReactive} class:ticking={isTimerTicking} class:pulsing={isPulsing}
	class:dead={isDead} class:cmd-mode={commanderDamageMode} class:cmd-source={commanderDamageSource}
	role="button" tabindex="0" onclick={onclick} onkeydown={(e) => { if (e.key==='Enter') onclick(); }}>
	{#if player.commanderImageUrl}<div class="bg" style="background-image:url({player.commanderImageUrl})"></div>{/if}
	<div class="content">
		<div class="info"><span class="pname">{player.playerName}</span>{#if player.commanderName}<span class="cname">{player.commanderName}</span>{/if}</div>
		{#if !isDead}
			<div class="life-ctrl">
				<button class="life-btn dec" onpointerdown={() => pointerDown(-1)} onpointerup={() => pointerUp(-1)} onpointerleave={pointerLeave}>−</button>
				<div class="life-val">{player.life}</div>
				<button class="life-btn inc" onpointerdown={() => pointerDown(1)} onpointerup={() => pointerUp(1)} onpointerleave={pointerLeave}>+</button>
			</div>
		{:else}
			<div class="dead-overlay"><Icon name="skull" size={36} color="var(--color-danger)" /><span>DEAD</span></div>
		{/if}
		<div class="footer">
			<span class="pool">{formatTime(player.poolTimeRemaining)}</span>
			{#if isActive}<span class="badge badge-active">Active</span>{/if}
			{#if isReactive}<span class="badge badge-react">Reacting</span>{/if}
		</div>
		{#if Object.keys(player.commanderDamageTaken).length > 0}
			<div class="cmd-bar">{#each Object.values(player.commanderDamageTaken) as dmg}<span class="cmd-pip">{dmg}</span>{/each}</div>
		{/if}
	</div>
</div>

<style>
	.tile{position:relative;border-radius:var(--radius-lg);overflow:hidden;background:var(--color-surface);border:1px solid var(--color-surface-elevated);transition:all var(--transition-normal);cursor:pointer;min-height:180px;display:flex;flex-direction:column}
	.tile.active{border-color:rgba(0,230,118,.5);box-shadow:var(--glow-success)}
	.tile.ticking{border-color:var(--neon-red)}
	.tile.pulsing{animation:pulse-border 1s infinite}
	.tile.dead{opacity:.4;filter:grayscale(.8);pointer-events:none}
	.tile.cmd-mode{cursor:crosshair}
	.tile.cmd-source{border-color:rgba(255,171,0,.6);box-shadow:0 0 16px rgba(255,171,0,.3)}
	.bg{position:absolute;inset:0;background-size:cover;background-position:center top;opacity:.2;z-index:0}
	.content{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:var(--space-sm)}
	.info{display:flex;flex-direction:column;gap:2px}
	.pname{font-weight:700;font-size:.75rem;letter-spacing:.03em}
	.cname{font-size:.6rem;color:var(--color-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
	.life-ctrl{display:flex;align-items:center;justify-content:center;gap:var(--space-sm);padding:var(--space-sm) 0}
	.life-btn{width:40px;height:40px;border-radius:var(--radius-full);font-size:1.4rem;font-weight:800;transition:all var(--transition-fast);display:flex;align-items:center;justify-content:center}
	.life-btn.dec{background:rgba(255,23,68,.12);color:var(--color-danger)}.life-btn.dec:active{background:rgba(255,23,68,.3)}
	.life-btn.inc{background:rgba(0,230,118,.12);color:var(--color-success)}.life-btn.inc:active{background:rgba(0,230,118,.3)}
	.life-val{font-size:2rem;font-weight:800;font-family:var(--font-mono);font-variant-numeric:tabular-nums;min-width:48px;text-align:center;line-height:1}
	.dead-overlay{display:flex;flex-direction:column;align-items:center;gap:4px;padding:var(--space-md) 0}
	.dead-overlay span{font-size:.7rem;font-weight:800;color:var(--color-danger);letter-spacing:.1em}
	.footer{display:flex;align-items:center;justify-content:center;gap:var(--space-xs)}
	.pool{font-family:var(--font-mono);font-size:.65rem;color:var(--color-text-muted);font-variant-numeric:tabular-nums}
	.badge{padding:2px 6px;border-radius:var(--radius-full);font-size:.5rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
	.badge-active{background:rgba(0,230,118,.15);color:var(--color-success)}
	.badge-react{background:var(--color-secondary-dim);color:var(--color-secondary)}
	.cmd-bar{display:flex;gap:4px;justify-content:center;margin-top:2px}
	.cmd-pip{background:var(--color-primary-dim);color:var(--color-primary);font-size:.55rem;font-weight:800;padding:1px 5px;border-radius:var(--radius-full)}

	/* ── Landscape compact ── */
	@media (orientation: landscape) and (max-height: 500px) {
		.tile { min-height: unset; }
		.content { padding: var(--space-xs); gap: 2px; }
		.pname { font-size: .6rem; }
		.cname { font-size: .5rem; }
		.life-ctrl { padding: 2px 0; gap: var(--space-xs); }
		.life-btn { width: 28px; height: 28px; font-size: 1rem; min-height: unset; }
		.life-val { font-size: 1.3rem; min-width: 36px; }
		.footer { gap: 2px; }
		.pool { font-size: .55rem; }
		.badge { font-size: .4rem; padding: 1px 4px; }
		.dead-overlay { padding: var(--space-xs) 0; }
		.cmd-bar { margin-top: 0; }
	}
</style>

