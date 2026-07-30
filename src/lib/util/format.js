/** Small display helpers. Everything here takes raw data and returns a string. */

/** 142 → "2h 22m" */
export function duration(minutes) {
	if (!minutes) return '';
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (!h) return `${m}m`;
	return m ? `${h}h ${m}m` : `${h}h`;
}

/** "1994-09-23" → "23 Sep 1994" */
export function longDate(iso) {
	if (!iso) return '';
	return new Date(iso).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
}

/** A timestamp turned into "just now", "4h ago", "12 Mar". */
export function timeAgo(iso) {
	if (!iso) return '';
	const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 7) return `${days}d ago`;
	if (days < 365) return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

/** "2026-12-18" → "in 142 days" / "tomorrow" / "out now". */
export function untilRelease(iso) {
	if (!iso) return '';
	const day = 24 * 60 * 60 * 1000;
	const today = new Date(new Date().toISOString().slice(0, 10));
	const days = Math.round((new Date(iso) - today) / day);
	if (days <= 0) return 'out now';
	if (days === 1) return 'tomorrow';
	if (days < 30) return `in ${days} days`;
	if (days < 365) return `in ${Math.round(days / 30)} months`;
	return `in ${(days / 365).toFixed(1)} years`;
}

/** ["a", "b", "c"] → "a, b and c" (capped, with "+2 more" style overflow). */
export function list(values, max = 3) {
	const items = (values ?? []).filter(Boolean);
	if (!items.length) return '';
	if (items.length <= max) {
		if (items.length === 1) return items[0];
		return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
	}
	return `${items.slice(0, max).join(', ')} +${items.length - max}`;
}

export function plural(count, one, many = `${one}s`) {
	return `${count} ${count === 1 ? one : many}`;
}

/** A 0–100 source score as stars out of 5, rounded to a half. */
export function scoreToStars(score) {
	if (!score) return null;
	return Math.round((score / 20) * 2) / 2;
}

export function initials(name) {
	return (name ?? '')
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0].toUpperCase())
		.join('');
}

/** Stable 0–359 hue from a string, so avatars keep the same colour everywhere. */
export function hueOf(seed) {
	let hash = 0;
	for (let i = 0; i < (seed ?? '').length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
	return hash;
}

export function compactNumber(value) {
	if (value < 1000) return String(value);
	if (value < 10000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
	return `${Math.round(value / 1000)}k`;
}
