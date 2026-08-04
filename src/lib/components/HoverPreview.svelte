<!--
	The card that grows out of a poster when the cursor rests on it.

	Two motions, in the order they read as one gesture:

	  dwell    650ms   the cursor has to rest; crossing a grid triggers nothing
	  scale    240ms   the poster grows, in place, still exactly a poster
	  widen    420ms   it stretches sideways — and only sideways — until the
	                   artwork is a 16:9 frame, while the body opens beneath it
	  play    +600ms   the trailer fades in where the poster was

	The widen is the important one. The box keeps the top edge it reached when it
	scaled and grows outward from the same centre: a portrait poster turning into
	a landscape frame is the shape change that makes the video belong in the box
	it was already in, rather than a second box arriving with a video in it.

	Two earlier versions got this wrong in the same way — grow the poster a
	little, then put the card somewhere else. That is two destinations, and no
	amount of easing disguises the second one. It reads as a modal because it is
	one. Here `top` is computed once, for both stages, from the same numbers.

	Rendered once at the root rather than inside a poster: rails scroll with
	`overflow-x: auto` and clip anything inside them, and the poster under the
	cursor is very often the one at the edge.
-->
<script>
	import QuickShelf from '$lib/components/QuickShelf.svelte';
	import Trailer from '$lib/components/Trailer.svelte';
	import { itemPath } from '$lib/data/items.js';
	import { lineOf } from '$lib/data/types.js';
	import { preview } from '$lib/state/preview.svelte.js';

	/** The grow-in-place step: enough to lift off the grid, not enough to travel. */
	const SCALE = 1.12;

	/**
	 * How much wider the finished card is than the poster.
	 *
	 * Set by the artwork rather than picked: a 2:3 poster only becomes a 16:9
	 * frame by getting a lot wider, and much less than this leaves a video strip
	 * too short to be worth starting.
	 */
	const GROWTH = 1.75;

	/** Kept this far clear of the viewport edges. */
	const MARGIN = 12;

	/** Roughly what the title, meta, overview and shelf row come to. Used only to
	 *  keep the card on screen — see `top` below. */
	const BODY = 172;

	const SCALE_MS = 240;
	const WIDEN_MS = 420;
	const PLAY_MS = 600;

	let item = $derived(preview.item);
	let detail = $derived(preview.detail);
	let rect = $derived(preview.rect);

	/** 'seed' → 'scale' → 'wide'. */
	let phase = $state('seed');
	let playing = $state(false);

	let meta = $derived(item ? lineOf(item).slice(0, 3).join(' · ') : '');

	/*
	 * Runs the stages, keyed on the item — moving to another poster starts the
	 * sequence again rather than continuing the last one's.
	 */
	$effect(() => {
		const id = item?.id;
		if (!id) return;

		phase = 'seed';
		playing = false;

		// One frame at the poster's exact box, so the browser has something to
		// transition *from*. Without it the first paint is already the end state
		// and nothing animates at all.
		const toScale = requestAnimationFrame(() => requestAnimationFrame(() => (phase = 'scale')));
		const toWide = setTimeout(() => (phase = 'wide'), SCALE_MS);
		const toPlay = setTimeout(() => (playing = true), SCALE_MS + WIDEN_MS + PLAY_MS);

		return () => {
			cancelAnimationFrame(toScale);
			clearTimeout(toWide);
			clearTimeout(toPlay);
		};
	});

	let box = $derived.by(() => {
		if (!rect) return null;

		const scaledW = rect.width * SCALE;
		const scaledH = rect.height * SCALE;
		const wideW = rect.width * GROWTH;
		const wideArt = wideW * (9 / 16);
		const midX = rect.left + rect.width / 2;

		/*
		 * One value, used by both open stages, so the card cannot move vertically
		 * once it has grown. Clamped against the taller of the two stages rather
		 * than the current one — clamping per stage is what would reintroduce the
		 * jump, near the bottom of the window where it is least forgivable.
		 */
		const tallest = Math.max(scaledH, wideArt + BODY);
		const top = Math.min(
			Math.max(MARGIN, rect.top - (scaledH - rect.height) / 2),
			Math.max(MARGIN, window.innerHeight - tallest - MARGIN)
		);

		if (phase === 'seed') {
			return {
				left: rect.left,
				top: rect.top,
				width: rect.width,
				art: rect.height,
				duration: SCALE_MS
			};
		}

		if (phase === 'scale') {
			return { left: midX - scaledW / 2, top, width: scaledW, art: scaledH, duration: SCALE_MS };
		}

		return {
			// Outward from the same centre, so the growth is symmetrical — then
			// pulled back inside the window for the first and last of a row.
			left: Math.min(Math.max(MARGIN, midX - wideW / 2), window.innerWidth - wideW - MARGIN),
			top,
			width: wideW,
			art: wideArt,
			duration: WIDEN_MS
		};
	});

	// A poster that has scrolled away leaves this pointing at empty page.
	$effect(() => {
		if (!preview.open) return;

		const dismiss = () => preview.close();
		window.addEventListener('scroll', dismiss, { passive: true, capture: true });
		window.addEventListener('resize', dismiss, { passive: true });

		return () => {
			window.removeEventListener('scroll', dismiss, { capture: true });
			window.removeEventListener('resize', dismiss);
		};
	});
