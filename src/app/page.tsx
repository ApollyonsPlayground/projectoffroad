import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicHomeCtas } from '@/components/PublicHomeCtas';

/** Must match the “Application home page” and privacy URL you enter in Google Cloud OAuth consent. */
const PUBLIC_SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') || 'https://socaloffroaders.com';

const PRIVACY_URL = `${PUBLIC_SITE}/privacy/`;
const ACCOUNT_DELETE_URL = `${PUBLIC_SITE}/account/delete/`;

export const metadata: Metadata = {
  title: 'SoCal Offroaders | Southern California off-road community',
  description:
    'Official homepage for SoCal Offroaders — trails, runs, clubs, and community features. Learn what the app does, why we use Google sign-in, and read our privacy policy without logging in.',
  openGraph: {
    title: 'SoCal Offroaders',
    description:
      'Southern California off-road community — trails, runs, clubs, and rider-built content.',
    url: `${PUBLIC_SITE}/`,
    siteName: 'SoCal Offroaders',
  },
};

/**
 * Public marketing root for OAuth consent / verification (no login required).
 * The signed-in app (feed, DMs, profile) lives at `/feed/`.
 */
export default function PublicHomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <p className="sr-only">
        Public homepage for SoCal Offroaders. No account or sign-in is required to read this page.
      </p>

      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-primary-foreground font-black text-sm tracking-tight">SO</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Southern California
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                SoCal<span className="text-primary">Offroaders</span>
              </h1>
              <p className="text-[11px] text-muted-foreground mt-1">Brand and product name: SoCal Offroaders</p>
            </div>
          </div>
          <PublicHomeCtas />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-5 py-10 space-y-10">
        <section aria-labelledby="domain-heading" className="rounded-2xl border border-border bg-muted/60 p-5">
          <h2 id="domain-heading" className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-2">
            Where this site is hosted
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            This homepage and our privacy policy are published on our own domain and application —{' '}
            <strong className="text-foreground">{PUBLIC_SITE.replace(/^https?:\/\//, '')}</strong> — not on a
            third-party profile or site builder where we cannot prove ownership (for example, not only a Google Sites,
            Facebook Page, Instagram link-in-bio, or Twitter/X profile). You can read this entire page without creating
            an account or signing in.
          </p>
        </section>

        <section
          aria-labelledby="beta-cta-heading"
          className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-black p-[1px] shadow-[0_0_40px_-12px_rgba(249,115,22,0.35)]"
        >
          <div className="rounded-2xl bg-muted/95 px-5 py-7 sm:px-8 sm:py-8 relative">
            <div
              className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/25 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-amber-500/15 blur-2xl"
              aria-hidden
            />
            <p className="relative text-[10px] font-black uppercase tracking-[0.28em] text-primary/90/95 mb-2">
              Early access
            </p>
            <h2
              id="beta-cta-heading"
              className="relative text-2xl sm:text-3xl font-black text-foreground tracking-tight mb-2"
            >
              Join the <span className="text-primary">beta</span>
            </h2>
            <p className="relative text-muted-foreground text-[15px] leading-relaxed mb-6 max-w-lg">
              Test the latest builds on <strong className="text-foreground/90">iPhone</strong> (TestFlight) or{' '}
              <strong className="text-foreground/90">Android</strong> (Google Play internal testing) before they ship to the
              stores.
            </p>
            <Link
              href="/beta/"
              className="group relative inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-black shadow-lg shadow-primary/30 hover:from-primary/90 hover:to-primary/70 hover:shadow-primary/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span>Get beta access</span>
              <span
                className="inline-block transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              >
                →
              </span>
            </Link>
            <p className="relative mt-4 text-[12px] text-muted-foreground">
              Free · spots limited while we tune performance and safety
            </p>
          </div>
        </section>

        <section aria-labelledby="about-heading">
          <h2 id="about-heading" className="text-lg font-black text-foreground mb-3">
            What SoCal Offroaders is
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[15px] mb-3">
            <strong className="text-foreground/90">SoCal Offroaders</strong> is a community web application for Southern
            California off-road enthusiasts. We help riders discover trails, browse and join club runs, find clubs, and
            share updates with others who ride in the region.
          </p>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            The product is operated independently; “SoCal Offroaders” is the public name shown in the app, in the
            store (where applicable), and on this website.
          </p>
        </section>

        <section aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-lg font-black text-foreground mb-3">
            What the app does (functionality)
          </h2>
          <ul className="list-disc pl-5 text-muted-foreground text-[15px] space-y-2 leading-relaxed">
            <li>
              <strong className="text-foreground/90">Trails</strong> — browse and search trail information (public).
            </li>
            <li>
              <strong className="text-foreground/90">Runs</strong> — view upcoming and past community runs (public).
            </li>
            <li>
              <strong className="text-foreground/90">Clubs</strong> — explore off-road clubs (public).
            </li>
            <li>
              <strong className="text-foreground/90">Community feed</strong> — after sign-in, a scrollable feed of posts
              (photos and text), likes, comments, reposts, and moderation tools where applicable.
            </li>
            <li>
              <strong className="text-foreground/90">Profile &amp; garage</strong> — optional display name / username,
              vehicles, and saved content for signed-in users.
            </li>
            <li>
              <strong className="text-foreground/90">Direct messages</strong> — signed-in users can message each other where
              messaging is enabled.
            </li>
            <li>
              <strong className="text-foreground/90">Safety &amp; SOS</strong> — in-app tools to highlight safety and
              emergency context while on the trail (features may evolve).
            </li>
          </ul>
          <p className="text-muted-foreground text-[13px] mt-3">
            Open the live app from this page using <Link href="/feed/" className="text-primary/90 font-semibold hover:underline">Open app</Link> — the feed and social features require sign-in where noted above.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-muted/80 p-6 space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Explore without an account</h2>
          <ul className="flex flex-col gap-2 text-[15px]">
            <li>
              <Link href="/trails/" className="text-primary/90 font-semibold hover:underline">
                Trail Explorer
              </Link>
              <span className="text-muted-foreground"> — public trail list</span>
            </li>
            <li>
              <Link href="/runs/" className="text-primary/90 font-semibold hover:underline">
                Runs
              </Link>
              <span className="text-muted-foreground"> — public run calendar</span>
            </li>
            <li>
              <Link href="/clubs/" className="text-primary/90 font-semibold hover:underline">
                Clubs
              </Link>
              <span className="text-muted-foreground"> — community clubs directory</span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="data-heading">
          <h2 id="data-heading" className="text-lg font-black text-foreground mb-3">
            Why we request Google sign-in and user data
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-3">
            We use <strong className="text-foreground/90">Sign in with Google</strong> so you have a secure account without
            us storing a separate password. When you choose Google, we receive limited profile information from Google
            (such as email, name, and profile photo) to create your account, show your identity in the community, and
            contact you about your account if needed.
          </p>
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-3">
            We use that data to: authenticate you, display your name or chosen handle in posts and comments, reduce
            spam and abuse, and operate community features you choose to use (for example posts, messages, and club/run
            participation). We do not sell your personal information to data brokers.
          </p>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Full details — categories of data, retention, cookies, third-party processors (such as our database and
            hosting providers), and your rights — are in our privacy policy at the link below. Use the{' '}
            <strong className="text-foreground/90">same URL</strong> you configure on your Google OAuth consent screen.
          </p>
        </section>

        <section aria-labelledby="privacy-heading" className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 id="privacy-heading" className="text-sm font-black uppercase tracking-wider text-primary/90 mb-3">
            Privacy policy (required link)
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-4">
            Privacy policy URL for OAuth consent configuration (copy exactly if your Google project expects this host):
          </p>
          <p className="font-mono text-sm text-foreground break-all mb-4 bg-background/50 rounded-lg px-3 py-2 border border-border">
            {PRIVACY_URL}
          </p>
          <Link
            href={PRIVACY_URL}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/90 transition-colors"
          >
            Open privacy policy
          </Link>
          <p className="text-muted-foreground text-[13px] leading-relaxed mt-6 mb-2">
            <strong className="text-foreground/90">Account &amp; data deletion</strong> (required URL for Google Play and similar stores —
            copy exactly):
          </p>
          <p className="font-mono text-sm text-foreground break-all mb-4 bg-background/50 rounded-lg px-3 py-2 border border-border">
            {ACCOUNT_DELETE_URL}
          </p>
          <Link
            href="/account/delete/"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-border text-foreground text-sm font-bold hover:border-primary/50 hover:text-foreground transition-colors"
          >
            Open delete-account page
          </Link>
        </section>

        <footer className="pt-8 border-t border-border text-[12px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/terms/" className="hover:text-muted-foreground">
            Terms
          </Link>
          <Link href="/guidelines/" className="hover:text-muted-foreground">
            Community guidelines
          </Link>
          <Link href="/child-safety/" className="hover:text-muted-foreground">
            Child safety standards
          </Link>
          <Link href="/support/" className="hover:text-muted-foreground">
            Support
          </Link>
          <Link href="/beta/" className="hover:text-muted-foreground">
            Beta testing
          </Link>
          <Link href="/feed/" className="hover:text-muted-foreground">
            Community feed
          </Link>
          <Link href={PRIVACY_URL} className="hover:text-muted-foreground">
            Privacy
          </Link>
          <Link href="/account/delete/" className="hover:text-muted-foreground">
            Delete account
          </Link>
        </footer>
      </main>
    </div>
  );
}
