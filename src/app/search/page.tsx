'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/db/supabase'
import { resolvePublicDisplayName } from '@/lib/profileDisplay'

interface SearchResult {
  type: 'run' | 'club' | 'user'
  id: string
  title: string
  subtitle: string
}

interface UserSearchRow {
  id: string
  name: string | null
  username: string | null
  hide_display_name: boolean | null
  email: string | null
  location: string | null
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) {
      setQuery(q)
      performSearch(q)
    }
  }, [])

  async function performSearch(searchQuery: string) {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    const results: SearchResult[] = []

    if (!supabase) {
      setLoading(false)
      return
    }

    // Search runs
    const { data: runs } = await supabase
      .from('runs')
      .select('id, title, club:clubs(name)')
      .ilike('title', `%${searchQuery}%`)
      .limit(5)
    
    if (runs) {
      runs.forEach(run => {
        results.push({
          type: 'run',
          id: run.id,
          title: run.title,
          subtitle: (run.club as { name?: string })?.name || 'Independent'
        })
      })
    }

    // Search clubs
    const { data: clubs } = await supabase
      .from('clubs')
      .select('id, name, location')
      .ilike('name', `%${searchQuery}%`)
      .limit(5)
    
    if (clubs) {
      clubs.forEach(club => {
        results.push({
          type: 'club',
          id: club.id,
          title: club.name,
          subtitle: club.location || ''
        })
      })
    }

    const like = `%${searchQuery.trim()}%`
    const [{ data: byName }, { data: byUsername }] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, username, hide_display_name, email, location')
        .ilike('name', like)
        .limit(5),
      supabase
        .from('users')
        .select('id, name, username, hide_display_name, email, location')
        .ilike('username', like)
        .limit(5),
    ])
    const userMap = new Map<string, UserSearchRow>()
    ;[...(byName ?? []), ...(byUsername ?? [])].forEach((user) => {
      if (user?.id) userMap.set(user.id, user)
    })
    const users = [...userMap.values()].slice(0, 5)

    if (users.length) {
      users.forEach(user => {
        results.push({
          type: 'user',
          id: user.id,
          title: resolvePublicDisplayName({
            id: user.id,
            name: user.name,
            username: user.username,
            hide_display_name: user.hide_display_name,
            email: user.email,
          }),
          subtitle: user.location || ''
        })
      })
    }

    setResults(results)
    setLoading(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    performSearch(query)
    // Update URL
    window.history.pushState({}, '', `/search?q=${encodeURIComponent(query)}`)
  }

  function getIcon(type: string) {
    switch (type) {
      case 'run': return '🏁'
      case 'club': return '🏢'
      case 'user': return '👤'
      default: return '📄'
    }
  }

  function getLink(type: string, id: string) {
    switch (type) {
      case 'run': return `/runs/${id}`
      case 'club': return `/clubs/${id}`
      case 'user': return `/profile/${id}`
      default: return '#'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex space-x-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search runs, clubs, users..."
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg"
            >
              Search
            </button>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Searching...</div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result, index) => (
              <Link
                key={`${result.type}-${result.id}-${index}`}
                href={getLink(result.type, result.id)}
                className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getIcon(result.type)}</span>
                  <div className="flex-1">
                    <div className="text-white font-medium">{result.title}</div>
                    <div className="text-gray-400 text-sm">
                      {result.subtitle} • {result.type}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-8 text-gray-400">
            No results found for "{query}"
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            Enter a search term above
          </div>
        )}
      </div>
    </div>
  )
}
