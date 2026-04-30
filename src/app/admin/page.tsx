'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ShieldCheck, CheckCircle2, XCircle, Mountain, Clock, Loader2, RefreshCw } from 'lucide-react'

interface TrailSuggestion {
  id: string
  trail_name: string        // matches DB column name
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  suggested_by: string | null
  users?: { name: string | null; email: string | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  approved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/30',
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, profile, loading: authLoading, supabaseClient } = useAuth()
  const [suggestions, setSuggestions] = useState<TrailSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})

  // Role guard — redirect non-OWNERs back to home
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    const role = (profile?.role as string | null)?.toLowerCase()
    if (role !== 'owner') {
      router.replace('/')
    }
  }, [authLoading, user, profile, router])

  const fetchSuggestions = useCallback(async () => {
    if (!supabaseClient) return
    setLoading(true)

    const query = supabaseClient
      .from('trail_suggestions')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false })

    const { data, error } = await (
      filter === 'all' ? query : query.eq('status', filter)
    )

    if (!error && data) {
      setSuggestions(data as TrailSuggestion[])
    }
    setLoading(false)
  }, [supabaseClient, filter])

  useEffect(() => {
    if (!authLoading && user && (profile?.role as string | null)?.toLowerCase() === 'owner') {
      fetchSuggestions()
    }
  }, [fetchSuggestions, authLoading, user, profile])

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    if (!supabaseClient) return
    setUpdatingId(id)
    const { error } = await supabaseClient
      .from('trail_suggestions')
      .update({
        status,
        admin_notes: noteInputs[id] ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      })
      .eq('id', id)

    if (!error) {
      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status, admin_notes: noteInputs[id] ?? s.admin_notes } : s
        )
      )
    }
    setUpdatingId(null)
  }

  const pending = suggestions.filter((s) => s.status === 'pending').length

  // Still waiting for auth resolution
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050705] flex items-center justify-center">
        <Loader2 size={28} className="text-[#FF8C00] animate-spin" />
      </div>
    )
  }

  // Role check not yet passed (will redirect)
  const role = (profile?.role as string | null)?.toLowerCase()
  if (role !== 'owner') return null

  return (
    <div className="min-h-screen bg-[#050705]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#050705]/95 backdrop-blur border-b border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FF8C00] rounded-lg flex items-center justify-center">
              <ShieldCheck size={16} className="text-black" />
            </div>
            <div>
              <h1 className="text-white font-black uppercase tracking-wide text-sm">Admin Dashboard</h1>
              <p className="text-neutral-500 text-[11px]">Project Offroad</p>
            </div>
          </div>
          <button
            onClick={fetchSuggestions}
            disabled={loading}
            className="p-2 text-neutral-500 hover:text-white transition-colors disabled:opacity-40"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Trail Suggestions section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mountain size={18} className="text-[#FF8C00]" />
              <h2 className="text-white font-black uppercase tracking-widest text-sm">
                Trail Suggestions
              </h2>
              {pending > 0 && (
                <span className="px-2 py-px bg-amber-500 text-black text-[10px] font-black rounded-full leading-none">
                  {pending} pending
                </span>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wide rounded-full border transition-colors ${
                    filter === f
                      ? 'bg-[#FF8C00] text-black border-[#FF8C00]'
                      : 'bg-transparent text-neutral-500 border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="text-[#FF8C00] animate-spin" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="border-2 border-dashed border-neutral-800 rounded-xl p-12 text-center">
              <Mountain size={32} className="text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">No {filter === 'all' ? '' : filter} trail suggestions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3"
                >
                  {/* Row 1: trail name + status badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-bold text-[15px] leading-snug">{s.trail_name}</p>
                      <p className="text-neutral-500 text-[11px] mt-0.5">
                        Suggested by{' '}
                        <span className="text-neutral-400">
                          {(s.users as any)?.name ?? (s.users as any)?.email ?? 'Unknown'}
                        </span>{' '}
                        &middot;{' '}
                        {new Date(s.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[s.status]}`}
                    >
                      {s.status === 'pending' && <Clock size={9} />}
                      {s.status === 'approved' && <CheckCircle2 size={9} />}
                      {s.status === 'rejected' && <XCircle size={9} />}
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>

                  {/* Existing admin note */}
                  {s.admin_notes && (
                    <p className="text-[12px] text-neutral-400 bg-neutral-800 rounded-lg px-3 py-2 leading-relaxed">
                      Note: {s.admin_notes}
                    </p>
                  )}

                  {/* Actions — only for pending suggestions */}
                  {s.status === 'pending' && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={noteInputs[s.id] ?? ''}
                        onChange={(e) => setNoteInputs((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder="Optional admin note..."
                        className="w-full bg-neutral-800 border border-neutral-700 px-3 py-2 text-white text-[12px] rounded-lg focus:outline-none focus:border-[#FF8C00] transition placeholder:text-neutral-600"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(s.id, 'approved')}
                          disabled={updatingId === s.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold uppercase tracking-wide rounded-lg transition disabled:opacity-50"
                        >
                          {updatingId === s.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(s.id, 'rejected')}
                          disabled={updatingId === s.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600/80 hover:bg-red-600 text-white text-[12px] font-bold uppercase tracking-wide rounded-lg transition disabled:opacity-50"
                        >
                          {updatingId === s.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
