<script lang="ts">
	import type { GamePlayerState } from '$lib/models/types';
	import { formatTime } from '$lib/utils/format';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		player: GamePlayerState; playerIndex: number;
		isActive: boolean; isReactive: boolean; isTimerTicking: boolean;
		isPulsing: boolean; isDead: boolean;
		showPool?: boolean;
		commanderDamageMode: boolean; commanderDamageSource: boolean;
		cmdSourcePlayerId?: string | null;
		upsideDown?: boolean;
		highlightGold?: boolean;
		showStatusBadges?: boolean;
		seatPosition?: 'tl' | 'tr' | 'br' | 'bl' | 'r';
		minimalMode?: boolean;
		selectedToMove?: boolean;
		rotate?: 'none' | 'left' | 'right';
		onlifechange: (amount: number) => void; onclick: () => void;
		onrevive?: () => void;
	}

	let {
		player, playerIndex, isActive, isReactive, isTimerTicking, isPulsing, isDead,
		showPool = true,
		commanderDamageMode, commanderDamageSource, cmdSourcePlayerId = null,
		upsideDown = false, highlightGold = false,
		showStatusBadges = true,
		seatPosition = 'tl',
		minimalMode = false,
		selectedToMove = false,
		rotate = 'none',
		onlifechange, onclick, onrevive
	}: Props = $props();

	/* ── Commander damage value from the selected source ── */
	let cmdDmgFromSource = $derived(
		cmdSourcePlayerId ? (player.commanderDamageTaken[cmdSourcePlayerId] ?? 0) : 0
	);

	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let holdInterval: ReturnType<typeof setInterval> | null = null;
	let holdTriggered = false;

	function pointerDown(amount: number, e: PointerEvent) {
		e.stopPropagation();
		holdTriggered = false;
		clearHold();
		holdTimer = setTimeout(() => {
			holdTriggered = true;
			onlifechange(amount * 10);
			holdInterval = setInterval(() => onlifechange(amount * 10), 500);
		}, 500);
	}
	function pointerUp(amount: number, e: PointerEvent) {
		e.stopPropagation();
		clearHold();
		if (!holdTriggered) onlifechange(amount);
		holdTriggered = false;
	}
	function pointerLeave(e: PointerEvent) {
		e.stopPropagation();
		clearHold();
	}
	function clearHold() {
		if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
		if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
	}

	$effect(() => {
		if (isDead) clearHold();
	});
</script>

