import Link from 'next/link';
import type { Metadata } from 'next';
import { BetaAndroidEmailRequest } from '@/components/BetaAndroidEmailRequest';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/r2v5n2nf';
const PLAY_INTERNAL_TEST_URL = 'https://play.google.com/apps/internaltest/4700162531788489615';

export const metadata: Metadata = {
  title: 'Beta testing | SoCal Offroaders',
  description:
    'Join the SoCal Offroaders beta on iPhone (TestFlight) or Android (Google Play internal testing).',
  alternates: { canonical: '/beta/' },
};

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-primary-foreground font-black text-sm tracking-tight">SO</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">SoCal Offroaders</p>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Beta testing</h1>
            </div>
          </div>
          <Link
            href="/"
            className="text-sm font-bold text-muted-foreground hover:text-primary/90 transition-colors sm:self-center"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-5 py-10 space-y-8">
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Help us test new builds before they ship to the App Store and Google Play. Pick your platform below.
        </p>

        <section
          aria-labelledby="ios-heading"
          className="rounded-2xl border border-border bg-muted/60 p-6 space-y-4"
        >
          <h2 id="ios-heading" className="text-lg font-black text-foreground">
            iPhone, iPad, or Mac
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Install Apple’s TestFlight app if you have not already, then use the link below on your Apple device to
            accept the beta and install SoCal Offroaders.
          </p>
          <a
            href={TESTFLIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/90 transition-colors"
          >
            Join on TestFlight
          </a>
        </section>

        <section
          aria-labelledby="android-heading"
          className="rounded-2xl border border-border bg-muted/60 p-6 space-y-5"
        >
          <h2 id="android-heading" className="text-lg font-black text-foreground">
            Android (Google Play)
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Internal testing on Google Play works by email: send us the <strong className="text-foreground/90">Google account</strong>{' '}
            you use on the Play Store. We add you in Play Console; after that, Google may take{' '}
            <strong className="text-foreground/90">up to about 24 hours</strong> before you can install from the link below.
            Use the <strong className="text-foreground/90">same</strong> account when you open the opt-in link.
          </p>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">1. Request access</h3>
            <BetaAndroidEmailRequest />
          </div>

          <div className="rounded-xl border border-border bg-background/40 px-4 py-3 text-[13px] text-muted-foreground">
            <p className="mb-2">Prefer to write your own email? Contact</p>
            <a className="text-primary/90 font-semibold hover:underline break-all" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
              {SITE_SUPPORT_EMAIL}
            </a>
            <p className="mt-2">
              Include the Google Play account email you want added and mention Android beta / internal test.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-3">
              2. After you are added (wait for access)
            </h3>
            <p className="text-muted-foreground text-[15px] leading-relaxed mb-3">
              When your account is on the internal test list and Play has updated (often within a few hours, sometimes up
              to ~24 hours), open this link while signed into Google Play with that account:
            </p>
            <a
              href={PLAY_INTERNAL_TEST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 rounded-xl border border-border text-foreground text-sm font-bold hover:border-primary/50 hover:text-foreground transition-colors"
            >
              Open Google Play internal test
            </a>
          </div>
        </section>

        <footer className="pt-6 border-t border-border text-[12px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/support/" className="hover:text-muted-foreground">
            Support
          </Link>
          <Link href="/" className="hover:text-muted-foreground">
            Home
          </Link>
        </footer>
      </main>
    </div>
  );
}
