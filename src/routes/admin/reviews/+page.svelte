<!--
	Moderating what people write.

	This is the table a moderator exists for, so nothing on it is gated behind
	being an administrator.

	Two things are deliberate. Editing opens a dialog showing the wording
	history, because the point of moderating a review is knowing what it used to
	say. And deleting asks you to type the author's handle first: a review is
	somebody's writing, the delete is permanent, and it takes the history with
	it.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as api from '$lib/api/client.js';
	import Avatar from '$lib/components/Avatar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import ConfirmAction from '$lib/components/admin/ConfirmAction.svelte';
	import DataTable from '$lib/components/admin/DataTable.svelte';
	import Toolbar from '$lib/components/admin/Toolbar.svelte';
	import { typeKeys, types } from '$lib/data/types.js';

	const columns = [
		{ key: 'work', label: 'Title' },
		{ key: 'author', label: 'Author' },
		{ key: 'rating', label: 'Score', sort: 'rating', align: 'end' },
		{ key: 'body', label: 'Review' },
		{ key: 'when', label: 'Written', sort: 'recent', align: 'end', hideNarrow: true },
		{ key: 'actions', label: '', align: 'end' }
	];

	const ratingOptions = [
		{ value: '', label: 'Any score' },
		{ value: 'low', label: '2 stars and under' },
		{ value: 'mid', label: 'Between 2 and 4' },
		{ value: 'high', label: '4 stars and up' }
	];

	const editedOptions = [
		{ value: '', label: 'Edited or not' },
		{ value: 'yes', label: 'Rewritten' },
		{ value: 'no', label: 'Never edited' }
	];

	const typeOptions = [
		{ value: '', label: 'Any kind' },
		...typeKeys.map((key) => ({ value: key, label: types[key].plural }))
	];

	let params = $derived(page.url.searchParams);
	let term = $derived(params.get('q') ?? '');
	let rating = $derived(params.get('rating') ?? '');
	let edited = $derived(params.get('edited') ?? '');
	let type = $derived(params.get('type') ?? '');
	let author = $derived(params.get('user') ?? '');
	let sort = $derived(params.get('sort') ?? 'recent');
	let pageNumber = $derived(Number(params.get('page') ?? 1));

	let result = $state({ items: [], total: 0, pages: 0 });
	let loading = $state(true);
	let error = $state(null);
	let busyId = $state(null);

	$effect(() => {
		const request = {
			q: term,
			user: author,
			type,
			rating,
			edited,
			sort,
			page: pageNumber,
			limit: 25
		};

		// Typing fires several of these and they need not return in order.
		let live = true;
		loading = true;

		api
			.adminReviews(request)
			.then((data) => {
				if (!live) return;
				result = data;
				error = null;
			})
			.catch((e) => {
				if (live) error = e.message ?? 'Could not load reviews.';
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
		goto(`/admin/reviews?${next}`, { noScroll: true, keepFocus: true });
	}

	async function reload() {
		result = await api.adminReviews({
			q: term,
			user: author,
			type,
			rating,
			edited,
			sort,
			page: pageNumber,
			limit: 25
		});
	}

	async function remove(review) {
		busyId = review.id;
		try {
			await api.adminDeleteReview(review.id);
			await reload();
		} catch (e) {
			error = e.body?.error ?? e.message;
		} finally {
			busyId = null;
		}
	}

	/* ---- editing ---- */

	let editing = $state(null);
	let draft = $state({ rating: 0, body: '' });
	let saving = $state(false);
	let formError = $state(null);

	async function open(review) {
		formError = null;
		saving = false;
		// The row has no history — that only comes with the review itself.
		editing = review;
		draft = { rating: review.rating, body: review.body };

		try {
			editing = await api.adminReview(review.id);
			draft = { rating: editing.rating, body: editing.body };
		} catch (e) {
			formError = e.message ?? 'Could not load the full review.';
		}
	}

	let dirty = $derived(
		Boolean(editing) && (draft.rating !== editing.rating || draft.body !== editing.body)
	);

	async function save(event) {
		event.preventDefault();
		saving = true;
		formError = null;

		try {
			await api.adminUpdateReview(editing.id, { rating: draft.rating, body: draft.body });
			editing = null;
			await reload();
		} catch (e) {
			const code = e.body?.error;
			formError =
				{
					invalid_rating: 'Scores go in half stars, from 0.5 to 5.',
					empty_body: 'A review cannot be empty. Delete it instead.',
					empty_payload: 'Nothing was changed.'
				}[code] ??
				e.body?.detail ??
				e.message ??
				'Could not save.';
		} finally {
			saving = false;
		}
	}

	/** @param {string} iso */
	function ago(iso) {
		if (!iso) return '—';
		const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
		if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m ago`;
		if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
		if (seconds < 2592000) return `${Math.round(seconds / 86400)}d ago`;
		return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
	}

	/** @param {string} iso */
	function stamp(iso) {
		return iso ? new Date(iso).toLocaleString() : '—';
	}
</script>

<svelte:head><title>Reviews — Admin — Feelm</title></svelte:head>

<header class="masthead">
	<div>
		<span class="eyebrow"><Icon name="quote" size={14} />Moderation</span>
		<h1 class="display">Reviews</h1>
	</div>
</header>

<Toolbar
	{term}
	onterm={(value) => set('q', value)}
	placeholder="Search the text, a title or an author…"
	filters={[
		{ key: 'type', label: 'Kind', value: type, options: typeOptions },
		{ key: 'rating', label: 'Score', value: rating, options: ratingOptions },
		{ key: 'edited', label: 'Edited', value: edited, options: editedOptions }
	]}
	onfilter={set}
	total={result.total}
	noun="review"
	busy={loading}
/>

{#if author}
	<p class="scoped">
		Only reviews by <strong>@{author}</strong>
		<button type="button" class="btn btn-sm btn-ghost" onclick={() => set('user', '')}>
			<Icon name="close" size={12} />Clear
		</button>
	</p>
{/if}

{#if error}<p class="error">{error}</p>{/if}

<DataTable
	{columns}
	rows={result.items}
	{sort}
	onsort={(key) => set('sort', key)}
	{loading}
	empty="No reviews match that."
>
	{#snippet row(review, column)}
		{#if column.key === 'work'}
			{#if review.work}
				<a class="work" href="/{review.work.type}/{review.work.slug}" data-type={review.work.type}>
					{#if review.work.poster}
						<img src={review.work.poster} alt="" loading="lazy" />
					{:else}
						<span class="noart"><Icon name={review.work.type} size={14} /></span>
					{/if}
					<span class="title">
						<strong>{review.work.title}</strong>
						<span class="faint">{review.work.year ?? '—'}</span>
					</span>
				</a>
			{:else}
				<span class="faint">—</span>
			{/if}
		{:else if column.key === 'author'}
			<a class="who" href="/admin/users/{review.user?.id}">
				<Avatar user={review.user} size={26} />
				<span class="faint">@{review.user?.username}</span>
			</a>
		{:else if column.key === 'rating'}
			<span class="score"><Stars value={review.rating} size={13} /></span>
		{:else if column.key === 'body'}
			<button type="button" class="excerpt" onclick={() => open(review)} title="Open this review">
				{review.body}
				{#if review.edited}
					<em class="tag">edited ×{review.versionCount}</em>
				{/if}
			</button>
		{:else if column.key === 'when'}
			<span class="num faint" title={stamp(review.createdAt)}>{ago(review.createdAt)}</span>
		{:else if column.key === 'actions'}
			<div class="actions">
				{#if busyId === review.id}
					<Spinner size={14} />
				{:else}
					<button type="button" class="btn btn-sm btn-ghost" onclick={() => open(review)}>Edit</button>
					<ConfirmAction
						label="Delete"
						prompt="Type @{review.user?.username} to confirm:"
						confirmLabel="Delete"
						confirmText={review.user?.username}
						onconfirm={() => remove(review)}
					/>
				{/if}
			</div>
		{/if}
	{/snippet}
</DataTable>

<Pager page={pageNumber} pages={result.pages} onpage={(n) => set('page', n)} />

<Modal open={Boolean(editing)} title="Edit review" wide onclose={() => (editing = null)}>
	{#if editing}
		<div class="context">
			<Avatar user={editing.user} size={32} />
			<div>
				<strong>{editing.user?.name}</strong>
				<span class="faint">
					on {editing.work?.title ?? 'a title'} · written {stamp(editing.createdAt)}
				</span>
			</div>
			<button type="button" class="btn btn-sm" onclick={() => set('user', editing.user?.username)}>
				Their reviews
			</button>
		</div>

		<form onsubmit={save}>
			<label class="stars">
				<span class="eyebrow">Score</span>
				<Stars
					value={draft.rating}
					size={22}
					interactive
					onchange={(value) => (draft.rating = value)}
					label="Score"
				/>
			</label>

			<label>
				<span class="eyebrow">Text</span>
				<textarea class="field" rows="8" bind:value={draft.body}></textarea>
			</label>

			<p class="hint faint">
				Saving keeps what it said before. An edit that changes nothing is not recorded.
			</p>

			{#if formError}<p class="error">{formError}</p>{/if}

			<div class="foot">
				<button type="button" class="btn" onclick={() => (editing = null)}>Cancel</button>
				<button type="submit" class="btn btn-primary" disabled={saving || !dirty}>
					{saving ? 'Saving…' : 'Save review'}
				</button>
			</div>
		</form>

		{#if editing.history?.length}
			<section class="history">
				<h3 class="eyebrow"><Icon name="history" size={13} />What it said before</h3>
				<ol>
					{#each editing.history as version, i (i)}
						<li>
							<div class="version-head">
								<Stars value={version.rating} size={12} />
								<span class="faint">{stamp(version.editedAt)}</span>
							</div>
							<p>{version.body}</p>
						</li>
					{/each}
				</ol>
			</section>
		{/if}
	{/if}
</Modal>

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

	.scoped {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0 0 1rem;
		font-size: 0.88rem;
		color: var(--muted);
	}

	.error {
		margin: 0 0 1rem;
		color: var(--danger);
		font-size: 0.88rem;
	}

	/* Cells -------------------------------------------------------------- */

	.work {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		min-width: 0;
		max-width: 15rem;
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

	.title strong {
		font-size: 0.88rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.title span {
		font-size: 0.78rem;
	}

	.work:hover strong {
		color: var(--accent);
	}

	.who {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.84rem;
	}

	.who:hover .faint {
		color: var(--brand);
	}

	.score {
		display: inline-flex;
		justify-content: flex-end;
	}

	/* The text is the interesting column, so it opens the review. */
	.excerpt {
		display: block;
		max-width: 32rem;
		padding: 0;
		border: 0;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.86rem;
		text-align: left;
		line-height: 1.45;
		cursor: pointer;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.excerpt:hover {
		color: var(--ink);
	}

	.tag {
		font-size: 0.72rem;
		font-style: normal;
		color: var(--brand);
		white-space: nowrap;
	}

	.num {
		font-size: 0.82rem;
		font-variant-numeric: tabular-nums;
	}

	.actions {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	/* Dialog ------------------------------------------------------------- */

	.context {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding-bottom: 1rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--line);
		font-size: 0.88rem;
	}

	.context > div {
		display: flex;
		flex-direction: column;
		min-width: 0;
		line-height: 1.3;
	}

	.context span {
		font-size: 0.8rem;
	}

	.context .btn {
		margin-left: auto;
		flex: none;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.stars {
		gap: 0.45rem;
	}

	textarea.field {
		resize: vertical;
		font: inherit;
		line-height: 1.55;
	}

	.hint {
		margin: 0;
		font-size: 0.8rem;
	}

	.foot {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	/* History ------------------------------------------------------------ */

	.history {
		margin-top: 1.5rem;
		padding-top: 1.1rem;
		border-top: 1px solid var(--line);
	}

	.history h3 {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0 0 0.75rem;
		color: var(--faint);
	}

	.history ol {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.history li {
		padding: 0.7rem 0.85rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.version-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.35rem;
		font-size: 0.78rem;
	}

	.history p {
		margin: 0;
		font-size: 0.86rem;
		line-height: 1.5;
		color: var(--muted);
		white-space: pre-wrap;
	}
</style>
