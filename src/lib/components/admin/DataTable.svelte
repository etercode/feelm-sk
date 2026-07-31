<!--
	The table every admin list is made of.

	Columns are declared rather than marked up so sorting, alignment and the
	narrow-screen behaviour are decided once. The caller supplies a `row`
	snippet and gets handed each record plus the column being drawn — which
	keeps cell markup where the data is understood, and layout here.

	Under 780px the whole thing turns into stacked cards: a nine-column table on
	a phone is a horizontal scroll nobody wins.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';

	let {
		/** @type {{ key: string, label: string, sort?: string, align?: 'start'|'end', width?: string, hideNarrow?: boolean }[]} */
		columns = [],
		rows = [],
		/** Currently active sort key, as the API names it. */
		sort = null,
		onsort = null,
		loading = false,
		empty = 'Nothing here.',
		rowKey = (/** @type {any} */ row) => row.id,
		row
	} = $props();
</script>

<div class="wrap" class:busy={loading} aria-busy={loading}>
	{#if loading && rows.length === 0}
		<p class="state"><Spinner size={16} /> Loading…</p>
	{:else if rows.length === 0}
		<p class="state faint">{empty}</p>
	{:else}
		<table>
			<thead>
				<tr>
					{#each columns as column (column.key)}
						<th
							class:end={column.align === 'end'}
							class:narrow-hide={column.hideNarrow}
							style={column.width ? `width:${column.width}` : undefined}
							aria-sort={column.sort && sort === column.sort ? 'ascending' : undefined}
						>
							{#if column.sort && onsort}
								<button
									type="button"
									class="sorter"
									class:on={sort === column.sort}
									onclick={() => onsort(column.sort)}
								>
									{column.label}
									{#if sort === column.sort}<Icon name="down" size={12} />{/if}
								</button>
							{:else}
								{column.label}
							{/if}
						</th>
					{/each}
				</tr>
			</thead>

			<tbody>
				{#each rows as record (rowKey(record))}
					<tr>
						{#each columns as column (column.key)}
							<td
								class:end={column.align === 'end'}
								class:narrow-hide={column.hideNarrow}
								data-label={column.label}
							>
								{@render row(record, column)}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.wrap {
		border: 1px solid var(--line);
		border-radius: var(--radius-lg);
		background: var(--surface);
		overflow: hidden;
		transition: opacity 0.15s ease;
	}

	/* A refresh dims the old rows rather than replacing them with a spinner. */
	.wrap.busy table {
		opacity: 0.5;
		pointer-events: none;
	}

	.state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin: 0;
		padding: 3rem 1rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th {
		padding: 0.7rem 0.9rem;
		border-bottom: 1px solid var(--line);
		background: var(--surface-2);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--faint);
		text-align: left;
		white-space: nowrap;
	}

	td {
		padding: 0.7rem 0.9rem;
		border-bottom: 1px solid var(--line);
		vertical-align: middle;
	}

	tbody tr:last-child td {
		border-bottom: 0;
	}

	tbody tr:hover td {
		background: var(--tint);
	}

	.end {
		text-align: right;
	}

	.sorter {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		cursor: pointer;
	}

	.sorter:hover {
		color: var(--ink);
	}

	.sorter.on {
		color: var(--brand);
	}

	/* Stacked cards, one per record, with the header text as the row label. */
	@media (max-width: 780px) {
		table,
		tbody,
		tr,
		td {
			display: block;
			width: 100%;
		}

		thead {
			display: none;
		}

		tbody tr {
			padding: 0.4rem 0;
			border-bottom: 1px solid var(--line);
		}

		tbody tr:last-child {
			border-bottom: 0;
		}

		td {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			gap: 1rem;
			padding: 0.3rem 0.9rem;
			border: 0;
			text-align: left;
		}

		td::before {
			content: attr(data-label);
			flex: none;
			font-size: 0.7rem;
			font-weight: 600;
			letter-spacing: 0.1em;
			text-transform: uppercase;
			color: var(--faint);
		}

		.narrow-hide {
			display: none;
		}
	}
</style>
