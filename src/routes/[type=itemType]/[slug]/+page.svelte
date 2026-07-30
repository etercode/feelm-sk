<!--
	One page for every activity type. The shared frame — artwork, scores, shelf,
	reviews — is the same everywhere; what changes is the block in the middle and
	the facts in the sidebar, both driven by the type registry in
	$lib/data/types.js.
-->
<script>
	import Avatar from '$lib/components/Avatar.svelte';
	import CastRail from '$lib/components/CastRail.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import Rail from '$lib/components/Rail.svelte';
	import ReviewCard from '$lib/components/ReviewCard.svelte';
	import ReviewEditor from '$lib/components/ReviewEditor.svelte';
	import SeasonBrowser from '$lib/components/SeasonBrowser.svelte';
	import ShelfControls from '$lib/components/ShelfControls.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import Trailer from '$lib/components/Trailer.svelte';
	import { externalRatings, isUpcoming, itemPath } from '$lib/data/items.js';
	import { facetsOf, lineOf, progressLabel, statusLabel, typeOf } from '$lib/data/types.js';
	import { catalog } from '$lib/state/catalog.svelte.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { compactNumber, longDate, plural, untilRelease } from '$lib/util/format.js';
	import { untrack } from 'svelte';

	let { data } = $props();

	let item = $derived(data.item);
	let spec = $derived(typeOf(item));
	let facets = $derived(facetsOf(item));
	let parts = $derived(catalog.collectionOf(item));
	let unreleased = $derived(isUpcoming(item));
	let outside = $derived(externalRatings(item));

	let rating = $derived(library.ratingOf(item.id));
	let reviews = $derived(library.reviewsForItem(item.id));
	let others = $derived(reviews.filter((review) => review.userId !== session.user?.id));
	let shelved = $derived(library.entriesForItem(item.id));

	// Opening the page is what clears its NEW badge; also pull community reviews.
	$effect(() => {
		const current = item;
		const userId = session.user?.id;
		if (userId) untrack(() => library.markSeen(userId, current.id));
		void library.loadItemReviews(current);
	});
</script>

<svelte:head>
	<title>{item.title} — Feelm</title>
	<meta name="description" content={item.overview ?? item.title} />
</svelte:head>

