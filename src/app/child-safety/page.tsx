import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

export const metadata: Metadata = {
  title: 'Child safety standards | SoCal Offroaders',
  description:
    'Published standards against child sexual abuse and exploitation (CSAE) for the SoCal Offroaders platform.',
  alternates: { canonical: '/child-safety/' },
};

export default function ChildSafetyStandardsPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Child safety &amp; exploitation standards
        </h1>
        <p className="text-gray-400 mb-8">
          Externally published standards required by app stores and regulators. Last updated: May 2026.
        </p>

        <div className="prose prose-invert prose-amber">
          <h2 className="text-foreground mt-8">Scope</h2>
          <p className="text-gray-300">
            SoCal Offroaders (&quot;we&quot;, &quot;the platform&quot;) prohibits any content or behavior that
            sexually exploits or endangers children, or that facilitates child sexual abuse and exploitation
            (CSAE). These standards apply to all accounts, posts, messages, media, profiles, events, clubs, and
            linked materials accessible through our services.
          </p>

          <h2 className="text-foreground mt-8">Zero tolerance</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>
              <strong>Child sexual abuse material (CSAM)</strong> — We prohibit uploading, requesting,
              storing, linking to, or distributing CSAM in any form.
            </li>
            <li>
              <strong>Sexual exploitation of minors</strong> — We prohibit sexualizing minors, grooming,
              solicitation of minors for sexual purposes, trafficking-related exploitation, and predatory
              conduct directed at minors.
            </li>
            <li>
              <strong>Age of the platform</strong> — Our services are not directed at children under 18; see
              our{' '}
              <Link href="/privacy/" className="text-amber-400 hover:underline">
                Privacy Policy
              </Link>{' '}
              for children&apos;s privacy practices.
            </li>
          </ul>

          <h2 className="text-foreground mt-8">Detection, moderation &amp; enforcement</h2>
          <p className="text-gray-300">
            We use a combination of automated signals, user reporting, and human review where appropriate to
            enforce these standards. Violations may result in immediate content removal, account suspension or
            permanent ban, and preservation of records as required for safety and legal compliance.
          </p>

          <h2 className="text-foreground mt-8">Reporting</h2>
          <p className="text-gray-300">
            If you become aware of content or conduct on SoCal Offroaders that may involve CSAE or risk to a
            child, contact us immediately at{' '}
            <a className="text-amber-400 hover:underline" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
              {SITE_SUPPORT_EMAIL}
            </a>
            . Include URLs, usernames, timestamps, and screenshots where safe to provide them.
          </p>
          <p className="text-gray-300 mt-4">
            If someone is in immediate danger, contact <strong>local emergency services</strong> (for example,
            <strong>911</strong> in the United States). You may also report suspected CSAM to the{' '}
            <a
              className="text-amber-400 hover:underline"
              href="https://report.cybertip.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              National Center for Missing &amp; Exploited Children (CyberTip)
            </a>{' '}
            or your country&apos;s equivalent reporting body.
          </p>

          <h2 className="text-foreground mt-8">Cooperation with authorities</h2>
          <p className="text-gray-300">
            We cooperate with law enforcement and comply with applicable reporting obligations where CSAM or
            child safety threats are identified, consistent with applicable law and responsible disclosure
            practices.
          </p>

          <h2 className="text-foreground mt-8">Related policies</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>
              <Link href="/guidelines/" className="text-amber-400 hover:underline">
                Community guidelines
              </Link>
            </li>
            <li>
              <Link href="/terms/" className="text-amber-400 hover:underline">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy/" className="text-amber-400 hover:underline">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <Link href="/" className="text-amber-500 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
