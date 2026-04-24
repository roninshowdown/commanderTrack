<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { formatTime, formatTimestamp, uid } from '$lib/utils/format';
	import {
		gameState, commanderDamageMode, commanderDamageSource,
		isGameRunning, currentTickingTime, isTimerCritical,
		logEntries as currentGameLogs,
		toggleStartStop, advanceNextTurn, changeLife, applyCommanderDamage,
		toggleCommanderDamageMode, setCommanderDamageSourcePlayer,
		clearCommanderDamageMode,
		toggleReactivePlayer, returnPriorityToActive,
		getRandomOpponentCandidates, clearAndSetReactivePlayer,
		finishGame, resetGame, abandonGame, restoreActiveGame,
		undoLastAction, canUndo, startGameWithPlayer, revivePlayer, swapPlayerSeats
	} from '$lib/stores/gameStore';
	import type { TimerConfigA, GamePlayerState } from '$lib/models/types';
	import { authUser } from '$lib/firebase/auth';
	import PlayerTile from '$lib/components/game/PlayerTile.svelte';
	import TimerDisplay from '$lib/components/game/TimerDisplay.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { playGainSound, playTurnEndSound } from '$lib/utils/sounds';

	let user = $derived($authUser);
	let showWinnerModal: boolean = $state(false);
	let restoring: boolean = $state(false);
	let showWheel: boolean = $state(false);
	let revivePromptIndex: number | null = $state(null);
	let revivePromptTimer: ReturnType<typeof setTimeout> | null = null;
	let showCancelPrompt: boolean = $state(false);
	let cancelPromptTimer: ReturnType<typeof setTimeout> | null = null;
	let winnerModalPausedByUi: boolean = $state(false);
	let undoMode: boolean = $state(false);
	let moveCandidateIndex: number | null = $state(null);
	let showGameLogModal: boolean = $state(false);
	let logModalPausedTimer: boolean = $state(false);
	let uiLogEvents: { id: string; timestamp: number; label: string; detail: string; tone: 'gain' | 'loss' | 'turn' | 'react' }[] = $state([]);

	/* ── CMD picker sub-menu in wheel ── */
	let showCmdPicker: boolean = $state(false);

	/* ── Source commander playerId for tile display ── */
	let cmdSourcePid = $derived(
		$commanderDamageMode && $commanderDamageSource !== null && $gameState
			? $gameState.players[$commanderDamageSource].playerId
			: null
	);
	let cmdSourceImg = $derived(
		$commanderDamageMode && $commanderDamageSource !== null && $gameState
			? $gameState.players[$commanderDamageSource].commanderImageUrl
			: ''
	);

	/* ── Start Game Ceremony ── */
	type StartPhase = 'idle' | 'roulette' | 'countdown' | 'playing';
	let startPhase: StartPhase = $state('idle');
	let rouletteIdx: number = $state(-1);
	let countdownNum: number = $state(5);
	let chosenStartPlayer: number = $state(0);

	function beginStartCeremony() {
		if (!$gameState || $gameState.timerInfo.phase !== 'IDLE') return;
		moveCandidateIndex = null;
		const playerCount = $gameState.players.length;
		chosenStartPlayer = Math.floor(Math.random() * playerCount);
		startPhase = 'roulette';
		rouletteIdx = 0;
		const totalSteps = playerCount * 4 + chosenStartPlayer;
		let step = 0;
		function nextRouletteStep() {
			rouletteIdx = step % playerCount;
			step++;
			if (step <= totalSteps) {
				const progress = step / totalSteps;
				const delay = 60 + 340 * (progress * progress);
				setTimeout(nextRouletteStep, delay);
			} else {
				rouletteIdx = chosenStartPlayer;
				setTimeout(startCountdown, 600);
			}
		}
		nextRouletteStep();
	}

	function startCountdown() {
		startPhase = 'countdown';
		countdownNum = 5;
		const doTick = () => {
			if (countdownNum > 1) {
				countdownNum--;
				setTimeout(doTick, 1000);
			} else {
				startPhase = 'playing';
				startGameWithPlayer(chosenStartPlayer);
			}
		};
		setTimeout(doTick, 1000);
	}

	let isIdle = $derived($gameState?.timerInfo.phase === 'IDLE' && startPhase === 'idle');
	let isStartCeremony = $derived(startPhase !== 'idle' && startPhase !== 'playing');

	/* ── Random-pick roulette animation (2× faster than start ceremony) ── */
	let randomPickActive: boolean = $state(false);
	let randomPickIdx: number = $state(-1);
	let randomPickedIdx: number = $state(-1);
	let randomPickTimer: ReturnType<typeof setTimeout> | null = null;

	function beginRandomPick() {
		const cands = getRandomOpponentCandidates();
		if (!cands.length) return;
		const chosenIdx = cands[Math.floor(Math.random() * cands.length)];
		returnPriorityToActive();
		randomPickedIdx = -1;
		randomPickActive = true;
		randomPickIdx = -1;
		const totalSteps = cands.length * 4 + cands.indexOf(chosenIdx);
		let step = 0;
		function nextStep() {
			randomPickIdx = cands[step % cands.length];
			step++;
			if (step <= totalSteps) {
				const progress = step / totalSteps;
				// 2× faster: halved delay values (30 + 170 instead of 60 + 340)
				const delay = 30 + 170 * (progress * progress);
				setTimeout(nextStep, delay);
			} else {
				randomPickIdx = chosenIdx;
				randomPickedIdx = chosenIdx;
				randomPickTimer = setTimeout(() => {
					randomPickActive = false;
					randomPickIdx = -1;
					randomPickedIdx = -1;
					clearAndSetReactivePlayer(chosenIdx);
					randomPickTimer = null;
				}, 2000);
			}
		}
		nextStep();
	}

	/* ── Long-press wheel logic ── */
	let longPressStartTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressOpenTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressTriggered = false;
	let longPressing: boolean = $state(false);
	let autoPaused = false;
	const WHEEL_HOLD_THRESHOLD_MS = 200;
	const WHEEL_RING_DURATION_MS = 250;

	let wakeLockSentinel: { release: () => Promise<void> } | null = null;

	/* ── Layouts per player count ──
	 * Each entry maps slot-index -> { gridArea, seat, upsideDown, cmdAngle }
	 */
	type SeatLayout = { gridArea: string; seat: 'tl' | 'tr' | 'br' | 'bl'; upsideDown: boolean; cmdAngle: number };
	const LAYOUTS: Record<number, SeatLayout[]> = {
		2: [
			{ gridArea: '1 / 1 / 2 / 2', seat: 'tl', upsideDown: true, cmdAngle: 90 },
			{ gridArea: '2 / 1 / 3 / 2', seat: 'bl', upsideDown: false, cmdAngle: 270 }
		],
		3: [
			{ gridArea: '1 / 1 / 2 / 3', seat: 'tl', upsideDown: true, cmdAngle: 90 },
			{ gridArea: '2 / 2 / 3 / 3', seat: 'br', upsideDown: false, cmdAngle: 315 },
			{ gridArea: '2 / 1 / 3 / 2', seat: 'bl', upsideDown: false, cmdAngle: 225 }
		],
		4: [
			{ gridArea: '1 / 1 / 2 / 2', seat: 'tl', upsideDown: true, cmdAngle: 135 },
			{ gridArea: '1 / 2 / 2 / 3', seat: 'tr', upsideDown: true, cmdAngle: 45 },
			{ gridArea: '2 / 2 / 3 / 3', seat: 'br', upsideDown: false, cmdAngle: 315 },
			{ gridArea: '2 / 1 / 3 / 2', seat: 'bl', upsideDown: false, cmdAngle: 225 }
		],
		5: [
			{ gridArea: '1 / 1 / 2 / 2', seat: 'tl', upsideDown: true, cmdAngle: 135 },
			{ gridArea: '1 / 2 / 2 / 3', seat: 'tr', upsideDown: true, cmdAngle: 90 },
			{ gridArea: '2 / 2 / 3 / 3', seat: 'br', upsideDown: false, cmdAngle: 315 },
			{ gridArea: '2 / 1 / 3 / 2', seat: 'bl', upsideDown: false, cmdAngle: 225 },
			{ gridArea: '1 / 3 / 3 / 4', seat: 'tr', upsideDown: false, cmdAngle: 0 }
		]
	};

	function getLayout(): SeatLayout[] {
		const n = $gameState?.players.length ?? 4;
		return LAYOUTS[n] ?? LAYOUTS[4];
	}

	function seatPositionForIndex(idx: number): 'tl' | 'tr' | 'br' | 'bl' {
		return getLayout()[idx]?.seat ?? 'tl';
	}


	function openWheel(): void {
		if (undoMode || showGameLogModal) return;
		showWheel = true;
		showCmdPicker = false;
		if ($isGameRunning && !$commanderDamageMode) {
			toggleStartStop();
			autoPaused = true;
		}
	}

	function closeWheel(): void {
		showWheel = false;
		showCmdPicker = false;
		autoPaused = false;
		// Always ensure timer is running when wheel closes
		if (!$commanderDamageMode && !$isGameRunning && $gameState && !$gameState.isFinished && $gameState.timerInfo.phase !== 'IDLE') {
			toggleStartStop();
		}
	}

	function enterCommanderMode() {
		if (!$commanderDamageMode) toggleCommanderDamageMode();
		if ($isGameRunning) toggleStartStop();
	}

	function exitCommanderModeAndResume() {
		if ($commanderDamageMode) clearCommanderDamageMode();
		if (!$isGameRunning && $gameState && !$gameState.isFinished && $gameState.timerInfo.phase !== 'IDLE') {
			toggleStartStop();
		}
	}

	function clearWheelPressTimers() {
		if (longPressStartTimer) { clearTimeout(longPressStartTimer); longPressStartTimer = null; }
		if (longPressOpenTimer) { clearTimeout(longPressOpenTimer); longPressOpenTimer = null; }
	}

	function handleSeatSelection(idx: number): void {
		if (!$gameState || !isIdle || isStartCeremony || showWheel || randomPickActive || undoMode || showGameLogModal) return;
		if (moveCandidateIndex === idx) {
			moveCandidateIndex = null;
			playGainSound();
			return;
		}
		if (moveCandidateIndex === null) {
			moveCandidateIndex = idx;
			playGainSound();
			return;
		}
		swapPlayerSeats(moveCandidateIndex, idx);
		moveCandidateIndex = null;
		playTurnEndSound();
	}

	function clearCancelPrompt() {
		showCancelPrompt = false;
		if (cancelPromptTimer) {
			clearTimeout(cancelPromptTimer);
			cancelPromptTimer = null;
		}
	}

	function openCancelPrompt() {
		showCancelPrompt = true;
		if (cancelPromptTimer) clearTimeout(cancelPromptTimer);
		cancelPromptTimer = setTimeout(() => {
			clearCancelPrompt();
		}, 2000);
	}

	function wheelPointerDown(e: PointerEvent) {
		e.stopPropagation();
		if (showGameLogModal || showWheel || undoMode || isIdle || isStartCeremony || $commanderDamageMode || randomPickActive) return;
		longPressTriggered = false;
		longPressing = false;
		clearWheelPressTimers();
		longPressStartTimer = setTimeout(() => {
			longPressing = true;
			longPressOpenTimer = setTimeout(() => {
				longPressTriggered = true;
				longPressing = false;
				openWheel();
			}, WHEEL_RING_DURATION_MS);
		}, WHEEL_HOLD_THRESHOLD_MS);
	}
	function wheelPointerUp(e: PointerEvent) {
		e.stopPropagation();
		clearWheelPressTimers();
		longPressing = false;
		if (showGameLogModal || undoMode || isIdle || isStartCeremony || randomPickActive) return;
		// CMD mode: single click on wheel exits CMD mode
		if ($commanderDamageMode && !showWheel && !longPressTriggered) {
			exitCommanderModeAndResume();
			longPressTriggered = false;
			return;
		}
		if (showWheel && !longPressTriggered) {
			closeWheel();
		} else if (!longPressTriggered) {
			handleNextTurn();
		}
		longPressTriggered = false;
	}
	function wheelPointerLeave() {
		clearWheelPressTimers();
		longPressing = false;
	}

	function clearRevivePrompt() {
		revivePromptIndex = null;
		if (revivePromptTimer) {
			clearTimeout(revivePromptTimer);
			revivePromptTimer = null;
		}
	}

	function showRevivePrompt(idx: number) {
		revivePromptIndex = idx;
		if (revivePromptTimer) clearTimeout(revivePromptTimer);
		revivePromptTimer = setTimeout(() => {
			clearRevivePrompt();
		}, 2000);
	}

	async function requestWakeLock() {
		if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
		if (!$gameState || $gameState.isFinished) return;
		const nav = navigator as Navigator & {
			wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
		};
		if (!nav.wakeLock) return;
		try {
			if (!wakeLockSentinel) {
				wakeLockSentinel = await nav.wakeLock.request('screen');
			}
		} catch {
			wakeLockSentinel = null;
		}
	}

	async function releaseWakeLock() {
		if (!wakeLockSentinel) return;
		try {
			await wakeLockSentinel.release();
		} catch {
			// best effort release
		}
		wakeLockSentinel = null;
	}

	let timerVariant = $derived($gameState?.config.timerConfig.variant ?? 'B');
	let hasReactionControls = $derived(
		timerVariant === 'B' ||
		(timerVariant === 'A' && !!($gameState?.config.timerConfig as TimerConfigA | undefined)?.enableReaction)
	);
	let playerCount = $derived($gameState?.players.length ?? 0);
	let hasUnifiedLayout = $derived(playerCount >= 2 && playerCount <= 5);
	let hasReactivePlayer = $derived(($gameState?.reactivePlayerIndices ?? []).length > 0);
	let isCenterPoolDrain = $derived(
		!!$gameState &&
		$gameState.config.timerConfig.variant !== 'none' &&
		$gameState.timerInfo.phase === 'POOL_TIME'
	);

	onMount(() => {
		const onVisibility = async () => {
			if (document.visibilityState === 'visible') await requestWakeLock();
			else await releaseWakeLock();
		};
		document.addEventListener('visibilitychange', onVisibility);

		(async () => {
			if (!$gameState && user?.uid) {
				restoring = true;
				await restoreActiveGame(user.uid);
				restoring = false;
			}
			if ($gameState && $gameState.timerInfo.phase !== 'IDLE') {
				startPhase = 'playing';
			}
			await requestWakeLock();
		})();

		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});

	onDestroy(() => {
		if (randomPickTimer) {
			clearTimeout(randomPickTimer);
			randomPickTimer = null;
		}
		clearWheelPressTimers();
		clearRevivePrompt();
		clearCancelPrompt();
		releaseWakeLock();
	});

	$effect(() => {
		if (!$gameState || $gameState.isFinished) {
			releaseWakeLock();
			return;
		}
		requestWakeLock();
	});

	$effect(() => {
		if (!$gameState || $gameState.isFinished || $gameState.timerInfo.phase === 'IDLE') {
			winnerModalPausedByUi = false;
			return;
		}
		if (!showWinnerModal && winnerModalPausedByUi && !$isGameRunning) {
			toggleStartStop();
			winnerModalPausedByUi = false;
		}
	});

	$effect(() => {
		if (!showGameLogModal && logModalPausedTimer && !$isGameRunning && $gameState && !$gameState.isFinished && $gameState.timerInfo.phase !== 'IDLE') {
			toggleStartStop();
			logModalPausedTimer = false;
		}
	});

	function handleTileClick(idx: number) {
		if (!$gameState) return;
		if (showGameLogModal) return;
		if (isIdle) {
			handleSeatSelection(idx);
			return;
		}
		if (startPhase !== 'playing' || randomPickActive) return;
		if (undoMode) return;
		if ($gameState.players[idx].isDead) return;
		if ($commanderDamageMode) return; // in CMD mode, only +/- work
		const cfg = $gameState.config.timerConfig;
		const canReact = (cfg.variant === 'B') || (cfg.variant === 'A' && cfg.enableReaction);
		if (canReact && idx !== $gameState.activePlayerIndex && !$gameState.players[idx].isDead) {
			const dropping = ($gameState.reactivePlayerIndices ?? []).includes(idx);
			uiLogEvents = [{
				id: uid(),
				timestamp: Date.now(),
				label: dropping ? 'REACT DROP' : 'REACT CLAIM',
				detail: `${$gameState.players[idx].playerName} ${dropping ? 'dropped' : 'claimed'} priority`,
				tone: 'react'
			}, ...uiLogEvents];
			toggleReactivePlayer(idx);
		}
	}

	function handleNextTurn() {
		if (!$gameState) return;
		const nextIdx = ($gameState.activePlayerIndex + 1) % $gameState.players.length;
		const nextName = $gameState.players[nextIdx]?.playerName ?? 'Next player';
		uiLogEvents = [{ id: uid(), timestamp: Date.now(), label: 'TURN', detail: `${nextName} turn started`, tone: 'turn' }, ...uiLogEvents];
		advanceNextTurn();
	}

	function handleReturnPriority() {
		if (!$gameState || !($gameState.reactivePlayerIndices ?? []).length) return;
		const names = ($gameState.reactivePlayerIndices ?? []).map((i) => $gameState.players[i]?.playerName).filter(Boolean).join(', ');
		uiLogEvents = [{ id: uid(), timestamp: Date.now(), label: 'REACT DROP', detail: `${names} dropped priority`, tone: 'react' }, ...uiLogEvents];
		returnPriorityToActive();
	}

	function handleLifeChange(idx: number, amount: number) {
		if (showGameLogModal) return;
		if (startPhase !== 'playing' || randomPickActive) return;
		if (undoMode) return;
		if ($commanderDamageMode && $commanderDamageSource !== null) {
			applyCommanderDamage($commanderDamageSource, idx, amount);
		} else {
			changeLife(idx, amount);
		}
	}

	/* ── CMD picker: select a commander source from the sub-wheel ── */
	function openCmdPicker() {
		showCmdPicker = true;
	}

	function selectCmdSource(idx: number) {
		enterCommanderMode();
		setCommanderDamageSourcePlayer(idx);
		closeWheel();
	}
	function exitCmdMode() {
		exitCommanderModeAndResume();
	}

	function selectWinner(id: string) {
		showWinnerModal = false;
		finishGame(id);
	}
	function openWinnerModal() {
		showWinnerModal = true;
		if (showWheel && autoPaused) {
			winnerModalPausedByUi = true;
			return;
		}
		if ($isGameRunning && $gameState && !$gameState.isFinished && $gameState.timerInfo.phase !== 'IDLE') {
			toggleStartStop();
			winnerModalPausedByUi = true;
		}
	}
	function closeWinnerModal() {
		showWinnerModal = false;
	}
	function navigateToMenu() {
		if (showGameLogModal) return;
		if ($isGameRunning && $gameState && !$gameState.isFinished && $gameState.timerInfo.phase !== 'IDLE') {
			toggleStartStop();
		}
		showWinnerModal = false;
		showWheel = false;
		showCmdPicker = false;
		autoPaused = false;
		goto('/');
	}
	function startAnotherGame() {
		startPhase = 'idle';
		resetGame();
		goto('/setup');
	}
	function handleCancelGame() {
		clearCancelPrompt();
		startPhase = 'idle';
		abandonGame();
		goto('/setup');
	}
	function runWheelAction(action: () => void, options?: { resumeOnClose?: boolean }) {
		const shouldResumeOnClose = options?.resumeOnClose ?? true;
		action();
		if (shouldResumeOnClose) {
			closeWheel();
		} else {
			showWheel = false;
			showCmdPicker = false;
			autoPaused = false;
		}
	}

	function enterUndoMode() {
		if (!$canUndo) return;
		showWheel = false;
		showCmdPicker = false;
		undoMode = true;
	}

	function exitUndoMode() {
		undoMode = false;
		if (!$commanderDamageMode && autoPaused && !$isGameRunning && $gameState && !$gameState.isFinished && $gameState.timerInfo.phase !== 'IDLE') {
			toggleStartStop();
		}
		autoPaused = false;
	}

	function handleUndoModeExecute() {
		if (!$canUndo) return;
		undoLastAction();
	}

	function requestRevive(playerIndex: number) {
		if (!$gameState || startPhase !== 'playing') return;
		const p = $gameState.players[playerIndex];
		if (!p?.isDead) return;
		showRevivePrompt(playerIndex);
	}

	function requestCancelGame() {
		openCancelPrompt();
	}

	function openGameLogModal() {
		showWheel = false;
		showCmdPicker = false;
		if ($isGameRunning && $gameState && !$gameState.isFinished && $gameState.timerInfo.phase !== 'IDLE') {
			toggleStartStop();
			logModalPausedTimer = true;
		}
		showGameLogModal = true;
	}

	function closeGameLogModal() {
		showGameLogModal = false;
		if (logModalPausedTimer && !$isGameRunning && $gameState && !$gameState.isFinished && $gameState.timerInfo.phase !== 'IDLE') {
			toggleStartStop();
		}
		logModalPausedTimer = false;
	}

	let gameLogRows = $derived.by(() => {
		const rows = $currentGameLogs.map((l) => ({
			id: l.id,
			timestamp: l.timestamp,
			label: l.type === 'commander_damage' ? 'CMD' : 'LIFE',
			detail: `${l.playerName} ${l.value >= 0 ? 'gains' : 'loses'} ${Math.abs(l.value)}`,
			tone: l.value >= 0 ? 'gain' : 'loss'
		}));
		return [...rows, ...uiLogEvents].sort((a, b) => b.timestamp - a.timestamp);
	});

	function confirmRevive(playerIndex: number) {
		revivePlayer(playerIndex);
		clearRevivePrompt();
	}
