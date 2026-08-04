<!--
	The top of the home page: what the crawler found that nobody can watch yet.
	The plate plays the trailer for whichever release is selected — muted and
	looping, because it is playing on its own — and the queue beside it picks
	the next one.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import Trailer from '$lib/components/Trailer.svelte';
	import { itemPath } from '$lib/data/items.js';
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

	$effect(() => {
		if (picked || releases.length < 2) return;
		picked = true;
		index = Math.floor(Math.random() * releases.length);
	});

	let current = $derived(releases[index] ?? null);
	let isNew = $derived(current ? library.isNewFor(session.user?.id, current) : false);
</script>

{#if current}
	<section class="hero frame" aria-label={t('hero.comingUp')}>
		<div class="stage" data-type={current.type}>
			<!--
				The still and the trailer share a wrapper so the fade can be
				applied to both at once — and only to them. Masking the stage
				itself would take the title and the buttons with it.
			-->
			<div class="media">
				<!-- The still is the poster frame the trailer starts over. -->
				<img class="plate" src={current.backdrop ?? current.poster} alt="" fetchpriority="high" />
				<Trailer item={current} fit="cover" loop autoplay />
			</div>
			<div class="veil"></div>

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
				<div class="actions">
					<a class="btn btn-accent" href={itemPath(current)}>
						<Icon name="right" size={14} />{t('hero.details')}
					</a>
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
					<span class="faint">{t('count.announced', { count: releases.length })}</span>
				</header>

				<ul>
					{#each releases as release, position (release.id)}
						<li>
							<button
								type="button"
								class:on={position === index}
								onclick={() => (index = position)}
								aria-current={position === index ? 'true' : undefined}
							>
								<img src={release.poster} alt="" loading="lazy" />
								<span class="text">
									<span class="name">{release.title}</span>
									<span class="date faint">{longDate(release.details.releaseDate)}</span>
								</span>
								{#if library.isNewFor(session.user?.id, release)}
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
		gap: 0.5rem;
		margin-top: 1rem;
	}

	/* The queue ---------------------------------------------------------- */

	.queue {
		position: relative;
		min-width: 0;
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

	/*
	 * A grid, not a column, so the queue uses the width it is given.
	 *
	 * On a wide screen the plate takes only as much as 16:9 needs and leaves
	 * several hundred pixels beside it — which used to be the hole in the page.
	 * auto-fill turns that into a second and third column of releases instead:
	 * one column at 19rem, two by about 40rem, three past 60rem. Nothing is
	 * hidden and nothing is stretched; there is simply more of the list where
	 * there is more room for it.
	 *
	 * dense packing because the rows are a fixed height and a gap in the flow
	 * would be more obvious than a title arriving one place earlier than its
	 * date order suggests.
	 */
	.queue ul {
		list-style: none;
		margin: 0;
		padding: 0 0.35rem 0 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
		grid-auto-rows: max-content;
		grid-auto-flow: row dense;
		gap: 0.2rem 0.5rem;
		flex: 1;
		min-height: 0;
		/*
		 * Scrollable, with nothing that looks like a scrollbar. A visible track
		 * down the side of a release queue makes it read as a widget with a
		 * hidden remainder; fading both ends says the same thing — there is
		 * more above and below — without drawing a control for it. The wheel
		 * and a finger still work.
		 */
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		mask-image: linear-gradient(to bottom, transparent, #000 3%, #000 94%, transparent);
	}

	.queue ul::-webkit-scrollbar {
		display: none;
	}

	/*
	 * A container, so a row's poster can be sized against the column it is in
	 * rather than against the viewport — see `.queue img`.
	 */
	.queue li {
		container-type: inline-size;
	}

	.queue button {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		width: 100%;
		padding: 0.4rem 0.5rem;
		border: 0;
		border-left: 2px solid transparent;
		border-radius: var(--radius-sm);
		background: none;
		text-align: left;
		cursor: pointer;
		transition:
			background 0.18s ease,
			border-color 0.18s ease;
	}

	.queue button:hover {
		background: var(--tint);
	}

	.queue button.on {
		background: var(--tint);
		border-left-color: var(--brand);
	}

	/*
	 * Posters big enough to recognise. At 1.9rem these were thumbnails you
	 * could not tell apart, on the one list whose whole job is to make you
	 * want to look at something.
	 *
	 * Sized against the row rather than fixed, because the queue is a grid now
	 * and its columns are wide where the screen is: a poster that suits a
	 * 19rem single column is lost in a 20rem one at the other end. The cap
	 * stops a row growing taller than the text beside it needs.
	 */
	.queue img {
		width: clamp(3.25rem, 24cqw, 5.25rem);
		aspect-ratio: 2 / 3;
		object-fit: cover;
		border-radius: 3px;
		flex: none;
	}

	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
		line-height: 1.3;
	}

	.name {
		font-size: 0.84rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.date {
		font-size: 0.72rem;
	}

	.dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: var(--new);
		flex: none;
	}

	@media (max-width: 900px) {
		.hero {
			grid-template-columns: minmax(0, 1fr);
		}

		/*
		 * Still 16:9 on a phone — the whole frame, same as everywhere else. The
		 * override that used to be here reshaped it, and reshaping is what
		 * crops.
		 */
		.stage {
			aspect-ratio: 16 / 9;
		}

		/* Back in flow below the plate, running sideways instead. */
		.queue-inner {
			position: static;
		}

		.queue ul {
			flex-direction: row;
			overflow-x: auto;
			overflow-y: hidden;
			gap: 0.4rem;
			padding-right: 0;
			mask-image: linear-gradient(to right, #000 calc(100% - 2.5rem), transparent);
		}

		.queue button {
			width: auto;
			border-left: 0;
			border-bottom: 2px solid transparent;
		}

		.queue button.on {
			border-bottom-color: var(--brand);
		}

		.name {
			max-width: 9rem;
		}
	}
</style>
