<!--
	The catalog, 412,000 rows of it.

	Everything here is the server's job — searching, filtering, counting, paging.
	Nothing about this page changes when the catalog doubles.

	The filter worth having is "missing": the reason to open this table is
	almost never to browse it, it is to find the rows the crawler left
	incomplete and fix them.

	Hiding a work is not deleting it. Shelves, reviews and seen marks all
	cascade from a work, so a real delete would take other people's scores and
	writing with it. Hidden works stay here under "Hidden" and come back whole.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as api from '$lib/api/client.js';
	import Icon from '$lib/components/Icon.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import ConfirmAction from '$lib/components/admin/ConfirmAction.svelte';
	import DataTable from '$lib/components/admin/DataTable.svelte';
	import Toolbar from '$lib/components/admin/Toolbar.svelte';
	import { typeKeys, types } from '$lib/data/types.js';
	import { session } from '$lib/state/session.svelte.js';

	const columns = [
		{ key: 'work', label: 'Title', sort: 'title' },
		{ key: 'year', label: 'Year', sort: 'year', align: 'end' },
		{ key: 'score', label: 'Score', sort: 'score', align: 'end', hideNarrow: true },
		{ key: 'gaps', label: 'Gaps' },
		{ key: 'added', label: 'Crawled', sort: 'added', align: 'end', hideNarrow: true },
		{ key: 'actions', label: '', align: 'end' }
	];

	const typeOptions = [
		{ value: '', label: 'Any kind' },
		...typeKeys.map((key) => ({ value: key, label: types[key].plural }))
	];

	const statusOptions = [
		{ value: '', label: 'In the catalog' },
		{ value: 'deleted', label: 'Hidden' },
		{ value: 'all', label: 'Everything' }
	];

	const missingOptions = [
		{ value: '', label: 'Complete or not' },
		{ value: 'poster', label: 'No poster' },
		{ value: 'overview', label: 'No description' },
		{ value: 'genre', label: 'No genres' },
		{ value: 'imdb', label: 'No IMDb id' },
		{ value: 'year', label: 'No year' }
	];

	let params = $derived(page.url.searchParams);
	let term = $derived(params.get('q') ?? '');
	let type = $derived(params.get('type') ?? '');
	let status = $derived(params.get('status') ?? '');
	let missing = $derived(params.get('missing') ?? '');
	let genre = $derived(params.get('genre') ?? '');
	let sort = $derived(params.get('sort') ?? 'popular');
	let pageNumber = $derived(Number(params.get('page') ?? 1));

	let result = $state({ items: [], total: 0, pages: 0 });
	let loading = $state(true);
	let error = $state(null);
	let busyId = $state(null);
	let genres = $state([]);

	$effect(() => {
		api
			.adminGenres()
			.then((d) => (genres = d.items))
			.catch(() => {});
	});

	let genreOptions = $derived([
		{ value: '', label: 'Any genre' },
		...genres.map((g) => ({ value: g.slug, label: g.name }))
	]);

	$effect(() => {
		const request = { q: term, type, status, missing, genre, sort, page: pageNumber, limit: 25 };

		let live = true;
		loading = true;

		api
			.adminWorks(request)
			.then((data) => {
				if (!live) return;
				result = data;
				error = null;
			})
			.catch((e) => {
				if (live) error = e.message ?? 'Could not load the catalog.';
			})
			.finally(() => {
				if (live) loading = false;
			});

		return () => {
			live = false;
		};
	});

	function set(key, value) {
		const next = new URLSearchParams(page.url.searchParams);
		if (value === '' || value === null) next.delete(key);
		else next.set(key, String(value));
		if (key !== 'page') next.delete('page');
		goto(`/admin/works?${next}`, { noScroll: true, keepFocus: true });
	}

	async function reload() {
		result = await api.adminWorks({
			q: term,
			type,
			status,
			missing,
			genre,
			sort,
			page: pageNumber,
			limit: 25
		});
	}

	async function hide(work) {
		busyId = work.id;
		try {
			await api.adminHideWork(work.id);
			await reload();
		} catch (e) {
			error = e.body?.error ?? e.message;
		} finally {
			busyId = null;
		}
	}

	async function restore(work) {
		busyId = work.id;
		try {
			await api.adminRestoreWork(work.id);
			await reload();
		} catch (e) {
			error = e.body?.error ?? e.message;
		} finally {
			busyId = null;
		}
	}

	/** What the crawler did not fill in, as chips. */
	function gaps(work) {
		const out = [];
		if (!work.poster) out.push('poster');
		if (!work.hasOverview) out.push('description');
		if (!work.year) out.push('year');
		return out;
	}

	/** @param {string} iso */
	function day(iso) {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric' });
	}
