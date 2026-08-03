<!--
	The trailer.

	Two different jobs from one component. On the home plate it is decoration:
	muted, looping, no controls, playing the moment the page opens because that
	is the whole point of the plate. On a detail page it is content, and content
	does not start talking at you — that one waits to be asked, and until it is
	asked YouTube is never contacted at all.

	`autoplay` is the switch and it defaults to off. An embed that plays on sight
	should have to be opted into rather than remembered about.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte.js';

	let {
		item,
		/** `cover` fills its container (the home plate); `inline` is a 16:9 block. */
		fit = 'inline',
		controls = true,
		muted = true,
		loop = false,
		autoplay = false
	} = $props();

	let key = $derived(item?.trailer?.key ?? null);

	/*
	 * Whether the iframe exists at all. An autoplaying embed is mounted at once;
	 * the rest wait for a click, so a detail page costs nothing until somebody
	 * wants the trailer — no YouTube script, no cookie, no request.
	 */
	let started = $state(false);

	// Set from `autoplay` here rather than as the initial value, so that a
	// different work — a different trailer — does not inherit the last one's
	// started state and begin playing the moment the page changes.
	$effect(() => {
		key;
		started = autoplay;
	});

	let src = $derived(
		key && started
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

	let still = $derived(item?.backdrop ?? item?.poster ?? null);
</script>

{#if key}
	<div class="player {fit}">
		{#if src}
			{#key src}
				<iframe
					{src}
					title={t('work.trailerTitle', { title: item.title })}
					allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
					allowfullscreen
				></iframe>
			{/key}
		{:else}
			<!--
				The poster frame with the play control on it. A real button rather
				than a handler on the image: this is the one interactive thing
				here, and a keyboard has to be able to reach it.
			-->
			<button type="button" class="start" onclick={() => (started = true)}>
				{#if still}
					<img src={still} alt="" loading="lazy" />
				{/if}
				<span class="glyph"><Icon name="play" size={26} filled /></span>
				<span class="sr-only">{t('work.trailerTitle', { title: item.title })}</span>
			</button>
		{/if}
	</div>
{/if}

<style>
	.inline {
		background: #000;
		aspect-ratio: 16 / 9;
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-card);
	}

	/*
	 * object-fit: cover, for an iframe: size the 16:9 frame to whichever axis of
	 * the plate is short and let the other overhang. Container units measure the
	 * plate itself, so the crop is right at any plate shape.
	 */
	/*
	 * No background colour, unlike the inline player. The still sits underneath
	 * this on the home plate, and a black fill would cover it for however long
	 * YouTube takes to paint the first frame — a black rectangle where the
	 * artwork was, every time the page opens.
	 */
	.cover {
		position: absolute;
		inset: 0;
		overflow: hidden;
		container-type: size;
	}

	.cover iframe {
		position: absolute;
		left: 50%;
		/*
		 * Biased upward rather than centred. The frame stopped being a fixed
		 * 84rem and now follows the screen, so the plate is much wider than it
		 * is tall and a 16:9 trailer loses roughly half its height to the crop.
		 * Faces sit above the middle of a shot, so taking more off the bottom
		 * than the top keeps them — the same bias the still underneath uses.
		 */
		top: 42%;
		/*
		 * Covered, then zoomed a further 18%.
		 *
		 * A trailer is usually shot wider than the 16:9 frame YouTube plays it
		 * in — 2.39:1 is the common one — so the player hands us black bars
		 * baked into the picture, top and bottom. Covering the plate exactly
		 * keeps them, and on a plate this wide they read as the video being
		 * letterboxed inside its own box. Overscanning eats them. 18% is short
		 * of the ~34% that would clear a full cinemascope bar, because a
		 * trailer that really is 16:9 would lose a third of itself to that.
		 */
		width: calc(max(100cqw, calc(100cqh * 16 / 9)) * 1.18);
		height: calc(max(100cqh, calc(100cqw * 9 / 16)) * 1.18);
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

	/* Shown until somebody asks for the trailer. */
	.start {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}

	.start img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 22%;
		opacity: 0.75;
		transition: opacity 0.25s ease;
	}

	.start:hover img {
		opacity: 0.92;
	}

	.glyph {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: grid;
		place-items: center;
		width: 4.5rem;
		height: 4.5rem;
		border-radius: 50%;
		background: var(--glass);
		backdrop-filter: blur(10px);
		border: 1px solid rgb(255 255 255 / 0.35);
		color: #fff;
		transition: transform 0.25s cubic-bezier(0.2, 0.7, 0.3, 1);
	}

	.start:hover .glyph {
		transform: translate(-50%, -50%) scale(1.08);
	}

	@media (prefers-reduced-motion: reduce) {
		.start img,
		.glyph {
			transition: none;
		}
	}
</style>
