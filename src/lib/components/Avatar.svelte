<!--
	Initials on a hue derived from the username, so a person keeps the same
	colour everywhere without anyone uploading a photo.
-->
<script>
	import { hueOf, initials } from '$lib/util/format.js';

	let { user, size = 40, ring = false } = $props();

	let hue = $derived(hueOf(user?.username ?? ''));
	let letters = $derived(initials(user?.name ?? user?.username ?? '?'));
</script>

<span
	class="avatar"
	class:ring
	style="--size: {size}px; --hue: {hue}; font-size: {Math.round(size * 0.38)}px"
	aria-hidden="true"
>
	{letters}
</span>

<style>
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background:
			radial-gradient(circle at 30% 25%, hsl(var(--hue) 70% 58%), hsl(calc(var(--hue) + 40) 62% 34%));
		color: #0a0b10;
		font-weight: 700;
		letter-spacing: 0.02em;
		user-select: none;
		flex: none;
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}

	.ring {
		box-shadow:
			inset 0 0 0 1px var(--line-strong),
			0 0 0 2px var(--page),
			0 0 0 3px hsl(var(--hue) 70% 55% / 0.7);
	}
</style>
