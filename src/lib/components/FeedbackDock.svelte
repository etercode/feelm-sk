<!--
	The button in the corner of every page, and the box it opens.

	Feedback used to be a page you had to go to, which meant leaving the thing
	you wanted to complain about in order to complain about it — and losing the
	screenshot-worthy state on the way. This opens over whatever you are looking
	at, sends, and gets out of the way. Nothing navigates.

	Deliberately just the composer: what kind, what happened, screenshots, send.
	Everything you have already sent lives on /feedback, where there is room for
	statuses, replies and a pager — putting any of it in here would turn a box
	you use for ten seconds into a panel you have to read.

	Mounted once, in the root layout. Signed-out visitors get no button at all —
	the API requires an account, and a button that only ever leads to a login
	form is a worse answer than no button.
-->
<script>
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import ImageDrop from '$lib/components/ImageDrop.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import * as api from '$lib/api/client.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { feedbackDock } from '$lib/state/feedback.svelte.js';
	import { session } from '$lib/state/session.svelte.js';

	const CATEGORIES = ['bug', 'idea', 'other'];

	let body = $state('');
	let category = $state('bug');
	let sending = $state(false);
	let sent = $state(false);
	let error = $state(/** @type {string | null} */ (null));

	/** The report the screenshots hang on — created on the first attach. */
	let draft = $state(/** @type {any} */ (null));

	/** @type {HTMLTextAreaElement | undefined} */
	let box = $state();

	/*
	 * Everywhere but the admin, which has the other end of this conversation on
	 * screen already and does not need a button for adding to its own queue.
	 * /feedback keeps it: that page is the archive, and this is the only way to
	 * write something.
	 */
	let suppressed = $derived(page.url.pathname.startsWith('/admin'));
	let visible = $derived(!!session.user && !suppressed);

	$effect(() => {
		if (feedbackDock.open && session.user) box?.focus();
	});

	/* Leaving it open on a page that draws no dock means a panel that appears by
	   itself on the next page that does. */
	$effect(() => {
		if (suppressed && feedbackDock.open) feedbackDock.hide();
	});

	/**
	 * A screenshot needs a report to hang on, so the first one creates it.
	 *
	 * Holding files in the browser until the text is sent means the upload only
	 * fails once someone believes they are finished, which is the worst moment
	 * to be told an image was too big.
	 *
	 * @param {File} file
	 */
	async function attach(file) {
		try {
			if (!draft) {
				draft = await api.createFeedback(body.trim() || t('feedback.draftPlaceholder'), category);
			}
			draft = await api.addFeedbackImage(draft.id, file);
			error = null;
		} catch {
			error = t('feedback.imageFailed');
		}
	}

	/** @param {number} imageId */
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
			reset();
			sent = true;
			// /feedback, if it is open behind this, has no other way of hearing
			// that the list it is showing just changed.
			feedbackDock.changed();
		} catch {
			error = t('feedback.sendFailed');
		} finally {
			sending = false;
		}
	}

	function reset() {
		body = '';
		category = 'bug';
		draft = null;
		error = null;
	}

	function again() {
		sent = false;
		reset();
	}

	/** @param {KeyboardEvent} event */
	function onkey(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void send();
		}
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && feedbackDock.open) feedbackDock.hide();
	}}
/>

