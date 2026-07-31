<!--
	1.1 million people, one per name the crawler has ever seen.

	The default sort is alphabetical rather than most-credited, and that is a
	performance decision the API makes: ordering by credit count means counting
	all 1.1 million rows before throwing almost all of them away. "Most
	credited" is offered, it just is not free.

	The filter that earns its place is "no credits" — the crawler creates a
	person the moment it reads a name, so a person nothing points at any more is
	a row worth looking at.
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
	import { session } from '$lib/state/session.svelte.js';

	const columns = [
		{ key: 'person', label: 'Name', sort: 'name' },
		{ key: 'credits', label: 'Credits', sort: 'credits', align: 'end' },
		{ key: 'external', label: 'TMDB id', hideNarrow: true },
		{ key: 'actions', label: '', align: 'end' }
	];

	const photoOptions = [
		{ value: '', label: 'With or without a photo' },
		{ value: 'yes', label: 'Has a photo' },
		{ value: 'no', label: 'No photo' }
	];

	const creditOptions = [
		{ value: '', label: 'Credited or not' },
		{ value: 'some', label: 'Has credits' },
		{ value: 'none', label: 'No credits left' }
	];

	let params = $derived(page.url.searchParams);
	let term = $derived(params.get('q') ?? '');
	let photo = $derived(params.get('photo') ?? '');
	let credits = $derived(params.get('credits') ?? '');
	let sort = $derived(params.get('sort') ?? 'name');
	let pageNumber = $derived(Number(params.get('page') ?? 1));

	let result = $state({ items: [], total: 0, pages: 0 });
	let loading = $state(true);
	let error = $state(null);
	let busyId = $state(null);

	$effect(() => {
		const request = { q: term, photo, credits, sort, page: pageNumber, limit: 25 };

		let live = true;
		loading = true;

		api
			.adminPeople(request)
			.then((data) => {
				if (!live) return;
				result = data;
				error = null;
			})
			.catch((e) => {
				if (live) error = e.message ?? 'Could not load people.';
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
		goto(`/admin/people?${next}`, { noScroll: true, keepFocus: true });
	}

	async function remove(person) {
		busyId = person.id;
		try {
			await api.adminDeletePerson(person.id);
			result = await api.adminPeople({ q: term, photo, credits, sort, page: pageNumber, limit: 25 });
		} catch (e) {
			error =
				e.body?.error === 'person_has_credits'
					? `${person.name} still has credits. Open them and merge instead.`
					: (e.body?.error ?? e.message);
		} finally {
			busyId = null;
		}
	}
</script>

<svelte:head><title>People — Admin — Feelm</title></svelte:head>

<header class="masthead">
	<div>
		<span class="eyebrow"><Icon name="user" size={14} />Catalog</span>
		<h1 class="display">People</h1>
	</div>
</header>

<Toolbar
	{term}
	onterm={(value) => set('q', value)}
	placeholder="Search names…"
	filters={[
		{ key: 'photo', label: 'Photo', value: photo, options: photoOptions },
		{ key: 'credits', label: 'Credits', value: credits, options: creditOptions }
	]}
	onfilter={set}
	total={result.total}
	noun="person"
	busy={loading}
/>

{#if error}<p class="error">{error}</p>{/if}

<DataTable
	{columns}
	rows={result.items}
	{sort}
	onsort={(key) => set('sort', key)}
	{loading}
	empty="Nobody matches that."
>
	{#snippet row(person, column)}
		{#if column.key === 'person'}
			<a class="who" href="/admin/people/{person.id}">
				{#if person.photo}
					<img src={person.photo} alt="" loading="lazy" />
				{:else}
					<span class="noart"><Icon name="user" size={14} /></span>
				{/if}
				<span class="names">
					<strong>{person.name}</strong>
					<span class="faint">{person.slug}</span>
				</span>
			</a>
		{:else if column.key === 'credits'}
			<span class="num" class:zero={person.creditCount === 0}>
				{person.creditCount?.toLocaleString() ?? '—'}
			</span>
		{:else if column.key === 'external'}
			{#if person.externalId}
				<span class="faint mono">{person.externalId}</span>
			{:else}
				<span class="faint">—</span>
			{/if}
		{:else if column.key === 'actions'}
			<div class="actions">
				{#if busyId === person.id}
					<Spinner size={14} />
				{:else}
					<a class="btn btn-sm btn-ghost" href="/admin/people/{person.id}">Open</a>
					{#if session.isAdmin && person.creditCount === 0}
						<ConfirmAction
							label="Delete"
							prompt="Delete {person.name}?"
							confirmLabel="Delete"
							onconfirm={() => remove(person)}
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

	.who {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
		max-width: 24rem;
	}

	.who img,
	.noart {
		width: 2.2rem;
		height: 2.2rem;
		flex: none;
		border-radius: 50%;
		object-fit: cover;
		background: var(--surface-2);
	}

	.noart {
		display: grid;
		place-items: center;
		color: var(--faint);
	}

	.names {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.25;
	}

	.names strong,
	.names span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.names strong {
		font-size: 0.88rem;
	}

	.names span {
		font-size: 0.76rem;
	}

	.who:hover strong {
		color: var(--brand);
	}

	.num {
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	.num.zero {
		color: var(--danger);
	}

	.mono {
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}

	.actions {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.35rem;
		flex-wrap: wrap;
	}
</style>
