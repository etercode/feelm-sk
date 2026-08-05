<!--
	Three ways to hand over a screenshot: press the button, drop the file, or
	paste it.

	Paste is the one that matters. Reporting a bug means taking a screenshot,
	and on every desktop platform that puts the picture on the clipboard rather
	than into a file — so the shortest possible path from "this looks wrong" to
	a report is Ctrl+V, and anything that makes someone save-as first has added
	a step to the thing we most want people to do.

	The paste listener is on the window rather than on this element, because at
	the moment you press Ctrl+V the focus is wherever you were typing, which is
	the textarea next door. Scoped to when the component is mounted, so it never
	steals a paste from a page that has no upload on it.
-->
<script>
	import Icon from '$lib/components/Icon.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import { t } from '$lib/i18n/index.svelte.js';

	/**
	 * @type {{
	 *   images?: Array<{ id: number, url: string | null, purged: boolean }>,
	 *   max?: number,
	 *   busy?: boolean,
	 *   disabled?: boolean,
	 *   onadd: (file: File) => void,
	 *   onremove?: (imageId: number) => void
	 * }}
	 */
	let { images = [], max = 4, busy = false, disabled = false, onadd, onremove } = $props();

	let dragging = $state(false);
	/** @type {HTMLInputElement | undefined} */
	let picker = $state();

	let full = $derived(images.length >= max);
	let closed = $derived(disabled || full);

	/** @param {FileList | File[] | null | undefined} files */
	function take(files) {
		if (closed || !files) return;
		// Only as many as there is room for; the rest are ignored rather than
		// sent and refused one by one.
		for (const file of [...files].slice(0, max - images.length)) {
			if (file.type.startsWith('image/')) onadd(file);
		}
	}

	/** @param {ClipboardEvent} event */
	function onpaste(event) {
		if (closed) return;
		const files = [...(event.clipboardData?.items ?? [])]
			.filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
			.map((item) => item.getAsFile())
			.filter((f) => f !== null);

		if (files.length) {
			// Only when we actually took something, so pasting text into the
			// textarea still behaves normally.
			event.preventDefault();
			take(files);
		}
	}

	$effect(() => {
		window.addEventListener('paste', onpaste);
		return () => window.removeEventListener('paste', onpaste);
	});
</script>

<!--
	A div and not a button: it contains the thumbnails, each with its own remove
	button, and a button inside a button is invalid. The visible button below is
	the accessible control; the whole area is a convenience for a pointer.
-->
<div
	class="drop"
	class:dragging
	class:closed
	ondragover={(event) => {
		if (closed) return;
		event.preventDefault();
		dragging = true;
	}}
	ondragleave={() => (dragging = false)}
	ondrop={(event) => {
		event.preventDefault();
		dragging = false;
		take(event.dataTransfer?.files);
	}}
	role="group"
	aria-label={t('feedback.images')}
>
	{#if images.length}
		<ul class="shots">
			{#each images as image (image.id)}
				<li>
					{#if image.purged}
						<span class="gone" title={t('feedback.imagePurged')}><Icon name="image" size={16} /></span>
					{:else}
						<img src={image.url} alt="" />
					{/if}
					{#if onremove && !disabled}
						<button type="button" class="drop-x" aria-label={t('common.remove')} onclick={() => onremove(image.id)}>
							<Icon name="close" size={12} stroke={2.4} />
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if !closed}
		<div class="invite">
			<button type="button" class="btn btn-sm" onclick={() => picker?.click()} disabled={busy}>
				{#if busy}<Spinner size={13} />{:else}<Icon name="image" size={13} />{/if}
				{t('feedback.addImage')}
			</button>
			<span class="faint hint">{t('feedback.dropHint')}</span>
		</div>
	{:else if full}
		<span class="faint hint">{t('feedback.imageLimit', { max })}</span>
	{/if}

	<input
		bind:this={picker}
		type="file"
		accept="image/*"
		multiple
		class="sr-only"
		onchange={(event) => {
			take(event.currentTarget.files);
			event.currentTarget.value = '';
		}}
	/>
</div>

<style>
	.drop {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.75rem;
		border: 1px dashed var(--line-strong);
		border-radius: var(--radius);
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
	}

	/* Only while something is actually over it — a permanent highlight would
	   be a box that always looks like it is mid-action. */
	.drop.dragging {
		border-color: var(--brand);
		border-style: solid;
		background: var(--tint);
	}

	.drop.closed {
		border-style: solid;
		opacity: 0.75;
	}

	.shots {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.shots li {
		position: relative;
		width: 5.5rem;
		height: 5.5rem;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--surface-2);
	}

	.shots img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* A reclaimed screenshot still takes its place, so the report keeps saying
	   how many there were. */
	.gone {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		color: var(--faint);
	}

	.drop-x {
		position: absolute;
		top: 0.2rem;
		right: 0.2rem;
		display: grid;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		border: none;
		border-radius: 50%;
		background: rgb(6 8 15 / 0.72);
		color: #fff;
		cursor: pointer;
	}

	.drop-x:hover,
	.drop-x:focus-visible {
		background: var(--danger);
	}

	.invite {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.hint {
		font-size: 0.78rem;
	}
</style>
