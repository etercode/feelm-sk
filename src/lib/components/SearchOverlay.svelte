<!--
	Quick search: type, see posters, hit enter for the first hit, or open the full
	search page for the filters. Opens on ⌘K / Ctrl+K from anywhere.

	Results come from /api/search/suggest — the same full-text ranking as the
	search page, without the facet queries.
-->
<script>
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/Icon.svelte';
	import * as api from '$lib/api/client.js';
	import { itemPath } from '$lib/data/items.js';
	import { lineOf, types } from '$lib/data/types.js';
	import { t } from '$lib/i18n/index.svelte.js';
	import { counted } from '$lib/util/format.js';

	let { open = false, onclose } = $props();

	let query = $state('');
	/** @type {any[]} */
	let results = $state([]);
	/** @type {{ term: string, total: number } | null} */
	let suggestion = $state(null);
	/** @type {any[]} */
	let people = $state([]);
	let total = $state(0);
	// False when the server stopped counting at its ceiling — see WorkSearch.
	let exactTotal = $state(true);
	let loading = $state(false);
	let error = $state(/** @type {string | null} */ (null));
	/** @type {HTMLInputElement | undefined} */
	let input = $state();

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let debounceTimer;
	/** @type {number} */
	let requestId = 0;

	$effect(() => {
		if (open) {
			query = '';
			results = [];
			suggestion = null;
			people = [];
			total = 0;
			exactTotal = true;
			error = null;
			loading = false;
			queueMicrotask(() => input?.focus());
		} else {
			clearTimeout(debounceTimer);
		}
	});

	$effect(() => {
		const q = query.trim();
		clearTimeout(debounceTimer);

		if (!open || q.length < 2) {
			results = [];
			suggestion = null;
			people = [];
			total = 0;
			loading = false;
			error = null;
			return;
		}

		loading = true;
		error = null;
		const id = ++requestId;

		debounceTimer = setTimeout(async () => {
			try {
				const data = await api.searchSuggest({ q, limit: 8, facets: 0 });
				if (id !== requestId) return;
				results = data?.items ?? [];
				suggestion = data?.suggestion ?? null;
				people = data?.people ?? [];
				total = data?.total ?? 0;
				exactTotal = data?.totalIsExact !== false;
				error = null;
			} catch (e) {
				if (id !== requestId) return;
				results = [];
				suggestion = null;
				people = [];
				total = 0;
				error = t('search.failed');
				console.warn('search failed', e);
			} finally {
				if (id === requestId) loading = false;
			}
		}, 250);
	});

	/** Enter opens the full search page — that is where the filters live. */
	function submit(event) {
		event.preventDefault();
		const q = query.trim();
		if (!q) return;
		onclose?.();
		goto(`/search?q=${encodeURIComponent(q)}`);
	}

	function visit(item) {
		onclose?.();
		goto(itemPath(item));
	}

	function useSuggestion() {
		if (!suggestion) return;
		query = suggestion.term;
		queueMicrotask(() => input?.focus());
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (open && event.key === 'Escape') onclose?.();
	}}
/>

