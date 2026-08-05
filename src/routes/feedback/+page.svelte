<!--
	Tell us something, and see what happened to it.

	One page rather than a modal, because the second half — the list of what you
	have already sent and where it got to — is the part that makes people file a
	second report. A form that swallows things and never mentions them again
	gets used once.

	No load function: the shelf pattern. getAccessToken() is browser-only, so
	everything is fetched in an $effect once the session has hydrated.
-->
<script>
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import ImageDrop from '$lib/components/ImageDrop.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import * as api from '$lib/api/client.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { session } from '$lib/state/session.svelte.js';
	import { relativeTime } from '$lib/util/format.js';

	const CATEGORIES = ['bug', 'idea', 'other'];

	let ready = $state(false);
	let loading = $state(true);
	let error = $state(/** @type {string | null} */ (null));
	let items = $state(/** @type {any[]} */ ([]));

	// The composer.
	let body = $state('');
	let category = $state('bug');
	let sending = $state(false);
	/** The report the composer's images belong to — created on first attach. */
	let draft = $state(/** @type {any} */ (null));
	let uploading = $state(false);

	/** Which existing report is open for editing. */
	let editing = $state(/** @type {number | null} */ (null));
	let editBody = $state('');
	let confirming = $state(/** @type {number | null} */ (null));

	$effect(() => {
		session.hydrate().then(() => {
			ready = true;
			if (!session.user) return goto('/login');
			void load();
		});
	});

	async function load() {
		loading = true;
		try {
			const data = await api.listFeedback({ limit: 50 });
			// The draft, if there is one, is already in this list — it is a real
			// report the moment an image is attached to it.
			items = data?.items ?? [];
			error = null;
		} catch (e) {
			error = t('feedback.loadFailed');
		} finally {
			loading = false;
		}
	}

	/**
	 * A screenshot needs a report to hang on, so the first attach creates one.
	 *
	 * The alternative — holding files in the browser and posting them after the
	 * text — means the upload only fails once the person thinks they are done,
	 * which is the worst moment to be told an image was too big.
	 */
	async function attach(file) {
		uploading = true;
		try {
			if (!draft) {
				draft = await api.createFeedback(body.trim() || t('feedback.draftPlaceholder'), category);
			}
			draft = await api.addFeedbackImage(draft.id, file);
			error = null;
		} catch (e) {
			error = t('feedback.imageFailed');
		} finally {
			uploading = false;
		}
	}

	async function detach(imageId) {
		if (!draft) return;
		try {
			draft = await api.removeFeedbackImage(draft.id, imageId);
		} catch {
			error = t('feedback.imageFailed');
		}
	}

	async function send() {
		if (!body.trim() || sending) return;
		sending = true;
		try {
			if (draft) {
				await api.updateFeedback(draft.id, { body: body.trim(), category });
			} else {
				await api.createFeedback(body.trim(), category);
			}
			body = '';
			category = 'bug';
			draft = null;
			error = null;
			await load();
		} catch (e) {
			error = t('feedback.sendFailed');
		} finally {
			sending = false;
		}
	}

	async function saveEdit(item) {
		try {
			await api.updateFeedback(item.id, { body: editBody.trim() });
			editing = null;
			await load();
		} catch {
			error = t('feedback.sendFailed');
		}
	}

	async function remove(item) {
		try {
			await api.deleteFeedback(item.id);
			confirming = null;
			await load();
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

{#if !ready || loading}
	<div class="frame page"><p class="faint"><Spinner size={15} /> {t('common.loading')}</p></div>
{:else}
	<div class="frame page">
		<header class="masthead">
			<span class="eyebrow"><Icon name="megaphone" size={14} />{t('feedback.eyebrow')}</span>
			<h1 class="display">{t('feedback.title')}</h1>
			<p class="muted">{t('feedback.intro')}</p>
		</header>

		{#if error}<p class="error">{error}</p>{/if}

		<section class="card composer">
			<div class="kinds">
				{#each CATEGORIES as key (key)}
					<button
						type="button"
						class="chip"
						class:on={category === key}
						onclick={() => (category = key)}
					>
						{t(`feedback.category.${key}`)}
					</button>
				{/each}
			</div>

			<textarea
				class="field"
				rows="5"
				bind:value={body}
				placeholder={t('feedback.placeholder')}
			></textarea>

			<ImageDrop
				images={draft?.images ?? []}
				busy={uploading}
				onadd={attach}
				onremove={detach}
			/>

			<div class="send">
				<button type="button" class="btn btn-primary" disabled={!body.trim() || sending} onclick={send}>
					{#if sending}<Spinner size={14} />{/if}
					{t('feedback.send')}
				</button>
			</div>
		</section>

		<h2 class="eyebrow mine">{t('feedback.mine')}</h2>

		{#if !items.length}
			<p class="muted">{t('feedback.empty')}</p>
		{:else}
			<ul class="reports">
				{#each items as item (item.id)}
					<li class="card report">
						<div class="head">
							<span class="state {tone(item.status)}">{t(`feedback.status.${item.status}`)}</span>
							<span class="faint kind">{t(`feedback.category.${item.category}`)}</span>
							<span class="faint when">{relativeTime(item.createdAt)}</span>
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
											<a href={image.url} target="_blank" rel="noreferrer">
												<img src={image.url} alt="" loading="lazy" />
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
		margin: 0;
		max-width: 46ch;
	}

	.error {
		color: var(--danger);
	}

	.composer {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 1rem;
	}

	.kinds {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.chip.on {
		background: var(--brand);
		border-color: var(--brand);
		color: var(--on-accent);
	}

	textarea {
		resize: vertical;
		min-height: 6rem;
		font: inherit;
	}

	.send {
		display: flex;
		justify-content: flex-end;
	}

	.mine {
		display: block;
		margin: 2rem 0 0.75rem;
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
