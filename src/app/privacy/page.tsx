import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert prose-amber">
          <p className="text-gray-400">Last updated: April 2026</p>

          <h2 className="text-white mt-8">1. Information We Collect</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li><strong>Account Info:</strong> Email, name, profile picture</li>
            <li><strong>Profile Info:</strong> Bio, location, experience level, emergency contact</li>
            <li><strong>Vehicles:</strong> Year, make, model, modifications</li>
            <li><strong>Activity:</strong> Runs joined, messages, club memberships</li>
          </ul>

          <h2 className="text-white mt-8">2. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Provide our services (connecting you with clubs and runs)</li>
            <li>Communicate with you about events and updates</li>
            <li>Improve our services</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="text-white mt-8">3. Data Sharing</h2>
          <p className="text-gray-300">
            We <strong>do not sell</strong> your personal data. We share data only with:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Supabase (our database provider) for service hosting</li>
            <li>Club organizers when you join their runs</li>
            <li>Law enforcement when required by law</li>
          </ul>

          <h2 className="text-white mt-8">4. Your Rights</h2>
          <p className="text-gray-300">Under GDPR and CCPA, you have the right to:</p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Access your data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt out of data sales (we don't sell data)</li>
          </ul>

          <h2 className="text-white mt-8">5. Data Security</h2>
          <p className="text-gray-300">
            We use industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.
          </p>

          <h2 className="text-white mt-8">6. Children's Privacy</h2>
          <p className="text-gray-300">
            Our service is not intended for anyone under 18. We do not knowingly collect data from children.
          </p>

          <h2 className="text-white mt-8">7. Changes</h2>
          <p className="text-gray-300">
            We may update this policy. We'll notify you of significant changes.
          </p>

          <h2 className="text-white mt-8">8. Contact</h2>
          <p className="text-gray-300">
            Questions? Contact us at privacy@socaloffroaders.app
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
