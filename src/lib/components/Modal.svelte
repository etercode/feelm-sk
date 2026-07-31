<!--
	A centred dialog on a scrim.

	The app had two hand-rolled ones already — the search overlay and the
	screenshot lightbox — and the admin forms would have made a third. Esc
	closes, a click on the scrim closes, focus moves into the panel on open and
	back to whatever opened it on close, and the page behind does not scroll.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';

	let { open = false, title = '', onclose, wide = false, children } = $props();

	/** @type {HTMLElement | null} */
	let panel = $state(null);
	/** @type {Element | null} */
	let restoreTo = null;

	$effect(() => {
		if (!open) return;

		restoreTo = document.activeElement;
		const overflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		// Wait for the panel to exist before reaching into it.
		queueMicrotask(() => panel?.focus());

		return () => {
			document.body.style.overflow = overflow;
			if (restoreTo instanceof HTMLElement) restoreTo.focus();
		};
	});

	/** @param {KeyboardEvent} event */
	function onkeydown(event) {
		if (!open) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose?.();
		}
	}
</script>

<svelte:window {onkeydown} />

{#if open}
	<div class="scrim">
		<!--
			Click-outside-to-close is a real button rather than a handler on the
			backdrop: a div that does something is invisible to a keyboard, and
			wrapping the dialog in a button would not be valid markup. Esc and
			the close button in the header are the other two ways out.
		-->
		<button type="button" class="backdrop" aria-label="Close" onclick={() => onclose?.()}></button>

		<div
			class="panel card"
			class:wide
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			bind:this={panel}
		>
			<header>
				<h2>{title}</h2>
				<button type="button" class="icon-btn" aria-label="Close" onclick={() => onclose?.()}>
					<Icon name="close" size={18} />
				</button>
			</header>

			<div class="body">{@render children()}</div>
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		padding: var(--pad);
		background: var(--veil);
		backdrop-filter: blur(3px);
		animation: fade 0.15s ease;
	}

	.backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		padding: 0;
		background: none;
		cursor: default;
	}

	.panel {
		position: relative;
		width: 100%;
		max-width: 30rem;
		max-height: calc(100dvh - 4rem);
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-pop);
		outline: none;
		animation: rise 0.18s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.panel.wide {
		max-width: 46rem;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.1rem;
		border-bottom: 1px solid var(--line);
	}

	h2 {
		margin: 0;
		font-size: 1.05rem;
	}

	.icon-btn {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border: 0;
		border-radius: 50%;
		background: var(--tint);
		color: var(--muted);
		cursor: pointer;
	}

	.icon-btn:hover {
		background: var(--tint-strong);
		color: var(--ink);
	}

	.body {
		padding: 1.1rem;
		overflow-y: auto;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
</style>
