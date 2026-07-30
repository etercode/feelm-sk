# Feelm — frontend

SvelteKit (JavaScript, no TypeScript) frontend for **Feelm**, a shared log of
the films, series, games and books people actually finished.

Catalog, auth, shelves, reviews, follows, feed and seen/NEW all talk to the
Symfony API in `../feelm` via `VITE_API_URL` (default `http://localhost:8092`).

```bash
# API first
cd ../feelm && docker compose up -d
docker compose exec php bin/console doctrine:migrations:migrate
docker compose exec php bin/console app:catalog:seed

# then the front
cd ../feelm-sk
cp .env.example .env   # VITE_API_URL=http://localhost:8092
npm install
npm run dev            # http://localhost:5173
```

Tokens use the same opaque access + refresh flow as runbook (`Authorization: Bearer`,
refresh on 401). Demo login: username `kaan`, password `password123` (after API seed/smoke).

No runtime dependencies. SvelteKit, Vite and svelte-check are the only packages,
and they are all dev dependencies.

## The idea

Four activity types — **movie, series, game, book** — share one envelope:

```js
{ id, type, slug, title, year, tagline, overview, genres, poster, backdrop,
  externalScore, source, details: { /* whatever that type needs */ } }
```

What differs per type lives in **`src/lib/data/types.js`**, the only file that
knows a game has a player perspective and a series has seasons:

| type   | shelf words                          | its own facts                                         |
| ------ | ------------------------------------ | ----------------------------------------------------- |
| movie  | Watchlist · Watching · Watched       | cast, director, runtime, part *n* of a trilogy        |
| series | Watchlist · Watching · Finished      | seasons → episodes, network, episode length, progress |
| game   | Backlog · Playing · Beaten           | player perspective (FPP/TPP/isometric), modes, engine, platforms |
| book   | Reading list · Reading · Read        | author, pages, publisher, ISBN, cycle                 |

Cards, detail pages and profiles read that registry rather than branching on
`item.type`, so a fifth type is an entry in one file plus artwork.

Progress is type-shaped too: an episode for series, hours for games, a page for
books — `progressShapeOf()` drives both the editor and the little bar on a card.

## Design

Paper by default, the dark room on request — the toggle sits in the header and
remembers your choice (`light` → `dark` → `system`).

- Light: `#f7f8fa` page, white cards, `#14171f` ink. Dark: `#12151c` page,
  `#1c2029` cards. Both go through the same tokens in `src/app.css`
- A hue per type — amber films, violet series, mint games, rose books — piped
  through `[data-type]` so a whole section retints itself
- **Instrument Serif** for anything display-sized, **Inter Tight** for the UI
- Artwork lives in panels rather than full-bleed bands

### Home

A compact release plate at the top — upcoming titles — then one section per type
and the activity strip at the bottom.

### Trailers

They play in the page. `Trailer.svelte` renders a privacy-mode YouTube frame in
`cover` (home plate) or `inline` (detail) fit. Keys come from TMDB.

### Search

`/search` is the advanced surface: full-text query, filter panel with live facet
counts (type, genre, decade, score, length, release state, certification,
language), sort, and paging. Every control writes to the query string and lets
the load function re-run, so a filtered search is a shareable link and the
counts always describe the rows on screen.

The **did you mean** line appears when a query barely matched; it carries the
number of results the corrected spelling would give, so it is a decision rather
than a guess. ⌘K opens the quick overlay — same ranking, no facet queries — with
matching people as chips and a link into the full page.

Browse pages (`/movies`, `/series`, `/games`, `/books`) run the same query with
the type pinned. They used to fetch the first hundred titles and filter them in
the browser, which stopped being true the moment the crawler passed a hundred.

### Scores

Two kinds of number, kept apart. **Your people's** ratings are the stars — the
average of what users here gave it. **The outside opinion** is whatever the
crawler collected, shown in that source's own units: `IMDb 7.2 · 7.7k votes`
linking to the IMDb page, or `TMDB 67%` where IMDb has nothing. `externalRating()`
in `$lib/data/items.js` picks which to show, taking the first entry of the
`ratings` map the API sends — it arrives ordered by preference, so the label and
the number always come from the same source.

Search can filter on the IMDb rating and vote count and sort by it.

### NEW and UPCOMING

**New** means the crawler added it after your last catch-up and you have not
opened it since — `addedAt` against the `seenUpTo` timestamp the API returns,
plus the set of titles you opened. Marking everything seen moves the timestamp;
it does not write a row per catalogued title.

**Upcoming** is a future release date, derived not stored: those titles go on the
watchlist only and cannot be rated.

## Layout

```
src/
  app.css                  tokens + shared primitives
  lib/
    api/                   fetch + Bearer refresh
    config.js              VITE_API_URL
    data/
      types.js             per-type registry: words, facts, progress
      items.js             pure helpers (itemPath, isUpcoming, peopleOf)
    state/
      catalog.svelte.js    live catalog from the API
      library.svelte.js    shelves, ratings, reviews, follows, seen
      session.svelte.js    auth
      theme.svelte.js      light / dark / system
    components/
  routes/
    +page.svelte           home
    [type=itemType]/[slug] detail
    movies|series|games|books
    u/[username]           profile
    feed
    login|register
```

## Reviews

One review per person per item — writing again edits it and pushes the previous
text into history. Ratings are halves from 0.5 to 5.

Catalog data is owned by the Symfony API (`../feelm`); this app only reads it
over HTTP.

