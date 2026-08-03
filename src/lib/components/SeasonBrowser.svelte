<!--
	Seasons and episodes — the part of a series that no other activity type has.
	If the viewer is tracking progress, everything up to where they are is
	ticked off.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import { library } from '$lib/state/library.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { counted, duration, longDate } from '$lib/util/format.js';

	let { item } = $props();

	let seasons = $derived(item.details.seasons ?? []);
	let entry = $derived(session.user ? library.entryFor(session.user.id, item.id) : null);
	let progress = $derived(entry?.progress ?? null);

	let selected = $state(0);

	let season = $derived(seasons[selected] ?? null);

	/** Everything before where they stopped counts as seen. */
	function seen(episode) {
		if (!progress) return entry?.status === 'done';
		if (season.number < progress.season) return true;
		if (season.number > progress.season) return false;
		return episode.number <= progress.episode;
	}

	function markWatched(episode) {
		if (!session.user) return;
		library.setProgress(session.user.id, item.id, {
			season: season.number,
			episode: episode.number
		});
	}
</script>

{#if seasons.length}
	<section class="seasons">
		<header>
			<h2 class="display">{t('seasons.title')}</h2>
			<span class="faint">
				{counted('count.season', item.details.seasonCount)} · {counted(
					'count.episode',
					item.details.episodeCount
				)}
			</span>
		</header>

		<div class="tabs scroller">
			{#each seasons as candidate, position (candidate.number)}
				<button
					type="button"
					class="tab"
					class:on={position === selected}
					onclick={() => (selected = position)}
				>
					{#if candidate.poster}
						<img src={candidate.poster} alt="" loading="lazy" />
					{/if}
					<span>
						<strong>{candidate.name}</strong>
						<span class="faint">
							{candidate.year} · {t('count.episodesShort', { count: candidate.episodes.length })}
						</span>
					</span>
				</button>
			{/each}
		</div>

		{#if season}
			<ol class="episodes">
				{#each season.episodes as episode (episode.number)}
					<li class:seen={seen(episode)}>
						<span class="no">{episode.number}</span>

						{#if episode.still}
							<img class="still" src={episode.still} alt="" loading="lazy" />
						{/if}

						<div class="text">
							<div class="line">
								<h3>{episode.title}</h3>
								{#if episode.score}
									<span class="chip"><Icon name="star" size={11} filled />{episode.score}</span>
								{/if}
							</div>
							<p class="dot-list small">
								{#if episode.airDate}<span>{longDate(episode.airDate)}</span>{/if}
								{#if episode.runtime}<span>{duration(episode.runtime)}</span>{/if}
							</p>
							{#if episode.overview}<p class="blurb">{episode.overview}</p>{/if}
						</div>

						{#if session.user}
							<button
								type="button"
								class="tick"
								aria-label={t('seasons.markWatched', { n: episode.number })}
								onclick={() => markWatched(episode)}
							>
								<Icon name="check" size={14} stroke={2.6} />
							</button>
						{/if}
					</li>
				{/each}
			</ol>
		{/if}
	</section>
{/if}

<style>
	.seasons {
		margin-block: 2.5rem;
	}

	header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	h2 {
		font-size: 1.5rem;
	}

	.tabs {
		display: flex;
		gap: 0.6rem;
		padding-bottom: 0.6rem;
		margin-bottom: 1.25rem;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem 0.9rem 0.4rem 0.4rem;
		border: 1px solid var(--line);
		border-radius: 99px;
		background: var(--tint);
		color: var(--muted);
		cursor: pointer;
		flex: none;
		transition:
			border-color 0.18s ease,
			background 0.18s ease,
			color 0.18s ease;
	}

	.tab img {
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 50%;
		object-fit: cover;
	}

	.tab span {
		display: flex;
		flex-direction: column;
		line-height: 1.25;
		font-size: 0.82rem;
		text-align: left;
	}

	.tab:hover {
		color: var(--ink);
		background: var(--tint-strong);
	}

	.tab.on {
		border-color: color-mix(in srgb, var(--accent) 55%, transparent);
		background: var(--accent-soft);
		color: var(--accent);
	}

	.episodes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.episodes li {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 0.95rem 0;
		border-top: 1px solid var(--line);
	}

	.no {
		width: 1.75rem;
		flex: none;
		text-align: right;
		font-family: var(--font-display);
		font-size: 1.35rem;
		color: var(--faint);
		line-height: 1.2;
	}

	.seen .no {
		color: var(--accent);
	}

	.still {
		width: 8rem;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-radius: 8px;
		flex: none;
		background: var(--surface-2);
		opacity: 0.85;
		transition: opacity 0.2s ease;
	}

	li:hover .still {
		opacity: 1;
	}

	.text {
		flex: 1;
		min-width: 0;
	}

	.line {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	h3 {
		font-size: 1rem;
	}

	.small {
		font-size: 0.78rem;
		margin: 0.15rem 0 0;
	}

	.blurb {
		margin: 0.35rem 0 0;
		font-size: 0.88rem;
		color: var(--muted);
		max-width: 68ch;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.tick {
		display: grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		flex: none;
		border: 1px solid var(--line);
		border-radius: 50%;
		background: none;
		color: var(--faint);
		cursor: pointer;
		transition:
			background 0.18s ease,
			color 0.18s ease,
			border-color 0.18s ease;
	}

	.tick:hover {
		color: var(--ink);
		border-color: var(--line-strong);
	}

	.seen .tick {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}

	@media (max-width: 640px) {
		.still {
			display: none;
		}
	}
</style>
