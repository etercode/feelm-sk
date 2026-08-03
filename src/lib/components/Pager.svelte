<!--
	Numbered pagination.

	This markup was written four times over — browse, search, the crawler and
	the profile shelf all had their own byte-identical copy — so the admin
	tables took it as the moment to make it one thing.

	It started as "Previous · 1 / 16,508 · Next", which is fine at twelve pages
	and useless at sixteen thousand: you cannot get anywhere except one step at
	a time. So: numbers around where you are, the first and last page always
	reachable, and a box to type a number into once there are more pages than
	anybody wants to click through.

	It renders nothing at all for a single page, which is what every caller
	wrapped it in an {#if} to achieve.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import { t } from '$lib/i18n/index.svelte.js';
	import { number } from '$lib/util/format.js';

	let {
		page = 1,
		/** Null when the caller did not ask the server to count. */
		pages = 1,
		onpage,
		/** Only consulted when `pages` is unknown. */
		hasMore = false,
		busy = false,
		/** How many numbers to show either side of the current one. */
		siblings = 1,
		label = null
	} = $props();

	/** Once there are more pages than this, offer the jump box. */
	const JUMP_ABOVE = 8;

	/*
	 * A listing that does not print a total does not pay to compute one, so
	 * `pages` can be null. Everything that needs to know where the end is —
	 * the last-page button, the numbers after this one, the "of N" — steps
	 * aside, and `hasMore` carries the only question left: is there another.
	 */
	let known = $derived(typeof pages === 'number' && pages > 0);
	let total = $derived(known ? Math.max(pages, 1) : Infinity);
	let current = $derived(Math.min(Math.max(Math.round(page) || 1, 1), known ? total : Infinity));

	/** @param {number} from @param {number} to */
	function range(from, to) {
		return Array.from({ length: to - from + 1 }, (_, i) => from + i);
	}

	/*
	 * The numbers to draw: first, last, a window around the current page, and
	 * a gap marker wherever the sequence jumps. Gaps carry their own key so
	 * two of them in one list stay distinguishable.
	 */
	let slots = $derived.by(() => {
		if (!known) {
			const left = Math.max(current - siblings, 1);
			const right = current + (hasMore ? siblings : 0);
			const near = range(left, right);
			return left > 2 ? [1, { gap: 'l' }, ...near] : range(1, right);
		}

		// Enough room for first, last, the window, and two gaps.
		const widest = 5 + siblings * 2;
		if (total <= widest) return range(1, total);

		const left = Math.max(current - siblings, 1);
		const right = Math.min(current + siblings, total);
		const gapLeft = left > 3;
		const gapRight = right < total - 2;

		if (!gapLeft && gapRight) {
			return [...range(1, 3 + siblings * 2), { gap: 'r' }, total];
		}
		if (gapLeft && !gapRight) {
			return [1, { gap: 'l' }, ...range(total - (2 + siblings * 2), total)];
		}
		return [1, { gap: 'l' }, ...range(left, right), { gap: 'r' }, total];
	});

	let jump = $state('');

	function go(event) {
		event.preventDefault();
		const wanted = Number(jump.trim());
		if (!Number.isFinite(wanted) || wanted < 1) return;
		jump = '';
		onpage(known ? Math.min(Math.round(wanted), total) : Math.round(wanted));
	}
</script>

{#if known ? total > 1 : current > 1 || hasMore}
	<nav class="pager" aria-label={label ?? t('pager.label')}>
		<div class="steps">
			<button
				type="button"
				class="btn btn-sm edge"
				disabled={busy || current <= 1}
				title={t('pager.first')}
				aria-label={t('pager.first')}
				onclick={() => onpage(1)}
			>
				<Icon name="left" size={13} /><Icon name="left" size={13} />
			</button>

			<button
				type="button"
				class="btn btn-sm"
				disabled={busy || current <= 1}
				onclick={() => onpage(current - 1)}
			>
				<Icon name="left" size={14} /><span class="word">{t('common.previous')}</span>
			</button>

			<ol class="numbers">
				{#each slots as slot (typeof slot === 'number' ? slot : slot.gap)}
					<li>
						{#if typeof slot === 'number'}
							<button
								type="button"
								class="num"
								class:on={slot === current}
								disabled={busy}
								aria-current={slot === current ? 'page' : undefined}
								aria-label={t('pager.page', { n: slot })}
								onclick={() => onpage(slot)}
							>
								{number(slot)}
							</button>
						{:else}
							<span class="gap" aria-hidden="true">…</span>
						{/if}
					</li>
				{/each}
			</ol>

			<button
				type="button"
				class="btn btn-sm"
				disabled={busy || (known ? current >= total : !hasMore)}
				onclick={() => onpage(current + 1)}
			>
				<span class="word">{t('common.next')}</span><Icon name="right" size={14} />
			</button>

			{#if known}
				<button
					type="button"
					class="btn btn-sm edge"
					disabled={busy || current >= total}
					title={t('pager.last')}
					aria-label={t('pager.last')}
					onclick={() => onpage(total)}
				>
					<Icon name="right" size={13} /><Icon name="right" size={13} />
				</button>
			{/if}
		</div>

		{#if !known || total > JUMP_ABOVE}
			<form class="jump" onsubmit={go}>
				<label>
					<span class="sr-only">{t('pager.goTo')}</span>
					<input
						type="number"
						min="1"
						max={known ? total : undefined}
						bind:value={jump}
						placeholder={t('pager.jumpPlaceholder')}
						disabled={busy}
						inputmode="numeric"
					/>
				</label>
				<button type="submit" class="btn btn-sm" disabled={busy || jump.trim() === ''}>{t('common.go')}</button>
				{#if known}<span class="of faint">{t('pager.of', { total })}</span>{/if}
			</form>
		{/if}
	</nav>
{/if}

<style>
	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
		padding: 2rem 0 0;
	}

	.steps {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.numbers {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		margin: 0 0.25rem;
		padding: 0;
		list-style: none;
	}

	.num {
		min-width: 2.1rem;
		padding: 0.35rem 0.5rem;
		border: 1px solid transparent;
		border-radius: var(--radius);
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.num:hover:not(:disabled):not(.on) {
		background: var(--tint);
		color: var(--ink);
	}

	.num.on {
		background: var(--brand);
		border-color: var(--brand);
		color: var(--on-accent);
		font-weight: 600;
		cursor: default;
	}

	.num:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.gap {
		display: inline-block;
		min-width: 1.4rem;
		text-align: center;
		color: var(--faint);
		font-size: 0.85rem;
	}

	.jump {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.jump input {
		width: 5.5rem;
		padding: 0.35rem 0.6rem;
		border: 1px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	.jump input:focus {
		border-color: color-mix(in srgb, var(--brand) 60%, transparent);
		outline: none;
	}

	.of {
		font-size: 0.82rem;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	/*
	 * On a phone the words and the jump-to-ends buttons go first, then the
	 * outermost numbers — the current page and its immediate neighbours are
	 * what has to survive.
	 */
	@media (max-width: 640px) {
		.word,
		.edge {
			display: none;
		}

		.numbers {
			margin: 0 0.1rem;
		}

		.num {
			min-width: 1.9rem;
			padding: 0.35rem 0.35rem;
			font-size: 0.82rem;
		}
	}
</style>
