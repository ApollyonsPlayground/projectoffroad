'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Map, Users, User, Settings, Compass, X } from 'lucide-react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/runs', label: 'Runs', icon: Compass },
  { href: '/clubs', label: 'Clubs', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface LeftNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeftNav({ isOpen, onClose }: LeftNavProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-300, 0], [0, 1]);
  
  const variants = {
    open: { x: 0, opacity: 1 },
    closed: { x: -300, opacity: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40 md:hidden"
          />
          
          {/* Drawer */}
          <motion.nav
            variants={variants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ x }}
            drag="x"
            dragConstraints={{ left: -300, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x > 100 || velocity.x > 500) {
                onClose();
              }
            }}
            className="fixed top-0 left-0 w-64 h-screen bg-neutral-900 border-r-2 border-neutral-800 p-4 z-50 md:relative md:translate-x-0 md:opacity-100 md:flex md:flex-col md:sticky md:top-0 md:h-screen md:w-64 md:block"
          >
            <div className="mb-8 flex items-center justify-between">
              <h1 className="text-xl font-black uppercase tracking-widest text-orange-500">
                SoCal<span className="text-white">Offroad</span>
              </h1>
              <button onClick={onClose} className="md:hidden text-neutral-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 text-neutral-400 hover:text-orange-500 hover:bg-neutral-800 rounded-none transition-colors font-bold uppercase text-sm tracking-wide border-l-4 border-transparent hover:border-orange-500"
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-8 border-t-2 border-neutral-800">
              <Link
                href="/runs/create"
                onClick={onClose}
                className="block w-full py-3 bg-orange-600 hover:bg-orange-700 text-center font-black uppercase tracking-wider text-white"
              >
                + New Run
              </Link>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}

// Desktop-only version (used in layout)
export function DesktopNav() {
  return (
    <nav className="sticky top-0 w-64 h-screen bg-neutral-900 border-r-2 border-neutral-800 p-4 hidden md:block">
      <div className="mb-8">
        <h1 className="text-xl font-black uppercase tracking-widest text-orange-500">
          SoCal<span className="text-white">Offroad</span>
        </h1>
      </div>
      <ul className="space-y-2">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 text-neutral-400 hover:text-orange-500 hover:bg-neutral-800 rounded-none transition-colors font-bold uppercase text-sm tracking-wide border-l-4 border-transparent hover:border-orange-500"
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 pt-8 border-t-2 border-neutral-800">
        <Link
          href="/runs/create"
          className="block w-full py-3 bg-orange-600 hover:bg-orange-700 text-center font-black uppercase tracking-wider text-white"
        >
          + New Run
        </Link>
      </div>
    </nav>
  );
}