<!--
	The trailer.

	Two different jobs from one component. On the home plate and the hover card
	it is decoration, playing the moment it appears because that is the whole
	point of both — the hover card loops its few seconds, while the plate reports
	the end through `onended` so the hero can move to the next announcement. On a
	detail page it is content, and content does not start on its own — that one
	waits to be asked, and until it is asked YouTube is never contacted at all.

	`autoplay` is the switch and it defaults to off. An embed that plays on sight
	should have to be opted into rather than remembered about.

	## Whose controls

	The detail page uses YouTube's. It had ours — a scrub bar, a clock, a
	play button and a fullscreen toggle, all driven over postMessage — and they
	were worse at the job than the thing they covered. YouTube's bar has the
	quality menu, captions, playback speed, chapters and the keyboard shortcuts
	people already know, and it cannot drift out of sync with the player the way
	a mirror of its state can. Hiding it also went against YouTube's own terms
	about their branding staying visible.

	So `controls=1` there, and the iframe takes the cursor.

	The plate and the hover card still hide it, because there the trailer is
	wallpaper: it plays behind a title and a set of links, a scrub bar invites an
	interaction there is no reason to want, and clicks belong to whatever is
	underneath. Those keep one control of ours — a speaker — because a video that
	makes noise with no way to stop it is the one thing worse than no controls.

	`enablejsapi=1` is what makes that speaker possible: it turns the iframe into
	something that accepts commands as JSON over postMessage and reports its
	state back the same way, which is all YouTube's own API library does, so
	there is no reason to load it. It is also how the plate knows a video ended
	and can move to the next announcement.
-->
<script module>
	/**
	 * Where the volume starts, for every trailer everywhere.
	 *
	 * Full volume is the wrong opening bid for something that begins playing
	 * next to whatever you were already listening to. Half is audible without
	 * being an event, and the slider is right there.
	 *
	 * It has to be sent as a command as well as asked for in the URL, because
	 * YouTube remembers a viewer's last volume across embeds and will happily
	 * come back at whatever they left a different site on.
	 */
	const START_VOLUME = 50;

	/*
	 * The level to open the *next* one at.
	 *
	 * In the module block, so it is one number for the whole session rather
	 * than one per player. The home plate advances by itself now, and a viewer
	 * who turns a trailer up should not have to turn the one after it up as
	 * well — but that is a preference for this visit, not something to write
	 * down, so it starts at START_VOLUME again on the next page load.
	 *
	 * Only ever written from a browser event, so it cannot leak between SSR
	 * requests.
	 */
	let chosen = START_VOLUME;
</script>

