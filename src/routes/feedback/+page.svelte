<!--
	Everything you have told us, and what happened to it.

	The composer used to be at the top of this page. It has moved into the dock
	that sits on every page, because the moment you want to report something is
	the moment you are looking at it, not one navigation later — so what is left
	here is the archive: tabs for the four states a report can be in, a page at a
	time, and the edit and withdraw controls for the ones still yours to change.

	State lives in the query string, so a tab and a page can be linked to and
	survive a reload.

	No load function: the shelf pattern. getAccessToken() is browser-only, so
	everything is fetched in an $effect once the session has hydrated.
-->
<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import Pager from '$lib/components/Pager.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { mediaUrl } from '$lib/config.js';
	import * as api from '$lib/api/client.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { feedbackDock } from '$lib/state/feedback.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { timeAgo } from '$lib/util/format.js';

	const STATUSES = ['new', 'accepted', 'done', 'declined'];
	const PER_PAGE = 10;

	let ready = $state(false);
	let loading = $state(true);
	let error = $state(/** @type {string | null} */ (null));
	let data = $state(/** @type {any} */ (null));

	/** Which existing report is open for editing. */
	let editing = $state(/** @type {number | null} */ (null));
	let editBody = $state('');
	let confirming = $state(/** @type {number | null} */ (null));

	let params = $derived(page.url.searchParams);
	let tab = $derived(params.get('status') ?? '');
	let pageNumber = $derived(Number(params.get('page') ?? 1) || 1);

	let items = $derived(data?.items ?? []);
	let counts = $derived(data?.counts ?? {});
	let all = $derived(STATUSES.reduce((sum, s) => sum + (counts[s] ?? 0), 0));

	/*
	 * Re-runs on a tab or page change, and on `revision` — which the dock bumps
	 * when something is sent from behind this page, so a new report appears in
	 * the list rather than waiting for a reload nobody thinks to do.
	 */
	$effect(() => {
		const search = page.url.search;
		void feedbackDock.revision;

		session.hydrate().then(() => {
			ready = true;
			if (!session.user) return goto('/login');
			void load(search);
		});
	});

	/** @param {string} search */
	async function load(search) {
		loading = true;
		try {
			const q = new URLSearchParams(search);
			data = await api.listFeedback({
				limit: PER_PAGE,
				page: q.get('page') ?? '1',
				...(q.get('status') ? { status: /** @type {string} */ (q.get('status')) } : {})
			});
			error = null;
		} catch {
			error = t('feedback.loadFailed');
		} finally {
			loading = false;
		}
	}

	/**
	 * @param {Record<string, string | null>} changes
	 * @param {{ resetPage?: boolean }} [options]
	 */
	function apply(changes, { resetPage = true } = {}) {
		const next = new URLSearchParams(params);
		for (const [key, value] of Object.entries(changes)) {
			if (value) next.set(key, value);
			else next.delete(key);
		}
		// A tab change starts at its own first page; page 4 of "waiting" has
		// nothing to do with page 4 of "done".
		if (resetPage) next.delete('page');
		const query = next.toString();
		goto(query ? `/feedback?${query}` : '/feedback', { noScroll: true, keepFocus: true });
	}

	/** @param {any} item */
	async function saveEdit(item) {
		try {
			await api.updateFeedback(item.id, { body: editBody.trim() });
			editing = null;
			await load(page.url.search);
		} catch {
			error = t('feedback.sendFailed');
		}
	}

	/** @param {any} item */
	async function remove(item) {
		try {
			await api.deleteFeedback(item.id);
			confirming = null;
			await load(page.url.search);
		} catch {
			error = t('feedback.sendFailed');
		}
	}

	/** @param {string} status */
	function tone(status) {
		return { new: 'wait', accepted: 'go', done: 'ok', declined: 'no' }[status] ?? 'wait';
	}
</script>

<svelte:head><title>{t('feedback.title')} — Feelm</title></svelte:head>

<!--
	The header and tabs wait for the session, so a signed-out visitor gets a
	spinner and a redirect rather than a flash of somebody's archive. Past that
	point `loading` only greys the list: switching tabs must not blank the tabs
	you are switching with.
