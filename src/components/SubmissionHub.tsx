'use client';

import { Calendar, MapPin, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function SubmissionHub() {
  const [activeTab, setActiveTab] = useState<'events' | 'trail'>('events');

  return (
    <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl border border-stone-700 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-stone-700">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-4 px-6 text-sm font-semibold transition-colors ${
            activeTab === 'events'
              ? 'text-orange-400 border-b-2 border-orange-400 bg-stone-800/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Calendar size={18} />
            Upcoming Events
          </div>
        </button>
        <button
          onClick={() => setActiveTab('trail')}
          className={`flex-1 py-4 px-6 text-sm font-semibold transition-colors ${
            activeTab === 'trail'
              ? 'text-orange-400 border-b-2 border-orange-400 bg-stone-800/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MapPin size={18} />
            Suggest a Trail
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'events' ? (
          <div className="space-y-4">
            {/* LU.MA CALENDAR EMBED */}
            <div className="w-full overflow-hidden rounded-lg border border-stone-700 mb-4">
              <iframe
                src="https://luma.com/embed/calendar/cal-HOBQ0OOIQFzOFrw/events"
                width="100%"
                height="450"
                frameBorder="0"
                style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}
                allowFullScreen={false}
                aria-hidden="false"
                tabIndex={0}
                title="SoCal Offroaders Event Calendar"
              />
            </div>
            
            {/* HOST A RUN BUTTON */}
            <a
              href="https://lu.ma/socaloffroaders/propose"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-stone-50 font-semibold rounded-lg transition-all shadow-lg shadow-orange-600/20"
            >
              <ExternalLink size={18} />
              Host Your Own Run
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-stone-400 text-sm mb-4">
              Know a great trail that should be on our list? Send us the details.
            </p>
            <a
              href="mailto:caelumheyron@agentmail.to?subject=Trail%20Suggestion%20for%20SoCal%20Off-Roaders"
              className="block w-full py-3 px-4 bg-stone-700 hover:bg-stone-600 text-stone-50 font-semibold rounded-lg transition-all text-center"
            >
              Suggest a Trail via Email
            </a>
            <p className="text-stone-500 text-xs text-center mt-2">
              Include the trail name, location, and difficulty level
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
