<!--
	The trailer, playing in the page rather than behind a button.

	It starts muted because that is the only way a browser will let it start at
	all, and the frame is only rendered when the item actually has a trailer —
	YouTube is never contacted for anything that does not.
-->
<script>
	import { i18n, t } from '$lib/i18n/index.svelte.js';

	let {
		item,
		/** `cover` fills its container (the home plate); `inline` is a 16:9 block. */
		fit = 'inline',
		controls = true,
		muted = true,
		loop = false
	} = $props();

	let key = $derived(item?.trailer?.key ?? null);

	let src = $derived(
		key
			? `https://www.youtube-nocookie.com/embed/${key}?` +
				new URLSearchParams({
					autoplay: '1',
					mute: muted ? '1' : '0',
					controls: controls ? '1' : '0',
					loop: loop ? '1' : '0',
					playlist: key, // a single-video loop needs itself as the playlist
					playsinline: '1',
					rel: '0',
					modestbranding: '1',
					hl: i18n.locale // the player chrome, not the video
				})
			: null
	);
</script>

{#if src}
	<div class="player {fit}">
		{#key src}
			<iframe
				{src}
				title={t('work.trailerTitle', { title: item.title })}
				allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
				allowfullscreen
			></iframe>
		{/key}
	</div>
{/if}

<style>
	.player {
		background: #000;
	}

	.inline {
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-card);
	}

	/*
	 * object-fit: cover, for an iframe: size the 16:9 frame to whichever axis of
	 * the plate is short and let the other overhang, centred. Container units
	 * measure the plate itself, so the crop is right at any plate shape.
	 */
	.cover {
		position: absolute;
		inset: 0;
		overflow: hidden;
		container-type: size;
	}

	.cover iframe {
		position: absolute;
		top: 50%;
		left: 50%;
		width: max(100cqw, calc(100cqh * 16 / 9));
		height: max(100cqh, calc(100cqw * 9 / 16));
		transform: translate(-50%, -50%);
		/* The plate is decoration; the queue and the Details link do the work. */
		pointer-events: none;
	}

	iframe {
		width: 100%;
		height: 100%;
		border: 0;
		display: block;
	}
</style>
