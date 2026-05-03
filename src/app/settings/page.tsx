'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, Shield, HelpCircle, Info, LogOut } from 'lucide-react'

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    runs: true,
    clubs: true,
    messages: false
  })

  return (
    <div className="min-h-screen bg-[#050705]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#050705] border-b-2 border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-neutral-400 hover:text-white">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-lg font-bold text-white uppercase tracking-wide">Settings</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Notifications */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">Notifications</h2>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-neutral-400">New runs in my area</span>
              <input
                type="checkbox"
                checked={notifications.runs}
                onChange={(e) => setNotifications({ ...notifications, runs: e.target.checked })}
                className="w-5 h-5 accent-muted-gold"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-neutral-400">Club updates</span>
              <input
                type="checkbox"
                checked={notifications.clubs}
                onChange={(e) => setNotifications({ ...notifications, clubs: e.target.checked })}
                className="w-5 h-5 accent-muted-gold"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-neutral-400">Direct messages</span>
              <input
                type="checkbox"
                checked={notifications.messages}
                onChange={(e) => setNotifications({ ...notifications, messages: e.target.checked })}
                className="w-5 h-5 accent-muted-gold"
              />
            </label>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">Privacy</h2>
          </div>
          
          <div className="space-y-3">
            <Link href="/privacy" className="flex items-center justify-between text-neutral-400 hover:text-white py-2">
              <span>Privacy Policy</span>
              <span className="text-neutral-600">→</span>
            </Link>
            <Link href="/terms" className="flex items-center justify-between text-neutral-400 hover:text-white py-2">
              <span>Terms of Service</span>
              <span className="text-neutral-600">→</span>
            </Link>
          </div>
        </div>

        {/* Support */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">Support</h2>
          </div>
          
          <div className="space-y-3">
            <Link href="/guides" className="flex items-center justify-between text-neutral-400 hover:text-white py-2">
              <span>Beginner's Guide</span>
              <span className="text-neutral-600">→</span>
            </Link>
            <a href="mailto:support@socaloffroaders.org" className="flex items-center justify-between text-neutral-400 hover:text-white py-2">
              <span>Contact Us</span>
              <span className="text-neutral-600">→</span>
            </a>
          </div>
        </div>

        {/* About */}
        <div className="bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Info className="text-muted-gold" size={20} />
            <h2 className="text-white font-bold uppercase tracking-wide">About</h2>
          </div>
          
          <div className="text-neutral-500 text-sm">
            <p>SoCalOffroaders</p>
            <p className="mt-1">Built with Next.js + Supabase</p>
          </div>
        </div>

        {/* Logout */}
        <button className="w-full flex items-center justify-center gap-2 py-3 bg-red-900/30 border-2 border-red-800 text-red-400 font-bold uppercase tracking-wider rounded-lg hover:bg-red-900/50 transition-colors">
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </div>
  )
}