</script>

<svelte:head><title>Works — Admin — Feelm</title></svelte:head>

<header class="masthead">
	<div>
		<span class="eyebrow"><Icon name="film" size={14} />Catalog</span>
		<h1 class="display">Works</h1>
	</div>
</header>

<Toolbar
	{term}
	onterm={(value) => set('q', value)}
	placeholder="Search titles…"
	filters={[
		{ key: 'type', label: 'Kind', value: type, options: typeOptions },
		{ key: 'status', label: 'Status', value: status, options: statusOptions },
		{ key: 'missing', label: 'Missing', value: missing, options: missingOptions },
		{ key: 'genre', label: 'Genre', value: genre, options: genreOptions }
	]}
	onfilter={set}
	total={result.total}
	noun="title"
	busy={loading}
/>

{#if error}<p class="error">{error}</p>{/if}

<DataTable
	{columns}
	rows={result.items}
	{sort}
	onsort={(key) => set('sort', key)}
	{loading}
	empty="No titles match that."
>
	{#snippet row(work, column)}
		{#if column.key === 'work'}
			<a class="work" href="/admin/works/{work.id}" data-type={work.type}>
				{#if work.poster}
					<img src={work.poster} alt="" loading="lazy" />
				{:else}
					<span class="noart"><Icon name={work.type} size={14} /></span>
				{/if}
				<span class="title">
					<strong>{work.title}</strong>
					<span class="faint">
						{#if work.originalTitle && work.originalTitle !== work.title}
							{work.originalTitle}
						{:else}
							{work.slug}
						{/if}
					</span>
				</span>
			</a>
		{:else if column.key === 'year'}
			<span class="num">{work.year ?? '—'}</span>
		{:else if column.key === 'score'}
			<span class="num">
				{work.externalScore ? Number(work.externalScore).toFixed(1) : '—'}
			</span>
		{:else if column.key === 'gaps'}
			{#if work.hidden}
				<span class="chip gone">Hidden</span>
			{:else if gaps(work).length}
				<span class="chips">
					{#each gaps(work) as gap (gap)}<span class="chip warn">no {gap}</span>{/each}
				</span>
			{:else}
				<span class="faint">—</span>
			{/if}
		{:else if column.key === 'added'}
			<span class="num faint">{day(work.addedAt)}</span>
		{:else if column.key === 'actions'}
			<div class="actions">
				{#if busyId === work.id}
					<Spinner size={14} />
				{:else if work.hidden}
					{#if session.isAdmin}
						<button type="button" class="btn btn-sm" onclick={() => restore(work)}>
							<Icon name="refresh" size={13} />Restore
						</button>
					{/if}
				{:else}
					<a class="btn btn-sm btn-ghost" href="/admin/works/{work.id}">Edit</a>
					{#if session.isAdmin}
						<ConfirmAction
							label="Hide"
							prompt="Hide it from the catalog?"
							confirmLabel="Hide"
							icon="eye"
							onconfirm={() => hide(work)}
						/>
					{/if}
				{/if}
			</div>
		{/if}
	{/snippet}
</DataTable>

<Pager page={pageNumber} pages={result.pages} onpage={(n) => set('page', n)} />

<style>
	.masthead {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.5rem;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--brand);
	}

	h1 {
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		margin: 0.3rem 0 0;
	}

	.error {
		margin: 0 0 1rem;
		color: var(--danger);
		font-size: 0.88rem;
	}

	.work {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
		max-width: 22rem;
	}

	.work img,
	.noart {
		width: 2rem;
		height: 3rem;
		flex: none;
		border-radius: var(--radius-sm);
		object-fit: cover;
		background: var(--surface-2);
	}

	.noart {
		display: grid;
		place-items: center;
		color: var(--accent);
	}

	.title {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.25;
	}

	.title strong,
	.title span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.title strong {
		font-size: 0.88rem;
	}

	.title span {
		font-size: 0.76rem;
	}

	.work:hover strong {
		color: var(--accent);
	}

	.num {
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	.chips {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.chip.warn {
		border-color: color-mix(in srgb, var(--book) 45%, transparent);
		color: var(--book);
		font-size: 0.72rem;
	}

	.chip.gone {
		border-color: color-mix(in srgb, var(--danger) 40%, transparent);
		color: var(--danger);
	}

	.actions {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.35rem;
		flex-wrap: wrap;
	}
</style>
