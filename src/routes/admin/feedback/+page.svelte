<!--
	The moderation queue.

	Sorted undecided-first by default, because the only question this page
	exists to answer is "what have I not looked at yet". Accepting is the
	consequential click — it takes the report away from its author — so it is
	the one with a primary button, and declining asks for a reason.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import Toolbar from '$lib/components/admin/Toolbar.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import * as api from '$lib/api/client.js';
	import { session } from '$lib/state/session.svelte.js';
	import { relativeTime } from '$lib/util/format.js';

	const STATUSES = ['new', 'accepted', 'done', 'declined'];
	const CATEGORIES = ['bug', 'idea', 'other'];

	let ready = $state(false);
	let loading = $state(true);
	let data = $state(/** @type {any} */ (null));
	let error = $state(/** @type {string | null} */ (null));

	/** Which report is showing its decline box. */
	let declining = $state(/** @type {number | null} */ (null));
	let note = $state('');
	let confirming = $state(/** @type {number | null} */ (null));

	let params = $derived(page.url.searchParams);
	let pageNumber = $derived(Number(params.get('page') ?? 1));

	$effect(() => {
		session.hydrate().then(() => {
			ready = true;
			void load(page.url.search);
		});
	});

	/** @param {string} search */
	async function load(search) {
		loading = true;
		try {
			const q = new URLSearchParams(search);
			data = await api.adminFeedback(Object.fromEntries(q));
			error = null;
		} catch (e) {
			error = 'Could not load the queue.';
		} finally {
			loading = false;
		}
	}

	/** @param {Record<string, string | null>} changes */
	function apply(changes, { resetPage = true } = {}) {
		const next = new URLSearchParams(params);
		for (const [k, v] of Object.entries(changes)) {
			if (v) next.set(k, v);
			else next.delete(k);
		}
		if (resetPage) next.delete('page');
		goto(`/admin/feedback?${next}`, { noScroll: true, keepFocus: true });
	}

	async function setStatus(item, status, why = null) {
		try {
			await api.adminSetFeedbackStatus(item.id, status, why);
			declining = null;
			note = '';
			await load(page.url.search);
		} catch {
			error = 'That did not save.';
		}
	}

	async function remove(item) {
		try {
			await api.adminDeleteFeedback(item.id);
			confirming = null;
			await load(page.url.search);
		} catch {
			error = 'Could not delete it.';
		}
	}

	function tone(status) {
		return { new: 'wait', accepted: 'go', done: 'ok', declined: 'no' }[status] ?? 'wait';
	}
</script>

<svelte:head><title>Feedback — Admin</title></svelte:head>

