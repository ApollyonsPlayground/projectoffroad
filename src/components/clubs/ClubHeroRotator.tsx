'use client';

import { useEffect, useMemo, useState } from 'react';

const ROTATE_MS = 6000;

type ClubHeroRotatorProps = {
  /** Fallback when there are no garage photos */
  bannerImage?: string | null;
  garagePhotoUrls: string[];
  alt?: string;
  className?: string;
};

export function ClubHeroRotator({
  bannerImage,
  garagePhotoUrls,
  alt = '',
  className = 'absolute inset-0 w-full h-full object-cover',
}: ClubHeroRotatorProps) {
  const slides = useMemo(() => {
    const garage = garagePhotoUrls.filter(Boolean);
    if (garage.length > 0) return garage;
    const banner = bannerImage?.trim();
    return banner ? [banner] : [];
  }, [bannerImage, garagePhotoUrls]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [slides]);

  if (slides.length === 0) return null;

  return (
    <div className="absolute inset-0">
      {slides.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          className={`${className} transition-opacity duration-1000 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={i !== index}
        />
      ))}
      {slides.length > 1 ? (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-[1]"
          aria-hidden
        >
          {slides.map((src, i) => (
            <span
              key={`dot-${src}-${i}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-4 bg-white/90' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
