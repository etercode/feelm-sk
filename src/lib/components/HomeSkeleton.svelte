<!--
	What the home page looks like before it has anything to show.

	It used to be the words "Loading catalog…" on an otherwise empty page, which
	is the least a film app can put on its front door — and it also meant the
	whole layout arrived at once and shoved nothing into place, so the first
	thing anybody saw was a jump.

	This draws the page's own shape instead: the plate, the release queue beside
	it, and the poster wall under both, at the sizes the real ones will take. It
	is rendered on the server too, so it is in the first HTML rather than
	something the browser has to get to.

	The one flourish is the sweep. Each block is lit a beat after the one to its
	left, so the highlight travels across the wall rather than every tile
	pulsing together — a strip being pulled through a gate, which is the one
	piece of the subject's own machinery that suits a wait.
-->
<script>
	import { t } from '$lib/i18n/index.svelte.js';

	/** Wide enough to fill the widest wall; the grid drops the overflow. */
	const posters = Array.from({ length: 14 }, (_, index) => index);
	/** Likewise — the queue is clipped to the height of the plate beside it. */
	const queue = Array.from({ length: 16 }, (_, index) => index);
	const rails = [0, 1];
</script>

<!--
	Announced once, politely. Everything below is decoration and hidden, so a
	screen reader gets a sentence rather than a description of forty rectangles.
-->
<div class="frame skeleton" aria-busy="true">
	<p class="sr-only" role="status">{t('home.loadingCatalog')}</p>

	<div class="hero" aria-hidden="true">
		<div class="stage bone"></div>

		<div class="queue">
			<div class="bone line eyebrow-line" style="--lag: 60ms"></div>

			<div class="tiles">
				{#each queue as tile (tile)}
					<div class="cell" style="--lag: {tile * 60}ms">
						<div class="bone poster"></div>
						<div class="bone line"></div>
						<div class="bone line short"></div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	{#each rails as rail (rail)}
		<div class="rail" aria-hidden="true">
			<div class="bone line eyebrow-line"></div>
			<div class="bone line title-line"></div>

			<div class="grid-posters">
				{#each posters as index (index)}
					<div class="cell" style="--lag: {(index % 7) * 80 + rail * 120}ms">
						<div class="bone poster"></div>
						<div class="bone line"></div>
						<div class="bone line short"></div>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.skeleton {
		padding-top: clamp(1rem, 3vw, 1.75rem);
		padding-bottom: 4rem;
	}

	/*
	 * Every placeholder is one of these. The sweep is a child rather than a
	 * moving background-position so the gradient keeps its angle at any width —
	 * a poster and a one-line caption otherwise get very different diagonals.
	 */
	.bone {
		position: relative;
		overflow: hidden;
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.bone::after {
		content: '';
		position: absolute;
		inset: 0;
		/* Tokens, not a white alpha — this has to read on paper and in the dark. */
		background: linear-gradient(100deg, transparent 30%, var(--surface-3) 50%, transparent 70%);
		transform: translateX(-100%);
		animation: sweep 1.9s ease-in-out infinite;
		animation-delay: var(--lag, 0ms);
	}

	@keyframes sweep {
		to {
			transform: translateX(100%);
		}
	}

	/*
	 * app.css collapses every animation under prefers-reduced-motion, which
	 * would leave the sweep frozen mid-tile as a permanent bright stripe. Better
	 * to have no sweep at all: the layout alone still says what is coming.
	 */
	@media (prefers-reduced-motion: reduce) {
		.bone::after {
			display: none;
		}
	}

	/* ---- the plate and the queue, matching Hero ------------------------- */

	.hero {
		display: grid;
		grid-template-columns: auto minmax(19rem, 1fr);
		gap: clamp(1rem, 1.6vw, 1.75rem);
	}

	.stage {
		height: clamp(12rem, 34vw, 38rem);
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-lg);
	}

	/*
	 * Height taken from the plate rather than from its own contents, exactly as
	 * the real queue takes it — so the row is the plate's height and the cards
	 * that do not fit are clipped instead of stretching the page.
	 *
	 * A container for the same reason Hero's queue is one: the columns below
	 * are sized against this box, and it has to break at the same widths or the
	 * skeleton would promise a layout the real page does not deliver.
	 */
	.queue {
		display: flex;
		flex-direction: column;
		height: clamp(12rem, 34vw, 38rem);
		min-width: 0;
		overflow: hidden;
		container-type: inline-size;
		mask-image: linear-gradient(to bottom, #000 82%, transparent);
	}

	.tiles {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-auto-rows: max-content;
		align-items: start;
		gap: 0.9rem 0.7rem;
		min-height: 0;
	}

	/* The same five bands as Hero. */
	@container (min-width: 14rem) {
		.tiles {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@container (min-width: 18rem) {
		.tiles {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	@container (min-width: 28rem) {
		.tiles {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
	}

	@container (min-width: 36rem) {
		.tiles {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}

	@container (min-width: 44rem) {
		.tiles {
			grid-template-columns: repeat(7, minmax(0, 1fr));
		}
	}

	/* ---- the walls ------------------------------------------------------ */

	.rail {
		margin-top: clamp(2rem, 4vw, 3rem);
	}

	.cell {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.poster {
		aspect-ratio: 2 / 3;
		border-radius: var(--radius);
	}

	.line {
		height: 0.7rem;
		border-radius: 99px;
	}

	.line.short {
		width: 55%;
	}

	.eyebrow-line {
		width: 6rem;
		height: 0.6rem;
		margin-bottom: 0.5rem;
	}

	/* Sized like the serif headings it stands in for, so nothing shifts. */
	.title-line {
		width: min(18rem, 60%);
		height: clamp(1.6rem, 3vw, 2.2rem);
		border-radius: var(--radius-sm);
		margin-bottom: 1.25rem;
	}

	@media (max-width: 900px) {
		.hero {
			grid-template-columns: minmax(0, 1fr);
		}

		.stage {
			width: 100%;
			height: auto;
		}

		/* The queue is a sideways rail down here — see Hero's own media query. */
		.queue {
			height: auto;
			mask-image: linear-gradient(to right, #000 calc(100% - 2rem), transparent);
		}

		.queue .eyebrow-line {
			display: none;
		}

		.tiles {
			grid-template-columns: none;
			grid-auto-flow: column;
			grid-auto-columns: 6.5rem;
			grid-auto-rows: auto;
			gap: 0.8rem;
			overflow: hidden;
		}
	}
</style>