<div class="tile" class:active={isActive && !commanderDamageMode} class:reactive={isReactive && !commanderDamageMode} class:ticking={isTimerTicking} class:pulsing={isPulsing}
	class:dead={isDead} class:cmd-mode={commanderDamageMode} class:cmd-source={commanderDamageSource} class:upside-down={upsideDown} class:gold-highlight={highlightGold}
	class:seat-tl={seatPosition === 'tl'} class:seat-tr={seatPosition === 'tr'} class:seat-br={seatPosition === 'br'} class:seat-bl={seatPosition === 'bl'}
	class:rotate-left={rotate === 'left'} class:rotate-right={rotate === 'right'}
	class:minimal={minimalMode} class:move-candidate={selectedToMove}
	role="button" tabindex="0"
	onpointerup={(e) => { e.stopPropagation(); onclick(); }}
	onkeydown={(e) => { if (e.key==='Enter') onclick(); }}>
	{#if player.commanderImageUrl}<div class="bg" style="background-image:url({player.commanderImageUrl})"></div>{/if}
	<div class="content">
		<!-- Status color only: no text indication by request -->
		{#if minimalMode}
			<div class="idle-name-chip">{player.playerName}</div>
		{:else if !isDead}
			<div class="readability-plate">
				<!-- onclick stopPropagation prevents life button taps from triggering tile click -->
				<div class="life-ctrl" role="presentation" onclick={(e) => e.stopPropagation()}>
					<button class="life-btn dec"
						onpointerdown={(e) => pointerDown(-1, e)}
						onpointerup={(e) => pointerUp(-1, e)}
						onpointerleave={(e) => pointerLeave(e)}
						aria-label={commanderDamageMode ? 'Decrease commander damage (heal)' : 'Decrease life'}><span class="life-sign">-</span></button>
					{#if commanderDamageMode && cmdSourcePlayerId}
						<div class="life-val cmd-dmg-val">{cmdDmgFromSource}</div>
					{:else}
						<div class="life-val">{player.life}</div>
					{/if}
					<button class="life-btn inc"
						onpointerdown={(e) => pointerDown(1, e)}
						onpointerup={(e) => pointerUp(1, e)}
						onpointerleave={(e) => pointerLeave(e)}
						aria-label={commanderDamageMode ? 'Increase commander damage' : 'Increase life'}><span class="life-sign">+</span></button>
				</div>
			</div>
		{:else}
			<div class="dead-overlay" role="presentation" onclick={(e) => e.stopPropagation()}>
				<button class="revive-btn" onclick={onrevive} aria-label="Revive player">
					<Icon name="skull" size={66} color="var(--color-danger)" />
				</button>
				<span>Revive</span>
			</div>
		{/if}
		{#if !minimalMode && Object.keys(player.commanderDamageTaken).length > 0 && !commanderDamageMode}
			<div class="cmd-bar">{#each Object.values(player.commanderDamageTaken) as dmg}<span class="cmd-pip">{dmg}</span>{/each}</div>
		{/if}
		{#if !minimalMode}
			<div class="info">
				<div class="info-stack">
					{#if showPool}<span class="pool">{formatTime(player.poolTimeRemaining)}</span>{/if}
					<span class="pname">{player.playerName}</span>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.tile{position:relative;border-radius:var(--radius-lg);overflow:hidden;background:var(--color-surface);border:2.8px solid var(--color-surface-elevated);transition:all var(--transition-normal);cursor:pointer;min-height:180px;display:flex;flex-direction:column}
	.tile.active{border-color:rgba(0,230,118,1);border-width:5px;box-shadow:0 0 36px rgba(0,230,118,.75), inset 0 0 18px rgba(0,230,118,.35)}
	.tile.reactive{border-color:rgba(0,229,255,1);border-width:5px;box-shadow:0 0 36px rgba(0,229,255,.75), inset 0 0 18px rgba(0,229,255,.35)}
	.tile.pulsing{animation:pulse-border 1s infinite}
	.tile.gold-highlight{border-color:rgba(255,215,0,.96);box-shadow:0 0 24px rgba(255,215,0,.6),0 0 44px rgba(255,215,0,.25);z-index:2}
	.tile.dead{opacity:.82;filter:grayscale(.25)}
	.tile.move-candidate{animation:move-candidate-pulse 1.1s ease-in-out infinite;border-color:rgba(255,215,0,.95);box-shadow:0 0 26px rgba(255,215,0,.44)}
	.tile.cmd-mode{cursor:crosshair}
	.tile.cmd-source{border-color:rgba(255,171,0,.86);box-shadow:0 0 22px rgba(255,171,0,.4)}
	.tile.upside-down .content{transform:rotate(180deg)}
	/* Rotate entire tile content for right- or left-seated players so numbers face them */
	.tile.rotate-left .content{transform:rotate(-90deg)}
	.tile.rotate-right .content{transform:rotate(90deg)}
	.tile.rotate-left .bg,.tile.rotate-right .bg{transform:scale(1.04)}
	.bg{position:absolute;inset:0;background-size:cover;background-position:center top;opacity:.9;z-index:0;transform:scale(1.04);filter:saturate(1.15) contrast(1.06)}
	.tile::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.34) 46%,rgba(0,0,0,.62));z-index:0}
	.tile.dead .bg{opacity:.6;filter:brightness(.35) saturate(.7) contrast(1.2)}
	.tile.dead::before{background:linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.72) 46%,rgba(0,0,0,.84))}
	.content{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;align-items:stretch;padding:var(--space-xs) var(--space-sm)}
	.readability-plate{display:flex;align-items:center;justify-content:center;flex:1;padding:var(--space-xs) 0}
	.idle-name-chip{margin:auto;padding:10px 16px;border-radius:var(--radius-full);background:rgba(8,8,13,.66);color:#f5f7ff;font-weight:900;font-size:1.1rem;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 0 10px rgba(255,255,255,.18)}
	.life-ctrl{display:flex;align-items:center;justify-content:center;gap:var(--space-md);flex:1}
	.life-btn{position:relative;width:72px;height:72px;border-radius:var(--radius-full);font-size:2.4rem;font-weight:800;transition:all var(--transition-fast);display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);border:1.5px solid rgba(255,255,255,.2)}
	.life-sign{display:flex;align-items:center;justify-content:center;width:100%;height:100%;line-height:1;color:#fff}
	.life-btn.dec{color:#fff}.life-btn.dec:active{background:rgba(20,0,4,.72)}
	.life-btn.inc{color:#fff}.life-btn.inc:active{background:rgba(0,18,8,.72)}
	.life-val{font-size:5.4rem;font-weight:900;font-family:var(--font-mono);font-variant-numeric:tabular-nums;min-width:118px;text-align:center;line-height:1;color:#fff;text-shadow:0 0 14px rgba(255,255,255,.22);background:rgba(0,0,0,.62);border:1.5px solid rgba(255,255,255,.2);border-radius:var(--radius-full);padding:8px 12px}
	.cmd-dmg-val{color:var(--color-danger)}
	.dead-overlay{display:flex;flex-direction:column;align-items:center;gap:8px;padding:var(--space-md) 0;flex:1;justify-content:center}
	.revive-btn{width:96px;height:96px;border-radius:var(--radius-full);border:2px solid rgba(255,23,68,.65);background:rgba(30,8,12,.62);display:flex;align-items:center;justify-content:center;box-shadow:0 0 22px rgba(255,23,68,.28)}
	.dead-overlay span{font-size:1rem;font-weight:900;color:var(--color-danger);letter-spacing:.12em;text-transform:uppercase;text-shadow:0 0 10px rgba(255,23,68,.32)}
	.info{display:flex;align-items:center;justify-content:center;gap:var(--space-sm);margin-top:auto}
	.info-stack{display:flex;flex-direction:column;align-items:center;gap:2px;background:rgba(8,8,13,.58);padding:4px 12px;border-radius:14px}
	.pname{font-weight:800;font-size:.74rem;letter-spacing:.04em;text-align:center;color:#f4f6ff;text-shadow:0 0 8px rgba(255,255,255,.18)}
	.pool{font-family:var(--font-mono);font-size:1.72rem;color:#fff;font-weight:900;font-variant-numeric:tabular-nums;line-height:1;text-shadow:0 0 14px rgba(255,255,255,.22)}
	@keyframes move-candidate-pulse{0%,100%{box-shadow:0 0 10px rgba(255,215,0,.35)}50%{box-shadow:0 0 28px rgba(255,215,0,.65)}}
	.cmd-bar{display:flex;gap:4px;justify-content:center;margin-top:2px}
	.cmd-pip{background:var(--color-primary-dim);color:var(--color-primary);font-size:.55rem;font-weight:800;padding:1px 5px;border-radius:var(--radius-full)}

	/* ── Mobile compact ── */
	@media (max-width: 768px) {
		.tile { min-height: unset; }
		.content { padding: var(--space-xs); gap: 2px; }
		.pname { font-size: .55rem; }
		.life-ctrl { gap: var(--space-sm); }
		.life-btn { width: 62px; height: 62px; font-size: 2.1rem; min-height: unset; }
		.life-val { font-size: 4.3rem; min-width: 96px; }
		.pool { font-size: 1.35rem; }
		.info-stack { padding: 3px 10px; }
		.idle-name-chip { font-size: .82rem; padding: 8px 12px; }
		.dead-overlay { padding: var(--space-xs) 0; }
		.revive-btn { width: 84px; height: 84px; }
		.cmd-bar { margin-top: 0; }
	}
</style>