<script>
	import Icon from '$lib/components/Icon.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte.js';

	let {
		item,
		/** `cover` fills its container (the home plate); `inline` is a 16:9 block. */
		fit = 'inline',
		/** Left unset, this follows `autoplay` — see `silent` below. */
		muted,
		loop = false,
		autoplay = false,
		/** Called once when the video reaches its end. Never fires while looping. */
		onended
	} = $props();

	let key = $derived(item?.trailer?.key ?? null);

	/*
	 * Muted only when we started it ourselves.
	 *
	 * A browser refuses to autoplay audio, so the home plate has to be silent —
	 * and `muted` defaulting to true for that reason silently applied to the
	 * detail page too, where the viewer has clicked a play button and is
	 * expecting to hear a trailer. Tying it to autoplay is the actual rule:
	 * sound needs a gesture, and a click is one.
	 */
	let silent = $derived(muted ?? autoplay);

	/*
	 * The full bar belongs to the fit that means "this is the thing you came
	 * for". On the plate and the hover card the trailer is wallpaper — a scrub
	 * bar on wallpaper invites an interaction there is no reason to want, so
	 * those get the speaker alone.
	 */
	let full = $derived(fit === 'inline');

	/*
	 * Whether the iframe exists at all. An autoplaying embed is mounted at once;
	 * the rest wait for a click, so a detail page costs nothing until somebody
	 * wants the trailer — no YouTube script, no cookie, no request.
	 */
	let started = $state(false);

	/* ---- the player's state, mirrored from the iframe ---------------------
	 *
	 * None of this can be read; it can only be received. Every field below is
	 * last-known rather than current, which is why the bar is built to look
	 * right when a message has not arrived yet: 0:00 of 0:00, paused, silent.
	 */

	let ready = $state(false);
	/** -1 unstarted, 1 playing, 2 paused, 3 buffering, 0 ended, 5 cued. */
	let mode = $state(-1);
	let level = $state(chosen);
	let sound = $state(false);

	/* ---- whether the volume slider is open --------------------------------
	 *
	 * This was `:hover, :focus-within` in CSS and it stuck open: dragging the
	 * slider leaves it focused, so `:focus-within` stayed true after the cursor
	 * had gone and the slider never closed again.
	 *
	 * Focus still has to open it or a keyboard could never reach it, so the
	 * three reasons are tracked apart. `keyed` is set only when the input
	 * matches :focus-visible — which a range input does for a Tab and not for a
	 * click, and that difference is exactly the one that was missing.
	 */
	let hovering = $state(false);
	/** The thumb is held. Keeps the track open when the drag leaves the box. */
	let holding = $state(false);
	let keyed = $state(false);
	let volumeOpen = $derived(hovering || holding || keyed);

	/** @type {HTMLIFrameElement | undefined} */
	let frame = $state();
	/** @type {HTMLDivElement | undefined} */
	let shell = $state();

	// Set from the props here rather than as initial values, so a different work
	// — a different trailer — does not inherit the last one's started state and
	// begin playing the moment the page changes.
	$effect(() => {
		key;
		started = autoplay;
		sound = !silent;
		ready = false;
		mode = -1;
		level = chosen;
	});

	let src = $derived(
		key && started
			? `https://www.youtube-nocookie.com/embed/${key}?` +
				new URLSearchParams({
					autoplay: '1',
					mute: silent ? '1' : '0',
					// Its own controls where the trailer is the thing you came
					// for; hidden where it is wallpaper. See the note at the top.
					controls: full ? '1' : '0',
					loop: loop ? '1' : '0',
					playlist: key, // a single-video loop needs itself as the playlist
					playsinline: '1',
					rel: '0',
					// What lets everything below talk to the player. Without it
					// postMessage is ignored and the only way to change anything
					// is to rebuild this URL, which restarts the video.
					enablejsapi: '1',
					hl: i18n.locale // the player chrome, not the video
				})
			: null
	);

	let still = $derived(item?.backdrop ?? item?.poster ?? null);

	/** A muted player draws an empty volume track, whatever its remembered level. */
	let loudness = $derived(sound ? level : 0);

	/** @param {Record<string, unknown>} message */
	function post(message) {
		frame?.contentWindow?.postMessage(JSON.stringify(message), '*');
	}

	/**
	 * @param {string} func
	 * @param {unknown[]} args
	 */
	function command(func, args = []) {
		post({ event: 'command', func, args });
	}

	/*
	 * The player does not volunteer anything until it has been greeted, and it
	 * ignores the greeting until it is ready — so this repeats until an answer
	 * arrives and then stops. Capped, because a player that is never going to
	 * reply should not be asked forever; the bar still works without state, it
	 * just shows zeros.
	 */
	$effect(() => {
		if (!started || ready) return;

		let tries = 0;
		const hello = setInterval(() => {
			post({ event: 'listening', id: 1, channel: 'widget' });
			if (++tries > 20) clearInterval(hello);
		}, 250);

		return () => clearInterval(hello);
	});

	$effect(() => {
		if (!started) return;

		/** @param {MessageEvent} event */
		const receive = (event) => {
			// Identity rather than origin: this is the window we created, and no
			// other sender can forge a reference to it.
			if (event.source !== frame?.contentWindow) return;

			let data;
			try {
				data = JSON.parse(event.data);
			} catch {
				return; // not ours, or not JSON
			}

			if (data?.event === 'onReady') {
				ready = true;
				// Before anything is audible: an unmuted player would otherwise
				// open at whatever volume YouTube remembers for this viewer.
				command('setVolume', [level]);
			}
			if (data?.event !== 'infoDelivery' && data?.event !== 'onReady') return;

			const info = data.info;
			if (!info) return;

			if (typeof info.playerState === 'number') {
				const was = mode;
				mode = info.playerState;
				// On the transition, not on the state: a finished player keeps
				// reporting 0 until something else happens to it, and a handler
				// that advances a queue must not be told twice.
				if (0 === mode && 0 !== was) onended?.();
			}
			if (typeof info.volume === 'number') level = info.volume;
			if (typeof info.muted === 'boolean') sound = !info.muted;
		};

		window.addEventListener('message', receive);
		return () => window.removeEventListener('message', receive);
	});


	// A drag can end anywhere — off the slider, off the window — so the release
	// is caught globally. Listening only while held keeps it to the one case.
	$effect(() => {
		if (!holding) return;

		const drop = () => (holding = false);
		window.addEventListener('pointerup', drop);
		window.addEventListener('pointercancel', drop);

		return () => {
			window.removeEventListener('pointerup', drop);
			window.removeEventListener('pointercancel', drop);
		};
	});


	function toggleSound() {
		sound = !sound;

		if (!sound) return command('mute');

		command('unMute');
		// A player created with mute=1 can come back at zero rather than at a
		// volume it never had; and a slider dragged to nothing then unmuted
		// should make a noise.
		if (level === 0) level = chosen = START_VOLUME;
		command('setVolume', [level]);
	}

	/** @param {number} value */
	function setLevel(value) {
		level = value;
		// Deliberately chosen, so the next trailer opens here rather than back
		// at the default.
		chosen = value;
		command('setVolume', [value]);

		// The slider is the mute button's other face: drag it to nothing and the
		// speaker crosses out, drag it back up and the sound returns.
		if (value === 0 && sound) {
			sound = false;
			command('mute');
		} else if (value > 0 && !sound) {
			sound = true;
			command('unMute');
		}
	}