{#if visible}
	{#if feedbackDock.open}
		<section class="dock" aria-label={t('feedback.dockTitle')}>
			<header class="bar">
				<span class="who">
					<Icon name="chat" size={15} />
					<strong>{t('feedback.dockTitle')}</strong>
				</span>
				<a class="all" href="/feedback">{t('feedback.dockAll')}</a>
				<button type="button" class="x" aria-label={t('common.close')} onclick={() => feedbackDock.hide()}>
					<Icon name="close" size={15} />
				</button>
			</header>

			{#if sent}
				<!-- One line and a way back to the box. The report itself is on
				     /feedback now, and repeating it here would be the history
				     this panel is deliberately without. -->
				<div class="done">
					<span class="tick"><Icon name="check" size={18} stroke={2.4} /></span>
					<p>{t('feedback.dockThanks')}</p>
					<button type="button" class="btn btn-sm" onclick={again}>{t('feedback.dockAnother')}</button>
				</div>
			{:else}
				<div class="composer">
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
						rows="4"
						bind:this={box}
						bind:value={body}
						onkeydown={onkey}
						placeholder={t('feedback.placeholder')}
					></textarea>

					<ImageDrop compact images={draft?.images ?? []} onadd={attach} onremove={detach} />

					{#if error}<p class="error">{error}</p>{/if}

					<div class="send">
						<span class="faint tip">{t('feedback.dockHint')}</span>
						<button
							type="button"
							class="btn btn-sm btn-primary"
							disabled={!body.trim() || sending}
							onclick={send}
						>
							{#if sending}<Spinner size={13} />{/if}
							{t('feedback.send')}
						</button>
					</div>
				</div>
			{/if}
		</section>
	{/if}

	<button
		type="button"
		class="tab"
		class:open={feedbackDock.open}
		aria-expanded={feedbackDock.open}
		aria-label={t('feedback.dockOpen')}
		title={t('feedback.dockOpen')}
		onclick={() => feedbackDock.toggle()}
	>
		<Icon name={feedbackDock.open ? 'close' : 'chat'} size={20} />
	</button>
{/if}

<style>
	.tab {
		position: fixed;
		right: clamp(0.9rem, 3vw, 1.5rem);
		bottom: clamp(0.9rem, 3vw, 1.5rem);
		z-index: 55;
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border: 1px solid var(--line-strong);
		border-radius: 50%;
		background: var(--brand);
		color: var(--on-accent);
		cursor: pointer;
		box-shadow: var(--shadow-lift);
		transition:
			transform 0.15s ease,
			background 0.15s ease;
	}

	.tab:hover,
	.tab:focus-visible {
		transform: translateY(-2px);
	}

	/* While the panel is up the button is its close control, and a filled brand
	   circle under an open panel reads as a second, competing action. */
	.tab.open {
		background: var(--surface-2);
		color: var(--ink);
	}

	.dock {
		position: fixed;
		right: clamp(0.9rem, 3vw, 1.5rem);
		bottom: calc(clamp(0.9rem, 3vw, 1.5rem) + 3.75rem);
		z-index: 65;
		display: flex;
		flex-direction: column;
		width: min(23rem, calc(100vw - 1.8rem));
		max-height: calc(100vh - var(--bar-height) - 6rem);
		overflow-y: auto;
		border: 1px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow-pop);
	}

	.bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.7rem;
		border-bottom: 1px solid var(--line);
		background: var(--tint);
	}

	.who {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--brand);
		font-size: 0.9rem;
	}

	.who strong {
		color: var(--ink);
	}

	.all {
		margin-left: auto;
		font-size: 0.76rem;
		color: var(--muted);
	}

	.x {
		display: grid;
		place-items: center;
		width: 1.7rem;
		height: 1.7rem;
		border: none;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--muted);
		cursor: pointer;
	}

	.x:hover {
		background: var(--surface-2);
		color: var(--ink);
	}

	.composer {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 0.7rem;
	}

	.kinds {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.kinds .chip {
		font-size: 0.74rem;
		padding: 0.15rem 0.5rem;
	}

	.chip.on {
		background: var(--brand);
		border-color: var(--brand);
		color: var(--on-accent);
	}

	textarea {
		resize: vertical;
		min-height: 5rem;
		font: inherit;
		font-size: 0.85rem;
	}

	.error {
		margin: 0;
		color: var(--danger);
		font-size: 0.8rem;
	}

	.send {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.tip {
		flex: 1 1 auto;
		font-size: 0.7rem;
		line-height: 1.2;
	}

	.done {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 1.6rem 1rem;
		text-align: center;
	}

	.tick {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--game) 20%, transparent);
		color: var(--game);
	}

	.done p {
		margin: 0;
		font-size: 0.88rem;
	}

	/*
	 * On a phone it is a sheet across the bottom rather than a card floating in
	 * a corner: at 23rem wide there is no corner left to float in.
	 */
	@media (max-width: 520px) {
		.dock {
			right: 0;
			left: 0;
			bottom: 0;
			width: 100%;
			max-height: min(85vh, calc(100vh - var(--bar-height)));
			border-radius: var(--radius) var(--radius) 0 0;
			border-bottom: none;
		}
	}
</style>
