<!--
	The row of numbers at the top of an admin page.

	Same shape as the crawler's stats grid, made into a component because every
	admin section wants one and the interesting part is always the number, not
	the box around it. A tile with an `href` becomes a link to the table it
	summarises.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';

	let {
		/** @type {{ key: string, label: string, value: number|string, icon?: string, hint?: string, href?: string, accent?: string }[]} */
		tiles = []
	} = $props();

	/** @param {number|string} value */
	function shown(value) {
		return typeof value === 'number' ? value.toLocaleString() : value;
	}
</script>

<div class="tiles">
	{#each tiles as tile (tile.key)}
		<svelte:element
			this={tile.href ? 'a' : 'div'}
			href={tile.href}
			class="tile"
			class:link={tile.href}
			data-type={tile.accent}
		>
			<span class="label">
				{#if tile.icon}<Icon name={tile.icon} size={13} />{/if}
				{tile.label}
			</span>
			<strong class="value">{shown(tile.value)}</strong>
			{#if tile.hint}<span class="hint faint">{tile.hint}</span>{/if}
		</svelte:element>
	{/each}
</div>

<style>
	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.75rem;
	}

	.tile {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.85rem 0.95rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.link {
		transition:
			border-color 0.18s ease,
			transform 0.18s ease;
	}

	.link:hover {
		border-color: var(--accent);
		transform: translateY(-1px);
	}

	.label {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.link .label {
		color: var(--accent);
	}

	.value {
		font-size: 1.5rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1.15;
	}

	.hint {
		font-size: 0.78rem;
	}
</style>
