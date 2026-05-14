'use client';

import { Calendar, MapPin, Camera, ExternalLink, Instagram } from 'lucide-react';
import { useState } from 'react';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

export default function SubmissionHub() {
  const [activeTab, setActiveTab] = useState<'events' | 'trail' | 'photos'>('events');

  return (
    <div className="bg-stone-900/50 backdrop-blur-sm rounded-2xl border border-stone-700 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-stone-700">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-3 px-2 md:px-4 text-xs md:text-sm font-semibold transition-colors ${
            activeTab === 'events'
              ? 'text-primary/90 border-b-2 border-primary/50 bg-stone-800/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className="flex items-center justify-center gap-1 md:gap-2">
            <Calendar size={16} />
            <span className="hidden sm:inline">Events</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('trail')}
          className={`flex-1 py-3 px-2 md:px-4 text-xs md:text-sm font-semibold transition-colors ${
            activeTab === 'trail'
              ? 'text-primary/90 border-b-2 border-primary/50 bg-stone-800/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className="flex items-center justify-center gap-1 md:gap-2">
            <MapPin size={16} />
            <span className="hidden sm:inline">Suggest Trail</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`flex-1 py-3 px-2 md:px-4 text-xs md:text-sm font-semibold transition-colors ${
            activeTab === 'photos'
              ? 'text-primary/90 border-b-2 border-primary/50 bg-stone-800/50'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <div className="flex items-center justify-center gap-1 md:gap-2">
            <Camera size={16} />
            <span className="hidden sm:inline">Share Photos</span>
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
                height="600"
                frameBorder="0"
                style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px' }}
                allowFullScreen={false}
                aria-hidden="false"
                tabIndex={0}
                title="SoCalOffroaders Event Calendar"
              />
            </div>
            
            {/* HOST A RUN BUTTON */}
            <a
              href="https://lu.ma/socaloffroaders/propose"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary hover:opacity-90 text-stone-50 font-semibold rounded-lg transition-all shadow-lg shadow-primary/20"
            >
              <ExternalLink size={18} />
              Want Others to Join You?
            </a>
          </div>
        ) : activeTab === 'trail' ? (
          <div className="space-y-4">
            <p className="text-stone-400 text-sm mb-4">
              Know a great trail that should be on our list? Send us the details.
            </p>
            <a
              href={`mailto:${SITE_SUPPORT_EMAIL}?subject=${encodeURIComponent('Trail suggestion for SoCal Off-Roaders')}`}
              className="block w-full py-3 px-4 bg-stone-700 hover:bg-stone-600 text-stone-50 font-semibold rounded-lg transition-all text-center"
            >
              Suggest a Trail via Email
            </a>
            <p className="text-stone-500 text-xs text-center mt-2">
              Include trail name, location, and difficulty level
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Photo Submission Info */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera size={32} className="text-foreground" />
              </div>
              <h3 className="text-xl font-bold text-stone-50 mb-2">
                Share Your Trail Photos
              </h3>
              <p className="text-stone-400 text-sm">
                Got snaps from your off-road adventures? We want to see them!
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-stone-800/50 rounded-xl p-5 border border-stone-700">
              <h4 className="font-semibold text-primary/90 mb-3">How it works:</h4>
              <ol className="space-y-2 text-stone-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>DM us on Instagram with your trail photos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>Tell us which trail you visited</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>We&apos;ll add your photos to the site (with credit!)</span>
                </li>
              </ol>
            </div>

            {/* Instagram Button */}
            <a
              href="https://instagram.com/noah2131"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-primary hover:from-purple-500 hover:via-pink-500 hover:to-primary/90 text-white font-bold rounded-lg transition-all shadow-lg"
            >
              <Instagram size={24} />
              <span>DM Us @noah2131</span>
            </a>

            <p className="text-stone-500 text-xs text-center">
              By submitting, you agree to have your photos featured with credit
            </p>
          </div>
        )}
      </div>
    </div>
  );
}