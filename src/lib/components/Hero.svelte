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
	import { list, longDate, untilRelease } from '$lib/util/format.js';

	let { releases = [] } = $props();

	let index = $state(0);

	let current = $derived(releases[index] ?? null);
	let isNew = $derived(current ? library.isNewFor(session.user?.id, current) : false);
</script>

{#if current}
	<section class="hero frame" aria-label="Coming up">
		<div class="stage" data-type={current.type}>
			<!-- The still is the poster frame the trailer starts over. -->
			<img class="plate" src={current.backdrop ?? current.poster} alt="" fetchpriority="high" />
			<Trailer item={current} fit="cover" controls={false} loop />
			<div class="veil"></div>

			<div class="stage-body">
				<div class="labels">
					<span class="tag">
						<Icon name="calendar" size={12} />
						{untilRelease(current.details.releaseDate)}
					</span>
					{#if isNew}<span class="tag new">New</span>{/if}
				</div>

				<h1 class="display">{current.title}</h1>

				<p class="meta">
					{list(current.genres, 2)}{#if current.details.directors?.length}
						· {list(current.details.directors, 1)}{/if}
				</p>

				<div class="actions">
					<a class="btn btn-accent" href={itemPath(current)}>
						<Icon name="right" size={14} />Details
					</a>
					{#if current.trailer}
						<span class="muted-note"><Icon name="play" size={12} filled />Trailer, muted</span>
					{/if}
				</div>
			</div>
		</div>

		<aside class="queue">
			<header>
				<span class="eyebrow">Coming up</span>
				<span class="faint">{releases.length} announced</span>
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
								<span class="dot" aria-label="New"></span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</aside>
	</section>
{/if}

<style>
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 19rem;
		gap: 1rem;
		padding-top: clamp(1rem, 3vw, 1.75rem);
	}

	/* The plate ---------------------------------------------------------- */

	.stage {
		position: relative;
		aspect-ratio: 16 / 8;
		max-height: 27rem;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--surface-2);
		box-shadow: var(--shadow-card);
	}

	.plate {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 22%;
	}

	.veil {
		position: absolute;
		inset: 0;
		background:
			var(--veil-gradient),
			linear-gradient(to right, rgb(8 10 15 / 0.75), transparent 65%);
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

	.muted-note {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.76rem;
		opacity: 0.65;
	}

	/* The queue ---------------------------------------------------------- */

	.queue {
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

	.queue ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		overflow-y: auto;
	}

	.queue button {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		width: 100%;
		padding: 0.35rem 0.5rem;
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
		border-left-color: var(--brass);
	}

	.queue img {
		width: 1.9rem;
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

		.stage {
			aspect-ratio: 3 / 2;
		}

		.queue ul {
			flex-direction: row;
			overflow-x: auto;
			gap: 0.4rem;
		}

		.queue button {
			width: auto;
			border-left: 0;
			border-bottom: 2px solid transparent;
		}

		.queue button.on {
			border-bottom-color: var(--brass);
		}

		.name {
			max-width: 9rem;
		}
	}
</style>
