<!--
	Advanced search.

	Every control writes to the query string and lets the load function re-run,
	which keeps the URL and the results honest about each other — no local state
	that can drift, and a filtered search is a link you can send someone.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import { types, typeKeys } from '$lib/data/types.js';
	import { plural } from '$lib/util/format.js';

	let { data } = $props();

	let params = $derived(page.url.searchParams);
	let results = $derived(data.results);
	let facets = $derived(data.results?.facets ?? null);

	let queryText = $state('');
	$effect(() => {
		queryText = params.get('q') ?? '';
	});

	const sortLabels = {
		relevance: 'Best match',
		popularity: 'Most popular',
		score: 'Highest rated',
		imdb: 'Highest on IMDb',
		newest: 'Newest first',
		oldest: 'Oldest first',
		title: 'A–Z',
		added: 'Recently crawled'
	};

	const scoreSteps = [
		{ value: '', label: 'Any score' },
		{ value: '60', label: '60 and up' },
		{ value: '70', label: '70 and up' },
		{ value: '80', label: '80 and up' },
		{ value: '90', label: '90 and up' }
	];

	// IMDb publishes out of 10, so the filter speaks in those units.
	const imdbSteps = [
		{ value: '', label: 'Any IMDb rating' },
		{ value: '6', label: '6.0 and up' },
		{ value: '7', label: '7.0 and up' },
		{ value: '8', label: '8.0 and up' },
		{ value: '9', label: '9.0 and up' }
	];

	const votesSteps = [
		{ value: '', label: 'Any number of votes' },
		{ value: '1000', label: '1k+ votes' },
		{ value: '10000', label: '10k+ votes' },
		{ value: '100000', label: '100k+ votes' }
	];

	const runtimeSteps = [
		{ value: '', label: 'Any length' },
		{ value: '0-45', label: 'Under 45m' },
		{ value: '45-90', label: '45m – 1h30' },
		{ value: '90-150', label: '1h30 – 2h30' },
		{ value: '150-', label: 'Over 2h30' }
	];

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
	<title>{queryText ? `${queryText} — search` : 'Search'} — Feelm</title>
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
			placeholder="Title, person, genre…"
			autocomplete="off"
		/>
		<button type="submit" class="btn btn-primary">Search</button>
	</form>

	{#if data.unreachable}
		<p class="notice">The catalog API is unreachable. Is it running on {`8092`}?</p>
	{:else}
		<div class="summary">
			<p class="count">
				{#if results.total}
					<strong>{results.total.toLocaleString()}</strong>
					{plural(results.total, 'result').split(' ').slice(1).join(' ')}
					{#if queryText}for “{queryText}”{/if}
				{:else if activeCount}
					Nothing matches {queryText ? `“${queryText}” with those filters` : 'those filters'}
				{:else if queryText}
					Nothing matches “{queryText}”
				{:else}
					{results.total.toLocaleString()} titles
				{/if}
			</p>

			<label class="sort">
				<span class="sr-only">Sort</span>
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
				Did you mean
				<a href="/search?{new URLSearchParams({ ...Object.fromEntries(params), q: results.suggestion.term, page: '1' })}">
					{results.suggestion.term}
				</a>?
				<span class="faint">{plural(results.suggestion.total, 'result')}</span>
			</p>
		{/if}

		<div class="layout">
			<aside class="filters">
				<header>
					<span class="eyebrow">Filters</span>
					{#if activeCount}
						<a class="clear" href="/search?{new URLSearchParams(queryText ? { q: queryText } : {})}">
							Clear {activeCount}
						</a>
					{/if}
				</header>

				<section>
					<h2>Type</h2>
					{#each typeKeys as key (key)}
						<label class="check" data-type={key}>
							<input
								type="checkbox"
								checked={selected('type', key)}
								onchange={() => toggle('type', key)}
							/>
							<Icon name={key} size={13} />
							<span class="label">{types[key].plural}</span>
							{#if facets}<span class="n">{(facets.types[key] ?? 0).toLocaleString()}</span>{/if}
						</label>
					{/each}
				</section>

				{#if facets?.genres?.length}
					<section>
						<h2>Genre</h2>
						<div class="scroll-list">
							{#each facets.genres as genre (genre.slug)}
								<label class="check">
									<input
										type="checkbox"
										checked={selected('genre', genre.slug)}
										onchange={() => toggle('genre', genre.slug)}
									/>
									<span class="label">{genre.name}</span>
									<span class="n">{genre.count.toLocaleString()}</span>
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
								<span class="label">Must match all</span>
							</label>
						{/if}
					</section>
				{/if}

				{#if facets?.decades?.length}
					<section>
						<h2>Decade</h2>
						<div class="chips">
							{#each facets.decades.slice(0, 14) as bucket (bucket.decade)}
								<button
									type="button"
									class="chip"
									class:on={decadeValue === String(bucket.decade)}
									onclick={() => setDecade(bucket.decade)}
								>
									{bucket.decade}s <span class="faint">{bucket.count}</span>
								</button>
							{/each}
						</div>
					</section>
				{/if}

				<section>
					<h2>Score</h2>
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
					<h2>Length</h2>
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
					<h2>Release</h2>
					<select
						class="field"
						value={params.get('release') ?? 'any'}
						onchange={(event) => apply({ release: event.currentTarget.value })}
					>
						<option value="any">Anything</option>
						<option value="released">Out now</option>
						<option value="upcoming">Not out yet</option>
					</select>
				</section>

				{#if data.filters.certifications.length}
					<section>
						<h2>Rated</h2>
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
						<h2>Language</h2>
						<div class="chips">
							{#each data.filters.languages.slice(0, 10) as lang (lang.code)}
								<button
									type="button"
									class="chip"
									class:on={selected('language', lang.code)}
									onclick={() => toggle('language', lang.code)}
								>
									{lang.code.toUpperCase()} <span class="faint">{lang.count}</span>
								</button>
							{/each}
						</div>
					</section>
				{/if}
			</aside>

			<div class="results">
				{#if results.items.length}
					<div class="grid-posters">
						{#each results.items as item (item.id)}
							<PosterCard {item} />
						{/each}
					</div>

					{#if results.pages > 1}
						<nav class="pager">
							<button
								type="button"
								class="btn btn-sm"
								disabled={pageNumber <= 1}
								onclick={() => apply({ page: pageNumber - 1 }, { resetPage: false })}
							>
								<Icon name="left" size={14} />Previous
							</button>
							<span class="faint">Page {pageNumber} of {results.pages.toLocaleString()}</span>
							<button
								type="button"
								class="btn btn-sm"
								disabled={pageNumber >= results.pages}
								onclick={() => apply({ page: pageNumber + 1 }, { resetPage: false })}
							>
								Next<Icon name="right" size={14} />
							</button>
						</nav>
					{/if}
				{:else}
					<div class="empty">
						<p class="muted">
							{#if results.suggestion}
								Nothing under that spelling — try the correction above.
							{:else if activeCount}
								No titles match all of those filters.
							{:else}
								Search the catalog by title, person or genre.
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
		border-left: 3px solid var(--brass);
		background: var(--brass-soft);
		border-radius: 0 var(--radius) var(--radius) 0;
		font-size: 0.95rem;
	}

	.did-you-mean a {
		font-weight: 600;
		color: var(--brass);
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
		color: var(--brass);
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
		accent-color: var(--accent, var(--brass));
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
		background: var(--brass);
		border-color: var(--brass);
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
		min-width: 0;
	}

	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 2rem;
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
