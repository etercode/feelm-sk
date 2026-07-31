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

	let {
		page = 1,
		pages = 1,
		onpage,
		busy = false,
		/** How many numbers to show either side of the current one. */
		siblings = 1,
		label = 'Pagination'
	} = $props();

	/** Once there are more pages than this, offer the jump box. */
	const JUMP_ABOVE = 8;

	let total = $derived(Math.max(pages, 1));
	let current = $derived(Math.min(Math.max(Math.round(page) || 1, 1), total));

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
		onpage(Math.min(Math.round(wanted), total));
	}
</script>

{#if total > 1}
	<nav class="pager" aria-label={label}>
		<div class="steps">
			<button
				type="button"
				class="btn btn-sm edge"
				disabled={busy || current <= 1}
				title="First page"
				aria-label="First page"
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
				<Icon name="left" size={14} /><span class="word">Previous</span>
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
								aria-label="Page {slot.toLocaleString()}"
								onclick={() => onpage(slot)}
							>
								{slot.toLocaleString()}
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
				disabled={busy || current >= total}
				onclick={() => onpage(current + 1)}
			>
				<span class="word">Next</span><Icon name="right" size={14} />
			</button>

			<button
				type="button"
				class="btn btn-sm edge"
				disabled={busy || current >= total}
				title="Last page"
				aria-label="Last page"
				onclick={() => onpage(total)}
			>
				<Icon name="right" size={13} /><Icon name="right" size={13} />
			</button>
		</div>

		{#if total > JUMP_ABOVE}
			<form class="jump" onsubmit={go}>
				<label>
					<span class="sr-only">Go to page</span>
					<input
						type="number"
						min="1"
						max={total}
						bind:value={jump}
						placeholder="Page…"
						disabled={busy}
						inputmode="numeric"
					/>
				</label>
				<button type="submit" class="btn btn-sm" disabled={busy || jump.trim() === ''}>Go</button>
				<span class="of faint">of {total.toLocaleString()}</span>
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
