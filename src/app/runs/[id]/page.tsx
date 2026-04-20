'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Run {
  id: string
  title: string
  description: string
  date: string
  difficulty: string
  max_participants: number
  meetup_location: string
  vehicle_requirements: string
  status: string
  club?: { name: string; logo: string }
}

interface Message {
  id: string
  content: string
  created_at: string
  user?: { name: string; avatar_url: string }
}

export default function RunDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [run, setRun] = useState<Run | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) {
      fetchRun()
      fetchMessages()
    }
  }, [id])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchRun() {
    const { data } = await supabase
      .from('runs')
      .select('*, club:clubs(name, logo)')
      .eq('id', id)
      .single()
    
    if (data) setRun(data)
    setLoading(false)
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, user:users(name, avatar_url)')
      .eq('run_id', id)
      .order('created_at', { ascending: true })
    
    if (data) setMessages(data)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newMessage.trim()) return

    const { data, error } = await supabase
      .from('messages')
      .insert({ run_id: id, user_id: user.id, content: newMessage })
      .select('*, user:users(name, avatar_url)')
      .single()

    if (!error && data) {
      setMessages([...messages, data])
      setNewMessage('')
    }
  }

  async function joinRun() {
    if (!user) {
      router.push('/login')
      return
    }
    
    setJoining(true)
    const { error } = await supabase
      .from('run_participants')
      .insert({ run_id: id, user_id: user.id, rsvp_status: 'going' })
    
    setJoining(false)
    if (!error) {
      alert('You joined the run!')
    }
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy': return 'bg-green-500/20 text-green-400'
      case 'Moderate': return 'bg-yellow-500/20 text-yellow-400'
      case 'Challenging': return 'bg-orange-500/20 text-orange-400'
      case 'Extreme': return 'bg-red-500/20 text-red-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-amber-500">Loading...</div>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Run not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Run Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{run.title}</h1>
              <p className="text-gray-400">{run.club?.name || 'Independent'}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(run.difficulty)}`}>
              {run.difficulty}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Date</div>
              <div className="text-white">{new Date(run.date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-gray-400">Meetup</div>
              <div className="text-white">{run.meetup_location || 'TBD'}</div>
            </div>
            <div>
              <div className="text-gray-400">Status</div>
              <div className="text-white capitalize">{run.status}</div>
            </div>
            <div>
              <div className="text-gray-400">Spots</div>
              <div className="text-white">{run.max_participants} max</div>
            </div>
          </div>

          {run.description && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-gray-400 mb-2">Description</div>
              <div className="text-white">{run.description}</div>
            </div>
          )}

          {run.vehicle_requirements && (
            <div className="mt-4">
              <div className="text-gray-400 mb-2">Vehicle Requirements</div>
              <div className="text-white">{run.vehicle_requirements}</div>
            </div>
          )}

          <button
            onClick={joinRun}
            disabled={joining || !user}
            className="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition disabled:opacity-50"
          >
            {joining ? 'Joining...' : user ? 'Join This Run' : 'Sign in to Join'}
          </button>
        </div>

        {/* Run Chat */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">Run Chat</h2>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.length > 0 ? (
              messages.map((msg) => (
                <div key={msg.id} className="flex space-x-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black text-sm font-bold flex-shrink-0">
                    {msg.user?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-sm font-medium text-white">{msg.user?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-300">{msg.content}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                No messages yet. Start the conversation!
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Message Input */}
          {user && run.status === 'active' && (
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg font-medium"
                >
                  Send
                </button>
              </div>
            </form>
          )}
          
          {run.status !== 'active' && (
            <div className="p-4 border-t border-gray-700 text-center text-gray-500">
              Chat will be available when the run is active
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
