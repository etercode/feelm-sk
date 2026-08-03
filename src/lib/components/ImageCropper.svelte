<!--
	Square crop, done in the browser before anything is uploaded.

	The picture is laid out under a fixed square window: drag to move it, the
	slider to zoom, and only what shows through the window is sent. Cropping
	here rather than on the server means the upload is already the size it needs
	to be, and the person sees exactly what they are about to get.

	The server redraws whatever arrives anyway — this is framing, not security.
-->
<script>
	import { t } from '$lib/i18n/index.svelte.js';

	/**
	 * @type {{
	 *   file: File,
	 *   size?: number,
	 *   busy?: boolean,
	 *   onsave: (blob: Blob) => void,
	 *   oncancel: () => void
	 * }}
	 */
	let { file, size = 512, busy = false, onsave, oncancel } = $props();

	/** Edge of the on-screen window. The output is `size`, independent of this. */
	const VIEW = 264;

	/** @type {string | null} */
	let url = $state(null);

	/** @type {HTMLImageElement | undefined} */
	let img = $state();
	let natural = $state({ width: 0, height: 0 });
	let zoom = $state(1);
	let tx = $state(0);
	let ty = $state(0);
	let dragging = $state(false);

	/** Scale at which the picture exactly covers the window. */
	let base = $derived(
		natural.width && natural.height
			? Math.max(VIEW / natural.width, VIEW / natural.height)
			: 1
	);
	let scale = $derived(base * zoom);
	let width = $derived(natural.width * scale);
	let height = $derived(natural.height * scale);

	// One URL per file, revoked when the file changes or the cropper closes.
	// Minting it in an effect rather than a derived keeps the side effect where
	// it can be undone.
	$effect(() => {
		const next = URL.createObjectURL(file);
		url = next;

		return () => URL.revokeObjectURL(next);
	});

	function loaded() {
		if (!img) return;
		natural = { width: img.naturalWidth, height: img.naturalHeight };
		zoom = 1;
		centre();
	}

	function centre() {
		tx = (VIEW - natural.width * scale) / 2;
		ty = (VIEW - natural.height * scale) / 2;
	}

	/** Keeps the window covered — no blank corners, whatever the drag. */
	function clamp() {
		tx = Math.min(0, Math.max(VIEW - width, tx));
		ty = Math.min(0, Math.max(VIEW - height, ty));
	}

	/** @param {PointerEvent} event */
	function down(event) {
		dragging = true;
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	/** @param {PointerEvent} event */
	function move(event) {
		if (!dragging) return;
		tx += event.movementX;
		ty += event.movementY;
		clamp();
	}

	/** @param {PointerEvent} event */
	function up(event) {
		dragging = false;
		event.currentTarget.releasePointerCapture(event.pointerId);
	}

	/**
	 * Zooms about the centre of the window, so the part being looked at stays
	 * put instead of drifting towards a corner.
	 *
	 * @param {number} next
	 */
	function setZoom(next) {
		const middleX = (VIEW / 2 - tx) / scale;
		const middleY = (VIEW / 2 - ty) / scale;

		zoom = Math.min(4, Math.max(1, next));

		tx = VIEW / 2 - middleX * scale;
		ty = VIEW / 2 - middleY * scale;
		clamp();
	}

	/** @param {WheelEvent} event */
	function wheel(event) {
		event.preventDefault();
		setZoom(zoom * (event.deltaY < 0 ? 1.08 : 1 / 1.08));
	}

	function save() {
		if (!img || !natural.width) return;

		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;

		const context = canvas.getContext('2d');
		if (!context) return;

		// JPEG has no alpha, so a transparent PNG would come out black.
		context.fillStyle = '#ffffff';
		context.fillRect(0, 0, size, size);

		// The window, expressed back in the picture's own pixels.
		context.drawImage(img, -tx / scale, -ty / scale, VIEW / scale, VIEW / scale, 0, 0, size, size);

		canvas.toBlob((blob) => blob && onsave(blob), 'image/jpeg', 0.9);
	}
</script>

<div class="cropper">
	<!--
		Dragging is a shortcut for the slider and nothing else: the zoom control
		below reaches every framing this does, so there is nothing here a
		keyboard cannot already do.
	-->
	<div
		class="window"
		class:dragging
		role="group"
		aria-label={t('cropper.drag')}
		style="--view: {VIEW}px"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onwheel={wheel}
	>
		{#if url}
			<img
				bind:this={img}
				src={url}
				alt=""
				onload={loaded}
				style="width: {width}px; height: {height}px; transform: translate({tx}px, {ty}px)"
				draggable="false"
			/>
		{/if}
		<div class="mask"></div>
	</div>

	<label class="zoom">
		<span class="sr-only">{t('cropper.zoom')}</span>
		<input
			type="range"
			min="1"
			max="4"
			step="0.01"
			value={zoom}
			oninput={(event) => setZoom(Number(event.currentTarget.value))}
		/>
	</label>

	<p class="hint faint">{t('cropper.hint')}</p>

	<div class="actions">
		<button type="button" class="btn" onclick={oncancel} disabled={busy}>{t('common.cancel')}</button>
		<button type="button" class="btn btn-primary" onclick={save} disabled={busy || !natural.width}>
			{busy ? t('cropper.uploading') : t('cropper.use')}
		</button>
	</div>
</div>

<style>
	.cropper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.9rem;
	}

	.window {
		position: relative;
		width: var(--view);
		height: var(--view);
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--surface-2);
		cursor: grab;
		/* Otherwise the browser pans the page instead of the picture. */
		touch-action: none;
		user-select: none;
	}

	.window.dragging {
		cursor: grabbing;
	}

	.window img {
		position: absolute;
		top: 0;
		left: 0;
		max-width: none;
		transform-origin: 0 0;
	}

	/*
	 * Shows the circle the picture will be seen through without cropping to it —
	 * avatars are round on screen but the file stays square, so a square crop is
	 * still the honest thing to store.
	 */
	.mask {
		position: absolute;
		inset: 0;
		pointer-events: none;
		box-shadow: inset 0 0 0 1px var(--line-strong);
		background: radial-gradient(circle at 50% 50%, transparent 49.6%, rgb(8 10 15 / 0.55) 50%);
	}

	.zoom {
		width: var(--view, 264px);
		max-width: 100%;
	}

	.zoom input {
		width: 100%;
		accent-color: var(--brand);
	}

	.hint {
		margin: 0;
		font-size: 0.8rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
