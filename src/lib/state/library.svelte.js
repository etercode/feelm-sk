/*
 * Social layer backed by the Symfony API.
 *
 * Item ids are the API integer ids (same as `catalog`). User ids are API integers.
 */

import { browser } from '$app/environment';
import * as api from '$lib/api/client.js';
import { catalog } from '$lib/state/catalog.svelte.js';

class Library {
	/** @type {any[]} */
	users = $state([]);
	/** @type {any[]} */
	entries = $state([]);
	/** @type {any[]} */
	reviews = $state([]);
	/** @type {any[]} */
	follows = $state([]);
	/** @type {Set<number|string>} API item ids the current user has opened since catching up */
	seenItemIds = $state(new Set());
	/** @type {string | null} when the current user last caught up with the catalog */
	seenUpTo = $state(null);
	/** @type {Record<number, any>} */
	statsByUser = $state({});

	#hydrated = false;

	hydrate() {
		if (!browser || this.#hydrated) return;
		this.#hydrated = true;
	}

	/** @param {any} user */
	rememberUser(user) {
		if (!user?.id) return;
		const existing = this.users.find((u) => u.id === user.id);
		if (existing) {
			this.users = this.users.map((u) => (u.id === user.id ? { ...u, ...user } : u));
		} else {
			this.users = [...this.users, user];
		}
	}

	clearUserData() {
		this.entries = [];
		this.reviews = [];
		this.follows = [];
		this.seenItemIds = new Set();
		this.seenUpTo = null;
		this.statsByUser = {};
	}

	/**
	 * Load the signed-in person's shelf, seen set, following list and feed.
	 * @param {any} me
	 */
	async hydrateForUser(me) {
		if (!browser || !me) return;

		try {
			/*
			 * No catalog.hydrate() here. Every shelf row, review and activity
			 * event below arrives with its own work attached and is handed to
			 * catalog.remember(), so the lookups these feed resolve without
			 * the front page's rails — which a signed-in visitor was pulling
			 * on whatever page they happened to open.
			 */
			const [entriesPayload, seenPayload, followingPayload, feedPayload] = await Promise.all([
				api.getMyEntries(),
				api.listSeen(),
				api.getFollowing(me.username),
				api.getFeed({ scope: 'following', limit: 40 })
			]);

			this.entries = [];
			this.reviews = [];
			this.follows = [];

			// Titles first, so the recent rows that have one resolve against it.
			for (const item of entriesPayload?.items ?? []) {
				catalog.remember(item);
			}

			for (const row of entriesPayload?.entries ?? []) {
				this.#ingestEntryRow(row);
			}

			this.seenItemIds = new Set(seenPayload?.itemIds ?? []);
			this.seenUpTo = seenPayload?.seenUpTo ?? null;

			for (const person of followingPayload?.users ?? []) {
				this.rememberUser(person);
				this.#setFollow(me.id, person.id, true);
			}

			this.#ingestActivity(feedPayload?.activity ?? []);
		} catch (e) {
			console.warn('library hydrate failed', e);
		}
	}

	/** @param {any} apiItem */
	#catalogId(apiItem) {
		if (!apiItem?.id) return null;
		catalog.remember(apiItem);
		return apiItem.id;
	}

	/** @param {any} entry @param {any} apiItem */
	#ingestEntryRow(entry, apiItem = null) {
		// The shelf now arrives as state without titles — /api/me/entries used to
		// send a whole detail page per row and exhausted the server's memory on a
		// large shelf. Rows that do carry an item (a profile page, a rail) still
		// hand it over to be remembered; rows that do not name their title by id.
		const itemId = apiItem ? this.#catalogId(apiItem) : (entry?.itemId ?? null);
		if (!itemId || !entry) return;

		const normalized = {
			id: entry.id,
			userId: entry.userId,
			itemId,
			status: entry.status,
			rating: entry.rating ?? null,
			at: entry.updatedAt ?? entry.at ?? new Date().toISOString(),
			progress: entry.progress ?? null
		};

