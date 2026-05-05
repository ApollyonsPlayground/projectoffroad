import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

export const metadata: Metadata = {
  title: 'Privacy Policy | SoCal Offroaders',
  description:
    'How SoCal Offroaders collects, uses, and protects your data — account information, community activity, cookies, and your rights.',
  alternates: { canonical: '/privacy/' },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert prose-amber">
          <p className="text-gray-400">Last updated: April 2026</p>

          <h2 className="text-white mt-8">1. Information We Collect</h2>
          <p className="text-gray-300">We collect information you provide directly to us, as well as information automatically generated when you use our platform.</p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li><strong>Account Information:</strong> Email address, display name, profile picture, and authentication credentials</li>
            <li><strong>Profile Information:</strong> Bio, location (city/region), experience level, optional username/display preferences you set in the app</li>
            <li><strong>Vehicle Information:</strong> Year, make, model, modification details, vehicle photos</li>
            <li><strong>Activity Data:</strong> Runs joined, clubs membership, messages, posts, likes, comments, and other interactions</li>
            <li><strong>Technical Data:</strong> IP address, browser type, operating system, device identifiers, and access timestamps</li>
            <li><strong>Location Data:</strong> GPS coordinates (only when you explicitly enable location sharing for runs)</li>
          </ul>

          <h2 className="text-white mt-8">2. How We Use Your Information</h2>
          <p className="text-gray-300">We use your information for the following purposes:</p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li>Providing and maintaining our platform services</li>
            <li>Connecting you with clubs, runs, and other community members</li>
            <li>Communicating with you about events, updates, and administrative matters</li>
            <li>Analyzing usage patterns to improve user experience and platform functionality</li>
            <li>Enforcing our Terms of Service and Community Guidelines</li>
            <li>Complying with legal obligations and responding to lawful requests</li>
            <li>Detecting and preventing fraud, abuse, and security incidents</li>
          </ul>

          <h2 className="text-white mt-8">3. Cookies and Tracking Technologies</h2>
          <p className="text-gray-300">We use cookies and similar tracking technologies to:</p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li>Keep you logged in and remember your preferences</li>
            <li>Understand how you use our platform</li>
            <li>Monitor and analyze platform performance and traffic</li>
            <li>Keep the service functioning reliably (we do not run third‑party ad personalization in the app today)</li>
          </ul>
          <p className="text-gray-300 mt-2">You can control cookies through your browser settings. However, disabling cookies may limit certain platform features.</p>

          <h2 className="text-white mt-8">4. Third-Party Services</h2>
          <p className="text-gray-300">We share data with the following third-party service providers:</p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li><strong>Supabase:</strong> Cloud database, authentication, file storage, and (where enabled) server-side features such as image moderation pipelines</li>
            <li><strong>Vercel:</strong> Platform hosting and deployment; may receive technical logs (IP, requests) as part of operating the site</li>
            <li><strong>Google:</strong> If you choose &quot;Sign in with Google,&quot; Google processes identity according to its policies; we receive profile basics you approve (e.g. email, name, avatar)</li>
          </ul>
          <p className="text-gray-300 mt-2">These providers are contractually obligated to protect your data and use it only for the services they provide to us.</p>

          <h2 className="text-white mt-8">5. Data Sharing</h2>
          <p className="text-gray-300"><strong>We do NOT sell your personal data to third parties.</strong> We share data only in the following circumstances:</p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li><strong>With Club Organizers:</strong> When you join a club or RSVP to a run, your basic profile information is visible to club organizers</li>
            <li><strong>With Other Users:</strong> Profile information you choose to make public is visible to other platform users</li>
            <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental regulation</li>
            <li><strong>Emergency Situations:</strong> To protect personal safety or property in emergency situations</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of company assets (data would be transferred under same privacy protections)</li>
          </ul>

          <h2 className="text-white mt-8">6. Data Retention</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li><strong>Account Data:</strong> Retained while your account is active; you may request deletion at any time</li>
            <li><strong>Posts and Media:</strong> Retained until you delete them or your account is removed</li>
            <li><strong>Log Data:</strong> Retained for up to 12 months for security and analytics purposes</li>
            <li><strong>Backup Data:</strong> May remain in backups for up to 30 days after deletion</li>
          </ul>

          <h2 className="text-white mt-8">7. Your Rights (GDPR & CCPA)</h2>
          <p className="text-gray-300">Under the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA), you have the following rights:</p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Right to Correction:</strong> Request correction of inaccurate personal data</li>
            <li><strong>Right to Deletion:</strong> Request deletion of your personal data ("right to be forgotten")</li>
            <li><strong>Right to Restrict Processing:</strong> Request limitation of how we process your data</li>
            <li><strong>Right to Data Portability:</strong> Request your data in a structured, commonly used format</li>
            <li><strong>Right to Opt-Out:</strong> Opt out of the sale of personal data (we do not sell data)</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising these rights</li>
          </ul>
          <p className="text-gray-300 mt-2">
            To exercise these rights, contact us at{' '}
            <a className="text-amber-400 hover:underline" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
              {SITE_SUPPORT_EMAIL}
            </a>
          </p>
          <p className="text-gray-300 mt-3">
            <strong className="text-white">Delete your account online:</strong> signed-in users can permanently delete
            their account and associated personal data from{' '}
            <Link href="/account/delete/" className="text-amber-400 hover:underline">
              Account deletion (delete account &amp; data)
            </Link>
            . Use this URL in app-store consoles when a web link is required.
          </p>

          <h2 className="text-white mt-8">8. Data Security</h2>
          <p className="text-gray-300">We implement reasonable technical measures appropriate to our size and risk, including encryption in transit (HTTPS/TLS), authentication via our providers, and access controls on production systems. No method of electronic storage or transmission over the internet is 100% secure. We cannot guarantee absolute security, but we are committed to protecting your data.</p>
          <p className="text-gray-300 mt-2">In the event of a data breach that affects your personal data, we will notify you and relevant authorities as required by applicable law.</p>

          <h2 className="text-white mt-8">9. Children&apos;s Privacy</h2>
          <p className="text-gray-300">Our platform is not intended for individuals under 18 years of age. We do not knowingly collect, use, or share personal data from children. If we become aware that we have collected data from a child without parental consent, we will delete it promptly.</p>

          <h2 className="text-white mt-8">10. International Data Transfers</h2>
          <p className="text-gray-300">Your data may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place, including standard contractual clauses or adequacy decisions, to protect your data during such transfers.</p>

          <h2 className="text-white mt-8">11. Changes to This Policy</h2>
          <p className="text-gray-300">We may update this privacy policy from time to time. We will post the updated policy with a revised "Last updated" date. For material changes, we will provide notice through the platform or via email.</p>

          <h2 className="text-white mt-8">12. Contact Information</h2>
          <p className="text-gray-300">For questions about this Privacy Policy or to exercise your rights, contact us at:</p>
          <p className="text-gray-300 mt-2">
            Email:{' '}
            <a className="text-amber-400 hover:underline" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
              {SITE_SUPPORT_EMAIL}
            </a>
          </p>
          <p className="text-gray-300 mt-2">
            For formal postal or regulatory correspondence, contact us at the email above; we will provide a mailing
            address if your situation requires it.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <Link href="/feed/" className="text-amber-500 hover:underline font-medium">
            ← Back to app feed
          </Link>
          <span className="text-zinc-600" aria-hidden>
            ·
          </span>
          <Link href="/" className="text-amber-500/80 hover:underline">
            Public site intro
          </Link>
        </div>
      </div>
    </div>
  )
}