</script>

{#if key}
	<div
		class="player {fit}"
		class:paused={mode === 2 || mode === 0}
		bind:this={shell}
		role={full ? 'region' : undefined}
		aria-label={full ? t('work.trailerTitle', { title: item.title }) : undefined}
	>
		{#if src}
			<!--
				Keyed on the src so a new trailer replaces the iframe rather than
				navigating the old one, which would leave the previous video's
				sound and position behind.
			-->
			{#key src}
				<iframe
					bind:this={frame}
					{src}
					title={t('work.trailerTitle', { title: item.title })}
					allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
					allowfullscreen
				></iframe>
			{/key}

			<!--
				Everything below is for the decorative fits only. On a detail page
				the trailer is the thing you came for and YouTube's own bar is
				better than ours at being one — it has the quality menu, the
				captions, the keyboard shortcuts people already know, and it does
				not drift out of sync with a player we can only talk to by
				postMessage.
			-->
			{#if !full}
			<div class="bar sparse">

				<!--
					Button and slider are one control. The slider is always in the
					DOM so the tab order reaches it; it is the width that opens.
				-->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="volume"
					class:open={volumeOpen}
					onpointerenter={() => (hovering = true)}
					onpointerleave={() => (hovering = false)}
				>
					<button
						type="button"
						class="ctl"
						onclick={toggleSound}
						aria-pressed={sound}
						aria-label={t(sound ? 'work.soundOff' : 'work.soundOn')}
					>
						<Icon name={sound ? 'sound' : 'mute'} size={17} stroke={1.9} />
					</button>

					<input
						class="range level"
						type="range"
						min="0"
						max="100"
						step="1"
						value={loudness}
						aria-label={t('work.volume')}
						style="--filled: {loudness}%"
						oninput={(event) => setLevel(Number(event.currentTarget.value))}
						onpointerdown={() => (holding = true)}
						onfocus={(event) => (keyed = event.currentTarget.matches(':focus-visible'))}
						onblur={() => (keyed = false)}
						onkeydown={() => (keyed = true)}
					/>
				</div>

			</div>
			{/if}
		{:else}
			<!--
				The poster frame with the play control on it. A real button rather
				than a handler on the image: this is the one interactive thing
				here, and a keyboard has to be able to reach it.
			-->
			<button type="button" class="start" onclick={() => (started = true)}>
				{#if still}
					<img src={still} alt="" loading="lazy" />
				{/if}
				<span class="glyph"><Icon name="play" size={26} filled /></span>
				<span class="sr-only">{t('work.trailerTitle', { title: item.title })}</span>
			</button>
		{/if}
	</div>
{/if}

<style>
	/* Positioning context for the bar and the scrim, in both fits. */
	.player {
		position: relative;
	}

	.inline {
		background: #000;
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-card);
	}

	/* Filling the screen means giving up the shape and the corners. */
	.player:fullscreen {
		width: 100vw;
		height: 100vh;
		aspect-ratio: auto;
		border-radius: 0;
		box-shadow: none;
	}

	/*
	 * object-fit: cover, for an iframe: size the 16:9 frame to whichever axis of
	 * the container is short and let the other overhang. Container units measure
	 * that box itself, so the crop is right at any shape.
	 *
	 * No background colour here, unlike the inline player: the still sits under
	 * this on the home plate, and a black fill would cover it for as long as
	 * YouTube takes to paint a first frame — a black rectangle where the artwork
	 * was, every time the page opens.
	 */
	.cover {
		position: absolute;
		inset: 0;
		overflow: hidden;
		container-type: size;
		/*
		 * The plate is decoration and clicks belong to whatever is underneath —
		 * the hero's own links, or the poster card's. The bar takes itself back
		 * out of this.
		 */
		pointer-events: none;
	}

	.cover iframe {
		position: absolute;
		left: 50%;
		top: 50%;
		/*
		 * Cover with no overscan, and centred rather than biased upward. Both of
		 * those existed to survive a plate that was much wider than 16:9 and cut
		 * the trailer to a strip: the bias saved the faces, the 18% zoom hid the
		 * black bars the crop exposed. The plate is 16:9 now, so this resolves
		 * to exactly the container and neither is doing anything except throwing
		 * away picture.
		 *
		 * The max() stays. It costs nothing at a matching ratio and is what
		 * keeps this honest anywhere the container is not 16:9 — the inline
		 * player, or a plate somebody reshapes later.
		 */
		width: max(100cqw, calc(100cqh * 16 / 9));
		height: max(100cqh, calc(100cqw * 9 / 16));
		transform: translate(-50%, -50%);
	}

	/*
	 * Never takes the cursor, in either fit. This is what keeps YouTube's title
	 * bar, share button and channel avatar from ever being drawn — they are
	 * hover states, and the iframe is never hovered. It also means every click
	 * on the picture reaches whatever we put over it.
	 */
	iframe {
		width: 100%;
		height: 100%;
		border: 0;
		display: block;
		pointer-events: none;
	}

	/* The one player meant to be used. YouTube's bar is under the cursor here,
	   so the cursor has to be able to get to it. */
	.inline iframe {
		pointer-events: auto;
	}

	/* ---- our paused state, over YouTube's ------------------------------- */

	.scrim {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: grid;
		place-items: center;
		width: 100%;
		padding: 0;
		border: 0;
		background: rgb(6 8 14 / 0.45);
		cursor: pointer;
	}

	/* ---- the bar --------------------------------------------------------- */

	.bar {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 1.6rem 0.85rem 0.7rem;
		background: linear-gradient(to top, rgb(4 6 12 / 0.85), transparent);
		color: #fff;
		pointer-events: auto;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	/*
	 * Out of the way while the video is doing its job, back the moment there is
	 * a cursor on it. A paused video keeps it: the way out of paused is a
	 * control.
	 */
	.player:hover .bar,
	.player.paused .bar {
		opacity: 1;
	}

	/*
	 * And back for a keyboard. :focus-visible rather than :focus-within, which
	 * was the bug — clicking play leaves the button focused, so the bar stayed
	 * up over the video for the rest of the session. A separate rule because a
	 * selector list is not forgiving: an engine without :has() would have
	 * thrown away the hover rule above along with this one.
	 */
	.player:has(:focus-visible) .bar {
		opacity: 1;
	}

	/*
	 * The speaker alone, floated in the corner. No gradient and no full width:
	 * there is one control, and a bar drawn for one control is a bar drawn for
	 * nothing. Always visible, because on a muted autoplaying video it is the
	 * only thing that says the sound can be turned on.
	 */
	.bar.sparse {
		left: auto;
		right: 0.75rem;
		bottom: 0.75rem;
		padding: 0;
		background: none;
		opacity: 1;
		/* Grows leftward, so the speaker itself never moves. */
		flex-direction: row-reverse;
	}

	.ctl {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		flex: none;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: inherit;
		cursor: pointer;
		transition:
			background 0.15s ease,
			transform 0.15s ease;
	}

	.ctl:hover,
	.ctl:focus-visible {
		background: rgb(255 255 255 / 0.16);
		transform: scale(1.06);
	}

	/* The floated speaker has no bar behind it, so it brings its own. */
	.sparse .ctl {
		width: 2.35rem;
		height: 2.35rem;
		border: 1px solid rgb(255 255 255 / 0.3);
		background: rgb(8 10 16 / 0.55);
		backdrop-filter: blur(8px);
	}

	.sparse .ctl:hover,
	.sparse .ctl:focus-visible {
		background: rgb(8 10 16 / 0.85);
		border-color: rgb(255 255 255 / 0.6);
	}

	.clock {
		flex: none;
		font-size: 0.74rem;
		font-variant-numeric: tabular-nums;
		opacity: 0.85;
	}

	/* ---- sliders --------------------------------------------------------- */

	/*
	 * A real range input rather than a div with a drag handler: arrow keys, Home
	 * and End, and a screen reader announcing a percentage all come free, and
	 * none of them would have been written by hand.
	 *
	 * --filled is the played (or heard) portion, painted as a hard-stop gradient
	 * because a range input has no styleable "before the thumb" part that works
	 * across engines.
	 */
	.range {
		appearance: none;
		-webkit-appearance: none;
		height: 4px;
		min-width: 0;
		border-radius: 99px;
		background: linear-gradient(
			to right,
			var(--brand) var(--filled),
			rgb(255 255 255 / 0.3) var(--filled)
		);
		cursor: pointer;
	}

	.range::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 11px;
		height: 11px;
		border: 0;
		border-radius: 50%;
		background: #fff;
	}

	.range::-moz-range-thumb {
		width: 11px;
		height: 11px;
		border: 0;
		border-radius: 50%;
		background: #fff;
	}

	.range:disabled {
		cursor: default;
		opacity: 0.5;
	}

	.seek {
		flex: 1;
	}

	.volume {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex: none;
	}

	/*
	 * Closed to nothing and opened by hovering the pair. Width rather than
	 * display, so it can animate and so it stays focusable while shut — tabbing
	 * to it opens it, which is what `keyed` in the script is for.
	 *
	 * `.open` is a class rather than `:hover, :focus-within` because the second
	 * of those never let go: a dragged slider keeps focus, so the track stayed
	 * open after the cursor left. See the note on `volumeOpen`.
	 */
	.level {
		width: 0;
		opacity: 0;
		transition:
			width 0.18s ease,
			opacity 0.18s ease;
	}

	.volume.open .level {
		width: 4.5rem;
		opacity: 1;
	}

	/* ---- the unstarted state --------------------------------------------- */

	.start {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}

	.start img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 22%;
		opacity: 0.75;
		transition: opacity 0.25s ease;
	}

	.start:hover img {
		opacity: 0.92;
	}

	.glyph {
		display: grid;
		place-items: center;
		width: 4.5rem;
		height: 4.5rem;
		border-radius: 50%;
		background: var(--glass);
		backdrop-filter: blur(10px);
		border: 1px solid rgb(255 255 255 / 0.35);
		color: #fff;
		transition: transform 0.25s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.start .glyph {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.start:hover .glyph {
		transform: translate(-50%, -50%) scale(1.08);
	}

	.scrim:hover .glyph {
		transform: scale(1.08);
	}

	@media (prefers-reduced-motion: reduce) {
		.start img,
		.glyph,
		.ctl,
		.level,
		.bar {
			transition: none;
		}
	}
</style>
