<!--
	One inline SVG set, so the app ships no icon dependency. Everything is drawn
	on a 24×24 grid as strokes; `filled` swaps to a solid shape for stars.
-->
<script>
	const paths = {
		search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4.2-4.2',
		image: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 3-3L20 15',
		/*
		 * A speech bubble, for feedback. What used to be here was called
		 * `megaphone` and was drawn as a speaker cone with one arc beside it —
		 * which is `sound` with a wave missing, so the "tell us something"
		 * button read as a volume control. Saying something is the metaphor
		 * anyway; announcing at people is not.
		 */
		chat: 'M4 4h16v11H8l-4 4V4Z',
		star: 'M12 3.6l2.6 5.3 5.8.9-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.9L12 3.6Z',
		check: 'M4.8 12.4l4.8 4.8L19.2 6.8',
		plus: 'M12 5v14M5 12h14',
		minus: 'M5 12h14',
		right: 'M9 5l7 7-7 7',
		left: 'M15 5l-7 7 7 7',
		down: 'M5 9l7 7 7-7',
		up: 'M5 15l7-7 7 7',
		close: 'M6 6l12 12M18 6L6 18',
		film: 'M4 4h16v16H4zM9 4v16M15 4v16M4 9h5M4 15h5M15 9h5M15 15h5',
		tv: 'M3 7h18v12H3zM8 3l4 4 4-4',
		gamepad:
			'M8 9h8a5 5 0 0 1 0 10c-1.7 0-2.4-.8-4-.8s-2.3.8-4 .8a5 5 0 0 1 0-10ZM6.4 12v3M4.9 13.5h3M16.2 12.6h.01M18 14.6h.01',
		book: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5V4.5ZM5 18.5A1.5 1.5 0 0 0 6.5 20H19v-3',
		users:
			'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15 4.2a3.5 3.5 0 0 1 0 6.6',
		user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20c0-3.3 3.1-5.6 7-5.6s7 2.3 7 5.6',
		edit: 'M4 20h4L18 10l-4-4L4 16v4ZM13.5 6.5l4 4',
		history: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v4h4M12 8v4.4l3 1.8',
		external: 'M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4',
		bookmark: 'M7 4h10v16l-5-4-5 4V4Z',
		clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 8v4.4l3 1.8',
		calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
		menu: 'M4 7h16M4 12h16M4 17h16',
		logout: 'M9 5H5v14h4M15 8l4 4-4 4M19 12H9',
		play: 'M8 5l11 7-11 7V5Z',
		eye: 'M2.5 12S6 5.6 12 5.6 21.5 12 21.5 12 18 18.4 12 18.4 2.5 12 2.5 12ZM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z',
		activity: 'M3.5 12h4l2.5-6.5 3.5 13L16.5 12h4',
		sparkle: 'M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4Z',
		flame: 'M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.7.8-3 1.6-3.9.2 1.4 1 2.2 1.9 2.2 1.3 0 1.9-1.3 1.5-3.3-.2-1.2-.6-2.6-1-4Z',
		sun: 'M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6ZM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4',
		moon: 'M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z',
		monitor: 'M3 5h18v11H3zM9 20h6M12 16v4',
		quote: 'M9.5 6C7 7.2 5.5 9.4 5.5 12.4V18h5.2v-5.6H8.2c0-2 .6-3.4 2.3-4.4L9.5 6ZM18 6c-2.5 1.2-4 3.4-4 6.4V18h5.2v-5.6h-2.5c0-2 .6-3.4 2.3-4.4L18 6Z',
		shield: 'M12 3.2 19 6v5.4c0 4-2.9 7.5-7 9.4-4.1-1.9-7-5.4-7-9.4V6l7-2.8Z',
		trash: 'M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2L17.5 7M10.5 10.5v5.5M13.5 10.5v5.5',
		gear: 'M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6ZM19.6 14a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a1.9 1.9 0 1 1-3.8 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1A1.6 1.6 0 0 0 4 14h-.2a1.9 1.9 0 1 1 0-3.8H4a1.6 1.6 0 0 0 1.1-2.8L5 7.3a1.9 1.9 0 1 1 2.7-2.7l.1.1A1.6 1.6 0 0 0 10.5 4v-.2a1.9 1.9 0 1 1 3.8 0V4a1.6 1.6 0 0 0 2.7 1.1l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a1.9 1.9 0 1 1 0 3.8h-.2a1.6 1.6 0 0 0-1.3.7Z',
		warning: 'M12 4.2 21 19.4H3L12 4.2ZM12 10v4M12 16.6h.01',
		database: 'M12 3.4c4.4 0 8 1.2 8 2.7s-3.6 2.7-8 2.7-8-1.2-8-2.7 3.6-2.7 8-2.7ZM4 6.1v11.8c0 1.5 3.6 2.7 8 2.7s8-1.2 8-2.7V6.1M4 12c0 1.5 3.6 2.7 8 2.7s8-1.2 8-2.7',
		chart: 'M4 20V4M4 20h16M8 17V11M12.5 17V7M17 17v-4',
		refresh: 'M20 5.5v5h-5M4 18.5v-5h5M19.2 13.5A7.5 7.5 0 0 1 6.9 17.2M4.8 10.5A7.5 7.5 0 0 1 17.1 6.8',
		filter: 'M4 5.5h16l-6.2 7.2V19l-3.6-2.2v-4.1L4 5.5Z',
		dots: 'M6 12h.01M12 12h.01M18 12h.01',
		key: 'M15.5 4a4.5 4.5 0 1 0-4.2 6.1L10 11.4H7.5l-1 1v2.3l-1 1v2.3h3.2l6.1-6.1A4.5 4.5 0 0 0 15.5 4ZM16.3 7.6h.01',
		mail: 'M3.5 6h17v12h-17zM3.5 7l8.5 6 8.5-6',
		// The only logo in the set, so the only one drawn as a solid shape rather
		// than a stroke — a brand mark traced in outline stops being the mark.
		// Pass `filled` with this one.
		discord:
			'M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286ZM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189Zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
		// A speaker with two arcs, and the same speaker with the arcs struck out.
		// The cone is identical in both so the toggle reads as one control
		// changing state rather than two different buttons.
		sound: 'M4 9.5h3L11 6v12l-4-3.5H4v-5ZM14.4 9.4a3.8 3.8 0 0 1 0 5.2M17.2 6.8a7.6 7.6 0 0 1 0 10.4',
		mute: 'M4 9.5h3L11 6v12l-4-3.5H4v-5ZM15 10l4.5 4.5M19.5 10 15 14.5',
		pause: 'M9 5v14M15 5v14',
		expand: 'M9 4H4v5M20 9V4h-5M15 20h5v-5M4 15v5h5',
		collapse: 'M4 9h5V4M20 9h-5V4M15 20v-5h5M9 20v-5H4'
	};

	/** Type keys map onto their own glyph so callers can pass an item type. */
	const aliases = { movie: 'film', series: 'tv', game: 'gamepad', book: 'book' };

	let { name, size = 20, filled = false, stroke = 1.6, label = null } = $props();

	let d = $derived(paths[aliases[name] ?? name] ?? paths.sparkle);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill={filled ? 'currentColor' : 'none'}
	stroke="currentColor"
	stroke-width={filled ? 0 : stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden={label ? undefined : 'true'}
	aria-label={label ?? undefined}
	role={label ? 'img' : undefined}
>
	<path {d} />
</svg>

<style>
	svg {
		flex: none;
	}
</style>
