'use client';

import { useState } from 'react';
import HeroCinematic from '../components/HeroCinematic';
import TrailCard from '../components/TrailCard';
import RegionFilter from '../components/RegionFilter';
import SubmissionHub from '../components/SubmissionHub';
import DisclaimerModal from '../components/DisclaimerModal';
import trailsData from '../data/trails.json';
import { MapPin, Instagram, Wrench, AlertTriangle, ExternalLink, TreePine, Mountain, Shield } from 'lucide-react';

// Region filter function
function filterTrailsByRegion(trails: typeof trailsData, regionId: string) {
  if (regionId === 'all') return trails;
  
  return trails.filter(trail => {
    const loc = (trail.location || '').toLowerCase();
    const tags = (trail.tags || []).map(t => t.toLowerCase());
    
    switch (regionId) {
      case 'big-bear':
        return loc.includes('big bear') || tags.includes('big bear');
      case 'san-diego':
        return loc.includes('san diego') || tags.includes('san diego');
      case 'palm-springs':
        return loc.includes('palm springs') || loc.includes('idyllwild') || tags.includes('palm springs') || tags.includes('idyllwild');
      case 'joshua-tree':
        return loc.includes('joshua tree') || tags.includes('joshua tree');
      case 'san-bernardino':
        return loc.includes('san bernardino') || loc.includes('cajon') || loc.includes('lytle') || tags.includes('san bernardino');
      default:
        return true;
    }
  });
}

