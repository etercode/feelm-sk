<!--
	Search box and filter selects above an admin table.

	The search is debounced because it drives a server round trip on every
	keystroke otherwise, and every control reports upward rather than owning
	state: the page keeps all of it in the query string, so a filtered table is
	a link you can send somebody.
-->
<script>
	import { untrack } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	let {
		term = '',
		onterm,
		placeholder = 'Search…',
		/** @type {{ key: string, label: string, value: string, options: { value: string, label: string }[] }[]} */
		filters = [],
		onfilter,
		total = null,
		noun = 'result',
		busy = false,
		children = null
	} = $props();

	const DEBOUNCE_MS = 250;

	// Seeded from the prop, then kept in step by the effect below. untrack()
	// because this is the starting value, not a subscription — the effect is
	// what subscribes.
	let typed = $state(untrack(() => term));
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;

	// An external change — landing on the page with ?q= already set, or the
	// reset button — has to win over what was typed.
	$effect(() => {
		typed = term;
	});

	function onInput() {
		clearTimeout(timer);
		const value = typed;
		timer = setTimeout(() => onterm?.(value), DEBOUNCE_MS);
	}

	function submit(event) {
		event.preventDefault();
		clearTimeout(timer);
		onterm?.(typed);
	}
</script>

<div class="toolbar">
	<form class="find" onsubmit={submit}>
		<Icon name="search" size={16} />
		<input
			class="field"
			bind:value={typed}
			oninput={onInput}
			{placeholder}
			autocomplete="off"
			spellcheck="false"
			aria-label={placeholder}
		/>
		{#if typed}
			<button
				type="button"
				class="clear"
				aria-label="Clear search"
				onclick={() => {
					typed = '';
					clearTimeout(timer);
					onterm?.('');
				}}
			>
				<Icon name="close" size={14} />
			</button>
		{/if}
	</form>

	{#each filters as filter (filter.key)}
		<label class="pick">
			<span class="sr-only">{filter.label}</span>
			<select
				class="field"
				value={filter.value}
				onchange={(event) => onfilter?.(filter.key, event.currentTarget.value)}
			>
				{#each filter.options as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>
	{/each}

	{#if children}<div class="extra">{@render children()}</div>{/if}

	{#if total !== null}
		<p class="count faint" aria-live="polite">
			{busy ? '…' : `${total.toLocaleString()} ${noun}${total === 1 ? '' : 's'}`}
		</p>
	{/if}
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		margin-bottom: 1.1rem;
	}

	.find {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1 1 16rem;
		min-width: 0;
	}

	.find :global(svg) {
		position: absolute;
		left: 0.75rem;
		color: var(--faint);
		pointer-events: none;
	}

	.find input {
		padding-left: 2.3rem;
		padding-right: 2.1rem;
	}

	.clear {
		position: absolute;
		right: 0.5rem;
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		border: 0;
		border-radius: 50%;
		background: var(--tint);
		color: var(--muted);
		cursor: pointer;
	}

	.clear:hover {
		background: var(--tint-strong);
		color: var(--ink);
	}

	.pick select {
		width: auto;
		padding-right: 2rem;
		cursor: pointer;
	}

	.extra {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.count {
		margin: 0 0 0 auto;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
