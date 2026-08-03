<!--
	The browse page for one type.

	Filtering, sorting and paging all happen in the database — the page renders
	whatever the load function fetched and writes any change back into the query
	string, so a browse view is a shareable link.

	Nothing here is counted. A row of genre chips each carrying a number, and a
	total above them, were most of what this page cost: every request recounted
	every genre across the whole catalogue, and counted the catalogue itself, to
	decorate controls that read the same without either. The pager asks only
	whether there is a page after this one.
-->
<script>
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { types } from '$lib/data/types.js';
	import { t } from '$lib/i18n/index.svelte.js';

	/** The dictionary section per type — 'movie' is filed under 'movies'. */
	const BROWSE_KEY = { movie: 'movies', series: 'series', game: 'games', book: 'books' };

	let { type, data } = $props();

	// The heading and the standfirst are the type's, so this component picks
	// them up from the dictionary rather than having them handed down as props
	// that would arrive in whatever language the route file was written in.
	let heading = $derived(t(`browse.${BROWSE_KEY[type]}.title`));
	let intro = $derived(t(`browse.${BROWSE_KEY[type]}.intro`));

	let spec = $derived(types[type]);
	/*
	 * Changing a filter, a sort or a page is a navigation to this same route, so
	 * the results are replaced while everything around them stays put. The bar
	 * at the top of the window is easy to miss when the thing that changes is
	 * halfway down the page, so the grid says so itself.
	 */
	let refreshing = $derived(navigating.to?.route.id === page.route.id);
	let results = $derived(data.results);
	let options = $derived(data.filters);
	let params = $derived(page.url.searchParams);
	let pageNumber = $derived(Number(params.get('page') ?? 1));

	/*
	 * Rebuilt whenever the language changes — a $derived rather than a const,
	 * because a const would be filled in once at module load and then keep
	 * saying "Most popular" in a Turkish page.
	 */
	const SORTS = ['popularity', 'score', 'newest', 'oldest', 'title', 'added'];
	let sortLabels = $derived(Object.fromEntries(SORTS.map((key) => [key, t(`sort.${key}`)])));

	let scoreSteps = $derived([
		{ value: '', label: t('score.any') },
		...[60, 70, 80, 90].map((n) => ({ value: String(n), label: t('score.min', { n }) }))
	]);

	/*
	 * The decades the API says hold something, newest first. Derived from the
	 * reported year span it offered the sixties, seventies and eighties — one
	 * title, one title and none at all.
	 */
	let decades = $derived(options?.decades ?? []);

	// One genre at a time here; /search is where several can be combined.
	let genre = $derived(params.get('genre') ?? '');
	let decade = $derived(params.get('yearFrom') ?? '');
	let scoreMin = $derived(params.get('scoreMin') ?? '');

	function setDecade(value) {
		if (!value) return apply({ yearFrom: null, yearTo: null });
		apply({ yearFrom: value, yearTo: Number(value) + 9 });
	}

	let activeCount = $derived([genre, decade, scoreMin].filter(Boolean).length);

	function apply(changes, { resetPage = true } = {}) {
		const next = new URLSearchParams(params);
		for (const [key, value] of Object.entries(changes)) {
			next.delete(key);
			if (Array.isArray(value)) {
				for (const entry of value) next.append(key, entry);
			} else if (value !== null && value !== undefined && value !== '') {
				next.set(key, String(value));
			}
		}
		if (resetPage) next.delete('page');
		goto(`${spec.browse}?${next}`, { keepFocus: true, noScroll: true });
	}

</script>

