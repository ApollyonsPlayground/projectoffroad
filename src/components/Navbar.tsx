'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-black tracking-widest">
              <span className="text-[#FF8C00]">SOCAL</span>
              <span className="text-white">OFFROADERS</span>
            </Link>
            
            {user && (
              <div className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-gray-300 hover:text-amber-500 transition">
                  Dashboard
                </Link>
                <Link href="/runs" className="text-gray-300 hover:text-amber-500 transition">
                  Runs
                </Link>
                <Link href="/clubs" className="text-gray-300 hover:text-amber-500 transition">
                  Clubs
                </Link>
                <Link href="/achievements" className="text-gray-300 hover:text-amber-500 transition">
                  Badges
                </Link>
                <Link href="/leaderboard" className="text-gray-300 hover:text-amber-500 transition">
                  Leaderboard
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/profile" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold">
                    {profile?.name?.charAt(0) || 'U'}
                  </div>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-300 hover:text-red-400 transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/search" className="text-gray-300 hover:text-amber-500 transition">
                  Search
                </Link>
                <Link href="/login" className="text-gray-300 hover:text-amber-500 transition">
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-[#FF8C00] hover:bg-[#FF9D00] text-white px-4 py-2 rounded-lg font-bold transition"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
