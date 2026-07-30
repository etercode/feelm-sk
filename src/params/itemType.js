import { typeKeys } from '$lib/data/types.js';

/** Keeps /movie/dune and /book/dune apart without four near-identical routes. */
export function match(value) {
	return typeKeys.includes(value);
}
