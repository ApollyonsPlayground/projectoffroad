import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert prose-amber">
          <p className="text-gray-400">Last updated: April 2026</p>

          <h2 className="text-white mt-8">1. Acceptance of Terms</h2>
          <p className="text-gray-300">
            By accessing and using SoCal Offroaders ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement.
          </p>

          <h2 className="text-white mt-8">2. Platform Nature</h2>
          <p className="text-gray-300">
            SoCal Offroaders is a <strong>platform only</strong>. We connect offroad enthusiasts, clubs, and events. We do not organize, sponsor, or participate in any runs or events. All events are organized by third-party clubs and individuals.
          </p>

          <h2 className="text-white mt-8">3. Liability Disclaimer</h2>
          <p className="text-gray-300">
            <strong>You understand and agree that:</strong>
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>SoCal Offroaders is not liable for any injuries, damages, or losses occurring during runs or events</li>
            <li>All participants participate at their own risk</li>
            <li>Clubs and event organizers are independent parties responsible for their own events</li>
            <li>You should verify club credentials and insurance before participating</li>
          </ul>

          <h2 className="text-white mt-8">4. User Accounts</h2>
          <p className="text-gray-300">
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
          </p>

          <h2 className="text-white mt-8">5. User Content</h2>
          <p className="text-gray-300">
            You retain ownership of content you post but grant us a license to use, modify, and display it on the Platform.
          </p>

          <h2 className="text-white mt-8">6. Prohibited Activities</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Posting harmful, illegal, or inappropriate content</li>
            <li>Impersonating others</li>
            <li>Harassment or hate speech</li>
            <li>Spam or commercial solicitation</li>
          </ul>

          <h2 className="text-white mt-8">7. Termination</h2>
          <p className="text-gray-300">
            We reserve the right to terminate accounts that violate these terms or engage in harmful behavior.
          </p>

          <h2 className="text-white mt-8">8. Contact</h2>
          <p className="text-gray-300">
            Questions? Contact us at support@socaloffroaders.app
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
