/*
 * Built at deploy time, not per request.
 *
 * A Play reviewer fetching this during an API outage must not get a blank
 * page — the submission fails on it. Nothing here depends on the session or
 * the catalogue, so there is nothing to render per visitor.
 */
export const prerender = true;
