<!--
	The poster tile used by every rail and grid. It knows about the type accent,
	the community score, and — when the viewer has the item on a shelf — their
	own status and progress.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import { externalRatings, isUpcoming, itemPath } from '$lib/data/items.js';
	import { lineOf, progressRatio, statusLabel } from '$lib/data/types.js';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { untilRelease } from '$lib/util/format.js';

	/**
	 * `ownerId` swaps whose shelf the badge describes — a profile shows that
	 * person's status, everywhere else shows the viewer's.
	 */
	let { item, width = null, showType = true, ownerId = null } = $props();

	let community = $derived(library.ratingOf(item.id));
	let shelfOwner = $derived(ownerId ?? session.user?.id ?? null);
	let entry = $derived(shelfOwner ? library.entryFor(shelfOwner, item.id) : null);
	let ratio = $derived(entry?.progress ? progressRatio(item, entry.progress) : null);
	let meta = $derived(lineOf(item).slice(0, 2).join(' · '));

	let unreleased = $derived(isUpcoming(item));
	let outside = $derived(externalRatings(item));
	let fresh = $derived(library.isNewFor(session.user?.id, item));
</script>

<a
	class="poster-card"
	href={itemPath(item)}
	data-type={item.type}
	style={width ? `--card-width: ${width}` : ''}
>
	<div class="art">
		{#if item.poster}
			<img src={item.poster} alt="" loading="lazy" decoding="async" />
		{:else}
			<div class="fallback"><Icon name={item.type} size={28} /></div>
		{/if}

		<div class="veil"></div>

		{#if fresh}
			<span class="badge new">New</span>
		{:else if showType}
			<span class="type" title={item.type}><Icon name={item.type} size={13} /></span>
		{/if}

		{#if unreleased}
			<span class="badge soon">{untilRelease(item.details.releaseDate)}</span>
		{/if}

		{#if entry}
			<span class="status" class:done={entry.status === 'done'}>
				{#if entry.status === 'done'}<Icon name="check" size={12} stroke={2.4} />{/if}
				{statusLabel(item.type, entry.status)}
			</span>
		{/if}

		{#if ratio !== null}
			<span class="progress"><span style="width: {Math.round(ratio * 100)}%"></span></span>
		{/if}
	</div>

	<div class="label">
		<span class="title">{item.title}</span>
		<span class="meta">{meta}</span>
		{#if unreleased}
			<span class="score faint">Not out yet</span>
		{:else if community.count}
			<span class="score">
				<Stars value={community.average} size={12} />
				<span class="count">{community.count}</span>
			</span>
		{:else if outside.length}
			<span class="score faint outside">
				{#each outside.slice(0, 2) as rating (rating.source)}
					<span>{rating.label} {rating.value}</span>
				{/each}
			</span>
		{/if}
	</div>
</a>

<style>
	.poster-card {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: var(--card-width, 100%);
		scroll-snap-align: start;
	}

	.art {
		position: relative;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius);
		overflow: hidden;
		background: linear-gradient(160deg, var(--surface-2), var(--surface-2));
		box-shadow: var(--shadow-card);
		transition:
			transform 0.28s cubic-bezier(0.2, 0.7, 0.3, 1),
			box-shadow 0.28s ease;
	}

	.art::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px var(--tint-strong);
		transition: box-shadow 0.28s ease;
		pointer-events: none;
	}

	.poster-card:hover .art,
	.poster-card:focus-visible .art {
		transform: translateY(-6px);
		box-shadow: var(--shadow-lift);
	}

	.poster-card:hover .art::after {
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent);
	}

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.fallback {
		display: grid;
		place-items: center;
		height: 100%;
		color: var(--faint);
	}

	/* Just enough shading at the foot of the poster for a badge to sit on. */
	.veil {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgb(8 10 15 / 0.55), transparent 38%);
	}

	.badge {
		position: absolute;
		display: inline-flex;
		align-items: center;
		border-radius: 99px;
		font-weight: 700;
		white-space: nowrap;
	}

	.badge.new {
		top: 0.5rem;
		left: 0.5rem;
		padding: 0.1rem 0.5rem;
		background: var(--new);
		color: #fff;
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.badge.soon {
		left: 0.5rem;
		bottom: 0.5rem;
		padding: 0.15rem 0.5rem;
		background: var(--veil);
		color: var(--on-image);
		font-size: 0.68rem;
		font-weight: 600;
		backdrop-filter: blur(6px);
	}

	.type {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		display: grid;
		place-items: center;
		width: 1.55rem;
		height: 1.55rem;
		border-radius: 50%;
		background: var(--veil);
		color: var(--accent);
		backdrop-filter: blur(6px);
	}

	.status {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.15rem 0.45rem;
		border-radius: 99px;
		background: var(--veil);
		color: var(--on-image);
		font-size: 0.68rem;
		font-weight: 600;
		backdrop-filter: blur(6px);
	}

	.status.done {
		background: var(--accent);
		color: var(--on-accent);
	}

	.progress {
		position: absolute;
		left: 0.5rem;
		right: 0.5rem;
		bottom: 0.5rem;
		height: 3px;
		border-radius: 99px;
		background: var(--line-strong);
		overflow: hidden;
	}

	.progress span {
		display: block;
		height: 100%;
		background: var(--accent);
	}

	.label {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	/* Two lines are always reserved so a rail of cards keeps one baseline. */
	.title {
		font-size: 0.92rem;
		font-weight: 600;
		line-height: 1.25;
		min-height: 2.5em;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.poster-card:hover .title {
		color: var(--accent);
	}

	.meta {
		font-size: 0.78rem;
		color: var(--faint);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.score {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.72rem;
		color: var(--muted);
		margin-top: 0.1rem;
	}

	/* "IMDb 7.2 · TMDB 68%" on one line. */
	.outside {
		gap: 0.3rem;
	}

	.outside span + span::before {
		content: '·';
		margin-right: 0.3rem;
		opacity: 0.6;
	}

	.count::before {
		content: '·';
		margin-right: 0.3rem;
	}
</style>
