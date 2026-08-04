<!--
	The way out to somewhere that can actually play it.

	A split control: the button runs the search on the first click, and the
	caret beside it opens the panel that decides what the search says. That
	split is the whole point — the query is already good without touching
	anything, so the panel is for the minority who want it worded their way,
	and what they choose is remembered for every title after this one.

	The chips show the words themselves rather than labels for them, and the
	finished query is printed under the box. Nothing about the search that gets
	run is hidden from the person running it.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import { buildQuery, engineKeys, engines, searchUrl, watchParts } from '$lib/data/watch.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { watchPrefs } from '$lib/state/watch.svelte.js';

	let { item } = $props();

	let open = $state(false);
	/** @type {HTMLDivElement | undefined} */
	let root = $state();

	$effect(() => {
		watchPrefs.hydrate();
	});

	let parts = $derived(watchParts(item));
	let optional = $derived(parts.filter((part) => !part.always));
	let query = $derived(buildQuery(parts, watchPrefs.on, watchPrefs.words));
	let href = $derived(searchUrl(watchPrefs.engine, query));
</script>

<!--
	Closed by a click that lands outside it, tested by containment rather than
	by stopping propagation inside — a handler on the wrapper would make a
	plain <div> interactive, and everything in here that should take a click
	already is.
-->
<svelte:window
	onclick={(event) => {
		if (open && root && !root.contains(/** @type {Node} */ (event.target))) open = false;
	}}
	onkeydown={(event) => {
		if (event.key === 'Escape') open = false;
	}}
/>

<div class="watch" bind:this={root}>
	<a
		class="btn btn-accent go"
		{href}
		target="_blank"
		rel="noreferrer noopener"
		title={query}
	>
		<Icon name="search" size={14} />
		{t(`work.where.${item.type}`)}
	</a>

	<button
		type="button"
		class="btn btn-accent more"
		aria-expanded={open}
		aria-label={t('work.tuneSearch')}
		onclick={() => (open = !open)}
	>
		<Icon name={open ? 'up' : 'down'} size={14} />
	</button>

	{#if open}
		<div class="panel card">
			<div class="group" role="group" aria-label={t('work.searchWith')}>
				{#each engineKeys as key (key)}
					<button
						type="button"
						class="pick"
						class:on={watchPrefs.engine === key}
						aria-pressed={watchPrefs.engine === key}
						onclick={() => watchPrefs.setEngine(key)}
					>
						{engines[key].label}
					</button>
				{/each}
			</div>

			<div class="block">
				<span class="eyebrow">{t('work.searchWords')}</span>
				<div class="chips">
					<!-- Locked: a search for nothing in particular is not a search. -->
					<span class="chip fixed">{parts[0].text}</span>

					{#each optional as part (part.key)}
						<button
							type="button"
							class="chip"
							class:on={watchPrefs.isOn(part.key)}
							aria-pressed={watchPrefs.isOn(part.key)}
							onclick={() => watchPrefs.toggle(part.key)}
						>
							{part.text}
						</button>
					{/each}
				</div>
			</div>

			<label class="block">
				<span class="eyebrow">{t('work.yourWords')}</span>
				<input
					type="text"
					value={watchPrefs.words}
					placeholder={t('work.yourWordsHint')}
					oninput={(event) => watchPrefs.setWords(event.currentTarget.value)}
				/>
			</label>

			<div class="foot">
				<output class="preview">{query}</output>
				<button type="button" class="reset" onclick={() => watchPrefs.reset()}>
					{t('work.resetSearch')}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.watch {
		position: relative;
		display: flex;
		align-items: stretch;
	}

	/* One control in two pieces, so the seam runs down the middle of it. */
	.go {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	.more {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		padding-inline: 0.55rem;
		box-shadow: inset 1px 0 0 rgb(0 0 0 / 0.15);
	}

	/*
	 * Anchored to the control and over the artwork, so it needs to be a solid
	 * card rather than anything translucent — there is a backdrop photograph
	 * under this and text has to survive it.
	 */
	.panel {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		z-index: 20;
		width: max(20rem, 100%);
		max-width: min(26rem, calc(100vw - 2rem));
		padding: 0.9rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		background: var(--surface);
		color: var(--ink);
		box-shadow: var(--shadow-pop);
		animation: drop 0.16s ease;
		cursor: default;
	}

	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
	}

	.group {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2px;
		padding: 2px;
		border-radius: var(--radius);
		background: var(--surface-2);
	}

	.pick {
		padding: 0.45rem 0.3rem;
		border: 0;
		border-radius: calc(var(--radius) - 3px);
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.82rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.pick:hover {
		color: var(--ink);
	}

	.pick.on {
		background: var(--surface);
		color: var(--ink);
		font-weight: 600;
		box-shadow: var(--shadow-card);
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	/*
	 * Off is an outline, on is a fill. Deliberately not the accent colour: the
	 * accent is the section's, and these are not about the section — they are
	 * about what is switched on.
	 */
	.chip {
		padding: 0.28rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 99px;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.chip:hover {
		border-color: var(--line-strong);
		color: var(--ink);
	}

	.chip.on {
		border-color: transparent;
		background: var(--ink);
		color: var(--page);
	}

	/* The title, which cannot be switched off. */
	.chip.fixed {
		border-style: dashed;
		border-color: var(--line-strong);
		color: var(--ink);
		cursor: default;
	}

	input {
		width: 100%;
		padding: 0.5rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		background: var(--page);
		color: var(--ink);
		font: inherit;
		font-size: 0.86rem;
	}

	input:focus-visible {
		border-color: var(--brand);
		outline: none;
	}

	.foot {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.6rem;
		padding-top: 0.7rem;
		border-top: 1px solid var(--line);
	}

	/* Exactly what will be searched for, in the order it will be sent. */
	.preview {
		flex: 1;
		min-width: 0;
		font-size: 0.76rem;
		line-height: 1.45;
		color: var(--faint);
		overflow-wrap: anywhere;
	}

	.reset {
		flex: none;
		padding: 0;
		border: 0;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.76rem;
		text-decoration: underline;
		text-underline-offset: 2px;
		cursor: pointer;
	}

	.reset:hover {
		color: var(--ink);
	}

	@media (max-width: 600px) {
		.panel {
			/* Nothing to the right of it on a phone — grow the other way. */
			left: auto;
			right: 0;
		}
	}
</style>
