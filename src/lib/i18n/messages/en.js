/*
 * The master dictionary. Every other language is a translation of this file and
 * carries the same keys.
 *
 * Keys are flat and dotted — 'feed.empty.everyone' rather than a nested object
 * — because lookup is then one property access, and because a missing key is
 * obvious in a diff between two flat files in a way a missing branch is not.
 *
 * A key ending in `.one` / `.few` / `.many` / `.other` is a plural set: `t()`
 * picks between them from the `count` it was passed. English needs two of the
 * four, so only two are written here; Russian writes three, and Turkish and
 * Azerbaijani write `.other` alone because neither inflects a noun after a
 * numeral.
 */

/** @type {Record<string, string>} */
export const en = {
	/* ---- shared ------------------------------------------------------- */

	'common.loading': 'Loading…',
	'common.loadingPage': 'Loading page',
	'common.cancel': 'Cancel',
	'common.save': 'Save',
	'common.saving': 'Saving…',
	'common.saved': 'Saved.',
	'common.remove': 'Remove',
	'common.keep': 'Keep',
	'common.clear': 'Clear',
	'common.clearCount': 'Clear {count}',
	'common.close': 'Close',
	'common.previous': 'Previous',
	'common.next': 'Next',
	'common.go': 'Go',
	'common.backHome': 'Back home',
	'common.edit': 'Edit',
	'common.delete': 'Delete',
	'common.search': 'Search',
	'common.seeAll': 'See all',
	'common.new': 'New',
	'common.people': 'People',
	'common.apiUnreachable': 'The catalog API is unreachable.',

	/* ---- the bar ------------------------------------------------------ */

	'nav.home': 'Feelm — home',
	'nav.feed': 'Feed',
	'nav.search': 'Search',
	'nav.menu': 'Menu',
	'nav.account': 'Your account',
	'nav.profile': 'Your profile',
	'nav.yourFeed': 'Your feed',
	'nav.settings': 'Settings',
	'nav.admin': 'Admin',
	'nav.signIn': 'Sign in',
	'nav.signOut': 'Sign out',
	'nav.theme': 'Theme: {mode}',
	'theme.light': 'Light',
	'theme.dark': 'Dark',
	'theme.system': 'System',

	/* ---- the footer --------------------------------------------------- */

	'footer.blurb':
		'A shared log of what people actually finished — films, series, games and books, with the score and the one review they stand behind.',
	'footer.browse': 'Browse',
	'footer.catalog': 'Catalog',
	'footer.crawlerNote': 'Filled in by the crawler.',
	'footer.crawlerLink': 'Crawler status',
	'footer.credit': 'Film and series data from TMDB.',

	/* ---- the four types ----------------------------------------------- */

	'type.movie.label': 'Movie',
	'type.movie.plural': 'Movies',
	'type.series.label': 'Series',
	'type.series.plural': 'Series',
	'type.game.label': 'Game',
	'type.game.plural': 'Games',
	'type.book.label': 'Book',
	'type.book.plural': 'Books',

	/* ---- shelves, per type -------------------------------------------- */

	'status.movie.wishlist': 'Watchlist',
	'status.movie.active': 'Watching',
	'status.movie.done': 'Watched',
	'status.movie.dropped': 'Bailed',
	'status.series.wishlist': 'Watchlist',
	'status.series.active': 'Watching',
	'status.series.done': 'Finished',
	'status.series.dropped': 'Dropped',
	'status.game.wishlist': 'Backlog',
	'status.game.active': 'Playing',
	'status.game.done': 'Beaten',
	'status.game.dropped': 'Dropped',
	'status.book.wishlist': 'Reading list',
	'status.book.active': 'Reading',
	'status.book.done': 'Read',
	'status.book.dropped': 'Abandoned',

	/*
	 * A feed line is a whole sentence, not a verb dropped between two links.
	 *
	 * English puts the verb in the middle — "Kaan watched Dune" — and Turkish
	 * and Azerbaijani put it at the end. A `verb` key alone can only produce the
	 * English order, so the template is the key and `{person}` and `{title}` are
	 * slots the card fills with its two links. See ActivityCard.
	 */
	'activity.movie.done': '{person} watched {title}',
	'activity.movie.active': '{person} is watching {title}',
	'activity.movie.wishlist': '{person} wants to watch {title}',
	'activity.series.done': '{person} finished {title}',
	'activity.series.active': '{person} is watching {title}',
	'activity.series.wishlist': '{person} wants to watch {title}',
	'activity.game.done': '{person} beat {title}',
	'activity.game.active': '{person} is playing {title}',
	'activity.game.wishlist': '{person} wants to play {title}',
	'activity.book.done': '{person} read {title}',
	'activity.book.active': '{person} is reading {title}',
	'activity.book.wishlist': '{person} wants to read {title}',
	'activity.dropped': '{person} gave up on {title}',
	'activity.logged': '{person} logged {title}',

	/* ---- the detail sheet --------------------------------------------- */

	'facet.directedBy': 'Directed by',
	'facet.writtenBy': 'Written by',
	'facet.runtime': 'Runtime',
	'facet.released': 'Released',
	'facet.rated': 'Rated',
	'facet.createdBy': 'Created by',
	'facet.network': 'Network',
	'facet.status': 'Status',
	'facet.seasons': 'Seasons',
	'facet.episodes': 'Episodes',
	'facet.episodeLength': 'Episode length',
	'facet.firstAired': 'First aired',
	'facet.lastAired': 'Last aired',
	'facet.developer': 'Developer',
	'facet.publisher': 'Publisher',
	'facet.perspective': 'Player perspective',
	'facet.modes': 'Modes',
	'facet.platforms': 'Platforms',
	'facet.engine': 'Engine',
	'facet.mainStory': 'Main story',
	'facet.firstPublished': 'First published',
	'facet.pages': 'Pages',
	'facet.isbn': 'ISBN',
	'facet.collectionPart': 'Part {part} of {total}',

	/* ---- how far in somebody is --------------------------------------- */

	'progress.season': 'Season',
	'progress.episode': 'Episode',
	'progress.hoursPlayed': 'Hours played',
	'progress.page': 'Page',
	'progress.seriesAt': 'Season {season}, episode {episode}',
	'progress.gameAt': '{hours} hours in',
	'progress.bookAt': 'Page {page} of {pages}',
	'progress.bookAtUnknown': 'Page {page}',

	/* ---- formatting ---------------------------------------------------
	 *
	 * Durations and relative times are assembled here rather than in code so a
	 * language can reorder or re-word them. "2h 22m" is not universal.
	 */

	'format.hoursMinutes': '{h}h {m}m',
	'format.hoursOnly': '{h}h',
	'format.minutesOnly': '{m}m',
	'format.justNow': 'just now',
	'format.minutesAgo': '{n}m ago',
	'format.hoursAgo': '{n}h ago',
	'format.daysAgo': '{n}d ago',
	'format.outNow': 'out now',
	'format.tomorrow': 'tomorrow',
	'format.inDays': 'in {n} days',
	'format.inMonths': 'in {n} months',
	'format.inYears': 'in {n} years',
	'format.hoursSuffix': '{n} hours',
	'format.pagesSuffix': '{n} pages',

	/* ---- counted nouns ------------------------------------------------- */

	'count.season.one': '{count} season',
	'count.season.other': '{count} seasons',
	'count.episode.one': '{count} episode',
	'count.episode.other': '{count} episodes',
	'count.title.one': '{count} title',
	'count.title.other': '{count} titles',
	'count.result.one': '{count} result',
	'count.result.other': '{count} results',
	'count.rating.one': '{count} rating',
	'count.rating.other': '{count} ratings',
	'count.entry.one': '{count} entry',
	'count.entry.other': '{count} entries',
	'count.follower.one': '{count} follower',
	'count.follower.other': '{count} followers',
	'count.shelf.one': '{count} shelf',
	'count.shelf.other': '{count} shelves',
	'count.version.one': '{count} earlier version',
	'count.version.other': '{count} earlier versions',
	'count.votes.one': '{count} vote',
	'count.votes.other': '{count} votes',
	'count.following': '{count} following',
	'count.announced': '{count} announced',
	'count.episodesShort': '{count} ep',

	/*
	 * The noun on its own, for the one place the number is rendered separately
	 * because it is set in bold.
	 */
	'noun.result.one': 'result',
	'noun.result.other': 'results',

	/* ---- home ---------------------------------------------------------- */

	'home.title': 'Feelm — films, series, games and books people finished',
	'common.score': 'Score',
	'home.catalogFailed': 'Could not load the catalog from the API.',
	'home.loadingCatalog': 'Loading catalog…',
	'home.apiHint': 'Is the API running at {url}?',
	'home.crawledSince.one': 'The crawler added {count} title since you were last here.',
	'home.crawledSince.other': 'The crawler added {count} titles since you were last here.',
	'home.markSeen': 'Mark all as seen',
	'home.latestKicker': 'Just released',
	'home.latestTitle': 'New this season',
	'home.kicker.movie': 'Out now',
	'home.kicker.series': 'Season by season',
	'home.kicker.game': 'On the backlog',
	'home.kicker.book': 'On the nightstand',
	'home.latelyFollowing': 'People you follow',
	'home.latelyEveryone': 'Around here',
	'home.lately': 'Lately',
	'home.openFeed': 'Open the feed',
	'home.noFollowing': 'Nobody you follow has logged anything yet.',
	'home.findSomeone': 'Find someone to follow.',

	/* ---- the hero ------------------------------------------------------ */

	'hero.comingUp': 'Coming up',
	'hero.details': 'Details',
	'hero.mutedTrailer': 'Trailer, muted',

	/* ---- rails and galleries ------------------------------------------- */

	'rail.scrollLeft': 'Scroll left',
	'rail.scrollRight': 'Scroll right',
	'gallery.screenshots': 'Screenshots',
	'gallery.open': 'Open screenshot {n}',
	'cast.title': 'Cast',

	/* ---- browse -------------------------------------------------------- */

	'browse.movies.title': 'Films',
	'browse.movies.intro':
		'Everything with a running time and an ending. Trilogies stay together — a part knows which part it is.',
	'browse.series.title': 'Series',
	'browse.series.intro':
		'Seasons, episodes, and the exact one you stopped at. Progress is tracked per episode, not per show.',
	'browse.games.title': 'Games',
	'browse.games.intro':
		'Filed by perspective, mode and platform — first person, third person, isometric, and whatever Half-Life: Alyx is.',
	'browse.books.title': 'Books',
	'browse.books.intro':
		'Pages, publishers and the cycle a volume belongs to. Progress is a page number, because that is how reading works.',
	'browse.genre': 'Genre',
	'browse.anyGenre': 'Any genre',
	'browse.decade': 'Decade',
	'browse.anyDecade': 'Any decade',
	'browse.decadeLabel': '{decade}s',
	'browse.minScore': 'Minimum score',
	'browse.moreFilters': 'More filters',
	'browse.sortBy': 'Sort by',
	'browse.empty': 'Nothing here with those filters.',

	'sort.relevance': 'Best match',
	'sort.popularity': 'Most popular',
	'sort.score': 'Highest rated',
	'sort.imdb': 'Highest on IMDb',
	'sort.newest': 'Newest first',
	'sort.oldest': 'Oldest first',
	'sort.title': 'A–Z',
	'sort.added': 'Recently crawled',

	'score.any': 'Any score',
	'score.min': '{n} and up',
	'imdb.any': 'Any IMDb rating',
	'imdb.min': '{n}.0 and up',
	'votes.any': 'Any number of votes',
	'votes.min': '{n}+ votes',
	'length.any': 'Any length',
	'length.under45': 'Under 45m',
	'length.45to90': '45m – 1h30',
	'length.90to150': '1h30 – 2h30',
	'length.over150': 'Over 2h30',

	/* ---- search -------------------------------------------------------- */

	'search.title': 'Search',
	'search.titleFor': '{query} — search',
	'search.placeholder': 'Title, person, genre…',
	'search.quickPlaceholder': 'Films, series, games, books…',
	'search.dialogLabel': 'Search the catalog',
	'search.searching': 'Searching…',
	'search.failed': 'Search failed. Is the API up?',
	'search.didYouMean': 'Did you mean',
	'search.nothingMatches': 'Nothing matches “{query}”.',
	'search.trySpelling': 'Try another spelling.',
	'search.hint': 'Try a title, a person, a genre — or',
	'search.hintLink': 'browse with filters',
	'search.seeAllResults': 'See all {total}{more} results',
	'search.forQuery': 'for “{query}”',
	'search.noneWithFilters': 'Nothing matches “{query}” with those filters',
	'search.noneFilters': 'Nothing matches those filters',
	'search.noneQuery': 'Nothing matches “{query}”',
	'search.allTitles': '{count} titles',
	'search.sort': 'Sort',
	'search.filters': 'Filters',
	'search.type': 'Type',
	'search.mustMatchAll': 'Must match all',
	'search.length': 'Length',
	'search.release': 'Release',
	'search.releaseAny': 'Anything',
	'search.releaseOut': 'Out now',
	'search.releaseUpcoming': 'Not out yet',
	'search.language': 'Language',
	'search.emptySuggestion': 'Nothing under that spelling — try the correction above.',
	'search.emptyFilters': 'No titles match all of those filters.',
	'search.emptyStart': 'Search the catalog by title, person or genre.',
	'search.unreachablePort': 'The catalog API is unreachable. Is it running on {port}?',

	/* ---- paging -------------------------------------------------------- */

	'pager.label': 'Pagination',
	'pager.first': 'First page',
	'pager.last': 'Last page',
	'pager.page': 'Page {n}',
	'pager.goTo': 'Go to page',
	'pager.jumpPlaceholder': 'Page…',
	'pager.of': 'of {total}',

	/* ---- feed ---------------------------------------------------------- */

	'feed.title': 'Feed',
	'feed.activity': 'Activity',
	'feed.heading': 'Lately',
	'feed.scopeFollowing': 'People you follow',
	'feed.scopeEveryone': 'Everyone',
	'feed.scopeMe': 'Just me',
	'feed.signedOut': 'Everything happening here.',
	'feed.signedOutTail': 'to narrow it down to people you follow.',
	'feed.failed': 'Could not reach the API. Try again in a moment.',
	'feed.emptyMe': 'Nothing on your shelf yet. Anything you log shows up here.',
	'feed.empty': 'Quiet in here. Follow a few people and their evenings show up on this page.',
	'feed.loadMore': 'Load more',
	'feed.peopleToFollow': 'People to follow',
	'feed.followEveryone': 'You already follow everyone here.',

	/* ---- a work -------------------------------------------------------- */

	'work.details': 'Details',
	'work.collectionPart': '{name} · part {part} of {total}',
	'work.noRatings': 'No ratings here yet — be the first.',
	'work.cannotRateYet': 'Nobody can rate this yet.',
	'work.ratingsHere': '{ratings} here',
	'work.outOn': 'Out {date} — {relative}.',
	'work.storePage': 'On the store page',
	'work.reviews': 'Reviews',
	'work.oneEach': 'One review each — edit it whenever you change your mind.',
	'work.noReviews': 'Nobody has written about this yet.',
	'work.onShelves': 'On {shelves}',
	'work.related': 'If you liked this',
	'work.votes': '{count} votes',
	'work.notOutYet': 'Not out yet',
	'work.trailerTitle': '{title} trailer',

	/* ---- seasons ------------------------------------------------------- */

	'seasons.title': 'Seasons',
	'seasons.markWatched': 'Mark watched up to episode {n}',

	/* ---- shelf controls ------------------------------------------------ */

	'shelf.label': 'Shelf',
	'shelf.yourScore': 'Your score',
	'shelf.trackProgress': 'Track progress',
	'shelf.updateProgress': 'Update progress',
	'shelf.removeIt': 'Remove it?',
	'shelf.shelfFor': 'Shelf for {title}',
	'shelf.removeFrom': 'Remove {title} from the shelf',
	'shelf.nothingMatches': 'Nothing matches.',

	/* ---- reviews ------------------------------------------------------- */

	'review.edited': '· edited',
	'review.until': 'until {when}',
	'review.signInPrompt': 'to score this {type} and leave the one review you stand behind.',
	'review.editingNote': 'Editing your review — the old version is kept.',
	'review.yours': 'Your review',
	'review.placeholder': 'What stayed with you?',
	'review.saveChanges': 'Save changes',
	'review.post': 'Post review',
	'review.invite': 'Write your review of {title}…',
	'review.write': 'Write',

	/* ---- follow -------------------------------------------------------- */

	/* ---- stars ---- */

	'stars.rate': 'Rate this',
	'stars.value': '{value} out of 5',
	'stars.none': 'Not rated',
	'stars.pick': 'Rate {value} out of 5',

	'follow.follow': 'Follow',
	'follow.following': 'Following',

	/* ---- profile ------------------------------------------------------- */

	'profile.title': 'Profile',
	'profile.unknown': 'No one goes by @{username}',
	'profile.checkSpelling': 'Check the spelling and try again.',
	'profile.loadFailed': 'Could not load this profile.',
	'profile.shelfFailed': 'Could not load this shelf.',
	'profile.joined': 'Joined {date}',
	'profile.editProfile': 'Edit profile',
	'profile.inCommon': '{titles} in common',
	'profile.middleOfMine': 'You are in the middle of',
	'profile.middleOf': 'In the middle of',
	'profile.logged': 'logged',
	'profile.finished': 'finished',
	'profile.reviews': 'reviews',
	'profile.averageScore': 'average score',
	'profile.tabShelf': 'Shelf',
	'profile.tabReviews': 'Reviews',
	'profile.tabPeople': 'People',
	'profile.searchMine': 'Search your shelf',
	'profile.searchTheirs': 'Search this shelf',
	'profile.sortRecent': 'Recently updated',
	'profile.sortRating': 'Highest scored',
	'profile.sortTitle': 'Title A–Z',
	'profile.sortYear': 'Newest first',
	'profile.layout': 'Layout',
	'profile.posters': 'Posters',
	'profile.manage': 'Manage',
	'profile.list': 'List',
	'profile.everything': 'Everything',
	'profile.matchSuffix': ' match',
	'profile.pageOf': '· page {page} of {pages}',
	'profile.emptyFiltered': 'Nothing matches those filters.',
	'profile.emptyShelf': 'Nothing on this shelf yet.',
	'profile.noReviews': 'No reviews written yet.',
	'profile.following': 'Following',
	'profile.followers': 'Followers',
	'profile.followingNobody': 'Following nobody yet.',
	'profile.noFollowers': 'No followers yet.',

	/* ---- sign in / sign up --------------------------------------------- */

	'auth.signInTitle': 'Sign in',
	'auth.welcomeBack': 'Welcome back',
	'auth.welcomeBackIntro': 'Pick up your shelves, your scores and the reviews you keep rewriting.',
	'auth.username': 'Username',
	'auth.password': 'Password',
	'auth.signingIn': 'Signing in…',
	'auth.tryDemo': 'Try demo (kaan)',
	'auth.noAccount': 'No account?',
	'auth.createOne': 'Create one',
	'auth.registerTitle': 'Create an account',
	'auth.startLog': 'Start a log',
	'auth.startLogIntro':
		'Rate what you finish, write the one review you stand behind, and follow people whose taste you trust.',
	'auth.displayName': 'Display name',
	'auth.yourName': 'Your name',
	'auth.email': 'Email',
	'auth.passwordHint': 'At least 8 characters',
	'auth.repeatPassword': 'Repeat password',
	'auth.mismatch': 'These do not match yet.',
	'auth.mismatchError': 'The two passwords do not match.',
	'auth.tagline': 'One line about your taste',
	'auth.taglinePlaceholder': 'Rewatcher. Slow games. Long books.',
	'auth.creating': 'Creating…',
	'auth.createAccount': 'Create account',
	'auth.haveOne': 'Already have one?',
	'auth.googleOr': 'or',
	'auth.googleFailed': 'Google sign-in could not load. Use a password for now.',
	'auth.googleSigningIn': 'Signing you in…',
	'auth.googleNothing': 'Google did not send anything back. Try again.',
	'auth.googleNotSetUp': 'Google sign-in is not set up on this server.',
	'auth.enterBoth': 'Enter a username and password.',
	'auth.couldNotSignIn': 'Could not sign in.',
	'auth.couldNotGoogle': 'Could not sign in with Google.',
	'auth.invalidCredentials': 'Invalid username or password.',
	'auth.pickUsername': 'Pick a username.',
	'auth.emailRequired': 'An email address is required.',
	'auth.passwordTooShort': 'Password must be at least 8 characters.',
	'auth.emailTaken': 'That email already has an account.',
	'auth.usernameTaken': 'That username is taken.',
	'auth.couldNotCreate': 'Could not create account.',

	/* ---- choosing a handle --------------------------------------------- */

	'welcome.title': 'Pick your handle',
	'welcome.moment': 'One moment…',
	'welcome.signedInAs': 'Signed in as',
	'welcome.intro':
		'We made one up from your email. It goes in the link to your profile, and it cannot be changed afterwards — so this is the moment.',
	'welcome.handle': 'Handle',
	'welcome.keep': 'Keep {username}',
	'welcome.confirm': 'That is the one',
	'welcome.tooShort': 'Pick at least 3 characters.',
	'welcome.badCharacters': 'Letters, numbers and underscores only.',
	'welcome.taken': 'That one is taken. Try another.',
	'welcome.couldNotSave': 'Could not save that handle.',

	/* ---- settings ------------------------------------------------------ */

	'settings.title': 'Settings',
	'settings.yourAccount': 'Your account',
	'settings.loadingAccount': 'Loading your account…',
	'settings.viewProfile': 'View profile',

	'settings.picture': 'Picture',
	'settings.pictureNote':
		'Square works best. Without one you get your initials, which is a perfectly good answer.',
	'settings.changePicture': 'Change picture',
	'settings.uploadPicture': 'Upload a picture',
	'settings.notAnImage': 'That file is not an image.',
	'settings.tooBig': 'Pictures need to be under 8 MB.',
	'settings.uploadFailed': 'Could not upload that picture.',
	'settings.removeFailed': 'Could not remove the picture.',

	'settings.profile': 'Profile',
	'settings.handleNote': 'Your handle stays {handle} — people have links to it.',
	'settings.location': 'Location',
	'settings.about': 'About',
	'settings.taglinePlaceholder': 'One line under your name',
	'settings.nameRequired': 'A display name is required.',
	'settings.saveProfile': 'Save profile',
	'settings.profileFailed': 'Could not save your profile.',

	'settings.region': 'Language & region',
	'settings.regionNote':
		'The language the site is written in, and the clock every date is shown on.',
	'settings.language': 'Language',
	'settings.timezone': 'Timezone',
	'settings.timezoneNote': 'Times are stored in UTC and drawn in your zone. Now: {now}',
	'settings.useDeviceZone': 'Use this device ({zone})',
	'settings.savePreferences': 'Save preferences',
	'settings.preferencesFailed': 'Could not save those preferences.',
	'settings.signedOutNote': 'Saved on this device. Sign in to keep it across devices.',

	'settings.password': 'Password',
	'settings.passwordNote':
		'Your current password is required — a stolen session should not be enough to lock you out.',
	'settings.currentPassword': 'Current password',
	'settings.newPassword': 'New password',
	'settings.repeatPassword': 'Repeat new password',
	'settings.passwordShort': 'The new password needs at least 8 characters.',
	'settings.passwordMismatch': 'The two new passwords do not match.',
	'settings.wrongPassword': 'That is not your current password.',
	'settings.passwordFailed': 'Could not change your password.',
	'settings.changePassword': 'Change password',
	'settings.changing': 'Changing…',
	'settings.passwordChanged': 'Password changed.',

	'settings.fileTooLarge': 'That picture is too large.',
	'settings.unsupportedType': 'Use a JPEG, PNG or WebP.',
	'settings.unreadableImage': 'That file could not be read as an image.',
	'settings.imageTooLarge': 'That picture has too many pixels.',
	'settings.passwordUnchanged': 'That is the password you already have.',

	/* ---- the cropper --------------------------------------------------- */

	'cropper.drag': 'Drag to reposition',
	'cropper.zoom': 'Zoom',
	'cropper.hint': 'Drag to reposition, slide to zoom.',
	'cropper.uploading': 'Uploading…',
	'cropper.use': 'Use this picture',

	/* ---- errors -------------------------------------------------------- */

	'error.sideways': 'Something went sideways.',
	'error.instead': 'Here is something worth your evening instead.',

	/* ---- crawler ------------------------------------------------------- */

	'crawler.title': 'Crawler',
	'crawler.catalog': 'Catalog',
	'crawler.running': 'Running',
	'crawler.idle': 'Idle',
	'crawler.percentCrawled': '{percent}% crawled',
	'crawler.images': 'Artwork',
	'crawler.ofImages': '{crawled} of {total} images mirrored',
	'crawler.postersBackdrops': 'posters {posters}/{postersTotal} · backdrops {backdrops}/{backdropsTotal}',
	'crawler.ofNotable': '{crawled} of {total} worth crawling',
	'crawler.ofExport': '{percent}% of everything TMDB lists — {crawled} of {total}',
	'crawler.remaining': 'Remaining',
	'crawler.finishes': 'Finishes',
	'crawler.rate': 'Rate',
	'crawler.timeLeft': 'Time left',
	'crawler.lastTitle': 'Last title',
	'crawler.refreshes': 'Refreshes',
	'crawler.everySeconds': 'every {n}s',
	'crawler.filteredOut': 'Filtered out',
	'crawler.recentlyCrawled': 'Recently crawled',
	'crawler.nothingYet': 'Nothing crawled yet.',
	'crawler.never': 'never',
	'crawler.secondsAgo': '{n}s ago',
	'crawler.minutesAgo': '{n}m ago',
	'crawler.hoursAgo': '{n}h ago',
	'crawler.daysAgo': '{n}d ago'
};
