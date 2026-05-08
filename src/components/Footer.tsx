import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="text-lg font-bold text-amber-500">SoCalOffroaders</span>
            <p className="text-gray-500 text-sm mt-1">Southern California Offroad Community</p>
          </div>
          
          <div className="flex space-x-6 text-sm">
            <Link href="/terms" className="text-gray-400 hover:text-amber-500 transition">
              Terms
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-amber-500 transition">
              Privacy
            </Link>
            <Link href="/support/" className="text-gray-400 hover:text-amber-500 transition">
              Support
            </Link>
            <Link href="/account/delete/" className="text-gray-400 hover:text-amber-500 transition">
              Delete account
            </Link>
            <Link href="/guidelines" className="text-gray-400 hover:text-amber-500 transition">
              Guidelines
            </Link>
            <Link href="/child-safety" className="text-gray-400 hover:text-amber-500 transition">
              Child safety
            </Link>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-800 text-center text-gray-500 text-xs">
          © 2026 SoCalOffroaders. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
