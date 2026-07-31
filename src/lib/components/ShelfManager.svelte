<!--
	A shelf as a list rather than a wall of posters.

	On your own profile every row can be changed where it sits: move something
	between shelves, or drop it entirely, without opening the title and coming
	back. On someone else's it is the same list, read-only — a compact way to
	see what they have without scrolling through artwork.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import Stars from '$lib/components/Stars.svelte';
	import { itemPath } from '$lib/data/items.js';
	import { lineOf, statusLabel, statusOrder } from '$lib/data/types.js';
	import { library } from '$lib/state/library.svelte.js';

	/**
	 * @type {{
	 *   rows: Array<{ entry: any, item: any }>,
	 *   userId: number,
	 *   owner?: boolean
	 * }}
	 */
	let { rows, userId, owner = false } = $props();

	/** The row waiting on a "really?" — removing a shelf entry loses the score. */
	let confirming = $state(null);

	/** @param {any} item @param {string} status */
	function move(item, status) {
		library.setStatus(userId, item.id, status);
	}

	/** @param {any} item */
	function remove(item) {
		library.setStatus(userId, item.id, null);
		confirming = null;
	}
</script>

<ul class="rows">
	{#each rows as row (row.entry.id)}
		<li data-type={row.item.type}>
			<a class="thumb" href={itemPath(row.item)}>
				<img src={row.item.poster} alt="" loading="lazy" />
			</a>

			<div class="what">
				<a class="title" href={itemPath(row.item)}>{row.item.title}</a>
				<span class="faint line">{lineOf(row.item).slice(0, 2).join(' · ')}</span>
				{#if row.entry.rating}
					<span class="score"><Stars value={row.entry.rating} size={13} /></span>
				{/if}
			</div>

			{#if owner}
				{#if confirming === row.entry.id}
					<div class="controls confirm">
						<span class="faint">Remove it?</span>
						<button type="button" class="btn btn-sm danger" onclick={() => remove(row.item)}>
							Remove
						</button>
						<button
							type="button"
							class="btn btn-sm btn-ghost"
							onclick={() => (confirming = null)}
						>
							Keep
						</button>
					</div>
				{:else}
					<div class="controls">
						<label>
							<span class="sr-only">Shelf for {row.item.title}</span>
							<select
								class="field shelf"
								value={row.entry.status}
								onchange={(event) => move(row.item, event.currentTarget.value)}
							>
								{#each statusOrder as status (status)}
									<option value={status}>{statusLabel(row.item.type, status)}</option>
								{/each}
							</select>
						</label>

						<button
							type="button"
							class="icon"
							aria-label="Remove {row.item.title} from the shelf"
							onclick={() => (confirming = row.entry.id)}
						>
							<Icon name="close" size={15} />
						</button>
					</div>
				{/if}
			{:else}
				<span class="chip chip-accent">{statusLabel(row.item.type, row.entry.status)}</span>
			{/if}
		</li>
	{:else}
		<li class="muted empty">Nothing matches.</li>
	{/each}
</ul>

<style>
	.rows {
		list-style: none;
		margin: 0;
		padding: 0 0 2rem;
		display: flex;
		flex-direction: column;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.55rem 0.4rem;
		border-bottom: 1px solid var(--line);
	}

	li:hover {
		background: var(--tint);
	}

	.empty {
		border-bottom: 0;
		padding: 1.5rem 0.4rem;
	}

	.thumb {
		flex: none;
		width: 2.6rem;
		aspect-ratio: 2 / 3;
		border-radius: 4px;
		overflow: hidden;
		background: var(--surface-2);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.what {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		line-height: 1.35;
	}

	.title {
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.title:hover {
		color: var(--accent);
	}

	.line {
		font-size: 0.8rem;
	}

	.score {
		margin-top: 0.15rem;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex: none;
	}

	.confirm {
		font-size: 0.85rem;
	}

	.shelf {
		width: auto;
		padding: 0.3rem 0.5rem;
		font-size: 0.85rem;
		border-radius: 99px;
		cursor: pointer;
	}

	.danger {
		border-color: var(--danger);
		color: var(--danger);
	}

	.icon {
		display: grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--faint);
		cursor: pointer;
		transition: background 0.18s ease, color 0.18s ease;
	}

	.icon:hover {
		background: var(--tint-strong);
		color: var(--danger);
	}

	@media (max-width: 620px) {
		li {
			flex-wrap: wrap;
		}

		.what {
			flex-basis: calc(100% - 3.5rem);
		}

		.controls {
			margin-left: auto;
		}
	}
</style>