<div class="frame page" data-type={type}>
	<header class="masthead">
		<div>
			<span class="eyebrow"><Icon name={type} size={14} />{spec.plural}</span>
			<h1 class="display">{heading}</h1>
			<p class="muted">{intro}</p>
		</div>
	</header>

	{#if data.unreachable}
		<p class="notice">{t('common.apiUnreachable')}</p>
	{:else}
		<div class="filters">
			<div class="picks">
				<label>
					<span class="sr-only">{t('browse.genre')}</span>
					<select
						class="field"
						value={genre}
						onchange={(event) => apply({ genre: event.currentTarget.value || null })}
					>
						<option value="">{t('browse.anyGenre')}</option>
						{#each options?.genres ?? [] as g (g.slug)}
							<option value={g.slug}>{g.name}</option>
						{/each}
					</select>
				</label>

				{#if decades.length}
					<label>
						<span class="sr-only">{t('browse.decade')}</span>
						<select
							class="field"
							value={decade}
							onchange={(event) => setDecade(event.currentTarget.value)}
						>
							<option value="">{t('browse.anyDecade')}</option>
							{#each decades as d (d)}
								<!-- A string, because the value it is compared against came
								     from the query string and 1990 is not '1990'. -->
								<option value={String(d)}>{t('browse.decadeLabel', { decade: d })}</option>
							{/each}
						</select>
					</label>
				{/if}

				<label>
					<span class="sr-only">{t('browse.minScore')}</span>
					<select
						class="field"
						value={scoreMin}
						onchange={(event) => apply({ scoreMin: event.currentTarget.value || null })}
					>
						{#each scoreSteps as step (step.value)}
							<option value={step.value}>{step.label}</option>
						{/each}
					</select>
				</label>

				{#if activeCount}
					<button
						type="button"
						class="btn btn-sm btn-ghost"
						onclick={() => apply({ genre: null, yearFrom: null, yearTo: null, scoreMin: null })}
					>
						<Icon name="close" size={12} />{t('common.clear')}
					</button>
				{/if}
			</div>

			<div class="tools">
				<a class="btn btn-sm" href="/search?type={type}">
					<Icon name="search" size={13} />{t('browse.moreFilters')}
				</a>
				<label class="sort">
					<span class="sr-only">{t('browse.sortBy')}</span>
					<select
						class="field"
						value={params.get('sort') ?? 'popularity'}
						onchange={(event) => apply({ sort: event.currentTarget.value }, { resetPage: false })}
					>
						{#each Object.entries(sortLabels) as [key, label] (key)}
							<option value={key}>{label}</option>
						{/each}
					</select>
				</label>
			</div>
		</div>


		<!--
			The old results stay on screen while the new ones load, dimmed and
			inert. Emptying the grid first would collapse the page height and
			throw the scroll position around on every filter change.
		-->
		<div class="results" class:refreshing aria-busy={refreshing}>
			<div class="grid-posters">
				{#each results.items as item (item.id)}
					<PosterCard {item} showType={false} />
				{:else}
					<p class="muted">{t('browse.empty')}</p>
				{/each}
			</div>

			{#if refreshing}
				<div class="working">
					<Spinner size={22} />
					<span class="faint">{t('common.loading')}</span>
				</div>
			{/if}
		</div>

		<Pager
			page={pageNumber}
			pages={results.pages}
			hasMore={results.hasMore}
			onpage={(n) => apply({ page: n }, { resetPage: false })}
		/>
	{/if}
</div>

<style>
	.page {
		padding-top: clamp(2rem, 5vw, 3.5rem);
	}

	.results {
		position: relative;
	}

	.results.refreshing .grid-posters {
		opacity: 0.45;
		/* Stops a click landing on a poster that is about to be replaced. */
		pointer-events: none;
		transition: opacity 0.15s ease;
	}

	.working {
		position: absolute;
		inset: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		/* Sits over the first row, which is where the eye already is. */
		padding: clamp(2rem, 8vh, 5rem) 0;
	}

	.masthead {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
		padding-bottom: 1.5rem;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--accent);
	}

	h1 {
		font-size: clamp(2.2rem, 6vw, 3.6rem);
		margin: 0.35rem 0 0.4rem;
	}

	.masthead p {
		margin: 0;
		max-width: 52ch;
	}


	.notice {
		color: var(--danger);
	}

	.filters {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.9rem 0;
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}

	.picks {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
		min-width: 0;
	}

	.picks select {
		width: auto;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: none;
	}

	select {
		padding: 0.3rem 0.6rem;
		font-size: 0.82rem;
		border-radius: 99px;
	}


	.grid-posters {
		padding-bottom: 1rem;
	}

	@media (max-width: 700px) {
		.filters {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