</script>

{#if item && box}
	<!--
		Not a dialog and not focus-trapped: it is a richer view of something
		already on the page, opened by a cursor resting rather than by intent.
		Everything in it is reachable from the poster itself.
	-->
	<div
		class="preview {phase}"
		style="left: {box.left}px; top: {box.top}px; width: {box.width}px; --dur: {box.duration}ms"
		onpointerenter={() => preview.hold()}
		onpointerleave={() => preview.leave()}
		role="group"
		aria-label={item.title}
	>
		<!--
			A div with a stretched link over it rather than one big anchor: the
			player inside draws a mute button, and a <button> inside an <a> is
			invalid. PosterCard split itself the same way for the same reason.
		-->
		<div class="art" data-type={item.type} style="height: {box.art}px">
			<!--
				Two images, crossfaded rather than swapped. The poster is what was
				on the page a moment ago and has to be the first thing drawn; the
				backdrop is the shape the frame is becoming. Changing the src
				would blink, and keeping both mounted means the trailer has
				artwork under it while YouTube paints.
			-->
			<img class="shot poster" src={item.poster} alt="" />
			{#if detail?.backdrop}
				<img class="shot back" src={detail.backdrop} alt="" />
			{/if}

			<div class="veil"></div>
			<a class="link" href={itemPath(item)} aria-label={item.title}></a>

			<!--
				Above the link, and transparent to the cursor apart from the
				speaker — so the artwork still goes to the title when clicked.
			-->
			{#if playing && detail?.trailer?.key}
				<div class="film">
					<Trailer item={{ ...item, ...detail }} fit="cover" loop autoplay />
				</div>
			{/if}
		</div>

		<div class="body">
			<!--
				One wrapper, because the 0fr → 1fr row below measures a single
				child. Separate children would all land on row 1 and stack.
			-->
			<div class="body-inner">
				<a class="title" href={itemPath(item)}>{item.title}</a>

				<p class="meta faint">
					{meta}{#if detail?.genres?.length}&nbsp;·&nbsp;{detail.genres.join(', ')}{/if}
				</p>

				{#if detail?.overview}
					<p class="overview">{detail.overview}</p>
				{/if}

				<!--
					Always here, signed in or not — the shelf buttons send a
					signed-out visitor to sign in when pressed, which is a better
					answer than hiding the reason they might want to.

					These stars are the rating you would give, not the average
					everyone else gave. The average lived here first and never
					appeared, because a catalog this young has no ratings in it:
					`{#if community.count}` is false for every title in the
					database, so the row it guarded was dead markup.
				-->
				<div class="actions"><QuickShelf {item} open /></div>
			</div>
		</div>
	</div>
{/if}

<style>
	/*
	 * `left`, `top` and `width` are not composited properties, and animating them
	 * is normally the wrong instinct — but this element is `fixed`, so it is out
	 * of flow and nothing on the page relayouts when they change. What it buys is
	 * a card that is genuinely the poster's box on its first frame, which
	 * `transform: scale` cannot be: scaling takes the text with it, and the whole
	 * point of the card is more words rather than bigger ones.
	 *
	 * --dur is set per stage, so the grow-in-place is brisk and the stretch that
	 * follows has time to be watched.
	 */
	.preview {
		position: fixed;
		z-index: 60;
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--surface);
		transition:
			left var(--dur) cubic-bezier(0.22, 0.7, 0.25, 1),
			top var(--dur) cubic-bezier(0.22, 0.7, 0.25, 1),
			width var(--dur) cubic-bezier(0.22, 0.7, 0.25, 1),
			border-radius var(--dur) ease,
			box-shadow var(--dur) ease;
	}

	/* Flat while it is still the poster; the shadow arrives with the motion. */
	.preview.seed {
		box-shadow: none;
	}

	.preview.scale,
	.preview.wide {
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-pop);
	}

	.art {
		position: relative;
		display: block;
		overflow: hidden;
		background: var(--surface-2);
		transition: height var(--dur) cubic-bezier(0.22, 0.7, 0.25, 1);
	}

	.shot {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: opacity 320ms ease;
	}

	/*
	 * The poster holds the frame until it has widened, then hands over. Both stay
	 * mounted: the backdrop underneath gives the crossfade something to arrive
	 * at, and the poster under the trailer means there is never a grey rectangle
	 * while the video loads.
	 */
	.poster {
		opacity: 1;
	}

	.wide .poster {
		opacity: 0;
	}

	.back {
		object-position: center 25%;
		opacity: 0;
	}

	.wide .back {
		opacity: 1;
	}

	/*
	 * Stacked over the link so the speaker inside is reachable, and transparent
	 * to the cursor so everything else falls through to it. The button puts
	 * `pointer-events: auto` back on itself.
	 */
	.film {
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		animation: fade 400ms ease;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	/* Fills the artwork; the whole picture is the link. */
	.link {
		position: absolute;
		inset: 0;
		z-index: 1;
	}

	/* Under both, so it darkens the stills without tinting the video. */
	.veil {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgb(10 13 22 / 0.5), transparent 42%);
		pointer-events: none;
	}

	/*
	 * The body grows open rather than fading in. Text appearing inside a box that
	 * is already the right size is the other thing that reads as a popup;
	 * 0fr → 1fr is the only way to transition to a height nobody has measured.
	 */
	.body {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows var(--dur) cubic-bezier(0.22, 0.7, 0.25, 1);
	}

	.wide .body {
		grid-template-rows: 1fr;
	}

	.body-inner {
		min-height: 0;
		overflow: hidden;
		opacity: 0;
		transition: opacity 220ms ease 120ms;
	}

	.wide .body-inner {
		opacity: 1;
	}

	.title {
		display: block;
		padding: 0.7rem 0.85rem 0;
		font-weight: 600;
		font-size: 1rem;
		line-height: 1.25;
	}

	.title:hover {
		color: var(--brand);
	}

	.meta {
		margin: 0.2rem 0 0;
		padding: 0 0.85rem;
		font-size: 0.78rem;
	}

	.overview {
		margin: 0.45rem 0 0;
		padding: 0 0.85rem;
		font-size: 0.82rem;
		line-height: 1.45;
		color: var(--muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/*
	 * Here the shelf row is a row in a panel rather than an overlay on artwork,
	 * so it drops the gradient it wears on a poster and lays out sideways: four
	 * icons at one end, the stars you would give at the other.
	 */
	.actions {
		position: relative;
		margin-top: 0.6rem;
		padding: 0 0.6rem 0.7rem;
		/*
		 * QuickShelf pins --star to the dark theme's brighter gold, because on a
		 * poster it has to survive whatever colour the artwork is. Down here it
		 * is on --surface, so the theme's own gold is the right one — and this
		 * is the only way to get it back: read it one level up, where the
		 * component's own declaration has not shadowed it yet, and hand it in.
		 */
		--panel-star: var(--star);
	}

	.actions :global(.quick) {
		--star: var(--panel-star);
		position: static;
		padding: 0;
		background: none;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		gap: 0.6rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.preview,
		.art,
		.shot,
		.body,
		.body-inner {
			transition: none;
		}

		.film {
			animation: none;
		}
	}

	/* Touch has no hovering, so there is nothing to rest and nothing to expand. */
	@media (hover: none) {
		.preview {
			display: none;
		}
	}
</style>