{#if open}
	<div
		class="scrim"
		role="presentation"
		onclick={(event) => {
			if (event.target === event.currentTarget) onclose?.();
		}}
	>
		<div class="panel card" role="dialog" aria-modal="true" aria-label={t('search.dialogLabel')} tabindex="-1">
			<form onsubmit={submit}>
				<Icon name="search" size={20} />
				<input
					bind:this={input}
					bind:value={query}
					class="input"
					type="search"
					placeholder={t('search.quickPlaceholder')}
					autocomplete="off"
				/>
				<button type="button" class="btn btn-ghost btn-sm" onclick={() => onclose?.()}>Esc</button>
			</form>

			{#if query.trim().length >= 2}
				{#if loading && !results.length && !suggestion}
					<p class="hint">{t('search.searching')}</p>
				{:else if error}
					<p class="hint error">{error}</p>
				{:else}
					{#if suggestion}
						<button type="button" class="suggest" onclick={useSuggestion}>
							{t('search.didYouMean')} <strong>{suggestion.term}</strong>?
							<span class="faint">{counted('count.result', suggestion.total)}</span>
						</button>
					{/if}
					{#if people.length}
						<div class="people">
							<span class="eyebrow">{t('common.people')}</span>
							{#each people as person (person.slug)}
								<a
									class="chip"
									href="/search?person={encodeURIComponent(person.slug)}"
									onclick={() => onclose?.()}
								>
									{person.name}
								</a>
							{/each}
						</div>
					{/if}
					<ul class="results">
						{#each results as item (item.id)}
							<li>
								<button type="button" data-type={item.type} onclick={() => visit(item)}>
									{#if item.poster}
										<img src={item.poster} alt="" loading="lazy" />
									{:else}
										<span class="blank"></span>
									{/if}
									<span class="text">
										<span class="name">{item.title}</span>
										<span class="sub">{lineOf(item).join(' · ')}</span>
									</span>
									<span class="kind"
										><Icon name={item.type} size={13} />{types[item.type].label}</span
									>
								</button>
							</li>
						{:else}
							<li class="empty">
								{t('search.nothingMatches', { query })}
								{#if !suggestion}
									<span class="faint"> {t('search.trySpelling')}</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			{:else}
				<p class="hint">
					{t('search.hint')}
					<a href="/search" onclick={() => onclose?.()}>{t('search.hintLink')}</a>.
				</p>
			{/if}

			{#if query.trim().length >= 2 && total > results.length}
				<a
					class="all"
					href="/search?q={encodeURIComponent(query.trim())}"
					onclick={() => onclose?.()}
				>
					{t('search.seeAllResults', { total, more: exactTotal ? '' : '+' })}
					<Icon name="right" size={14} />
				</a>
			{/if}
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		justify-content: center;
		padding: clamp(3rem, 12vh, 8rem) 1rem 1rem;
		background: rgb(4 5 8 / 0.72);
		backdrop-filter: blur(10px);
		animation: fade 0.16s ease;
	}

	.panel {
		width: min(40rem, 100%);
		height: fit-content;
		max-height: 70vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: var(--surface);
		box-shadow: var(--shadow-pop);
		animation: rise 0.2s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	form {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.9rem 1rem;
		border-bottom: 1px solid var(--line);
		color: var(--faint);
	}

	.input {
		flex: 1;
		border: 0;
		background: none;
		font-size: 1.05rem;
		color: var(--ink);
	}

	.input:focus {
		outline: none;
	}

	.input::-webkit-search-cancel-button {
		display: none;
	}

	.suggest {
		display: block;
		width: 100%;
		margin: 0;
		padding: 0.75rem 1.2rem 0.25rem;
		border: 0;
		background: none;
		text-align: left;
		font-size: 0.92rem;
		color: var(--muted);
		cursor: pointer;
	}

	.suggest:hover {
		color: var(--ink);
	}

	.suggest strong {
		color: var(--accent);
		font-weight: 650;
	}

	.results {
		list-style: none;
		margin: 0;
		padding: 0.4rem;
		overflow-y: auto;
	}

	.results button {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		width: 100%;
		padding: 0.5rem;
		border: 0;
		border-radius: var(--radius);
		background: none;
		text-align: left;
		cursor: pointer;
	}

	.results button:hover {
		background: var(--tint);
	}

	.results img,
	.blank {
		width: 2.6rem;
		height: 3.9rem;
		object-fit: cover;
		border-radius: 5px;
		background: var(--surface-2);
		flex: none;
	}

	.text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.name {
		font-weight: 600;
	}

	.sub {
		font-size: 0.8rem;
		color: var(--faint);
	}

	.kind {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		color: var(--accent);
	}

	.empty,
	.people {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		padding: 0.6rem 0.9rem 0;
	}

	.people .chip {
		text-decoration: none;
	}

	.people .chip:hover {
		border-color: var(--line-strong);
		color: var(--ink);
	}

	.all {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.7rem;
		border-top: 1px solid var(--line);
		color: var(--brand);
		font-size: 0.88rem;
		font-weight: 600;
	}

	.all:hover {
		background: var(--tint);
	}

	.hint a {
		color: var(--brand);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.hint {
		margin: 0;
		padding: 1.4rem 1.2rem;
		color: var(--muted);
		font-size: 0.92rem;
	}


	.hint.error {
		color: var(--danger);
	}

	.faint {
		color: var(--faint);
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
	}
</style>
