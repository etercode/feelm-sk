<!--
	The privacy policy.

	Google Play will not roll a build out to any track without a policy at a
	public URL, and it has to describe what the app actually does — a reviewer
	compares it against the Data safety form, and a mismatch is a rejection.
	Everything here was written against the schema and the Android manifest
	rather than from a template: the tables in the API, the two permissions the
	app asks for, and the fact that it carries no analytics or advertising SDK
	at all.

	English only, deliberately. The rest of the site is translated, but a legal
	document machine-translated into three more languages is three more
	documents nobody has read, each of which is the operative one for whoever
	reads it. If it is translated later it should be by someone who can be
	responsible for the wording.

	Prerendered: it must answer even if the API is down, since a reviewer
	fetching it during an outage sees a blank page and fails the submission.
-->
<script>
	/*
	 * ---- fill these in before submitting -----------------------------------
	 *
	 * Play requires a real contact route, and GDPR requires the controller to
	 * be identifiable. Both are deliberately in one place so this is a one-line
	 * edit rather than a hunt through prose.
	 */
	const OPERATOR = 'Feelm';
	const CONTACT = 'privacy@feelm.org';
	const HOSTING = 'the European Union';

	const UPDATED = '7 August 2026';
</script>

<svelte:head>
	<title>Privacy Policy — Feelm</title>
	<meta name="description" content="What Feelm collects, why, and how to have it deleted." />
</svelte:head>

<div class="frame page">
	<header class="masthead">
		<h1 class="display">Privacy Policy</h1>
		<p class="muted">Last updated {UPDATED}. This policy covers the Feelm website at feelm.org and the Feelm Android app.</p>
	</header>

	<section>
		<h2>Who we are</h2>
		<p>
			Feelm is a shared log of films, series, games and books people have finished. It is operated by
			{OPERATOR}, which is the data controller for the information described here. You can reach us at
			<a href="mailto:{CONTACT}">{CONTACT}</a>.
		</p>
	</section>

	<section>
		<h2>What we collect</h2>

		<h3>Your account</h3>
		<p>
			A username, a display name, and — if you registered with a password — an email address and a
			hashed password. We never store the password itself. You may optionally add an avatar image, a
			short tagline, a bio and a location. We store the language and time zone you use the site in so
			it renders correctly.
		</p>

		<h3>If you sign in with Google</h3>
		<p>
			We receive and store an identifier for your Google account, along with the name, email address
			and profile picture Google provides. We do not receive your Google password and have no other
			access to your Google account.
		</p>

		<h3>What you record</h3>
		<p>
			The titles you add to a shelf, their status, your rating, your progress, the reviews you write
			and their earlier revisions, who you follow, and which new titles you have marked as seen.
			<strong>Your profile, shelves, ratings and reviews are public</strong> — they are visible to
			anyone, signed in or not. Your email address, your session records and anything you send us as
			feedback are not.
		</p>

		<h3>Feedback you send us</h3>
		<p>
			The text of any report you send, and any screenshots you attach to it. Screenshots are
			re-encoded on upload, which strips whatever the original file carried — location data from a
			phone, for instance. Please do not include anything in a screenshot you would not want us to
			see.
		</p>

		<h3>Technical information</h3>
		<p>
			Each signed-in session records the IP address and browser or app identification string it was
			created from, so you can recognise a session that is not yours. Our hosting provider and the
			network in front of it process IP addresses in order to deliver the service and to defend it
			from abuse.
		</p>
	</section>

	<section>
		<h2>Who else is involved</h2>
		<ul>
			<li>
				<strong>Our hosting.</strong> The service runs on a rented virtual server in {HOSTING}, and
				uploaded images are kept in object storage by the same provider.
			</li>
			<li>
				<strong>Cloudflare.</strong> Traffic to feelm.org passes through Cloudflare, which processes
				IP addresses to route requests and block attacks.
			</li>
			<li>
				<strong>Google.</strong> Only if you choose to sign in with Google, and separately when a
				trailer is played — trailers are hosted on YouTube, and playing one is a request to Google
				under their own privacy policy.
			</li>
			<li>
				<strong>TMDB.</strong> Our catalogue of films and series comes from The Movie Database. We
				fetch information from them; we do not send them anything about you.
			</li>
		</ul>
	</section>

	<section>
		<h2>How long we keep it</h2>
		<p>
			Your account and what you have recorded are kept until you ask us to delete them. Session
			records expire on their own and are revoked when you sign out. Feedback screenshots are cleared
			periodically to save space; the report they belonged to stays, marked to show a screenshot was
			there.
		</p>
	</section>

	<!--
		The anchor is load-bearing: this section's URL is what goes in the Play
		Console's Data safety form as the account deletion link, so #delete must
		not be renamed.
	-->
	<section id="delete">
		<h2>Deleting your account</h2>
		<p>
			In the app, open <strong>Settings</strong> and choose <strong>Delete account</strong>. On the
			website, the same control is at the bottom of
			<a href="/settings">your settings page</a>. Deleting removes your profile, shelves, ratings
			and reviews from the site and ends every signed-in session straight away.
		</p>
		<p>
			If you cannot sign in, write to <a href="mailto:{CONTACT}">{CONTACT}</a> from the address on
			the account and we will delete it for you.
		</p>
	</section>

	<section>
		<h2>Your rights</h2>
		<p>
			Write to <a href="mailto:{CONTACT}">{CONTACT}</a> and we will, without charge, give you a copy
			of what we hold about you or correct anything wrong. If you are in the EU, the UK or Türkiye
			you have these rights under law, along with the right to complain to your local data
			protection authority.
		</p>
	</section>

	<section>
		<h2>Children</h2>
		<p>
			Feelm is not directed at children under 13, and we do not knowingly collect information from
			them. If you believe a child has given us information, write to us and we will remove it.
		</p>
	</section>

	<section>
		<h2>Changes</h2>
		<p>
			If this policy changes in a way that affects you, we will say so on this page and update the
			date at the top. The current version is always here.
		</p>
	</section>
</div>

<style>
	.page {
		padding-top: clamp(2rem, 5vw, 3.5rem);
		padding-bottom: clamp(2rem, 5vw, 4rem);
		/* A measure, not a container width: legal prose read across a 1400px
		   screen is a wall nobody finishes. */
		max-width: 44rem;
	}

	.masthead {
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--line);
	}

	h1 {
		font-size: clamp(1.9rem, 5vw, 2.6rem);
		margin: 0 0 0.5rem;
	}

	.masthead p {
		margin: 0;
	}

	section {
		margin-top: 2rem;
	}

	h2 {
		font-size: 1.15rem;
		margin: 0 0 0.6rem;
	}

	h3 {
		font-size: 0.95rem;
		margin: 1.25rem 0 0.4rem;
		color: var(--muted);
	}

	p {
		margin: 0 0 0.8rem;
		line-height: 1.65;
	}

	ul {
		margin: 0;
		padding-left: 1.1rem;
		line-height: 1.65;
	}

	li {
		margin-bottom: 0.5rem;
	}

	a {
		color: var(--brand);
	}
</style>
