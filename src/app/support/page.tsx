import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

export const metadata: Metadata = {
  title: 'Support | SoCal Offroaders',
  description:
    'Contact support, report issues, and find quick links for account deletion, privacy, and community safety.',
  alternates: { canonical: '/support/' },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Support</h1>
        <p className="text-gray-400 mb-8">
          Need help with sign-in, posting, safety, or account settings? Start here.
        </p>

        <div className="prose prose-invert prose-amber">
          <h2 className="text-white mt-8">Contact</h2>
          <p className="text-gray-300">
            Email us at{' '}
            <a className="text-amber-400 hover:underline" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
              {SITE_SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p className="text-gray-300">
            To help us fix issues faster, include your device (iPhone/Android), OS version, what you expected to
            happen, what happened instead, and screenshots if possible.
          </p>

          <h2 className="text-white mt-8">Quick links</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>
              <Link href="/login/" className="text-amber-400 hover:underline">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/account/delete/" className="text-amber-400 hover:underline">
                Delete account &amp; data
              </Link>
            </li>
            <li>
              <Link href="/privacy/" className="text-amber-400 hover:underline">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/terms/" className="text-amber-400 hover:underline">
                Terms of service
              </Link>
            </li>
            <li>
              <Link href="/guidelines/" className="text-amber-400 hover:underline">
                Community guidelines
              </Link>
            </li>
            <li>
              <Link href="/child-safety/" className="text-amber-400 hover:underline">
                Child safety standards (CSAE)
              </Link>
            </li>
          </ul>

          <h2 className="text-white mt-8">Common issues</h2>
          <h3 className="text-white mt-6">Google sign-in loops or won’t finish</h3>
          <p className="text-gray-300">
            First, confirm you can sign in on the website. If you&apos;re in the iOS/Android app, the sign-in flow
            may open your browser and then return to the app to finish. If it doesn&apos;t return, email support and
            tell us which device you&apos;re on.
          </p>

          <h3 className="text-white mt-6">I can’t see photos in the feed</h3>
          <p className="text-gray-300">
            Sometimes image posts may be temporarily limited while safety checks run. If you can see text posts but
            not photos, contact support with the approximate time you posted and the account email used.
          </p>

          <h3 className="text-white mt-6">Report content or safety concerns</h3>
          <p className="text-gray-300">
            Use in-app reporting where available. For urgent issues, email{' '}
            <a className="text-amber-400 hover:underline" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
              {SITE_SUPPORT_EMAIL}
            </a>{' '}
            with relevant links, usernames, and screenshots.
          </p>
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