		const idx = this.entries.findIndex(
			(e) => e.userId === normalized.userId && e.itemId === normalized.itemId
		);
		if (idx >= 0) {
			this.entries = this.entries.map((e, i) => (i === idx ? normalized : e));
		} else {
			this.entries = [...this.entries, normalized];
		}
	}

	/** @param {any[]} activity */
	#ingestActivity(activity) {
		for (const event of activity) {
			if (event.user) this.rememberUser(event.user);
			if (event.entry && event.item) this.#ingestEntryRow(event.entry, event.item);
			if (event.review && event.item) this.#ingestReview(event.review, event.item);
		}
	}

	/** @param {any} review @param {any} apiItem */
	#ingestReview(review, apiItem) {
		const itemId = this.#catalogId(apiItem);
		if (!itemId || !review) return;
		if (review.user) this.rememberUser(review.user);

		const normalized = {
			id: review.id,
			userId: review.userId,
			itemId,
			rating: review.rating,
			body: review.body,
			createdAt: review.createdAt,
			updatedAt: review.updatedAt,
			history: review.history ?? []
		};

		const idx = this.reviews.findIndex(
			(r) => r.userId === normalized.userId && r.itemId === normalized.itemId
		);
		if (idx >= 0) {
			this.reviews = this.reviews.map((r, i) => (i === idx ? normalized : r));
		} else {
			this.reviews = [...this.reviews, normalized];
		}
	}

	/** @param {string} username */
	async loadProfile(username) {
		const data = await api.getProfile(username);
		this.rememberUser(data.user);
		this.statsByUser = { ...this.statsByUser, [data.user.id]: data.stats };

		// The shelf no longer arrives with the profile — it is paged separately,
		// because a profile response cannot grow with how much somebody logs.
		// What does arrive is what the head of the page shows.
		this.ingestEntries(data.current);
		if (data.banner) catalog.remember(data.banner);

		for (const review of data.reviews ?? []) {
			const item = catalog.itemById(review.itemId);
			if (item) this.#ingestReview(review, item);
			else if (review.itemId) {
				this.#ingestReview(review, { id: review.itemId, type: 'movie', slug: '' });
			}
			if (review.user) this.rememberUser(review.user);
		}

		const [followers, following] = await Promise.all([
			api.getFollowers(username),
			api.getFollowing(username)
		]);

		for (const person of followers?.users ?? []) {
			this.rememberUser(person);
			this.#setFollow(person.id, data.user.id, true);
		}
		for (const person of following?.users ?? []) {
			this.rememberUser(person);
			this.#setFollow(data.user.id, person.id, true);
		}

		return data;
	}

	/**
	 * Takes a page of shelf rows into the store, so the rest of the app can
	 * answer questions about the entries it has actually seen. The store holds
	 * what has been loaded, not everything that exists — entryFor() returning
	 * null means "not loaded here", which is the same answer it has always
	 * given for somebody else's shelf.
	 *
	 * @param {Array<{ entry: any, item: any }> | undefined | null} rows
	 */
	ingestEntries(rows) {
		for (const row of rows ?? []) {
			this.#ingestEntryRow(row.entry, row.item);
		}
	}

	/** @param {number} followerId @param {number} followedId @param {boolean} following */
	setFollowing(followerId, followedId, following) {
		this.#setFollow(followerId, followedId, following);
	}

	/** @param {number} followerId @param {number} followedId @param {boolean} following */
	#setFollow(followerId, followedId, following) {
		const exists = this.isFollowing(followerId, followedId);
		if (following && !exists) {
			this.follows = [...this.follows, { followerId, followedId }];
		} else if (!following && exists) {
			this.follows = this.follows.filter(
				(f) => !(f.followerId === followerId && f.followedId === followedId)
			);
		}
	}

	/**
	 * @param {'following' | 'everyone'} scope
	 * @param {number} [limit]
	 */
	/**
	 * One page of the feed, in the order the server ranked it.
	 *
	 * The events are returned rather than read back out of `entries`, which is
	 * the difference that makes paging work at all. That cache also holds every
	 * row of your own shelf, from getMyEntries — so rebuilding the feed from it
	 * mixed your whole library into a list the server had already chosen forty
	 * of, and page two would have been forty more of the same shuffle.
	 *
	 * Ingested as well as returned, because the users and works attached to
	 * each event are worth keeping for every other page that looks them up.
	 *
	 * @param {'following' | 'everyone' | 'me'} scope
	 */
	async loadFeed(scope = 'following', limit = 40, page = 1) {
		const data = await api.getFeed({ scope, limit, page });
		const activity = data?.activity ?? [];
		this.#ingestActivity(activity);

		return {
			events: activity
				.filter((event) => event.user && event.item && event.entry)
				// `at` is a plain date on the wire and an instant next to it;
				// the card writes "3 hours ago", so it wants the instant.
				.map((event) => ({
					...event,
					entry: { ...event.entry, at: event.entry.updatedAt ?? event.entry.at }
				})),
			hasMore: Boolean(data?.hasMore)
		};
	}

	/** @param {any} item */
	async loadItemReviews(item) {
		if (!item?.type || !item?.slug) return;
		catalog.remember(item);
		const data = await api.getItemReviews(item.type, item.slug);
		for (const review of data?.reviews ?? []) {
			this.#ingestReview(review, item);
			if (review.user) this.rememberUser(review.user);
		}
		return data?.rating ?? null;
	}

	#pathOf(itemId) {
		const item = catalog.itemById(itemId);
		if (!item) return null;
		return { type: item.type, slug: item.slug };
	}

	userById(userId) {
		return this.users.find((user) => user.id === userId) ?? null;
	}

	userByUsername(username) {
		return this.users.find((user) => user.username === username) ?? null;
	}

	/**
	 * New means the crawler added it after you last caught up and you have not
	 * opened it since. Without the timestamp every title you had not clicked
	 * would wear a NEW badge forever.
	 */
	isNewFor(userId, item) {
		if (!item?.id || !item.addedAt) return false;
		if (!userId) return false;
		if (this.seenItemIds.has(item.id)) return false;
		if (!this.seenUpTo) return true;
		return item.addedAt > this.seenUpTo;
	}

	newForUser(userId, list) {
		return list.filter((item) => this.isNewFor(userId, item));
	}

	markSeen(userId, itemId) {
		const path = this.#pathOf(itemId);
		if (!path) return;
		this.seenItemIds = new Set([...this.seenItemIds, itemId]);
		void api.markSeen(path.type, path.slug).catch(() => {});
	}

	catchUp(userId) {
		// One timestamp, not one row per title in the catalog.
		this.seenUpTo = new Date().toISOString();
		this.seenItemIds = new Set();
		void api.catchUpSeen().catch(() => {});
	}

	entriesOf(userId) {
		return this.entries
			.filter((entry) => entry.userId === userId)
			.slice()
			.sort((a, b) => b.at.localeCompare(a.at));
	}

	entryFor(userId, itemId) {
		return this.entries.find((entry) => entry.userId === userId && entry.itemId === itemId) ?? null;
	}

	entriesForItem(itemId) {
		return this.entries
			.filter((entry) => entry.itemId === itemId)
			.slice()
			.sort((a, b) => b.at.localeCompare(a.at));
	}

	setStatus(userId, itemId, status) {
		const path = this.#pathOf(itemId);
		if (!path) return;
		const existing = this.entryFor(userId, itemId);

		if (!status) {
			this.entries = this.entries.filter((entry) => entry !== existing);
			void api.deleteEntry(path.type, path.slug).catch(() => {});
			return;
		}

		if (existing) {
			this.entries = this.entries.map((entry) =>
				entry === existing ? { ...entry, status, at: new Date().toISOString() } : entry
			);
		} else {
			this.entries = [
				...this.entries,
				{
					id: `local-${itemId}`,
					userId,
					itemId,
					status,
					rating: null,
					at: new Date().toISOString(),
					progress: null
				}
			];
		}

		void api
			.upsertEntry(path.type, path.slug, { status })
			.then((row) => {
				if (row) {
					const item = catalog.itemById(itemId);
					if (item) this.#ingestEntryRow(row, item);
				}
			})
			.catch(() => {});
	}

	setProgress(userId, itemId, progress) {
		const path = this.#pathOf(itemId);
		if (!path) return;
		if (!this.entryFor(userId, itemId)) this.setStatus(userId, itemId, 'active');

		this.entries = this.entries.map((entry) =>
			entry.userId === userId && entry.itemId === itemId
				? { ...entry, progress, at: new Date().toISOString() }
				: entry
		);

		void api.upsertEntry(path.type, path.slug, { progress }).catch(() => {});
	}

	setRating(userId, itemId, rating) {
		const path = this.#pathOf(itemId);
		if (!path) return;
		if (!this.entryFor(userId, itemId)) this.setStatus(userId, itemId, 'done');

		this.entries = this.entries.map((entry) =>
			entry.userId === userId && entry.itemId === itemId
				? { ...entry, rating, at: new Date().toISOString() }
				: entry
		);

		void api.upsertEntry(path.type, path.slug, { rating }).catch(() => {});

		const review = this.reviewFor(userId, itemId);
		if (review && rating) this.saveReview(userId, itemId, { rating, body: review.body });
	}

	reviewFor(userId, itemId) {
		return (
			this.reviews.find((review) => review.userId === userId && review.itemId === itemId) ?? null
		);
	}

	reviewsForItem(itemId) {
		return this.reviews
			.filter((review) => review.itemId === itemId)
			.slice()
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	}

	reviewsBy(userId) {
		return this.reviews
			.filter((review) => review.userId === userId)
			.slice()
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	}

	saveReview(userId, itemId, { rating, body }) {
		const path = this.#pathOf(itemId);
		if (!path) return;
		const now = new Date().toISOString();
		const existing = this.reviewFor(userId, itemId);

		if (existing) {
			const previous = {
				rating: existing.rating,
				body: existing.body,
				editedAt: existing.updatedAt
			};
			this.reviews = this.reviews.map((review) =>
				review === existing
					? { ...review, rating, body, updatedAt: now, history: [previous, ...review.history] }
					: review
			);
		} else {
			this.reviews = [
				...this.reviews,
				{
					id: `local-r-${itemId}`,
					userId,
					itemId,
					rating,
					body,
					createdAt: now,
					updatedAt: now,
					history: []
				}
			];
		}

		if (!this.entryFor(userId, itemId)) this.setStatus(userId, itemId, 'done');
		this.entries = this.entries.map((candidate) =>
			candidate.userId === userId && candidate.itemId === itemId
				? { ...candidate, rating }
				: candidate
		);

		void api
			.saveReview(path.type, path.slug, { rating, body })
			.then((row) => {
				const item = catalog.itemById(itemId);
				if (row && item) this.#ingestReview(row, item);
			})
			.catch(() => {});
	}

	deleteReview(userId, itemId) {
		const path = this.#pathOf(itemId);
		this.reviews = this.reviews.filter(
			(review) => !(review.userId === userId && review.itemId === itemId)
		);
		if (path) void api.deleteReview(path.type, path.slug).catch(() => {});
	}

	ratingOf(itemId) {
		const ratings = this.entries
			.filter((entry) => entry.itemId === itemId && entry.rating)
			.map((entry) => entry.rating);
		if (!ratings.length) {
			const reviewRatings = this.reviews
				.filter((r) => r.itemId === itemId && r.rating)
				.map((r) => r.rating);
			if (!reviewRatings.length) return { average: null, count: 0 };
			const total = reviewRatings.reduce((sum, rating) => sum + rating, 0);
			return {
				average: Math.round((total / reviewRatings.length) * 10) / 10,
				count: reviewRatings.length
			};
		}
		const total = ratings.reduce((sum, rating) => sum + rating, 0);
		return { average: Math.round((total / ratings.length) * 10) / 10, count: ratings.length };
	}

	isFollowing(followerId, followedId) {
		return this.follows.some(
			(follow) => follow.followerId === followerId && follow.followedId === followedId
		);
	}

	toggleFollow(followerId, followedId) {
		if (followerId === followedId) return;
		const target = this.userById(followedId);
		if (!target?.username) return;

		const was = this.isFollowing(followerId, followedId);
		this.#setFollow(followerId, followedId, !was);

		void api
			.toggleFollow(target.username)
			.then((res) => {
				if (res && typeof res.following === 'boolean') {
					this.#setFollow(followerId, followedId, res.following);
				}
			})
			.catch(() => this.#setFollow(followerId, followedId, was));
	}

	followingOf(userId) {
		return this.follows
			.filter((follow) => follow.followerId === userId)
			.map((follow) => this.userById(follow.followedId))
			.filter(Boolean);
	}

	followersOf(userId) {
		return this.follows
			.filter((follow) => follow.followedId === userId)
			.map((follow) => this.userById(follow.followerId))
			.filter(Boolean);
	}

	activity({ userIds = null, limit = 20 } = {}) {
		return this.entries
			.filter((entry) => !userIds || userIds.includes(entry.userId))
			.slice()
			.sort((a, b) => b.at.localeCompare(a.at))
			.slice(0, limit)
			.map((entry) => ({
				entry,
				user: this.userById(entry.userId),
				item: catalog.itemById(entry.itemId),
				review: this.reviewFor(entry.userId, entry.itemId)
			}))
			.filter((event) => event.user && event.item);
	}

	feedFor(userId, limit = 20) {
		const ids = this.followingOf(userId).map((user) => user.id);
		ids.push(userId);
		return this.activity({ userIds: ids, limit });
	}

	statsOf(userId) {
		if (this.statsByUser[userId]) return this.statsByUser[userId];

		const entries = this.entriesOf(userId);
		const done = entries.filter((entry) => entry.status === 'done');
		const rated = entries.filter((entry) => entry.rating);
		const byType = {};

		for (const entry of done) {
			const item = catalog.itemById(entry.itemId);
			if (item) byType[item.type] = (byType[item.type] ?? 0) + 1;
		}

		return {
			logged: entries.length,
			finished: done.length,
			reviews: this.reviewsBy(userId).length,
			averageRating: rated.length
				? Math.round((rated.reduce((sum, entry) => sum + entry.rating, 0) / rated.length) * 10) /
					10
				: null,
			byType
		};
	}

}

export const library = new Library();
