import Link from 'next/link';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert prose-amber">
          <p className="text-gray-400">Last updated: April 2026</p>

          <h2 className="text-white mt-8">1. Acceptance of Terms</h2>
          <p className="text-gray-300">
            By accessing and using SoCalOffroaders ("the Platform"), you accept and agree to be bound by these Terms of Service and our Community Guidelines. If you do not agree to these terms, please do not use our platform.
          </p>

          <h2 className="text-white mt-8">2. Platform Nature</h2>
          <p className="text-gray-300">
            SoCalOffroaders is a <strong>social platform only</strong>. We provide a marketplace for connecting offroad enthusiasts, clubs, and events. We do NOT organize, sponsor, lead, or participate in any offroad runs, trips, or events. All events are organized exclusively by third-party club organizers and individual users who operate independently.
          </p>

          <h2 className="text-white mt-8">3. Assumption of Risk</h2>
          <p className="text-gray-300">
            <strong>Off-roading is inherently dangerous.</strong> By using this platform, you acknowledge that:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li>Off-road driving, hiking, and outdoor activities involve significant risks including serious injury or death</li>
            <li>Trail conditions vary and can change without notice</li>
            <li>Weather conditions can become hazardous without warning</li>
            <li>You assume full responsibility for your safety and the safety of your passengers</li>
            <li>You must verify trail closures with USFS, BLM, and local authorities before traveling</li>
          </ul>

          <h2 className="text-white mt-8">4. Liability Disclaimer & Limitation of Liability</h2>
          <p className="text-gray-300">
            <strong>You understand and agree that:</strong>
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li>SoCalOffroaders is NOT liable for any injuries, deaths, damages, or losses occurring during runs, events, or any platform-related activities</li>
            <li>All participants participate at their own sole risk and responsibility</li>
            <li>Clubs and event organizers are independent parties; we are not responsible for their events, safety practices, or insurance coverage</li>
            <li>You should independently verify club credentials, insurance, and safety measures before participating</li>
            <li>We do not endorse or guarantee the accuracy of any user-posted content, trail information, or event details</li>
          </ul>
          <p className="text-gray-300 mt-4">
            <strong>Limitation of Liability:</strong> To the maximum extent permitted by law, SoCalOffroaders shall not be liable for any indirect, incidental, special, consequential, or punitive damages, regardless of the cause of action or whether we have been advised of the possibility of such damages.
          </p>

          <h2 className="text-white mt-8">5. Indemnification</h2>
          <p className="text-gray-300">
            You agree to indemnify, defend, and hold harmless SoCalOffroaders, its officers, directors, employees, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li>Your use of the platform</li>
            <li>Your violation of these Terms of Service</li>
            <li>Your violation of any third-party rights</li>
            <li>Your participation in any club or run, including any injury or damage occurring during such activities</li>
            <li>Any content you post on the platform</li>
          </ul>

          <h2 className="text-white mt-8">6. User Accounts</h2>
          <p className="text-gray-300">
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li>Provide accurate and complete registration information</li>
            <li>Promptly update any changes to your information</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
          <p className="text-gray-300 mt-2">We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior.</p>

          <h2 className="text-white mt-8">7. User Content</h2>
          <p className="text-gray-300">
            You retain ownership of content you post (photos, videos, comments, reviews) but grant us a worldwide, royalty-free, perpetual, irrevocable, sublicensable license to use, modify, reproduce, distribute, prepare derivative works of, display, and publish such content on our platform and in marketing materials.
          </p>

          <h2 className="text-white mt-8">8. Content Moderation</h2>
          <p className="text-gray-300">We reserve the right to remove content that:</p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li>Violates these Terms or Community Guidelines</li>
            <li>Is illegal, harmful, threatening, defamatory, or obscene</li>
            <li>Infringes intellectual property rights of others</li>
            <li>Contains spam, commercial solicitation, or malware</li>
          </ul>

          <h2 className="text-white mt-8">9. Prohibited Activities</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mt-2">
            <li>Posting harmful, illegal, or inappropriate content</li>
            <li>Impersonating others or making false claims</li>
            <li>Harassment, hate speech, or discrimination</li>
            <li>Spam, commercial solicitation, or unauthorized advertising</li>
            <li>Attempting to bypass security or access controls</li>
            <li>Organizing events that could endanger participants</li>
          </ul>

          <h2 className="text-white mt-8">10. DMCA & Copyright Policy</h2>
          <p className="text-gray-300">
            We respect intellectual property rights. If you believe your copyrighted work has been infringed, please send a DMCA notice to {SITE_SUPPORT_EMAIL} with: (1) description of copyrighted work, (2) location of infringement, (3) your contact info, (4) a statement of good faith belief, (5) a statement of accuracy, (6) your signature.
          </p>

          <h2 className="text-white mt-8">11. Dispute Resolution & Arbitration</h2>
          <p className="text-gray-300">
            Any dispute arising from these terms shall first be attempted to be resolved through good-faith negotiation. If unresolved within 30 days, the dispute shall be resolved by binding arbitration in accordance with the rules of the American Arbitration Association. Arbitration shall be conducted in Riverside County, California. This agreement to arbitrate includes but is not limited to all disputes arising out of or relating to your use of the platform.
          </p>

          <h2 className="text-white mt-8">12. Governing Law</h2>
          <p className="text-gray-300">
            These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.
          </p>

          <h2 className="text-white mt-8">13. Force Majeure</h2>
          <p className="text-gray-300">
            We shall not be liable for any failure or delay in performing our obligations where such failure results from any cause beyond our reasonable control, including but not limited to: natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials.
          </p>

          <h2 className="text-white mt-8">14. Modifications</h2>
          <p className="text-gray-300">
            We may modify these Terms at any time. We'll post changes with a revised "Last updated" date. Your continued use of the platform after changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-white mt-8">15. Termination</h2>
          <p className="text-gray-300">
            We reserve the right to terminate your access to the platform, without prior notice, for any violation of these Terms or for any other reason at our sole discretion.
          </p>

          <h2 className="text-white mt-8">16. Severability</h2>
          <p className="text-gray-300">
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that the remaining provisions shall remain in full force and effect.
          </p>

          <h2 className="text-white mt-8">17. Entire Agreement</h2>
          <p className="text-gray-300">
            These Terms, together with our Privacy Policy and Community Guidelines, constitute the entire agreement between you and SoCalOffroaders and supersede all prior understandings.
          </p>

          <h2 className="text-white mt-8">18. Contact Information</h2>
          <p className="text-gray-300">For questions about these Terms, contact us at:</p>
          <p className="text-gray-300 mt-2">
            Email:{' '}
            <a className="text-amber-400 hover:underline" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
              {SITE_SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <Link href="/" className="text-amber-500 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}