export default function HomePage() {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const filteredTrails = filterTrailsByRegion(trailsData, selectedRegion);
  return (
    <main className="min-h-screen bg-stone-950">
      {/* Legal Disclaimer Modal - Page Load Gate */}
      <DisclaimerModal />

      {/* Sticky Legal Disclaimer Header */}
      <div className="sticky top-0 z-50 bg-red-900/90 backdrop-blur-sm border-b border-red-700">
        <div className="container mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-center gap-3 text-center">
            <AlertTriangle size={18} className="text-red-200 flex-shrink-0" />
            <p className="text-red-100 text-sm font-medium">
              <span className="font-bold">DISCLAIMER:</span> Off-roading is dangerous. Data is for informational purposes only. Users assume all risk. Verify closures with USFS/BLM before travel. Tread Lightly.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <HeroCinematic />

      {/* Trail Explorer Section */}
      <section id="trail-explorer" className="py-20 px-4 bg-stone-950">
        <div className="container mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-2 rounded-full bg-orange-600/10 border border-orange-600/30 text-orange-400 text-sm font-medium uppercase tracking-wider mb-4">
              Trail Explorer
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-50 mb-4">
              Choose Your <span className="italic text-orange-500">Adventure</span>
            </h2>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              From fire roads to rock crawls. Each trail includes rig requirements, 
              navigation links, and real-time status.
            </p>
          </div>

          {/* Guide Quick Links */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <a 
              href="/guides/beginner"
              className="inline-flex items-center gap-2 px-5 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-600 hover:border-orange-500/50 transition-all"
            >
              <span>📖</span>
              <span className="font-medium">Beginner's Guide</span>
            </a>
            <a 
              href="/guides/truck-buying"
              className="inline-flex items-center gap-2 px-5 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg border border-stone-600 hover:border-orange-500/50 transition-all"
            >
              <span>🚚</span>
              <span className="font-medium">Truck Buying Guide</span>
            </a>
          </div>

          {/* Region Filter Tabs */}
          <RegionFilter 
            selectedRegion={selectedRegion} 
            onRegionChange={setSelectedRegion} 
          />

          {/* Trail Count */}
          <div className="text-center mb-8">
            <p className="text-stone-400">
              Showing <span className="text-orange-400 font-bold">{filteredTrails.length}</span> trails
              {selectedRegion !== 'all' && ' in selected region'}
            </p>
          </div>

          {/* Trail Cards Grid */}
          {filteredTrails.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredTrails.map((trail, index) => (
                <TrailCard key={trail.id} trail={trail} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-stone-900/30 rounded-2xl border border-stone-800">
              <p className="text-stone-400 text-lg">No trails found in this region yet.</p>
              <p className="text-stone-500 text-sm mt-2">Check back soon for more trails!</p>
            </div>
          )}
        </div>
      </section>

      {/* Community Runs Section */}
      <section id="community-runs" className="py-20 px-4 bg-stone-900 border-y border-stone-800">
        <div className="container mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-emerald-600/10 border border-emerald-600/30 text-emerald-400 text-sm font-medium uppercase tracking-wider mb-4">
              Community
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-50 mb-4">
              Upcoming <span className="italic text-emerald-500">Trail Runs</span>
            </h2>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              Join the community. Meet fellow wheelers, explore new trails, 
              and make memories. All skill levels welcome.
            </p>
          </div>

          {/* LUMA COMMUNITY CTA - Replaces hardcoded run cards */}
          <div className="text-center py-16 bg-stone-950/50 rounded-2xl border-2 border-dashed border-stone-700 mb-12">
            <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-stone-300 mb-2">
              Join the Community on Luma
            </h3>
            <p className="text-stone-500 mb-6 max-w-md mx-auto">
              RSVP to upcoming trail runs, get notified about new events, and connect with fellow off-roaders.
            </p>
            <a
              href="https://lu.ma/socaloffroaders"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-stone-50 font-semibold rounded-lg transition-all shadow-lg shadow-emerald-600/20"
            >
              <ExternalLink size={18} />
              Join on Luma
            </a>
          </div>

          {/* SUBMISSION HUB - Now with lu.ma propose link */}
          <SubmissionHub />
        </div>
      </section>

      {/* Recovery Resources Section */}
      <section className="py-20 px-4 bg-stone-950">
        <div className="container mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-stone-700/50 border border-stone-600 text-stone-400 text-sm font-medium uppercase tracking-wider mb-4">
              Support
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-50 mb-4">
              Recovery <span className="italic text-stone-400">Resources</span>
            </h2>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              Stuck, broken, or need a tow? 
            </p>
          </div>

          {/* Recovery Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
            {/* SoCal Crwlr */}
            <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl border border-stone-700 p-8 hover:border-orange-600/30 transition-all">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-stone-50">SoCal Crwlr</h3>
              </div>
              
              <p className="text-stone-400 mb-6">
                Full-service recovery throughout Southern California OHV areas. 
                Winch, tow straps, hi-lift, and recovery rig ready to roll.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {['Winch', 'Tow Straps', 'Hi-Lift', 'Recovery Rig', 'All SoCal'].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-stone-800 text-stone-400 rounded-full text-xs border border-stone-700">
                    {tag}
                  </span>
                ))}
              </div>

              <a 
                href="https://instagram.com/socal_crwlr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-all border border-stone-600"
              >
                <Instagram size={18} />
                <span className="font-medium">@socal_crwlr</span>
              </a>
            </div>

            {/* Rugged Repair */}
            <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl border border-stone-700 p-8 hover:border-orange-600/30 transition-all">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-stone-50">Rugged Repair</h3>
                <span className="px-3 py-1 bg-orange-600/20 text-orange-400 rounded-full text-sm font-medium border border-orange-600/30">
                  Mobile Tech
                </span>
              </div>
              
              <p className="text-stone-400 mb-6">
                Trail-side repairs and mobile mechanic services. Welding, tools, 
                and expertise to get you rolling again. No trail too remote.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {['Mobile Repair', 'Welding', 'Tools', 'Trail-Side', 'Recovery'].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-stone-800 text-stone-400 rounded-full text-xs border border-stone-700">
                    {tag}
                  </span>
                ))}
              </div>

              <a 
                href="https://instagram.com/rugged_repair"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-all border border-stone-600"
              >
                <Wrench size={18} />
                <span className="font-medium">@rugged_repair</span>
              </a>
            </div>
          </div>


        </div>
      </section>

      {/* California Off-Road Resources Section */}
      <section className="py-20 px-4 bg-stone-900 border-y border-stone-800">
        <div className="container mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-emerald-600/10 border border-emerald-600/30 text-emerald-400 text-sm font-medium uppercase tracking-wider mb-4">
              Essential Resources
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-50 mb-4">
              California <span className="italic text-emerald-500">Off-Road</span> Resources
            </h2>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              Official sources for trail conditions, permits, and responsible recreation. 
              Always verify closures before heading out.
            </p>
          </div>

          {/* Resource Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* BLM California */}
            <a 
              href="https://www.blm.gov/programs/recreation/recreation-programs/off-highway-vehicles/california"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-stone-800/50 backdrop-blur-sm rounded-xl border border-stone-700 p-6 hover:border-orange-600/50 transition-all hover:shadow-lg hover:shadow-orange-900/10"
            >
              <div className="w-12 h-12 bg-emerald-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-600/30 transition-colors">
                <Mountain size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-stone-50 mb-2">BLM California</h3>
              <p className="text-stone-400 text-sm mb-4">Bureau of Land Management OHV areas, permits, and trail maps for California.</p>
              <div className="flex items-center gap-1 text-orange-400 text-sm font-medium">
                <span>Visit Site</span>
                <ExternalLink size={14} />
              </div>
            </a>

            {/* CA State Parks OHMVR */}
            <a 
              href="https://ohv.parks.ca.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-stone-800/50 backdrop-blur-sm rounded-xl border border-stone-700 p-6 hover:border-orange-600/50 transition-all hover:shadow-lg hover:shadow-orange-900/10"
            >
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition-colors">
                <Shield size={24} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-stone-50 mb-2">State Parks OHMVR</h3>
              <p className="text-stone-400 text-sm mb-4">California State Parks Off-Highway Motor Vehicle Recreation division.</p>
              <div className="flex items-center gap-1 text-orange-400 text-sm font-medium">
                <span>Visit Site</span>
                <ExternalLink size={14} />
              </div>
            </a>

            {/* Tread Lightly */}
            <a 
              href="https://treadlightly.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-stone-800/50 backdrop-blur-sm rounded-xl border border-stone-700 p-6 hover:border-orange-600/50 transition-all hover:shadow-lg hover:shadow-orange-900/10"
            >
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600/30 transition-colors">
                <TreePine size={24} className="text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-stone-50 mb-2">Tread Lightly!</h3>
              <p className="text-stone-400 text-sm mb-4">National nonprofit promoting responsible outdoor recreation through ethics education.</p>
              <div className="flex items-center gap-1 text-orange-400 text-sm font-medium">
                <span>Visit Site</span>
                <ExternalLink size={14} />
              </div>
            </a>

            {/* USFS Alerts */}
            <a 
              href="https://www.fs.usda.gov/alerts/sbnf/alerts-notices"
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-stone-800/50 backdrop-blur-sm rounded-xl border border-stone-700 p-6 hover:border-orange-600/50 transition-all hover:shadow-lg hover:shadow-orange-900/10"
            >
              <div className="w-12 h-12 bg-amber-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-600/30 transition-colors">
                <AlertTriangle size={24} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-stone-50 mb-2">USFS Alerts</h3>
              <p className="text-stone-400 text-sm mb-4">San Bernardino National Forest alerts, closures, and fire restrictions.</p>
              <div className="flex items-center gap-1 text-orange-400 text-sm font-medium">
                <span>Visit Site</span>
                <ExternalLink size={14} />
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-stone-950 border-t border-stone-800">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-stone-900/50 rounded-lg border border-stone-800 p-4 mb-8">
            <p className="text-stone-500 text-sm text-center">
              <span className="font-semibold text-stone-400">DISCLAIMER:</span> Off-roading is dangerous. Trail data is for informational purposes only. Users assume all risk of injury, death, or property damage. Always verify trail closures and conditions with USFS, BLM, or appropriate land management agencies before travel. Practice Tread Lightly principles.
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌲</span>
              <div>
                <h4 className="font-bold text-stone-50">SoCal Off-Roaders</h4>
                <p className="text-stone-500 text-sm">Tread lightly. Leave no trace.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <a
                href="https://ko-fi.com/socaloffroaders"
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-400 hover:text-[#FF5E5B] transition-colors"
              >
                support the website creator
              </a>
              <span className="text-stone-600">|</span>
              <a 
                href="https://instagram.com/noah2131" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-400 hover:text-orange-500 transition-colors"
              >
                @noah2131
              </a>
              <span className="text-stone-600">|</span>
              <span className="text-stone-500">© 2026 SoCal Off-Roaders</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
