'use client';

import { ChevronDown } from 'lucide-react';

export default function HeroCinematic() {
  const scrollToTrails = () => {
    document.getElementById('trail-explorer')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80)',
        }}
      >
        <div className="absolute inset-0 bg-stone-900/70"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/50 via-transparent to-stone-900"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-primary/20 border border-primary/40">
            <span className="text-primary/90 text-sm font-medium tracking-wide uppercase">
              Southern California Wilderness
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-stone-50 mb-6 tracking-tight">
            <span className="font-serif italic">Discover</span>
            <br />
            <span className="text-primary">SoCal&apos;s</span> Best Trails
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-stone-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            From desert dunes to mountain peaks. 
            Your guide to the wild places of Southern California.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button 
              onClick={scrollToTrails}
              className="px-8 py-4 bg-primary hover:opacity-90 text-stone-50 font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-primary/20"
            >
              Explore Trails
            </button>
            <a 
              href="#community-runs"
              className="px-8 py-4 bg-stone-800/80 hover:bg-stone-700/80 text-stone-50 font-semibold rounded-lg border border-stone-600 transition-all backdrop-blur-sm"
            >
              Join a Run
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">79+</div>
              <div className="text-stone-400 text-sm uppercase tracking-wider">Trails</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-emerald-500 mb-1">2</div>
              <div className="text-stone-400 text-sm uppercase tracking-wider">Guides</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button 
        onClick={scrollToTrails}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-stone-400 hover:text-stone-200 transition-colors animate-bounce"
      >
        <ChevronDown size={32} />
      </button>
    </section>
  );
}