-->
{#if !ready}
	<div class="frame page"><p class="faint"><Spinner size={15} /> {t('common.loading')}</p></div>
{:else}
	<div class="frame page">
		<header class="masthead">
			<span class="eyebrow"><Icon name="megaphone" size={14} />{t('feedback.eyebrow')}</span>
			<h1 class="display">{t('feedback.mine')}</h1>
			<p class="muted">{t('feedback.intro')}</p>
			<button type="button" class="btn btn-primary" onclick={() => feedbackDock.show()}>
				<Icon name="plus" size={14} />{t('feedback.newReport')}
			</button>
		</header>

		{#if error}<p class="error">{error}</p>{/if}

		<!--
			Tabs rather than a dropdown: there are exactly four states, each with a
			number, and the number is half the reason to look. A select hides both.
		-->
		<nav class="tabs" aria-label={t('feedback.filterLabel')}>
			<button type="button" class="tab" class:on={tab === ''} onclick={() => apply({ status: null })}>
				{t('feedback.tabAll')}<span class="n">{all}</span>
			</button>
			{#each STATUSES as status (status)}
				<button
					type="button"
					class="tab {tone(status)}"
					class:on={tab === status}
					onclick={() => apply({ status })}
				>
					{t(`feedback.status.${status}`)}<span class="n">{counts[status] ?? 0}</span>
				</button>
			{/each}
		</nav>

		{#if loading}
			<p class="faint"><Spinner size={15} /> {t('common.loading')}</p>
		{:else if !items.length}
			<p class="muted">{tab ? t('feedback.emptyTab') : t('feedback.empty')}</p>
		{:else}
			<ul class="reports">
				{#each items as item (item.id)}
					<li class="card report">
						<div class="head">
							<span class="state {tone(item.status)}">{t(`feedback.status.${item.status}`)}</span>
							<span class="faint kind">{t(`feedback.category.${item.category}`)}</span>
							<span class="faint when">{timeAgo(item.createdAt)}</span>
						</div>

						{#if editing === item.id}
							<textarea class="field" rows="4" bind:value={editBody}></textarea>
							<div class="row">
								<button type="button" class="btn btn-sm btn-primary" onclick={() => saveEdit(item)}>
									{t('common.save')}
								</button>
								<button type="button" class="btn btn-sm btn-ghost" onclick={() => (editing = null)}>
									{t('common.cancel')}
								</button>
							</div>
						{:else}
							<p class="body">{item.body}</p>
						{/if}

						{#if item.images?.length}
							<ul class="shots">
								{#each item.images as image (image.id)}
									<li>
										{#if image.purged}
											<span class="gone" title={t('feedback.imagePurged')}><Icon name="image" size={15} /></span>
										{:else}
											<a href={mediaUrl(image.url)} target="_blank" rel="noreferrer">
												<img src={mediaUrl(image.url)} alt="" loading="lazy" />
											</a>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}

						{#if item.note}
							<p class="note"><strong>{t('feedback.reply')}:</strong> {item.note}</p>
						{/if}

						{#if item.canEdit && editing !== item.id}
							<div class="row actions">
								<button
									type="button"
									class="btn btn-sm btn-ghost"
									onclick={() => {
										editing = item.id;
										editBody = item.body;
									}}
								>
									<Icon name="edit" size={12} />{t('common.edit')}
								</button>

								{#if confirming === item.id}
									<button type="button" class="btn btn-sm danger" onclick={() => remove(item)}>
										{t('feedback.confirmDelete')}
									</button>
									<button type="button" class="btn btn-sm btn-ghost" onclick={() => (confirming = null)}>
										{t('common.cancel')}
									</button>
								{:else}
									<button type="button" class="btn btn-sm btn-ghost" onclick={() => (confirming = item.id)}>
										<Icon name="trash" size={12} />{t('common.delete')}
									</button>
								{/if}
							</div>
						{:else if !item.canEdit}
							<p class="faint locked">{t('feedback.locked')}</p>
						{/if}
					</li>
				{/each}
			</ul>

			<Pager
				page={pageNumber}
				pages={data?.pages ?? 1}
				busy={loading}
				onpage={(n) => apply({ page: String(n) }, { resetPage: false })}
			/>
		{/if}
	</div>
{/if}

<style>
	.page {
		padding-top: clamp(2rem, 5vw, 3.5rem);
		max-width: 52rem;
	}

	.masthead {
		padding-bottom: 1.25rem;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--brand);
	}

	h1 {
		font-size: clamp(1.9rem, 5vw, 2.8rem);
		margin: 0.35rem 0 0.4rem;
	}

	.masthead p {
		margin: 0 0 1rem;
		max-width: 46ch;
	}

	.error {
		color: var(--danger);
	}

	.tabs {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--line);
	}

	.tabs .tab {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.7rem;
		border: 1px solid transparent;
		border-radius: 99px;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.tabs .tab:hover:not(.on) {
		background: var(--tint);
		color: var(--ink);
	}

	.tabs .tab.on {
		background: var(--surface-2);
		border-color: var(--line-strong);
		color: var(--ink);
		font-weight: 600;
	}

	/* The count carries the tab's own colour, so the strip reads as four states
	   at a glance and not as four grey words. */
	.n {
		min-width: 1.35rem;
		padding: 0.05rem 0.35rem;
		border-radius: 99px;
		background: var(--tint);
		font-size: 0.72rem;
		font-variant-numeric: tabular-nums;
		text-align: center;
	}

	.tab.on.go .n {
		background: color-mix(in srgb, var(--brand) 20%, transparent);
		color: var(--brand);
	}

	.tab.on.ok .n {
		background: color-mix(in srgb, var(--game) 22%, transparent);
		color: var(--game);
	}

	.tab.on.no .n {
		background: color-mix(in srgb, var(--danger) 18%, transparent);
		color: var(--danger);
	}

	.reports {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.report {
		padding: 0.9rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.78rem;
	}

	/* Four states, four readings — the colour is the fastest way to scan a
	   list of your own reports for the one that moved. */
	.state {
		padding: 0.1rem 0.5rem;
		border-radius: 99px;
		font-weight: 600;
		font-size: 0.72rem;
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

	.when {
		margin-left: auto;
	}

	.body {
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	textarea {
		resize: vertical;
		font: inherit;
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
		padding: 0.55rem 0.7rem;
		border-left: 2px solid var(--brand);
		background: var(--tint);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		font-size: 0.88rem;
	}

	.row {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.actions {
		margin-top: 0.1rem;
	}

	.danger {
		background: var(--danger);
		border-color: var(--danger);
		color: #fff;
	}

	.locked {
		margin: 0;
		font-size: 0.78rem;
	}
</style>
