<!--
	A small indeterminate spinner.

	Decoration only — it carries no text and is hidden from screen readers. The
	surrounding component is responsible for announcing what is happening, so
	that a busy state is not reduced to a picture of a circle.
-->
<script>
	let { size = 20 } = $props();
</script>

<span class="spinner" style="--size: {size}px" aria-hidden="true"></span>

<style>
	.spinner {
		display: inline-block;
		width: var(--size);
		height: var(--size);
		border: 2px solid var(--line-strong);
		/* One coloured edge is what makes the rotation legible. */
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}

	/*
	 * app.css freezes every animation under prefers-reduced-motion, which would
	 * leave a spinner sitting still and looking broken. A pulse of opacity is
	 * gentler than rotation but still says "working", so it is reinstated here
	 * at a slow, non-vestibular rate.
	 */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: fade 1.4s ease-in-out infinite !important;
			animation-duration: 1.4s !important;
			animation-iteration-count: infinite !important;
			border-top-color: var(--accent);
		}

		@keyframes fade {
			0%,
			100% {
				opacity: 1;
			}
			50% {
				opacity: 0.35;
			}
		}
	}
</style>
