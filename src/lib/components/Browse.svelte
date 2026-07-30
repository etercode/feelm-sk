<!--
	The browse page for one type.

	Filtering, sorting and paging all happen in the database — the page renders
	whatever the load function fetched and writes any change back into the query
	string, so a browse view is a shareable link and the counts are the real
	catalog counts rather than counts of the first page.
-->
<script>
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import PosterCard from '$lib/components/PosterCard.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { types } from '$lib/data/types.js';
	import { plural } from '$lib/util/format.js';

	let { type, title, intro, data } = $props();

	let spec = $derived(types[type]);
	/*
	 * Changing a filter, a sort or a page is a navigation to this same route, so
	 * the results are replaced while everything around them stays put. The bar
	 * at the top of the window is easy to miss when the thing that changes is
	 * halfway down the page, so the grid says so itself.
	 */
	let refreshing = $derived(navigating.to?.route.id === page.route.id);
	let results = $derived(data.results);
	let facets = $derived(data.results?.facets ?? null);
	let params = $derived(page.url.searchParams);
	let pageNumber = $derived(Number(params.get('page') ?? 1));

	const sortLabels = {
		popularity: 'Most popular',
		score: 'Highest rated',
		newest: 'Newest first',
		oldest: 'Oldest first',
		title: 'A–Z',
		added: 'Recently crawled'
	};

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

	function toggleGenre(slug) {
		const current = params.getAll('genre');
		apply({ genre: current.includes(slug) ? current.filter((g) => g !== slug) : [...current, slug] });
	}
</script>

<div class="frame page" data-type={type}>
	<header class="masthead">
		<div>
			<span class="eyebrow"><Icon name={type} size={14} />{spec.plural}</span>
			<h1 class="display">{title}</h1>
			<p class="muted">{intro}</p>
		</div>
		{#if results}
			<span class="count display">{results.total.toLocaleString()}</span>
		{/if}
	</header>

	{#if data.unreachable}
		<p class="notice">The catalog API is unreachable.</p>
	{:else}
		<div class="filters">
			<div class="genres scroller">
				<button
					type="button"
					class="chip"
					class:on={!params.getAll('genre').length}
					onclick={() => apply({ genre: null })}
				>
					All
				</button>
				{#each facets?.genres ?? [] as genre (genre.slug)}
					<button
						type="button"
						class="chip"
						class:on={params.getAll('genre').includes(genre.slug)}
						onclick={() => toggleGenre(genre.slug)}
					>
						{genre.name} <span class="faint">{genre.count.toLocaleString()}</span>
					</button>
				{/each}
			</div>

			<div class="tools">
				<a class="btn btn-sm" href="/search?type={type}">
					<Icon name="search" size={13} />More filters
				</a>
				<label class="sort">
					<span class="sr-only">Sort by</span>
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

		<p class="result faint">
			{plural(results.total, spec.label.toLowerCase())}
			{#if results.pages > 1}· page {pageNumber} of {results.pages.toLocaleString()}{/if}
		</p>

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
					<p class="muted">Nothing here with those filters.</p>
				{/each}
			</div>

			{#if refreshing}
				<div class="working">
					<Spinner size={22} />
					<span class="faint">Loading…</span>
				</div>
			{/if}
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
				<span class="faint">{pageNumber} / {results.pages.toLocaleString()}</span>
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

	.count {
		font-size: clamp(2.5rem, 7vw, 4.5rem);
		color: var(--accent);
		opacity: 0.35;
		line-height: 1;
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

	.genres {
		display: flex;
		gap: 0.4rem;
		min-width: 0;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: none;
	}

	.chip {
		cursor: pointer;
		flex: none;
		transition:
			background 0.18s ease,
			color 0.18s ease,
			border-color 0.18s ease;
	}

	.chip:hover {
		color: var(--ink);
		border-color: var(--line-strong);
	}

	.chip.on {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
		font-weight: 600;
	}

	.chip.on .faint {
		color: inherit;
		opacity: 0.75;
	}

	select {
		padding: 0.3rem 0.6rem;
		font-size: 0.82rem;
		border-radius: 99px;
	}

	.result {
		margin: 1.1rem 0;
		font-size: 0.82rem;
	}

	.grid-posters {
		padding-bottom: 1rem;
	}

	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding-block: 1.5rem 2.5rem;
	}

	@media (max-width: 700px) {
		.filters {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
