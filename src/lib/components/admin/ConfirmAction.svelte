<!--
	A destructive button that asks first, in place.

	The shelf manager already did this by swapping the row's controls for a
	"really?" instead of opening a dialog, and it reads better than a modal for
	something you might do to several rows in a row. This generalises it.

	`confirmText` turns it into the typed kind: for anything that destroys other
	people's data, clicking twice is too easy.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';

	let {
		label = 'Delete',
		prompt = 'Really?',
		confirmLabel = 'Yes',
		cancelLabel = 'No',
		icon = 'trash',
		confirmText = null,
		busy = false,
		disabled = false,
		small = true,
		onconfirm
	} = $props();

	let asking = $state(false);
	let typed = $state('');

	let ready = $derived(!confirmText || typed === confirmText);

	function cancel() {
		asking = false;
		typed = '';
	}

	async function go() {
		if (!ready) return;
		await onconfirm?.();
		cancel();
	}
</script>

{#if asking}
	<div class="confirm">
		<span class="faint">{prompt}</span>

		{#if confirmText}
			<input
				class="field type"
				bind:value={typed}
				placeholder={confirmText}
				aria-label="Type {confirmText} to confirm"
				autocomplete="off"
				spellcheck="false"
			/>
		{/if}

		<button
			type="button"
			class="btn danger"
			class:btn-sm={small}
			disabled={busy || !ready}
			onclick={go}
		>
			{#if busy}<Spinner size={13} />{/if}{confirmLabel}
		</button>
		<button type="button" class="btn btn-ghost" class:btn-sm={small} disabled={busy} onclick={cancel}>
			{cancelLabel}
		</button>
	</div>
{:else}
	<button
		type="button"
		class="btn danger"
		class:btn-sm={small}
		{disabled}
		onclick={() => (asking = true)}
	>
		{#if icon}<Icon name={icon} size={13} />{/if}{label}
	</button>
{/if}

<style>
	.confirm {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}

	.confirm span {
		font-size: 0.85rem;
	}

	.type {
		width: 10rem;
		padding: 0.3rem 0.6rem;
		font-size: 0.82rem;
	}

	.danger {
		border-color: color-mix(in srgb, var(--danger) 45%, transparent);
		color: var(--danger);
	}

	.danger:hover:not([disabled]) {
		background: color-mix(in srgb, var(--danger) 12%, transparent);
	}
</style>