</script>

<div class="game-page">
	{#if restoring}
		<div class="no-game"><p>Restoring game...</p></div>
	{:else if !$gameState}
		<div class="no-game"><p>No active game.</p><Button variant="primary" onclick={() => goto('/setup')}>{#snippet children()}<Icon name="play" size={16}/> Setup a Game{/snippet}</Button></div>
	{:else if $gameState.isFinished}
		<div class="finished animate-fade-in">
			<Icon name="trophy" size={48} color="var(--color-warning)" />
			<h1>Game Over</h1>
			{#if $gameState.winnerId}{@const w = $gameState.players.find((p: GamePlayerState) => p.playerId === $gameState.winnerId)}<p class="winner">{w?.playerName ?? 'Unknown'} wins!</p>{/if}
			<Button variant="primary" size="lg" onclick={startAnotherGame}>{#snippet children()}<Icon name="play" size={16}/> New Game{/snippet}</Button>
		</div>
	{:else}
		{#if hasUnifiedLayout}
			<div class="battlefield bf-{playerCount}">
				{#if showWheel}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div class="battlefield-overlay" role="presentation" onclick={() => closeWheel()}></div>
				{/if}
				{#if showGameLogModal}
					<div class="battlefield-overlay undo-overlay" role="presentation"></div>
				{/if}
				{#if undoMode}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div class="battlefield-overlay undo-overlay" role="presentation" onclick={() => exitUndoMode()}></div>
				{/if}
				{#if isStartCeremony && startPhase === 'roulette'}
					<div class="phase-backdrop phase-backdrop-heavy"></div>
				{/if}
				{#each $gameState.players as p, i}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="slot" style="grid-area:{getLayout()[i]?.gridArea ?? 'auto'}" data-seat-index={i}>
						{#if revivePromptIndex === i}
							<div class="tile-toast animate-fade-in">
								<span>Revive with 1 HP?</span>
								<button onclick={() => confirmRevive(i)}>Revive</button>
							</div>
						{/if}
						<PlayerTile player={p} playerIndex={i}
							isActive={i===$gameState.activePlayerIndex && startPhase === 'playing'}
							isReactive={!randomPickActive && ($gameState.reactivePlayerIndices ?? []).includes(i)}
							isTimerTicking={i===$gameState.timerInfo.targetPlayerIndex && $isGameRunning}
							isPulsing={i===$gameState.timerInfo.targetPlayerIndex && $isTimerCritical}
							isDead={p.isDead}
							showPool={$gameState.config.timerConfig.variant !== 'none' && startPhase === 'playing'}
							commanderDamageMode={$commanderDamageMode}
							commanderDamageSource={false}
							cmdSourcePlayerId={cmdSourcePid}
							upsideDown={getLayout()[i]?.upsideDown ?? false}
							showStatusBadges={false}
							minimalMode={startPhase !== 'playing'}
							selectedToMove={moveCandidateIndex === i && isIdle}
							seatPosition={seatPositionForIndex(i)}
							highlightGold={(moveCandidateIndex === i && isIdle) || (randomPickActive && randomPickIdx === i)}
							onlifechange={(amt: number)=>handleLifeChange(i,amt)}
							onrevive={() => requestRevive(i)}
							onclick={()=>handleTileClick(i)} />
					</div>
				{/each}

				<div class="wheel-zone">
					{#if showWheel}
						<!-- wheel-zone kept above overlay for actions -->
					{/if}
					{#if isIdle}
						<button class="wheel-core wheel-start" onclick={beginStartCeremony}>
							<Icon name="play" size={32} />
							<div class="wheel-meta wheel-start-text">Start Game</div>
						</button>
					{:else if isStartCeremony}
						<div class="wheel-core wheel-ceremony">
							{#if startPhase === 'countdown'}
								<!-- empty: big overlay shows the number -->
								<div class="wheel-meta wheel-ceremony-text">Get Ready!</div>
							{:else}
								<div class="wheel-meta wheel-ceremony-text">Picking...</div>
							{/if}
						</div>
					{:else if undoMode}
						<button class="wheel-core wheel-undo-mode" onclick={handleUndoModeExecute}>
							<Icon name="undo" size={44} />
							<div class="wheel-meta">Undo</div>
						</button>
					{:else}
						<button class="wheel-core" class:wheel-green={!hasReactivePlayer && !$commanderDamageMode} class:wheel-blue={hasReactivePlayer && !$commanderDamageMode} class:critical={$isTimerCritical} class:long-pressing={longPressing} class:cmd-active={$commanderDamageMode}
							onpointerdown={wheelPointerDown}
							onpointerup={wheelPointerUp}
							onpointerleave={wheelPointerLeave}>
							{#if longPressing}
								<svg class="lp-ring" class:lp-ring-blue={hasReactivePlayer && !$commanderDamageMode} viewBox="0 0 100 100">
									<circle cx="50" cy="50" r="46" />
								</svg>
							{/if}
							{#if $commanderDamageMode && cmdSourceImg}
								<img class="wheel-cmd-img" src={cmdSourceImg} alt="Commander" />
							{:else if $gameState.config.timerConfig.variant !== 'none'}
								<div class="wheel-time" class:pool-drain={isCenterPoolDrain}>{formatTime($currentTickingTime)}</div>
								<div class="wheel-meta">Round {$gameState.currentRound} · Turn {$gameState.turnCount + 1}</div>
							{:else}
								<Icon name="settings" size={28} />
								<div class="wheel-meta">Actions</div>
							{/if}
						</button>
					{/if}
					{#if showWheel && !showCmdPicker}
						<div class="wheel-actions">
							<button class="wheel-btn" style="--angle:150deg;--dist:168px" title="Menu" onclick={navigateToMenu}>
								<Icon name="menu" size={28} /><span class="wheel-label">Menu</span>
							</button>
							<button class="wheel-btn" style="--angle:90deg;--dist:168px" title="Finish Game" onclick={() => runWheelAction(openWinnerModal, { resumeOnClose: false })}>
								<Icon name="trophy" size={28} /><span class="wheel-label">Finish</span>
							</button>
							<button class="wheel-btn" style="--angle:30deg;--dist:168px" title="Game Log" onclick={() => runWheelAction(openGameLogModal, { resumeOnClose: false })}>
								<Icon name="search" size={28} /><span class="wheel-label">Log</span>
							</button>
							<button class="wheel-btn" style="--angle:210deg;--dist:168px" title="Undo Mode" disabled={!$canUndo} onclick={enterUndoMode}>
								<Icon name="undo" size={28} /><span class="wheel-label">Undo Mode</span>
							</button>
							<button class="wheel-btn" style="--angle:330deg;--dist:168px" title="Choose Random Opponent" onclick={() => runWheelAction(beginRandomPick)}>
								<Icon name="dice" size={28} /><span class="wheel-label">Random Opp.</span>
							</button>
							{#if $commanderDamageMode}
								<button class="wheel-btn active" style="--angle:270deg;--dist:168px" title="Exit CMD" onclick={() => runWheelAction(exitCmdMode)}>
									<Icon name="crosshair" size={28} /><span class="wheel-label">Exit CMD</span>
								</button>
							{:else}
								<button class="wheel-btn" style="--angle:270deg;--dist:168px" title="Commander Damage" onclick={openCmdPicker}>
									<Icon name="crosshair" size={28} /><span class="wheel-label">Commander Dmg</span>
								</button>
							{/if}
						</div>
					{/if}
					{#if showWheel && showCmdPicker && $gameState}
						<div class="wheel-actions">
							{#each $gameState.players as cp, ci}
							<button class="wheel-btn cmd-pick-btn" style="--angle:{getLayout()[ci]?.cmdAngle ?? 0}deg;--dist:168px" title={cp.commanderName}
									onclick={() => selectCmdSource(ci)}>
									{#if cp.commanderImageUrl}
										<img class="cmd-pick-img" src={cp.commanderImageUrl} alt={cp.commanderName} />
									{:else}
										<Icon name="crosshair" size={28} />
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				{#if startPhase === 'countdown'}
					<div class="countdown-overlay">
						{#key countdownNum}
							<div class="countdown-big" class:countdown-go={countdownNum <= 1}>{countdownNum}</div>
						{/key}
					</div>
				{/if}
			</div>
		{:else}
			<div class="no-game"><p>Unsupported player count: {playerCount}.</p><Button variant="primary" onclick={() => goto('/setup')}>{#snippet children()}<Icon name="play" size={16}/> Setup a Game{/snippet}</Button></div>
		{/if}

		<Modal bind:open={showWinnerModal} title="Select Winner">
			{#snippet children()}
				<div class="winner-list">
					{#each $gameState.players.filter((p: GamePlayerState) => !p.isDead) as p}
						<button class="winner-opt" onclick={()=>selectWinner(p.playerId)}>
							{#if p.commanderImageUrl}<img src={p.commanderImageUrl} alt="" class="winner-img"/>{/if}
							<div><strong>{p.playerName}</strong><span>{p.commanderName}</span></div>
						</button>
					{/each}
					<Button variant="ghost" size="sm" onclick={closeWinnerModal}>
						{#snippet children()}<Icon name="return" size={14}/> Return{/snippet}
					</Button>
				</div>
			{/snippet}
		</Modal>

		<Modal bind:open={showGameLogModal} title="Game Log">
			{#snippet children()}
				<div class="game-log-list">
					{#if !gameLogRows.length}
						<div class="empty">No entries yet.</div>
					{:else}
						{#each gameLogRows as row (row.id)}
							<div class="game-log-row">
								<span class="gl-time">{formatTimestamp(row.timestamp)}</span>
								<span class="gl-type" class:gl-turn={row.tone === 'turn'}>{row.label}</span>
								<span class="gl-detail" class:gl-gain={row.tone === 'gain'} class:gl-loss={row.tone === 'loss'}>{row.detail}</span>
							</div>
						{/each}
					{/if}
				</div>
				<Button variant="ghost" size="sm" onclick={closeGameLogModal}>
					{#snippet children()}<Icon name="return" size={14}/> Close{/snippet}
				</Button>
			{/snippet}
		</Modal>

		{#if showCancelPrompt}
			<div class="center-toast animate-fade-in">
				<span>Cancel this game?</span>
				<button onclick={handleCancelGame}>Cancel Game</button>
			</div>
		{/if}

	{/if}
</div>

<style>
	.game-page{padding-top:var(--space-sm);display:flex;flex-direction:column;gap:var(--space-md);max-width:100%;height:100%}
	.battlefield{position:relative;display:grid;gap:var(--space-xs);flex:1;min-height:0}
	.battlefield.bf-2{grid-template-columns:1fr;grid-template-rows:1fr 1fr}
	.battlefield.bf-3{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
	.battlefield.bf-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
	.battlefield.bf-5{grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr}
	.slot{min-width:0;min-height:0;position:relative}
	.slot :global(.tile){height:100%;min-height:unset}
	.tile-toast{position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:40;display:flex;align-items:center;gap:8px;background:rgba(8,8,13,.92);border:2px solid var(--color-warning);color:#fff;padding:6px 10px;border-radius:var(--radius-full);font-size:.72rem;font-weight:800;box-shadow:0 0 16px rgba(255,171,0,.24)}
	.tile-toast button{min-height:28px;padding:2px 10px;border-radius:var(--radius-full);background:var(--color-warning);color:#111;font-size:.68rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
	.battlefield-overlay{position:absolute;inset:0;z-index:28;pointer-events:auto;background:rgba(0,0,0,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
	.undo-overlay{z-index:31;background:rgba(0,0,0,.12);backdrop-filter:none;-webkit-backdrop-filter:none}
	.wheel-zone{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:34;background:transparent;pointer-events:none}
	.phase-backdrop{position:absolute;inset:0;z-index:26;pointer-events:auto}
	.phase-backdrop-heavy{background:rgba(0,0,0,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
	.wheel-core{pointer-events:auto;position:relative;z-index:2;width:203px;height:203px;border-radius:9999px;border:7px solid var(--neon-cyan);background:rgba(18,18,28,.95);box-shadow:0 0 34px rgba(0,229,255,.45);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;transition:transform var(--transition-fast),border-color .3s,box-shadow .3s;touch-action:none;overflow:hidden;-webkit-tap-highlight-color:transparent;outline:none;clip-path:circle(50% at 50% 50%);isolation:isolate}
	.wheel-core:focus,.wheel-core:focus-visible{outline:none}
	.wheel-core.wheel-green{border-color:rgba(0,230,118,1);box-shadow:0 0 44px rgba(0,230,118,.8), inset 0 0 20px rgba(0,230,118,.35)}
	.wheel-core.wheel-blue{border-color:rgba(0,229,255,1);box-shadow:0 0 44px rgba(0,229,255,.8), inset 0 0 20px rgba(0,229,255,.35)}
	.wheel-core:active{transform:scale(.96)}
	.wheel-core.critical{animation:pulse-border-blue 1s infinite}
	/* long-press loading ring */
	.lp-ring{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;transform:rotate(-90deg)}
	.lp-ring circle{fill:none;stroke:rgba(0,230,118,.6);stroke-width:5;stroke-linecap:round;stroke-dasharray:289;stroke-dashoffset:289;animation:lp-fill .25s linear forwards}
	.lp-ring.lp-ring-blue circle{stroke:rgba(0,229,255,.75)}
	@keyframes lp-fill{to{stroke-dashoffset:0}}
	@keyframes pulse-border-blue{0%,100%{border-color:rgba(255,23,68,.95);box-shadow:0 0 24px rgba(255,23,68,.38)}50%{border-color:rgba(255,23,68,.65);box-shadow:0 0 12px rgba(255,23,68,.22)}}
	/* ── Start button ── */
	.wheel-start{border-color:rgba(0,230,118,.6);box-shadow:0 0 20px rgba(0,230,118,.3);cursor:pointer}
	.wheel-start:hover{border-color:rgba(0,230,118,.9);box-shadow:0 0 30px rgba(0,230,118,.5)}
	.wheel-ceremony{border-color:rgba(255,215,0,.7);box-shadow:0 0 20px rgba(255,215,0,.3);cursor:default}
	.wheel-start-text{font-size:1.15rem;font-weight:900;letter-spacing:.08em}
	.wheel-ceremony-text{font-size:.88rem;font-weight:900;letter-spacing:.08em}
	/* ── CMD mode wheel ── */
	.wheel-core.cmd-active{border-color:var(--color-danger);box-shadow:0 0 22px rgba(255,23,68,.45)}
	.wheel-undo-mode{pointer-events:auto;z-index:32;border-color:rgba(255,171,0,.92);box-shadow:0 0 24px rgba(255,171,0,.42);gap:10px}
	.wheel-cmd-img{position:absolute;inset:0;width:100%;height:100%;border-radius:9999px;object-fit:cover;object-position:center top}
	.cmd-pick-btn{overflow:hidden}
	.cmd-pick-img{width:100%;height:100%;border-radius:9999px;object-fit:cover;object-position:center top}
	/* ── Countdown overlay ── */
	.countdown-overlay{position:absolute;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.66);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);pointer-events:auto;border-radius:inherit}
	.countdown-big{font-family:var(--font-mono);font-size:12rem;font-weight:900;color:rgba(255,215,0,.9);line-height:1;animation:countdown-pop .9s cubic-bezier(.34,1.56,.64,1) both;text-shadow:0 0 40px rgba(255,215,0,.4)}
	.countdown-go{color:rgba(0,230,118,.9);text-shadow:0 0 40px rgba(0,230,118,.4)}
	@keyframes countdown-pop{0%{opacity:0;transform:scale(2.5)}30%{opacity:1;transform:scale(1)}100%{opacity:.6;transform:scale(.9)}}
	.wheel-time{font-family:var(--font-mono);font-size:3.42rem;font-weight:900;line-height:1;color:#fff;text-shadow:0 0 18px rgba(255,255,255,.35)}
	.wheel-time.pool-drain{color:var(--color-danger);text-shadow:0 0 18px rgba(255,23,68,.42)}
	.wheel-meta{font-size:.74rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#edf2ff;text-align:center}
	.wheel-actions{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:1px;height:1px;z-index:1;pointer-events:none}
	.wheel-btn{pointer-events:auto;position:absolute;left:calc(50% + calc(var(--dist) * cos(var(--angle))));top:calc(50% + calc(var(--dist) * sin(var(--angle)) * -1));transform:translate(-50%,-50%);width:88px;aspect-ratio:1/1;min-height:88px;border-radius:9999px;background:var(--color-surface);border:1.5px solid var(--color-surface-elevated);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-shadow:var(--shadow-sm);animation:wheel-pop .25s cubic-bezier(.34,1.56,.64,1) both;padding:0}
	.wheel-btn:hover{border-color:var(--neon-cyan);box-shadow:var(--glow-cyan)}
	.wheel-btn.active{border-color:var(--neon-red);box-shadow:var(--glow-primary)}
	.wheel-btn:disabled{opacity:.45;cursor:not-allowed}
	.wheel-label{font-size:.74rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--color-text);line-height:1}
	.center-toast{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:70;display:flex;align-items:center;gap:10px;background:rgba(8,8,13,.92);border:2px solid var(--color-danger);color:#fff;padding:10px 14px;border-radius:var(--radius-full);font-size:.88rem;font-weight:900;box-shadow:0 0 20px rgba(255,23,68,.28)}
	.center-toast button{min-height:34px;padding:6px 12px;border-radius:var(--radius-full);background:var(--color-danger);color:#fff;font-size:.76rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
	@keyframes wheel-pop{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
	.turn-info{text-align:center;font-size:.7rem;font-weight:700;color:var(--color-text-muted);letter-spacing:.08em;text-transform:uppercase;padding:var(--space-sm)}
	.no-game,.finished{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-lg);padding:var(--space-2xl);text-align:center;min-height:60dvh}
	.finished h1{font-size:1.6rem;font-weight:900;color:var(--color-primary);letter-spacing:.1em;text-transform:uppercase}
	.winner{font-size:1.1rem;font-weight:700;color:var(--color-warning)}
	.controls{display:flex;gap:var(--space-xs);flex-wrap:wrap;justify-content:center}
	.tile-grid{display:flex;gap:var(--space-sm);overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding-bottom:var(--space-sm)}
	.tile-grid :global(.tile){flex:0 0 min(200px,45vw);scroll-snap-align:start}
	@media(min-width:769px){.tile-grid{flex-wrap:wrap;overflow-x:visible;scroll-snap-type:none}.tile-grid :global(.tile){flex:0 0 calc(50% - var(--space-sm))}}
	.winner-list{display:flex;flex-direction:column;gap:var(--space-sm)}
	.winner-opt{display:flex;align-items:center;gap:var(--space-md);padding:var(--space-md);border-radius:var(--radius-lg);background:var(--color-surface);border:1px solid var(--color-surface-elevated);transition:all var(--transition-fast);text-align:left;cursor:pointer}
	.winner-opt:hover{border-color:var(--neon-cyan);box-shadow:var(--glow-cyan)}
	.winner-img{width:40px;height:30px;border-radius:var(--radius-sm);object-fit:cover}
	.winner-opt strong{font-size:.85rem;display:block}.winner-opt span{font-size:.7rem;color:var(--color-text-muted)}
	.game-log-list{max-height:56dvh;overflow-y:auto;display:flex;flex-direction:column;gap:var(--space-xs);margin-bottom:var(--space-sm);-webkit-overflow-scrolling:touch;touch-action:pan-y}
	.game-log-row{display:grid;grid-template-columns:72px 62px 1fr;gap:var(--space-sm);align-items:center;padding:var(--space-sm) var(--space-md);background:var(--color-surface);border:1px solid var(--color-surface-elevated);border-radius:var(--radius-md);font-size:.72rem}
	.gl-time{font-family:var(--font-mono);color:var(--color-text-muted)}
	.gl-type{font-weight:800;color:#fff;letter-spacing:.06em}
	.gl-type.gl-turn{color:var(--color-success)}
	.gl-detail{font-weight:600;color:var(--color-text)}
	.gl-detail.gl-gain{color:var(--color-success)}
	.gl-detail.gl-loss{color:var(--color-danger)}

	@media (max-width: 768px) {
		.game-page { padding: 0; gap: 2px; flex: 1; overflow: hidden; }
		.battlefield { gap: 3px; }
		.wheel-core { width: 172px; height: 172px; }
		.wheel-time { font-size: 2.64rem; }
		.wheel-meta { font-size: .5rem; }
		.wheel-btn { width: 62px; min-height: 62px; }
		.wheel-label { font-size: .58rem; }
		.wheel-start-text { font-size: .92rem; }
		.wheel-ceremony-text { font-size: .64rem; }
		.no-game, .finished { min-height: unset; padding: var(--space-lg); height: 100%; }
		.controls {
			flex-wrap: nowrap;
			gap: 2px;
			justify-content: flex-start;
			padding: 2px 4px;
			overflow-x: auto;
			overflow-y: hidden;
			-webkit-overflow-scrolling: touch;
			flex-shrink: 0;
			scrollbar-width: none;
		}
		.controls::-webkit-scrollbar { display: none; }
		.controls :global(button) { min-height: 30px; padding: 3px 8px; font-size: .58rem; flex-shrink: 0; }
		.turn-info { padding: 4px; font-size: .6rem; flex-shrink: 0; }
		.tile-grid {
			flex: 1;
			min-height: 0;
			display: grid;
			grid-template-columns: 1fr 1fr;
			grid-auto-rows: minmax(0, 1fr);
			gap: 3px;
			overflow: hidden;
			padding: 0;
			scroll-snap-type: none;
			-webkit-overflow-scrolling: unset;
		}
		.tile-grid :global(.tile) {
			flex: unset;
			scroll-snap-align: unset;
			min-height: unset;
			height: 100%;
		}
	}

	@keyframes fade-in{from{opacity:0}to{opacity:1}}
</style>








