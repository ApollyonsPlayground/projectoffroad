import { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, MapPin, Wrench, Shield, CheckCircle, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: "Beginner's Guide to Off-Roading | SoCalOffroaders",
  description: "A practical, no-fluff beginner's guide for off-roading in Southern California. Vehicle prep, recovery gear, trail etiquette, and more.",
};

export default function BeginnerGuidePage() {
  return (
    <main className="min-h-screen bg-stone-950">
      {/* Sticky Legal Disclaimer Header */}
      <div className="sticky top-0 z-50 bg-red-900/90 backdrop-blur-sm border-b border-red-700">
        <div className="container mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-center gap-3 text-center">
            <AlertTriangle size={18} className="text-red-200 flex-shrink-0" />
            <p className="text-red-100 text-sm font-medium">
              <span className="font-bold">DISCLAIMER:</span> Off-roading is dangerous. Data is for informational purposes only. Users assume all risk. Verify closures with USFS/BLM before travel. Tread Lightly.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="py-12 px-4 bg-stone-900 border-b border-stone-800">
        <div className="container mx-auto max-w-4xl">
          <Link href="/" className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 mb-6">
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </Link>
          <span className="inline-block px-3 py-1 rounded-full bg-orange-600/10 border border-orange-600/30 text-orange-400 text-sm font-medium uppercase tracking-wider mb-4">
            Guide
          </span>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-50 mb-4">
            Beginner's Guide to <span className="italic text-orange-500">Off-Roading</span>
          </h1>
          <p className="text-stone-400 text-lg">
            A practical, no-fluff guide for your first SoCal trail run.
          </p>
        </div>
      </header>

      {/* Content */}
      <article className="py-12 px-4">
        <div className="container mx-auto max-w-4xl prose prose-invert prose-orange max-w-none">
          
          {/* Quick Primer */}
          <section className="bg-stone-900/50 rounded-2xl border border-stone-700 p-8 mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4 flex items-center gap-3">
              <Wrench className="text-orange-500" />
              Quick Primer: Drivetrain Basics
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-600">
                <h3 className="font-bold text-orange-400 mb-2">2WD / AWD</h3>
                <p className="text-stone-400 text-sm">Fine for dirt roads. Not recommended for serious trails.</p>
              </div>
              <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-600">
                <h3 className="font-bold text-orange-400 mb-2">4H (4-High)</h3>
                <p className="text-stone-400 text-sm">For higher-speed traction: snow, loose gravel, mild mud.</p>
              </div>
              <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-600">
                <h3 className="font-bold text-orange-400 mb-2">4L (4-Low)</h3>
                <p className="text-stone-400 text-sm">Low-range for slow technical sections: steep climbs, rocks, sand.</p>
              </div>
            </div>
            <p className="text-stone-400 text-sm mt-4">
              <span className="text-orange-400 font-semibold">Pro tip:</span> Shift into 4L BEFORE you need it — don't try to shift when stuck mid-slope.
            </p>
          </section>

          {/* Tires */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">Tires & Pressures</h2>
            <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
              <p className="text-stone-300 mb-4">
                Tires are the <span className="text-orange-400 font-semibold">biggest single upgrade</span> for off-road performance. All-terrain (AT) tires are fine for most beginners; mud-terrain (MT) helps in heavy mud but is louder on road.
              </p>
              <h3 className="font-semibold text-stone-200 mb-3">Tire Pressure Guide</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="text-left py-2 text-stone-400">Terrain</th>
                      <th className="text-left py-2 text-stone-400">PSI (Full-Size Truck)</th>
                      <th className="text-left py-2 text-stone-400">PSI (Compact/Midsize)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-stone-800">
                      <td className="py-2 text-stone-300">Gravel/Dirt</td>
                      <td className="py-2 text-orange-400">28-32 psi</td>
                      <td className="py-2 text-orange-400">30-35 psi</td>
                    </tr>
                    <tr className="border-b border-stone-800">
                      <td className="py-2 text-stone-300">Soft Sand</td>
                      <td className="py-2 text-orange-400">12-18 psi</td>
                      <td className="py-2 text-orange-400">15-20 psi</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-stone-300">Rocks/Technical</td>
                      <td className="py-2 text-orange-400">18-25 psi</td>
                      <td className="py-2 text-orange-400">20-28 psi</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Vehicle Mods */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">Essential Vehicle Mods</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-5">
                <h3 className="font-bold text-orange-400 mb-2">Recovery Points</h3>
                <p className="text-stone-400 text-sm">Front & rear rated D-rings (bow shackles) welded or bolt-on to factory recovery points.</p>
              </div>
              <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-5">
                <h3 className="font-bold text-orange-400 mb-2">Skid Plates</h3>
                <p className="text-stone-400 text-sm">Oil pan and transfer case protection for rocky trails.</p>
              </div>
              <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-5">
                <h3 className="font-bold text-orange-400 mb-2">Rock Rails</h3>
                <p className="text-stone-400 text-sm">Side step protection for rocker panel hits.</p>
              </div>
              <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-5">
                <h3 className="font-bold text-orange-400 mb-2">Locking Differentials</h3>
                <p className="text-stone-400 text-sm">Later upgrade for serious traction in technical terrain.</p>
              </div>
            </div>
          </section>

          {/* Recovery Gear */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4 flex items-center gap-3">
              <Shield className="text-orange-500" />
              Recovery Gear & Safety
            </h2>
            <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
              <h3 className="font-semibold text-stone-200 mb-3">Minimum Kit</h3>
              <ul className="grid md:grid-cols-2 gap-2 text-stone-300">
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Rated bow shackles (3/4")</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> 10-20 ft soft snatch strap</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Tree saver strap</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Recovery damper</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Hi-lift jack + base</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Gloves, basic tool kit</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Portable air compressor</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Tire repair kit</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> First aid kit</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Fire extinguisher</li>
              </ul>
            </div>
          </section>

          {/* Navigation */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4 flex items-center gap-3">
              <MapPin className="text-orange-500" />
              Navigation & Communications
            </h2>
            <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
              <ul className="space-y-3 text-stone-300">
                <li>• <span className="text-orange-400 font-semibold">GPX tracks & offline maps</span> — Gaia, Avenza, Maps.me. Download before you go.</li>
                <li>• <span className="text-orange-400 font-semibold">Two-way radios</span> — FRS/GMRS for group communication.</li>
                <li>• <span className="text-orange-400 font-semibold">Satellite communicator</span> — Spot or Garmin inReach for remote areas.</li>
                <li>• <span className="text-orange-400 font-semibold">Leave a plan</span> with someone at home: route, return time, vehicle description.</li>
              </ul>
            </div>
          </section>

          {/* Gear Checklists */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">Tiered Gear Checklist</h2>
            
            {/* Beginner */}
            <div className="bg-stone-900/30 rounded-xl border border-stone-700 p-6 mb-4">
              <h3 className="font-bold text-green-400 text-lg mb-3">🥉 Beginner — Day Trips, Stock Vehicles</h3>
              <ul className="grid md:grid-cols-2 gap-2 text-stone-300 text-sm">
                <li>• License, registration, insurance</li>
                <li>• Water (1 gal/person)</li>
                <li>• First aid kit</li>
                <li>• Basic tool kit</li>
                <li>• Portable air compressor</li>
                <li>• Spare tire + jack</li>
                <li>• Rated tow strap + gloves</li>
                <li>• Flashlight + maps/GPX</li>
              </ul>
            </div>

            {/* Intermediate */}
            <div className="bg-stone-900/30 rounded-xl border border-stone-700 p-6 mb-4">
              <h3 className="font-bold text-orange-400 text-lg mb-3">🥈 Intermediate — Occasional Technical Trails</h3>
              <ul className="grid md:grid-cols-2 gap-2 text-stone-300 text-sm">
                <li>• All beginner items</li>
                <li>• Tree saver strap + bow shackles</li>
                <li>• Hi-lift jack + base plate</li>
                <li>• Shovel + traction boards</li>
                <li>• Skid plates</li>
                <li>• Better tires (AT or light MT)</li>
                <li>• Fire extinguisher</li>
              </ul>
            </div>

            {/* Advanced */}
            <div className="bg-stone-900/30 rounded-xl border border-stone-700 p-6">
              <h3 className="font-bold text-red-400 text-lg mb-3">🥇 Advanced — Serious Rock/Sand/Overlanding</h3>
              <ul className="grid md:grid-cols-2 gap-2 text-stone-300 text-sm">
                <li>• All intermediate items</li>
                <li>• Winch + recovery points</li>
                <li>• Locking differentials</li>
                <li>• Heavy-duty recovery rope</li>
                <li>• Extra fuel (jerry can)</li>
                <li>• Satellite communicator</li>
                <li>• Spare parts: belts, hoses, fluids</li>
              </ul>
            </div>
          </section>

          {/* Trail Etiquette */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">Trail Etiquette & Rules</h2>
            <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
              <ul className="space-y-3 text-stone-300">
                <li>• <span className="text-orange-400 font-semibold">Yield:</span> Uphill vehicles have right of way on single-track technical lines.</li>
                <li>• <span className="text-orange-400 font-semibold">Leave no trace:</span> Pack out trash, don't widen the trail, respect wildlife.</li>
                <li>• <span className="text-orange-400 font-semibold">Respect closures:</span> Many SoCal trails have seasonal closures — check USFS/BLM.</li>
                <li>• <span className="text-orange-400 font-semibold">Fire restrictions:</span> Follow local fire rules; avoid campfires in extreme seasons.</li>
              </ul>
            </div>
          </section>

        </div>
      </article>

      {/* Footer */}
      <footer className="py-8 px-4 bg-stone-900 border-t border-stone-800">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-stone-500 text-sm">
            Provided by <Link href="/" className="text-orange-400 hover:underline">SoCalOffroaders.org</Link> — use responsibly.
          </p>
        </div>
      </footer>
    </main>
  );
}