<header class="masthead">
	<h1 class="display">Feedback</h1>
	{#if data?.counts}
		<p class="muted">
			{data.counts.new} waiting · {data.counts.accepted} accepted · {data.counts.done} done · {data.counts.declined} declined
		</p>
	{/if}
</header>

{#if error}<p class="error">{error}</p>{/if}

<Toolbar
	term={params.get('q') ?? ''}
	onterm={(value) => apply({ q: value })}
	placeholder="Search the text or an author…"
	filters={[
		{
			key: 'status',
			label: 'Status',
			value: params.get('status') ?? '',
			options: [{ value: '', label: 'Any status' }, ...STATUSES.map((s) => ({ value: s, label: s }))]
		},
		{
			key: 'category',
			label: 'Kind',
			value: params.get('category') ?? '',
			options: [{ value: '', label: 'Any kind' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]
		}
	]}
	onfilter={(key, value) => apply({ [key]: value })}
	total={data?.total ?? null}
	noun="report"
	busy={loading}
/>

{#if !ready || loading}
	<p class="faint"><Spinner size={15} /> Loading…</p>
{:else if !data?.items?.length}
	<p class="muted">Nothing here.</p>
{:else}
	<ul class="queue">
		{#each data.items as item (item.id)}
			<li class="card report">
				<div class="head">
					<span class="state {tone(item.status)}">{item.status}</span>
					<span class="faint">{item.category}</span>
					{#if item.user}
						<a class="who" href="/u/{item.user.username}">@{item.user.username}</a>
					{/if}
					<span class="faint when">{relativeTime(item.createdAt)}</span>
				</div>

				<p class="body">{item.body}</p>

				{#if item.images?.length}
					<ul class="shots">
						{#each item.images as image (image.id)}
							<li>
								{#if image.purged}
									<span class="gone" title="Screenshot purged"><Icon name="image" size={15} /></span>
								{:else}
									<a href={image.url} target="_blank" rel="noreferrer">
										<img src={image.url} alt="" loading="lazy" />
									</a>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				{#if item.note}
					<p class="note"><strong>Reply:</strong> {item.note}</p>
				{/if}

				{#if declining === item.id}
					<div class="decline">
						<input class="field" placeholder="Why not? (shown to the author)" bind:value={note} />
						<button type="button" class="btn btn-sm" onclick={() => setStatus(item, 'declined', note)}>
							Decline
						</button>
						<button type="button" class="btn btn-sm btn-ghost" onclick={() => (declining = null)}>Cancel</button>
					</div>
				{:else}
					<div class="row">
						{#if item.status === 'new'}
							<button type="button" class="btn btn-sm btn-primary" onclick={() => setStatus(item, 'accepted')}>
								<Icon name="check" size={12} />Accept
							</button>
							<button type="button" class="btn btn-sm btn-ghost" onclick={() => (declining = item.id)}>
								Decline
							</button>
						{:else if item.status === 'accepted'}
							<button type="button" class="btn btn-sm btn-primary" onclick={() => setStatus(item, 'done')}>
								<Icon name="check" size={12} />Mark done
							</button>
							<button type="button" class="btn btn-sm btn-ghost" onclick={() => setStatus(item, 'new')}>
								Back to new
							</button>
						{:else}
							<button type="button" class="btn btn-sm btn-ghost" onclick={() => setStatus(item, 'accepted')}>
								Reopen
							</button>
						{/if}

						{#if session.isAdmin}
							{#if confirming === item.id}
								<button type="button" class="btn btn-sm danger" onclick={() => remove(item)}>Really delete</button>
								<button type="button" class="btn btn-sm btn-ghost" onclick={() => (confirming = null)}>Cancel</button>
							{:else}
								<button type="button" class="btn btn-sm btn-ghost del" onclick={() => (confirming = item.id)}>
									<Icon name="trash" size={12} />
								</button>
							{/if}
						{/if}
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	<Pager page={pageNumber} pages={data.pages} onpage={(n) => apply({ page: String(n) }, { resetPage: false })} />
{/if}

<style>
	.masthead {
		padding-bottom: 1rem;
	}

	h1 {
		font-size: clamp(1.6rem, 4vw, 2.2rem);
		margin: 0 0 0.25rem;
	}

	.masthead p {
		margin: 0;
		font-size: 0.85rem;
	}

	.error {
		color: var(--danger);
	}

	.queue {
		list-style: none;
		margin: 1rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.report {
		padding: 0.85rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.78rem;
	}

	.state {
		padding: 0.1rem 0.5rem;
		border-radius: 99px;
		font-weight: 600;
		font-size: 0.72rem;
		text-transform: capitalize;
	}

	.state.wait {
		background: var(--tint);
		color: var(--muted);
	}
	.state.go {
		background: color-mix(in srgb, var(--brand) 18%, transparent);
		color: var(--brand);
	}
	.state.ok {
		background: color-mix(in srgb, var(--game) 20%, transparent);
		color: var(--game);
	}
	.state.no {
		background: color-mix(in srgb, var(--danger) 16%, transparent);
		color: var(--danger);
	}

	.who {
		font-weight: 600;
	}

	.when {
		margin-left: auto;
	}

	.body {
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.shots {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.shots li,
	.shots img {
		width: 4.5rem;
		height: 4.5rem;
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.shots img {
		object-fit: cover;
		display: block;
	}

	.gone {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		background: var(--surface-2);
		color: var(--faint);
	}

	.note {
		margin: 0;
		padding: 0.5rem 0.7rem;
		border-left: 2px solid var(--brand);
		background: var(--tint);
		font-size: 0.86rem;
	}

	.row,
	.decline {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.decline input {
		flex: 1 1 16rem;
	}

	.danger {
		background: var(--danger);
		border-color: var(--danger);
		color: #fff;
	}

	.del {
		margin-left: auto;
	}
</style>
