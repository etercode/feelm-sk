<!--
	Advanced search.

	Every control writes to the query string and lets the load function re-run,
	which keeps the URL and the results honest about each other — no local state
	that can drift, and a filtered search is a link you can send someone.
-->
<script>
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import { types, typeKeys } from '$lib/data/types.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { compactNumber, counted, number } from '$lib/util/format.js';

	let { data } = $props();

	let params = $derived(page.url.searchParams);
	let results = $derived(data.results);
	// Filters and paging navigate to /search itself, so the results are what
	// changes while the form around them stays put.
	let refreshing = $derived(navigating.to?.route.id === page.route.id);
	let facets = $derived(data.results?.facets ?? null);

	let queryText = $state('');
	$effect(() => {
		queryText = params.get('q') ?? '';
	});

	/*
	 * All five of these are $derived rather than const: a const is evaluated
	 * once when the module loads, which would pin every option label to
	 * whatever language happened to be in force at that moment.
	 */
	let sortLabels = $derived(
		Object.fromEntries(
			['relevance', 'popularity', 'score', 'imdb', 'newest', 'oldest', 'title', 'added'].map(
				(key) => [key, t(`sort.${key}`)]
			)
		)
	);

	let scoreSteps = $derived([
		{ value: '', label: t('score.any') },
		...[60, 70, 80, 90].map((n) => ({ value: String(n), label: t('score.min', { n }) }))
	]);

	// IMDb publishes out of 10, so the filter speaks in those units.
	let imdbSteps = $derived([
		{ value: '', label: t('imdb.any') },
		...[6, 7, 8, 9].map((n) => ({ value: String(n), label: t('imdb.min', { n }) }))
	]);

	let votesSteps = $derived([
		{ value: '', label: t('votes.any') },
		...[1000, 10000, 100000].map((n) => ({
			value: String(n),
			label: t('votes.min', { n: compactNumber(n) })
		}))
	]);

	let runtimeSteps = $derived([
		{ value: '', label: t('length.any') },
		{ value: '0-45', label: t('length.under45') },
		{ value: '45-90', label: t('length.45to90') },
		{ value: '90-150', label: t('length.90to150') },
		{ value: '150-', label: t('length.over150') }
	]);

	/** Rewrite the query string; a filter change always returns to page 1. */
	function apply(changes, { resetPage = true } = {}) {
		const next = new URLSearchParams(params);
		for (const [key, value] of Object.entries(changes)) {
			next.delete(key);
			if (Array.isArray(value)) {
				for (const entry of value) next.append(key, entry);
			} else if (value !== null && value !== '' && value !== undefined) {
				next.set(key, String(value));
			}
		}
		if (resetPage) next.delete('page');
		goto(`/search?${next}`, { keepFocus: true, noScroll: true });
	}

	function toggle(key, value) {
		const current = params.getAll(key);
		apply({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
	}

	function selected(key, value) {
		return params.getAll(key).includes(value);
	}

	let runtimeValue = $derived(
		params.has('runtimeMin') || params.has('runtimeMax')
			? `${params.get('runtimeMin') ?? '0'}-${params.get('runtimeMax') ?? ''}`
			: ''
	);

	function setRuntime(value) {
		if (!value) return apply({ runtimeMin: null, runtimeMax: null });
		const [min, max] = value.split('-');
		apply({ runtimeMin: min || null, runtimeMax: max || null });
	}

	let decadeValue = $derived(params.get('yearFrom') ?? '');

	function setDecade(decade) {
		if (decadeValue === String(decade)) return apply({ yearFrom: null, yearTo: null });
		apply({ yearFrom: decade, yearTo: Number(decade) + 9 });
	}

	let activeCount = $derived(
		[...params.keys()].filter((key) => !['q', 'page', 'limit', 'sort'].includes(key)).length
	);

	let pageNumber = $derived(Number(params.get('page') ?? 1));
</script>

<svelte:head>
	<title>{queryText ? t('search.titleFor', { query: queryText }) : t('search.title')} — Feelm</title>
</svelte:head>

<div class="frame page">
	<form
		class="ask"
		onsubmit={(event) => {
			event.preventDefault();
			apply({ q: queryText.trim() || null });
		}}
	>
		<Icon name="search" size={20} />
		<input
			class="field"
			type="search"
			bind:value={queryText}
			placeholder={t('search.placeholder')}
			autocomplete="off"
		/>
		<button type="submit" class="btn btn-primary">{t('common.search')}</button>
	</form>

	{#if data.unreachable}
		<p class="notice">{t('search.unreachablePort', { port: '8092' })}</p>
	{:else}
		<div class="summary">
			<p class="count">
				{#if results.total}
					<!--
						"1,000+" when the server stopped counting. Above a
						thousand the exact figure costs more than it is worth to
						anybody reading it, so it is not claimed.
					-->
					<strong>{number(results.total)}{results.totalIsExact === false ? '+' : ''}</strong>
					{t('noun.result', { count: results.total })}
					{#if queryText}{t('search.forQuery', { query: queryText })}{/if}
				{:else if activeCount}
					{queryText ? t('search.noneWithFilters', { query: queryText }) : t('search.noneFilters')}
				{:else if queryText}
					{t('search.noneQuery', { query: queryText })}
				{:else}
					{t('search.allTitles', { count: results.total })}
				{/if}
			</p>

			<label class="sort">
				<span class="sr-only">{t('search.sort')}</span>
				<select
					class="field"
					value={params.get('sort') ?? (queryText ? 'relevance' : 'popularity')}
					onchange={(event) => apply({ sort: event.currentTarget.value }, { resetPage: false })}
				>
					{#each data.filters.sorts as key (key)}
						<option value={key}>{sortLabels[key] ?? key}</option>
					{/each}
				</select>
			</label>
		</div>

		<!-- The correction. Shown whenever the query barely matched, with the
		     number of results the corrected spelling would give. -->
		{#if results.suggestion}
			<p class="did-you-mean">
				{t('search.didYouMean')}
				<a href="/search?{new URLSearchParams({ ...Object.fromEntries(params), q: results.suggestion.term, page: '1' })}">
					{results.suggestion.term}
				</a>?
				<span class="faint">{counted('count.result', results.suggestion.total)}</span>
			</p>
		{/if}

		<div class="layout">
			<aside class="filters">
				<header>
					<span class="eyebrow">{t('search.filters')}</span>
					{#if activeCount}
						<a class="clear" href="/search?{new URLSearchParams(queryText ? { q: queryText } : {})}">
							{t('common.clearCount', { count: activeCount })}
						</a>
					{/if}
				</header>

				<section>
					<h2>{t('search.type')}</h2>
					{#each typeKeys as key (key)}
						<label class="check" data-type={key}>
							<input
								type="checkbox"
								checked={selected('type', key)}
								onchange={() => toggle('type', key)}
							/>
							<Icon name={key} size={13} />
							<span class="label">{types[key].plural}</span>
							{#if facets}<span class="n">{number(facets.types[key] ?? 0)}</span>{/if}
						</label>
					{/each}
				</section>

				{#if facets?.genres?.length}
					<section>
						<h2>{t('browse.genre')}</h2>
						<div class="scroll-list">
							{#each facets.genres as genre (genre.slug)}
								<label class="check">
									<input
										type="checkbox"
										checked={selected('genre', genre.slug)}
										onchange={() => toggle('genre', genre.slug)}
									/>
									<span class="label">{genre.name}</span>
									<span class="n">{number(genre.count)}</span>
								</label>
							{/each}
						</div>
						{#if params.getAll('genre').length > 1}
							<label class="check mode">
								<input
									type="checkbox"
									checked={params.get('genreMode') === 'all'}
									onchange={(event) =>
										apply({ genreMode: event.currentTarget.checked ? 'all' : null })}
								/>
								<span class="label">{t('search.mustMatchAll')}</span>
							</label>
						{/if}
					</section>
				{/if}

				{#if facets?.decades?.length}
					<section>
						<h2>{t('browse.decade')}</h2>
						<div class="chips">
							{#each facets.decades.slice(0, 14) as bucket (bucket.decade)}
								<button
									type="button"
									class="chip"
									class:on={decadeValue === String(bucket.decade)}
									onclick={() => setDecade(bucket.decade)}
								>
									{t('browse.decadeLabel', { decade: bucket.decade })}
									<span class="faint">{number(bucket.count)}</span>
								</button>
							{/each}
						</div>
					</section>
				{/if}

				<section>
					<h2>{t('browse.minScore')}</h2>
					<select
						class="field"
						value={params.get('scoreMin') ?? ''}
						onchange={(event) => apply({ scoreMin: event.currentTarget.value || null })}
					>
						{#each scoreSteps as step (step.value)}
							<option value={step.value}>{step.label}</option>
						{/each}
					</select>
				</section>

				<section>
					<h2>IMDb</h2>
					<select
						class="field"
						value={params.get('imdbMin') ?? ''}
						onchange={(event) => apply({ imdbMin: event.currentTarget.value || null })}
					>
						{#each imdbSteps as step (step.value)}
							<option value={step.value}>{step.label}</option>
						{/each}
					</select>
					<select
						class="field votes"
						value={params.get('votesMin') ?? ''}
						onchange={(event) => apply({ votesMin: event.currentTarget.value || null })}
					>
						{#each votesSteps as step (step.value)}
							<option value={step.value}>{step.label}</option>
						{/each}
					</select>
				</section>

				<section>
					<h2>{t('search.length')}</h2>
					<select
						class="field"
						value={runtimeValue}
						onchange={(event) => setRuntime(event.currentTarget.value)}
					>
						{#each runtimeSteps as step (step.value)}
							<option value={step.value}>{step.label}</option>
						{/each}
					</select>
				</section>

				<section>
					<h2>{t('search.release')}</h2>
					<select
						class="field"
						value={params.get('release') ?? 'any'}
						onchange={(event) => apply({ release: event.currentTarget.value })}
					>
						<option value="any">{t('search.releaseAny')}</option>
						<option value="released">{t('search.releaseOut')}</option>
						<option value="upcoming">{t('search.releaseUpcoming')}</option>
					</select>
				</section>

				{#if data.filters.certifications.length}
					<section>
						<h2>{t('facet.rated')}</h2>
						<div class="chips">
							{#each data.filters.certifications.slice(0, 10) as cert (cert)}
								<button
									type="button"
									class="chip"
									class:on={selected('certification', cert)}
									onclick={() => toggle('certification', cert)}
								>
									{cert}
								</button>
							{/each}
						</div>
					</section>
				{/if}

				{#if data.filters.languages.length}
					<section>
						<h2>{t('search.language')}</h2>
						<div class="chips">
							{#each data.filters.languages.slice(0, 10) as lang (lang.code)}
								<button
									type="button"
									class="chip"
									class:on={selected('language', lang.code)}
									onclick={() => toggle('language', lang.code)}
								>
									{lang.code.toUpperCase()} <span class="faint">{number(lang.count)}</span>
								</button>
							{/each}
						</div>
					</section>
				{/if}
			</aside>

			<div class="results" class:refreshing aria-busy={refreshing}>
				{#if refreshing}
					<div class="working">
						<Spinner size={22} />
						<span class="faint">{t('common.loading')}</span>
					</div>
				{/if}
				{#if results.items.length}
					<div class="grid-posters">
						{#each results.items as item (item.id)}
							<PosterCard {item} />
						{/each}
					</div>

					<!--
						hasMore matters now that `pages` can be null: above a
						thousand matches the server stops counting, so there is
						no last page to draw and "is there another" is the only
						question left.
					-->
					<Pager
						page={pageNumber}
						pages={results.pages}
						hasMore={results.hasMore}
						onpage={(n) => apply({ page: n }, { resetPage: false })}
					/>
				{:else}
					<div class="empty">
						<p class="muted">
							{#if results.suggestion}
								{t('search.emptySuggestion')}
							{:else if activeCount}
								{t('search.emptyFilters')}
							{:else}
								{t('search.emptyStart')}
							{/if}
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		padding-block: clamp(1.5rem, 4vw, 2.5rem) 3rem;
	}

	.ask {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 0.9rem;
		border: 1px solid var(--line-strong);
		border-radius: 99px;
		background: var(--surface);
		color: var(--faint);
		box-shadow: var(--shadow-card);
	}

	.ask input {
		flex: 1;
		border: 0;
		background: none;
		padding: 0.25rem 0;
		font-size: 1.05rem;
	}

	.ask input:focus {
		outline: none;
	}

	.ask input::-webkit-search-cancel-button {
		display: none;
	}

	.notice {
		margin-top: 2rem;
		color: var(--danger);
	}

	.summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin: 1.5rem 0 0;
	}

	.count {
		margin: 0;
		font-size: 1rem;
		color: var(--muted);
	}

	.count strong {
		color: var(--ink);
	}

	.sort select {
		padding: 0.35rem 0.7rem;
		border-radius: 99px;
		font-size: 0.85rem;
		width: auto;
	}

	.did-you-mean {
		margin: 0.75rem 0 0;
		padding: 0.6rem 0.9rem;
		border-left: 3px solid var(--brand);
		background: var(--brand-soft);
		border-radius: 0 var(--radius) var(--radius) 0;
		font-size: 0.95rem;
	}

	.did-you-mean a {
		font-weight: 600;
		color: var(--brand);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.layout {
		display: grid;
		grid-template-columns: 15rem minmax(0, 1fr);
		gap: clamp(1.25rem, 3vw, 2.5rem);
		margin-top: 1.5rem;
	}

	/* Filter panel ------------------------------------------------------- */

	.filters {
		align-self: start;
		position: sticky;
		top: calc(var(--bar-height) + 1rem);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		max-height: calc(100vh - var(--bar-height) - 2rem);
		overflow-y: auto;
		padding-right: 0.25rem;
	}

	.filters header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.clear {
		font-size: 0.78rem;
		color: var(--brand);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.filters h2 {
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--faint);
		margin-bottom: 0.5rem;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.22rem 0;
		font-size: 0.88rem;
		cursor: pointer;
		color: var(--muted);
	}

	.check:hover {
		color: var(--ink);
	}

	.check input {
		accent-color: var(--accent, var(--brand));
		margin: 0;
	}

	.check .label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.check .n {
		font-size: 0.75rem;
		color: var(--faint);
		font-variant-numeric: tabular-nums;
	}

	.check.mode {
		margin-top: 0.4rem;
		border-top: 1px solid var(--line);
		padding-top: 0.5rem;
	}

	.scroll-list {
		max-height: 14rem;
		overflow-y: auto;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.chips .chip {
		cursor: pointer;
		font-size: 0.75rem;
	}

	.chips .chip.on {
		background: var(--brand);
		border-color: var(--brand);
		color: var(--on-accent);
		font-weight: 600;
	}

	.chips .chip.on .faint {
		color: inherit;
		opacity: 0.7;
	}

	.filters select {
		font-size: 0.85rem;
		padding: 0.4rem 0.6rem;
	}

	.filters select.votes {
		margin-top: 0.35rem;
	}

	/* Results ------------------------------------------------------------ */


	.results {
		position: relative;
	}

	.results .grid-posters {
		transition: opacity 0.15s ease;
	}

	.results.refreshing .grid-posters {
		opacity: 0.45;
		/* Stops a click landing on a poster that is about to be replaced. */
		pointer-events: none;
	}

	.working {
		position: absolute;
		inset: 0 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding: clamp(2rem, 8vh, 5rem) 0;
		z-index: 1;
	}

	.results {
		min-width: 0;
	}


	.empty {
		padding: 3rem 0;
	}

	@media (max-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}

		.filters {
			position: static;
			max-height: none;
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
			gap: 1rem;
		}
	}
</style>