<article data-type={item.type}>
	<div class="frame">
		<!-- The artwork lives inside its own panel, so the page around it stays paper. -->
		<header class="banner">
			<div class="plate" class:blurred={!item.backdrop}>
				<img src={item.backdrop ?? item.poster} alt="" fetchpriority="high" />
			</div>
			<div class="veil"></div>

			<div class="head">
				<div class="poster">
					<img src={item.poster} alt={item.title} />
				</div>

				<div class="intro">
					<div class="kind">
						<span class="tag"><Icon name={item.type} size={12} />{spec.label}</span>
						{#if unreleased}
							<span class="tag soon">
								<Icon name="calendar" size={11} />
								{untilRelease(item.details.releaseDate)}
							</span>
						{/if}
						{#if item.details.collection}
							<span class="tag quiet">
								{item.details.collection.name} · part {item.details.collection.part} of {item.details
									.collection.total}
							</span>
						{/if}
					</div>

					<h1 class="display">{item.title}</h1>

					{#if item.tagline}<p class="tagline">“{item.tagline}”</p>{/if}

					<p class="facts">
						{lineOf(item).join('  ·  ')}
						{#if item.genres.length}&nbsp; · &nbsp;{item.genres.slice(0, 3).join(', ')}{/if}
					</p>

					<div class="actions">
						{#if outside.length}
							{#each outside as rating (rating.source)}
								<a
									class="btn on-image"
									href={rating.href ?? item.source.url}
									target="_blank"
									rel="noreferrer noopener"
								>
									{rating.label}
									<strong>{rating.value}</strong>
									{#if rating.votes}
										<span class="votes">{compactNumber(rating.votes)} votes</span>
									{/if}
									<Icon name="external" size={13} />
								</a>
							{/each}
						{:else}
							<a
								class="btn on-image"
								href={item.source.url}
								target="_blank"
								rel="noreferrer noopener"
							>
								{item.source.name}<Icon name="external" size={13} />
							</a>
						{/if}
					</div>
				</div>
			</div>
		</header>
	</div>

	<div class="frame layout">
		<div class="main">
			{#if item.trailer}
				<section class="trailer">
					<Trailer {item} />
				</section>
			{/if}

			<!-- Your shelf, on paper rather than on top of the poster. -->
			<section class="shelf-bar card">
				<div class="community">
					{#if rating.count}
						<span class="big display">{rating.average}</span>
						<span class="stack-lines">
							<Stars value={rating.average} size={15} />
							<span class="faint">{plural(rating.count, 'rating')} here</span>
						</span>
					{:else}
						<span class="faint">
							{unreleased ? 'Nobody can rate this yet.' : 'No ratings here yet — be the first.'}
						</span>
					{/if}
				</div>
				<ShelfControls {item} />
			</section>

			{#if unreleased}
				<p class="release-note">
					<Icon name="calendar" size={15} />
					Out {longDate(item.details.releaseDate)} — {untilRelease(item.details.releaseDate)}.
				</p>
			{/if}

			{#if item.overview}
				<section class="overview">
					{#each item.overview.split('\n\n') as paragraph}
						<p>{paragraph}</p>
					{/each}
				</section>
			{/if}

			<!-- The type-specific middle. Everything else on this page is shared. -->
			{#if item.type === 'series'}
				<SeasonBrowser {item} />
				<CastRail cast={item.details.cast} />
			{:else if item.type === 'game'}
				<Gallery shots={item.details.screenshots} />
				{#if item.details.features?.length}
					<section class="features">
						<h2 class="display">On the store page</h2>
						<div class="chips">
							{#each item.details.features as feature}<span class="chip">{feature}</span>{/each}
						</div>
					</section>
				{/if}
			{:else if item.type === 'movie'}
				<CastRail cast={item.details.cast} />
			{/if}

			{#if parts.length > 1}
				<section class="parts">
					<h2 class="display">{item.details.collection.name}</h2>
					<div class="part-row">
						{#each parts as part (part.id)}
							<a
								class="part"
								class:current={part.id === item.id}
								href={itemPath(part)}
								aria-current={part.id === item.id ? 'page' : undefined}
							>
								<img src={part.poster} alt="" loading="lazy" />
								<span class="no">{part.details.collection.part}</span>
								<span class="name">{part.title}</span>
							</a>
						{/each}
					</div>
				</section>
			{/if}

			<section class="reviews">
				<h2 class="display">Reviews <span class="faint count">{reviews.length}</span></h2>
				<p class="rule faint">One review each — edit it whenever you change your mind.</p>

				<ReviewEditor {item} />

				<div class="review-list">
					{#each others as review (review.id)}
						<ReviewCard {review} />
					{:else}
						{#if !reviews.length}
							<p class="muted empty">Nobody has written about this yet.</p>
						{/if}
					{/each}
				</div>
			</section>
		</div>

		<aside>
			<section class="facts-card card">
				<h2 class="eyebrow">Details</h2>
				<dl>
					{#each facets as facet (facet.label)}
						<div>
							<dt>{facet.label}</dt>
							<dd>
								{#if facet.chips}
									<span class="chips">
										{#each facet.chips as chip}<span class="chip">{chip}</span>{/each}
									</span>
								{:else}
									{facet.value}
								{/if}
							</dd>
						</div>
					{/each}
				</dl>
			</section>

			{#if shelved.length}
				<section class="who card">
					<h2 class="eyebrow">On {plural(shelved.length, 'shelf', 'shelves')}</h2>
					<ul>
						{#each shelved as entry (entry.id)}
							{@const person = library.userById(entry.userId)}
							{#if person}
								<li>
									<a href="/u/{person.username}">
										<Avatar user={person} size={30} />
										<span class="name">{person.name}</span>
									</a>
									<span class="state">
										{#if entry.rating}<Stars value={entry.rating} size={12} />{/if}
										<span class="faint">
											{entry.progress
												? progressLabel(item, entry.progress)
												: statusLabel(item.type, entry.status)}
										</span>
									</span>
								</li>
							{/if}
						{/each}
					</ul>
				</section>
			{/if}
		</aside>
	</div>

	{#if data.related.length}
		<div class="frame">
			<Rail title="If you liked this" kicker={spec.plural} type={item.type}>
				{#each data.related as other (other.id)}
					<PosterCard item={other} width="clamp(8.5rem, 13vw, 11rem)" />
				{/each}
			</Rail>
		</div>
	{/if}
</article>

<style>
	/* Banner ------------------------------------------------------------ */

	.banner {
		position: relative;
		margin-top: clamp(1rem, 3vw, 1.75rem);
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--surface-2);
		box-shadow: var(--shadow-card);
	}

	.plate {
		position: absolute;
		inset: 0;
	}

	.plate img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 25%;
	}

	/* Books have no backdrop, so their cover stands in, blown up and blurred. */
	.plate.blurred img {
		filter: blur(38px) saturate(1.3);
		transform: scale(1.25);
	}

	.veil {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to top, rgb(8 10 15 / 0.92), rgb(8 10 15 / 0.55) 60%, rgb(8 10 15 / 0.35)),
			linear-gradient(to right, rgb(8 10 15 / 0.75), transparent 70%);
	}

	.head {
		position: relative;
		display: flex;
		align-items: flex-end;
		gap: clamp(1rem, 3vw, 2rem);
		padding: clamp(1.25rem, 4vw, 2.5rem);
		color: var(--on-image);
	}

	.poster {
		flex: none;
		width: clamp(7rem, 14vw, 11rem);
		aspect-ratio: 2 / 3;
		border-radius: var(--radius);
		overflow: hidden;
		box-shadow: 0 20px 40px -20px rgb(0 0 0 / 0.8);
	}

	.poster img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.intro {
		flex: 1;
		min-width: 0;
	}

	.kind {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.15rem 0.55rem;
		border-radius: 99px;
		background: rgb(255 255 255 / 0.16);
		backdrop-filter: blur(6px);
		font-size: 0.74rem;
		font-weight: 600;
	}

	.tag.soon {
		background: var(--new);
		color: #fff;
	}

	.tag.quiet {
		background: none;
		font-weight: 400;
		opacity: 0.75;
		padding-inline: 0.1rem;
	}

	h1 {
		font-size: clamp(2rem, 5vw, 3.8rem);
		margin: 0.5rem 0 0;
		text-wrap: balance;
	}

	.tagline {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(1rem, 2vw, 1.35rem);
		opacity: 0.85;
		margin: 0.35rem 0 0;
	}

	.facts {
		margin: 0.6rem 0 0;
		font-size: 0.88rem;
		opacity: 0.8;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1.1rem;
	}

	.on-image {
		background: rgb(255 255 255 / 0.14);
		border-color: rgb(255 255 255 / 0.35);
		color: var(--on-image);
		backdrop-filter: blur(6px);
	}

	.votes {
		opacity: 0.7;
		font-size: 0.8rem;
	}

	.on-image:hover {
		background: rgb(255 255 255 / 0.25);
	}

	/* Body -------------------------------------------------------------- */

	.layout {
		display: grid;
		/* minmax(0, …) everywhere: an auto minimum lets a wide child (the cast
		   rail, a screenshot strip) stretch the column past the viewport. */
		grid-template-columns: minmax(0, 1fr) 20rem;
		gap: clamp(1.5rem, 4vw, 3rem);
		padding-top: clamp(1.25rem, 3vw, 2rem);
	}

	.trailer {
		margin-bottom: 1rem;
	}

	.shelf-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1.25rem;
		padding: 1.1rem 1.25rem;
	}

	.community {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.stack-lines {
		display: flex;
		flex-direction: column;
		font-size: 0.8rem;
		line-height: 1.4;
	}

	.big {
		font-size: 2.4rem;
		color: var(--accent);
		line-height: 1;
	}

	.release-note {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 1.25rem 0 0;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.overview {
		margin-top: 1.5rem;
	}

	.overview p {
		font-size: 1.02rem;
		color: var(--muted);
		max-width: 72ch;
	}

	.main :global(h2.display) {
		font-size: 1.5rem;
	}

	.features,
	.parts,
	.reviews {
		margin-block: 2.5rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-top: 0.9rem;
	}

	/* Collection strip --------------------------------------------------- */

	.part-row {
		display: flex;
		gap: 0.85rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	.part {
		position: relative;
		width: 7rem;
	}

	.part img {
		width: 100%;
		aspect-ratio: 2 / 3;
		object-fit: cover;
		border-radius: 8px;
		box-shadow: 0 0 0 1px var(--line);
		opacity: 0.75;
		transition:
			opacity 0.2s ease,
			transform 0.2s ease;
	}

	.part:hover img {
		opacity: 1;
		transform: translateY(-4px);
	}

	.part.current img {
		opacity: 1;
		box-shadow: 0 0 0 2px var(--accent);
	}

	.part .no {
		position: absolute;
		top: 0.35rem;
		left: 0.35rem;
		display: grid;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		border-radius: 50%;
		background: var(--veil-strong);
		color: var(--on-image);
		font-size: 0.7rem;
		font-weight: 700;
	}

	.part .name {
		display: block;
		margin-top: 0.4rem;
		font-size: 0.78rem;
		color: var(--muted);
		line-height: 1.3;
	}

	/* Reviews ------------------------------------------------------------ */

	.count {
		font-size: 1rem;
	}

	.rule {
		margin: 0.2rem 0 1.1rem;
		font-size: 0.85rem;
	}

	.review-list {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		margin-top: 1.1rem;
	}

	.empty {
		margin: 0;
	}

	/* Sidebar ------------------------------------------------------------ */

	aside {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-self: start;
		position: sticky;
		top: calc(var(--bar-height) + 1rem);
	}

	.facts-card,
	.who {
		padding: 1.1rem 1.2rem;
	}

	dl {
		margin: 0.9rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	dl div {
		display: grid;
		grid-template-columns: 8rem 1fr;
		gap: 0.6rem;
		align-items: baseline;
	}

	dt {
		font-size: 0.78rem;
		color: var(--faint);
	}

	dd {
		margin: 0;
		font-size: 0.88rem;
	}

	dd .chips {
		margin-top: 0;
	}

	.who ul {
		list-style: none;
		margin: 0.8rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.who li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
	}

	.who a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.who .name {
		font-size: 0.86rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.who a:hover .name {
		color: var(--accent);
	}

	.state {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 0.72rem;
		flex: none;
	}

	@media (max-width: 1000px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}

		aside {
			position: static;
		}
	}

	@media (max-width: 720px) {
		.head {
			flex-direction: column;
			align-items: flex-start;
		}

		.poster {
			width: 6.5rem;
		}
	}
</style>
