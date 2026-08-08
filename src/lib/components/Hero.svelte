<!--
	The top of the home page: what the crawler found that nobody can watch yet.
	The plate plays the trailer for whichever release is selected — muted,
	because it is playing on its own — and the queue beside it picks the next
	one.

	It used to loop one trailer forever. A queue of a dozen announcements
	sitting next to a plate replaying the same ninety seconds is a list nobody
	has a reason to look at, so the plate now works through them: when a trailer
	ends the next one starts, and the queue highlight follows it.
-->
<script>
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import Trailer from '$lib/components/Trailer.svelte';
	import { itemPath } from '$lib/data/items.js';
	import { statusLabel } from '$lib/data/types.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { list, longDate, untilRelease } from '$lib/util/format.js';

	let { releases = [] } = $props();

	/*
	 * Which release the plate opens on. Random rather than the first, so the
	 * page is not the same page every visit — the queue holds a dozen or more
	 * announcements and the top one was the only one anybody ever saw.
	 *
	 * Seeded in an effect rather than inline because the server and the browser
	 * would roll different numbers and the hydration would not match. The
	 * server renders the first, the browser picks one; that is one frame of the
	 * first release, and it costs nothing.
	 */
	let index = $state(0);
	let picked = false;

	/*
	 * Which of them can actually take a turn. Not every announcement has a
	 * trailer cut yet, and one that has none shows a still and never ends —
	 * so it is never auto-selected and never advanced to. Clicking it in the
	 * queue still works; the plate simply stays on it, which is what choosing
	 * it meant.
	 */
	let playable = $derived(
		releases.map((release, position) => (release?.trailer?.key ? position : -1)).filter((p) => p >= 0)
	);

	$effect(() => {
		if (picked || releases.length < 2) return;
		picked = true;
		const pool = playable.length ? playable : releases.map((_, position) => position);
		index = pool[Math.floor(Math.random() * pool.length)];
	});

	/** The next one with a trailer, wrapping. */
	function advance() {
		if (playable.length < 2) return;
		index = playable.find((position) => position > index) ?? playable[0];
	}

	let current = $derived(releases[index] ?? null);
	let isNew = $derived(current?.isNew === true);

	let entry = $derived(
		session.user && current ? library.entryFor(session.user.id, current.id) : null
	);
	let saved = $derived(entry?.status === 'wishlist');

	/*
	 * Wishlist and nothing else. Everything on this rail is unreleased, so the
	 * other three shelves would be offering to record something that cannot
	 * have happened — the same rule QuickShelf applies over a poster.
	 */
	function watchlist() {
		if (!session.user) return goto('/login');
		library.setStatus(session.user.id, current, saved ? null : 'wishlist');
	}
</script>

