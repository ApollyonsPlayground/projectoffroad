import Link from 'next/link';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Community Guidelines</h1>
        
        <div className="prose prose-invert prose-amber">
          <p className="text-gray-400">
            SoCalOffroaders brings together off-road enthusiasts who share a passion for exploring the backcountry. 
            These guidelines help keep our community safe, welcoming, and fun for everyone.
          </p>

          <h2 className="text-white mt-8">🎯 Our Values</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li><strong>Safety First</strong> — We look out for each other on the trail</li>
            <li><strong>Respect</strong> — We treat fellow offroaders with courtesy</li>
            <li><strong>Environment</strong> — We practice Leave No Trace principles</li>
            <li><strong>Inclusivity</strong> — All skill levels welcome</li>
          </ul>

          <h2 className="text-white mt-8">✅ Do</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Share accurate information about runs and trail conditions</li>
            <li>Verify your vehicle meets requirements before joining runs</li>
            <li>Communicate respectfully with club organizers and participants</li>
            <li>Report unsafe behavior or concerns to organizers</li>
            <li>Practice good trail etiquette — yield to others, pack out trash</li>
            <li>Have fun and share your adventures!</li>
          </ul>

          <h2 className="text-white mt-8">❌ Don&apos;t</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Post fake events or mislead participants</li>
            <li>Harass, threaten, or discriminate against others</li>
            <li>Share others&apos; personal information without consent</li>
            <li>Spam or commercial solicitations</li>
            <li>Organize runs beyond your skill level without proper preparation</li>
            <li>Damage trails or private property</li>
          </ul>

          <h2 className="text-white mt-8">🚙 Run Safety Tips</h2>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Always tell someone where you&apos;re going</li>
            <li>Carry recovery gear (shackles, straps, gloves)</li>
            <li>Bring adequate water, food, and supplies</li>
            <li>Check weather conditions before heading out</li>
            <li>Stay with the group — don&apos;t split off alone</li>
            <li>Know your vehicle&apos;s limits</li>
          </ul>

          <h2 className="text-white mt-8">⚠️ Emergency</h2>
          <p className="text-gray-300">
            In case of emergency during a run:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Call 911 for life-threatening situations</li>
            <li>Use the SOS feature in the app to alert run participants</li>
            <li>Share your location with emergency services</li>
            <li>Stay with the injured person until help arrives</li>
          </ul>

          <h2 className="text-white mt-8">🚫 Enforcement</h2>
          <p className="text-gray-300">
            Violations may result in:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2">
            <li>Warning</li>
            <li>Temporary suspension</li>
            <li>Permanent ban</li>
          </ul>

          <h2 className="text-white mt-8">📢 Reporting</h2>
          <p className="text-gray-300">
            See something unsafe or inappropriate? Report it to the club organizer or contact us at{' '}
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
