<!--
	Someone's portrait: the photo they uploaded, or initials on a hue derived
	from their username. The generated one is not a placeholder waiting to be
	replaced — it keeps a person the same colour everywhere in the app.
-->
<script>
	import { mediaUrl } from '$lib/config.js';
	import { hueOf, initials } from '$lib/util/format.js';

	let { user, size = 40, ring = false } = $props();

	let hue = $derived(hueOf(user?.username ?? ''));
	let letters = $derived(initials(user?.name ?? user?.username ?? '?'));
	let photo = $derived(mediaUrl(user?.avatar));
</script>

<span
	class="avatar"
	class:ring
	class:has-photo={photo}
	style="--size: {size}px; --hue: {hue}; font-size: {Math.round(size * 0.38)}px"
	aria-hidden="true"
>
	{#if photo}
		<img src={photo} alt="" loading="lazy" />
	{:else}
		{letters}
	{/if}
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
		overflow: hidden;
		box-shadow: inset 0 0 0 1px var(--line-strong);
	}

	/* The generated hue is for initials — behind a photo it only rims the edge. */
	.avatar.has-photo {
		background: var(--surface-2);
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.ring {
		box-shadow:
			inset 0 0 0 1px var(--line-strong),
			0 0 0 2px var(--page),
			0 0 0 3px hsl(var(--hue) 70% 55% / 0.7);
	}
</style>
