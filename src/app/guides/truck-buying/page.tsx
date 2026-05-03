import { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle, XCircle, Car, Truck, Gauge } from 'lucide-react';

export const metadata: Metadata = {
  title: "Truck Buying Guide | SoCalOffroaders",
  description: "A practical guide to choosing the right truck or SUV for off-roading in Southern California.",
};

export default function TruckBuyingGuidePage() {
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
            Truck <span className="italic text-orange-500">Buying Guide</span>
          </h1>
          <p className="text-stone-400 text-lg">
            Choosing the right rig for Southern California trails.
          </p>
        </div>
      </header>

      {/* Content */}
      <article className="py-12 px-4">
        <div className="container mx-auto max-w-4xl prose prose-invert prose-orange max-w-none">

          {/* Recommendation */}
          <section className="bg-stone-900/50 rounded-2xl border border-orange-600/30 p-8 mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">Quick Recommendation</h2>
            <p className="text-stone-300 text-lg">
              If you want reliability, resale, and wide aftermarket support — prioritize a 
              <span className="text-orange-400 font-bold"> mid-size truck</span> (Toyota Tacoma / Ford Ranger / Chevy Colorado) or 
              <span className="text-orange-400 font-bold"> Jeep Wrangler</span> if rock-focused.
            </p>
          </section>

          {/* Vehicle Types */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">Vehicle Types & Who They Suit</h2>
            <div className="space-y-4">
              
              <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Truck className="text-blue-400" size={28} />
                  <h3 className="text-xl font-bold text-stone-50">Compact & Midsize Trucks</h3>
                </div>
                <p className="text-stone-400 mb-3"><span className="font-semibold text-orange-400">Models:</span> Toyota Tacoma, Ford Ranger, Chevy Colorado, Nissan Frontier</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-400 font-semibold mb-1">Pros:</p>
                    <p className="text-stone-400">Good ground clearance, excellent aftermarket, easier to drive, lower running costs</p>
                  </div>
                  <div>
                    <p className="text-orange-400 font-semibold mb-1">Best for:</p>
                    <p className="text-stone-400">Weekend trail use, moderate rock and sand, payload for gear</p>
                  </div>
                </div>
              </div>

              <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Gauge className="text-green-400" size={28} />
                  <h3 className="text-xl font-bold text-stone-50">Jeep Wrangler / Gladiator</h3>
                </div>
                <p className="text-stone-400 mb-3"><span className="font-semibold text-orange-400">Models:</span> Wrangler 2-door, 4-door Unlimited, Gladiator</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-400 font-semibold mb-1">Pros:</p>
                    <p className="text-stone-400">Purpose-built for off-road, removable tops/doors, excellent aftermarket</p>
                  </div>
                  <div>
                    <p className="text-orange-400 font-semibold mb-1">Best for:</p>
                    <p className="text-stone-400">Rock crawling, technical trails, enthusiast community culture</p>
                  </div>
                </div>
              </div>

              <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Truck className="text-red-400" size={28} />
                  <h3 className="text-xl font-bold text-stone-50">Full-Size Trucks</h3>
                </div>
                <p className="text-stone-400 mb-3"><span className="font-semibold text-orange-400">Models:</span> Ford F-150, Toyota Tundra, Chevy Silverado, Ram 1500</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-400 font-semibold mb-1">Pros:</p>
                    <p className="text-stone-400">Towing & payload, more cabin comfort</p>
                  </div>
                  <div>
                    <p className="text-orange-400 font-semibold mb-1">Best for:</p>
                    <p className="text-stone-400">Hauling trailers, overlanding with lots of gear</p>
                  </div>
                </div>
              </div>

              <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Car className="text-purple-400" size={28} />
                  <h3 className="text-xl font-bold text-stone-50">AWD Crossovers / SUVs</h3>
                </div>
                <p className="text-stone-400 mb-3"><span className="font-semibold text-orange-400">Models:</span> Toyota 4Runner, Subaru Outback, Ford Explorer, Lexus GX</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-400 font-semibold mb-1">Pros:</p>
                    <p className="text-stone-400">Comfortable daily drivers, capable on dirt and light snow</p>
                  </div>
                  <div>
                    <p className="text-orange-400 font-semibold mb-1">Best for:</p>
                    <p className="text-stone-400">Beginners wanting occasional trails with good on-road manners</p>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Key Specs */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">Key Specs That Matter</h2>
            <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
              <ul className="space-y-3 text-stone-300">
                <li>• <span className="text-orange-400 font-semibold">Ground clearance</span> — More = less risk of hitting skid-sensitive parts</li>
                <li>• <span className="text-orange-400 font-semibold">Approach/Departure/Breakover angles</span> — Determines how well you handle steep transitions</li>
                <li>• <span className="text-orange-400 font-semibold">4L (Low Range)</span> — Essential for slow technical sections</li>
                <li>• <span className="text-orange-400 font-semibold">Locking differentials</span> — Drastically improve capability on uneven terrain</li>
                <li>• <span className="text-orange-400 font-semibold">Tire fit</span> — Room for larger tires without rubbing</li>
                <li>• <span className="text-orange-400 font-semibold">Payload & towing</span> — Important for heavy camping gear or trailers</li>
              </ul>
            </div>
          </section>

          {/* New vs Used */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">New vs Used</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-stone-900/50 rounded-xl border border-green-600/30 p-6">
                <h3 className="font-bold text-green-400 text-lg mb-3">Buy New If...</h3>
                <ul className="space-y-2 text-stone-300 text-sm">
                  <li>• You want warranty coverage</li>
                  <li>• Modern safety tech matters</li>
                  <li>• You want fewer surprises</li>
                  <li>• Budget isn't a primary concern</li>
                </ul>
              </div>
              <div className="bg-stone-900/50 rounded-xl border border-orange-600/30 p-6">
                <h3 className="font-bold text-orange-400 text-lg mb-3">Buy Used If...</h3>
                <ul className="space-y-2 text-stone-300 text-sm">
                  <li>• You want lower cost</li>
                  <li>• You can inspect carefully</li>
                  <li>• You want less depreciation hit</li>
                  <li>• Find one with documented service history</li>
                </ul>
              </div>
            </div>
          </section>

          {/* What to Inspect */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">What to Inspect on Used Vehicles</h2>
            <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-stone-200 mb-3">Check These:</h3>
                  <ul className="space-y-2 text-stone-400 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Frame & chassis for rust/repairs</li>
                    <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Suspension components</li>
                    <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Drivetrain & transfer case</li>
                    <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Underbody skid plates</li>
                    <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Tires & wheel condition</li>
                    <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Electrical (clean wiring)</li>
                    <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Title history clear</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-stone-200 mb-3">Red Flags:</h3>
                  <ul className="space-y-2 text-stone-400 text-sm">
                    <li className="flex items-center gap-2"><XCircle size={16} className="text-red-500" /> Frame damage or repairs</li>
                    <li className="flex items-center gap-2"><XCircle size={16} className="text-red-500" /> Bent control arms</li>
                    <li className="flex items-center gap-2"><XCircle size={16} className="text-red-500" /> Transfer case leaks/noise</li>
                    <li className="flex items-center gap-2"><XCircle size={16} className="text-red-500" /> Messy aftermarket wiring</li>
                    <li className="flex items-center gap-2"><XCircle size={16} className="text-red-500" /> Salvage title</li>
                    <li className="flex items-center gap-2"><XCircle size={16} className="text-red-500" /> Uneven tire wear</li>
                    <li className="flex items-center gap-2"><XCircle size={16} className="text-red-500" /> No service records</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Minimal Mods */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">Minimal Recommended Mods</h2>
            <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
              <p className="text-stone-400 mb-4">After purchase, these are the must-haves to get trail-ready:</p>
              <ul className="grid md:grid-cols-2 gap-3 text-stone-300">
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Recovery points (front & rear)</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Rated D-rings / bow shackles</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Portable air compressor</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Tire repair kit</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Better tires (AT for most)</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Skid plates (if rocky trails)</li>
                <li className="flex items-center gap-2"><CheckCircle size={16} className="text-green-500" /> Tow straps & gloves</li>
              </ul>
            </div>
          </section>

          {/* Decision Checklist */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-stone-50 mb-4">Buy or Pass Checklist</h2>
            <div className="bg-stone-900/50 rounded-xl border border-stone-700 p-6">
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <input type="checkbox" className="w-5 h-5 rounded bg-stone-700 border-stone-500" />
                  <span className="text-stone-300">Ground clearance adequate for planned trails</span>
                </li>
                <li className="flex items-center gap-3">
                  <input type="checkbox" className="w-5 h-5 rounded bg-stone-700 border-stone-500" />
                  <span className="text-stone-300">4L / low-range present and working</span>
                </li>
                <li className="flex items-center gap-3">
                  <input type="checkbox" className="w-5 h-5 rounded bg-stone-700 border-stone-500" />
                  <span className="text-stone-300">No major frame or chassis repairs visible</span>
                </li>
                <li className="flex items-center gap-3">
                  <input type="checkbox" className="w-5 h-5 rounded bg-stone-700 border-stone-500" />
                  <span className="text-stone-300">Drivetrain & transfer case leak-free</span>
                </li>
                <li className="flex items-center gap-3">
                  <input type="checkbox" className="w-5 h-5 rounded bg-stone-700 border-stone-500" />
                  <span className="text-stone-300">Tires in good condition or replaceable</span>
                </li>
                <li className="flex items-center gap-3">
                  <input type="checkbox" className="w-5 h-5 rounded bg-stone-700 border-stone-500" />
                  <span className="text-stone-300">Recovery points present or installable</span>
                </li>
                <li className="flex items-center gap-3">
                  <input type="checkbox" className="w-5 h-5 rounded bg-stone-700 border-stone-500" />
                  <span className="text-stone-300">Title & history clear</span>
                </li>
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