{#if current}
	<section class="hero frame" aria-label={t('hero.comingUp')}>
		<!--
			The plate and the copy are siblings rather than parent and child so a
			phone can put the copy underneath. Overlaid on a 16:9 box 220px tall,
			a two-line title and a button had nowhere to go — see the media query.
		-->
		<div class="feature" data-type={current.type}>
			<div class="stage">
				<!--
					The still and the trailer share a wrapper so the fade can be
					applied to both at once — and only to them. Masking the stage
					itself would take the title and the buttons with it.
				-->
				<div class="media">
					<!-- The still is the poster frame the trailer starts over. -->
					<img class="plate" src={current.backdrop ?? current.poster} alt="" fetchpriority="high" />
					<!--
						Looping only when there is nothing to advance *to*. One
						trailer that stops dead on its last frame is worse than
						one that repeats; several that repeat is the thing this
						replaced.
					-->
					<Trailer
						item={current}
						fit="cover"
						autoplay
						loop={playable.length < 2}
						onended={advance}
					/>
				</div>
				<div class="veil"></div>
			</div>

			<div class="stage-body">
				<div class="labels">
					<span class="tag">
						<Icon name="calendar" size={12} />
						{untilRelease(current.details.releaseDate)}
					</span>
					{#if isNew}<span class="tag new">{t('common.new')}</span>{/if}
				</div>

				<h1 class="display">{current.title}</h1>

				<p class="meta">
					{list(current.genres, 2)}{#if current.details.directors?.length}
						· {list(current.details.directors, 1)}{/if}
				</p>

				<!--
					The "Trailer, muted" note that used to sit beside this is gone:
					the player draws its own speaker now, which says the same thing
					and can be pressed to change it.
				-->
				<!--
					Two actions, because the plate is where somebody decides they
					want this — and making them open the page to say so is the
					navigation the shelf buttons on a poster exist to avoid.
				-->
				<div class="actions">
					<a class="btn btn-accent" href={itemPath(current)}>
						<Icon name="right" size={14} />{t('hero.details')}
					</a>
					<button type="button" class="btn save" class:on={saved} aria-pressed={saved} onclick={watchlist}>
						<Icon name={saved ? 'check' : 'bookmark'} size={14} />
						{statusLabel(current.type, 'wishlist')}
					</button>
				</div>
			</div>
		</div>

		<aside class="queue">
			<!--
				Absolutely positioned so the queue takes its height from the plate
				beside it instead of setting the row height itself. Thirteen
				announcements are twice as tall as the plate, and the difference
				was showing up as dead space under it.
			-->
			<div class="queue-inner">
				<header>
					<span class="eyebrow">{t('hero.comingUp')}</span>
					<!--
						No count any more. What arrives here is forty drawn at random
						from the most popular of eight hundred-odd, so "40 announced"
						was reporting the size of the sample as the size of the thing.
					-->
					<a class="see-all" href="/search?release=upcoming">
						{t('common.seeAll')}<Icon name="right" size={13} />
					</a>
				</header>

				<ul>
					{#each releases as release, position (release.id)}
						<li>
							<button
								type="button"
								class:on={position === index}
								onclick={() => (index = position)}
								aria-current={position === index ? 'true' : undefined}
								title={release.title}
							>
								<img src={release.poster} alt="" loading="lazy" />
								<span class="text">
									<span class="name">{release.title}</span>
									<span class="date faint">{longDate(release.details.releaseDate)}</span>
								</span>
								{#if release.isNew}
									<span class="dot" aria-label={t('common.new')}></span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		</aside>
	</section>
{/if}

<style>
	/*
	 * The plate is sized by its height and the queue takes the rest.
	 *
	 * `auto` rather than `1fr` for the first column: the plate's width is not a
	 * share of the row, it is whatever 16:9 makes of its height. Letting a 1fr
	 * column decide the width instead is what forced the choice between a
	 * cropped plate and an enormous one — the ratio was being driven by however
	 * wide the screen happened to be.
	 *
	 * The queue then gets everything left over, which on a wide screen is a lot,
	 * and it has been given something to do with it. See `.queue ul`.
	 */
	.hero {
		display: grid;
		grid-template-columns: auto minmax(19rem, 1fr);
		gap: clamp(1rem, 1.6vw, 1.75rem);
		padding-top: clamp(1rem, 3vw, 1.75rem);
	}

	/* The plate ---------------------------------------------------------- */

	/*
	 * What the copy is positioned against. Its width comes from the stage
	 * inside it, so the `auto` grid column above still resolves to 16:9.
	 */
	.feature {
		position: relative;
		min-width: 0;
	}

	/*
	 * Height first: with `aspect-ratio` alongside it the width follows, which is
	 * what lets the grid column above be `auto`. Nothing is cropped because the
	 * box is the shape of the thing inside it.
	 */
	.stage {
		position: relative;
		height: clamp(12rem, 34vw, 38rem);
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--surface-2);
	}

	/*
	 * No mask. The fade was an attempt to stop a full-bleed plate looking like a
	 * component pasted on the page, and it made the video look letterboxed
	 * instead — dissolving the edges of a picture is only free when there is no
	 * picture near them, and on a 16:9 trailer there always is. A corner radius
	 * does the same job without touching the image.
	 */
	.media {
		position: absolute;
		inset: 0;
	}

	.plate {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 22%;
	}

	/* The darkening the title sits on. Decoration, so it never eats a click —
	   the player's speaker button is underneath it in DOM order. */
	.veil {
		position: absolute;
		inset: 0;
		background:
			var(--veil-gradient),
			linear-gradient(to right, rgb(8 10 15 / 0.8), transparent 60%);
		pointer-events: none;
	}

	.stage-body {
		position: absolute;
		left: clamp(1.1rem, 3vw, 2.25rem);
		right: clamp(1.1rem, 3vw, 2.25rem);
		bottom: clamp(1.1rem, 3vw, 1.9rem);
		color: var(--on-image);
	}

	.labels {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.6rem;
		border-radius: 99px;
		background: var(--veil);
		backdrop-filter: blur(6px);
		font-size: 0.74rem;
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	.tag.new {
		background: var(--new);
		color: #fff;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	h1 {
		font-size: clamp(2rem, 5vw, 3.6rem);
		text-wrap: balance;
		max-width: 20ch;
	}

	.meta {
		margin: 0.35rem 0 0;
		font-size: 0.88rem;
		opacity: 0.82;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	/*
	 * Sits on artwork, so it carries its own translucent plate rather than the
	 * theme surface — a light-theme button over a dark backdrop is a white slab
	 * in the middle of a photograph.
	 */
	.save {
		border-color: rgb(255 255 255 / 0.28);
		background: rgb(10 12 20 / 0.45);
		color: #fff;
		backdrop-filter: blur(6px);
	}

	.save:hover {
		border-color: rgb(255 255 255 / 0.5);
		background: rgb(10 12 20 / 0.62);
	}

	/* Already saved: stated, not shouted. It is a thing that is true, not a
	   thing to press again. */
	.save.on {
		border-color: color-mix(in srgb, var(--brand) 70%, transparent);
		background: color-mix(in srgb, var(--brand) 55%, rgb(10 12 20 / 0.5));
	}

	/* The queue ---------------------------------------------------------- */

	/*
	 * A container, so the grid inside can be sized against this column rather
	 * than against the viewport. That distinction is the whole fix: this column
	 * is what the plate leaves over, and how much that is does not track the
	 * screen width at all. A 1440px laptop leaves it *less* room than a 1280px
	 * one, because the plate's height clamp grows faster than the page does.
	 */
	.queue {
		position: relative;
		min-width: 0;
		container-type: inline-size;
	}

	.queue-inner {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.queue header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0 0.3rem 0.6rem;
		font-size: 0.78rem;
	}

	.see-all {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		color: var(--muted);
		font-weight: 500;
		white-space: nowrap;
	}

	.see-all:hover {
		color: var(--brand);
	}

	/*
	 * A wall of posters, not a list of rows — and the number of columns is set
	 * per band rather than by auto-fill.
	 *
	 * auto-fill was the trouble. It sizes columns to a minimum in rem, so this
	 * column got two of them only past about 1850px and one everywhere below:
	 * a 400px-wide box, 435px tall, showing three of thirteen releases behind a
	 * fade. Explicit counts against the container's own width give four columns
	 * on a laptop and six on a large monitor, so somewhere between six and all
	 * thirteen are on screen at every size instead of three.
	 *
	 * Posters end up 84–100px wide — the same size the old rows capped at, so
	 * nothing became harder to recognise. There are simply four of them across
	 * where there used to be one.
	 */
	.queue ul {
		list-style: none;
		margin: 0;
		padding: 0 0.35rem 0 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-auto-rows: max-content;
		align-items: start;
		gap: 0.9rem 0.7rem;
		flex: 1;
		min-height: 0;
		/*
		 * Scrollable, with nothing that looks like a scrollbar. A visible track
		 * down the side of a release queue makes it read as a widget with a
		 * hidden remainder. The wheel and a finger still work.
		 *
		 * No fade at the ends either. It was here to say "there is more below"
		 * without drawing a control for it, and on a grid of posters it read as
		 * the artwork itself being faded out — a poster is the one thing on this
		 * page that should never be half-transparent.
		 */
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.queue ul::-webkit-scrollbar {
		display: none;
	}

	/* Measured against `.queue`, which is the leftover column — not the screen. */
	@container (min-width: 14rem) {
		.queue ul {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@container (min-width: 18rem) {
		.queue ul {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	@container (min-width: 28rem) {
		.queue ul {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
	}

	@container (min-width: 36rem) {
		.queue ul {
			grid-template-columns: repeat(6, minmax(0, 1fr));
		}
	}

	@container (min-width: 44rem) {
		.queue ul {
			grid-template-columns: repeat(7, minmax(0, 1fr));
		}
	}

	.queue button {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		width: 100%;
		padding: 0;
		border: 0;
		background: none;
		text-align: left;
		cursor: pointer;
	}

	/*
	 * The poster is the whole card. Lifting it on hover rather than tinting a
	 * row behind it: there is no row any more, and the same lift is what the
	 * poster wall further down the page does.
	 */
	.queue img {
		width: 100%;
		aspect-ratio: 2 / 3;
		object-fit: cover;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		transition:
			transform 0.2s cubic-bezier(0.2, 0.7, 0.3, 1),
			box-shadow 0.2s ease;
	}

	.queue button:hover img,
	.queue button:focus-visible img {
		transform: translateY(-4px);
		box-shadow: var(--shadow-lift);
	}

	/*
	 * Which one is on the plate. An outline rather than a fill, because the
	 * artwork is what is being marked and a border would crop it.
	 */
	.queue button.on img {
		outline: 2px solid var(--brand);
		outline-offset: 2px;
	}

	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.3;
	}

	/*
	 * One line. In a 90px column a title is a hint rather than a label — the
	 * poster does the recognising and the plate spells out whichever one is
	 * selected — so it truncates instead of wrapping and pushing the grid about.
	 * The full title is on the button's `title`.
	 */
	.name {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.queue button.on .name {
		color: var(--ink);
		font-weight: 600;
	}

	.date {
		font-size: 0.68rem;
	}

	/* On the artwork now that the card is a column — a row has an end, a card has a corner. */
	.dot {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--new);
		box-shadow: 0 0 0 2px rgb(8 10 15 / 0.55);
	}

	/* ---- one column, and the queue on its side --------------------------- */

	@media (max-width: 900px) {
		.hero {
			grid-template-columns: minmax(0, 1fr);
		}

		/*
		 * Still 16:9 on a phone — the whole frame, same as everywhere else. The
		 * override that used to be here reshaped it, and reshaping is what
		 * crops. Full width now rather than sized from a height clamp, which
		 * left a ragged strip of page beside it on a narrow screen.
		 */
		.stage {
			width: 100%;
			height: auto;
			aspect-ratio: 16 / 9;
		}

		/* Back in flow below the plate, running sideways instead. */
		.queue-inner {
			position: static;
		}

		/*
		 * The same cards, laid end to end instead of wrapped. There is no room
		 * beside the plate down here, so the wall turns into one row that
		 * scrolls — which is what every other rail on this page does, and the
		 * cards themselves need no changes to do it.
		 *
		 * Written after the @container rules on purpose: they and this have the
		 * same specificity, so source order is what decides, and here the rail
		 * has to win.
		 */
		.queue ul {
			grid-template-columns: none;
			grid-auto-flow: column;
			grid-auto-columns: 6.5rem;
			grid-auto-rows: auto;
			gap: 0.8rem;
			padding: 0.25rem 0 0.3rem;
			overflow-x: auto;
			overflow-y: hidden;
			overscroll-behavior-x: contain;
			scroll-snap-type: x proximity;
		}

		.queue li {
			scroll-snap-align: start;
		}

		/* A finger scrolls the rail; there is nothing to lift out of the way of. */
		.queue button:hover img,
		.queue button:focus-visible img {
			transform: none;
			box-shadow: none;
		}
	}

	/* ---- the copy comes out from under the plate ------------------------- */

	/*
	 * A phone's plate is about 220px tall, and a title, a genre line, two tags
	 * and a button do not fit inside that — they were overlapping the picture
	 * and each other. Below it there is as much room as the copy needs, and the
	 * plate goes back to being only a plate.
	 */
	@media (max-width: 700px) {
		.stage-body {
			position: static;
			padding: 0.9rem 0.15rem 0;
			color: var(--ink);
		}

		/* Nothing is over the picture any more, so nothing needs darkening. */
		.veil {
			display: none;
		}

		.tag {
			background: var(--tint-strong);
			backdrop-filter: none;
			color: var(--muted);
		}

		.tag.new {
			background: var(--new);
			color: #fff;
		}

		h1 {
			font-size: clamp(1.5rem, 7vw, 2.1rem);
			max-width: none;
		}

		.meta {
			opacity: 1;
			color: var(--muted);
		}

		.actions {
			margin-top: 0.85rem;
		}

		/* Off the artwork and onto the page, so it goes back to being an
		   ordinary button — the same move .tag makes just above. */
		.save {
			border-color: var(--line-strong);
			background: var(--surface-2);
			color: var(--ink);
			backdrop-filter: none;
		}

		.save:hover {
			background: var(--tint-strong);
		}

		.save.on {
			border-color: var(--brand);
			background: var(--brand);
			color: var(--on-accent);
		}
	}
</style>
