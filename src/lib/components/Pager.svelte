<!--
	Previous / page-of-pages / next.

	This markup was written four times over — browse, search, the crawler and
	the profile shelf all had their own byte-identical copy — so the admin
	tables took it as the moment to make it one thing.

	It renders nothing at all for a single page, which is what every caller
	wrapped it in an {#if} to achieve.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';

	let { page = 1, pages = 1, onpage, busy = false, label = 'Pagination' } = $props();

	let current = $derived(Math.min(Math.max(page, 1), Math.max(pages, 1)));
</script>

{#if pages > 1}
	<nav class="pager" aria-label={label}>
		<button
			type="button"
			class="btn btn-sm"
			disabled={busy || current <= 1}
			onclick={() => onpage(current - 1)}
		>
			<Icon name="left" size={14} />Previous
		</button>

		<span class="faint">{current.toLocaleString()} / {pages.toLocaleString()}</span>

		<button
			type="button"
			class="btn btn-sm"
			disabled={busy || current >= pages}
			onclick={() => onpage(current + 1)}
		>
			Next<Icon name="right" size={14} />
		</button>
	</nav>
{/if}

<style>
	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem 0 0;
	}
</style>
