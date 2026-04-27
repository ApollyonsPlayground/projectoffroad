'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  AlertTriangle,
  Send,
  Check,
  X,
  Zap,
  MessageCircle,
  Info,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { ChatSkeleton } from '@/components/SkeletonLoader';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/db/supabase';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Run {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  difficulty: string;
  max_participants: number;
  current_participants: number;
  meetup_location: string;
  trail_name?: string;
  vehicle_requirements?: string;
  status: 'upcoming' | 'active' | 'completed';
  organizer_name?: string;
  club_name?: string;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
}

// Placeholder run for demo
const placeholderRun: Run = {
  id: '1',
  title: 'Holcomb Valley Weekend Run',
  description: 'All skill levels welcome. We will tackle John Bull and Gold Mountain. Recovery gear required. Bring a lunch and plenty of water. CB radio or GMRS recommended.',
  date: '2026-05-03',
  time: '07:00',
  difficulty: 'Advanced',
  max_participants: 12,
  current_participants: 8,
  meetup_location: 'Big Bear Discovery Center, 40971 North Shore Dr, Fawnskin, CA',
  trail_name: 'Holcomb Valley / John Bull',
  vehicle_requirements: 'Lifted 4WD, 33"+ tires, lockers recommended, skid plates required',
  status: 'active',
  organizer_name: 'Mike D.',
  club_name: 'SoCal Crawlers',
};

// Placeholder messages for demo
const placeholderMessages: Message[] = [
  {
    id: '1',
    content: 'Hey everyone! Looking forward to Saturday. Weather looks perfect.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    user_id: '1',
    user_name: 'Mike D.',
  },
  {
    id: '2',
    content: 'Same here! Just finished installing my new bumper, ready to test it out.',
    created_at: new Date(Date.now() - 82800000).toISOString(),
    user_id: '2',
    user_name: 'Sarah M.',
  },
  {
    id: '3',
    content: 'Anyone bringing a portable air compressor? Mine is in the shop.',
    created_at: new Date(Date.now() - 72000000).toISOString(),
    user_id: '3',
    user_name: 'Dan T.',
  },
  {
    id: '4',
    content: 'I have one you can use. Viair 400P.',
    created_at: new Date(Date.now() - 68400000).toISOString(),
    user_id: '1',
    user_name: 'Mike D.',
  },
  {
    id: '5',
    content: 'Perfect, thanks Mike! See you all at the meetup spot.',
    created_at: new Date(Date.now() - 64800000).toISOString(),
    user_id: '3',
    user_name: 'Dan T.',
  },
];

function getDifficultyColor(difficulty: string): string {
  const level = difficulty.toLowerCase();
  if (level === 'beginner' || level === 'easy') return 'badge-beginner';
  if (level === 'moderate' || level === 'intermediate') return 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30';
  if (level === 'advanced' || level === 'challenging') return 'badge-advanced';
  if (level === 'extreme') return 'badge-extreme';
  return 'bg-zinc-700/50 text-zinc-400';
}

type ViewMode = 'details' | 'chat';

export default function RunDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  
  const [run, setRun] = useState<Run | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Check if user wants to join directly
    if (searchParams.get('join') === 'true') {
      setViewMode('details');
    }
    
    fetchRun();
    fetchMessages();
  }, [id, searchParams]);

  useEffect(() => {
    if (viewMode === 'chat') {
      scrollToBottom();
    }
  }, [messages, viewMode]);

  async function fetchRun() {
    if (!supabase || !isSupabaseConfigured()) {
      setRun(placeholderRun);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('runs')
        .select('*, club:clubs(name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setRun(data || placeholderRun);
    } catch (err) {
      console.error('Error fetching run:', err);
      setRun(placeholderRun);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchMessages() {
    if (!supabase || !isSupabaseConfigured()) {
      setMessages(placeholderMessages);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, user:users(name, avatar_url)')
        .eq('run_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data?.length ? data : placeholderMessages);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setMessages(placeholderMessages);
    }
  }

  async function handleJoinRun() {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsJoining(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {}

    // Simulate join for demo
    setTimeout(() => {
      setIsJoining(false);
      setHasJoined(true);
      setViewMode('chat');
    }, 1000);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {}

    // Add message locally for demo
    const newMsg: Message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      user_id: user?.id || 'current',
      user_name: profile?.name || 'You',
    };

    setMessages([...messages, newMsg]);
    setNewMessage('');
    setIsSending(false);
    
    setTimeout(scrollToBottom, 100);
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertTriangle size={48} className="text-zinc-600 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-400 mb-2">Run not found</h2>
        <Link href="/runs" className="text-orange-500 hover:text-orange-400">
          Back to Runs
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-zinc-800 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/runs" className="p-2 -ml-2 text-zinc-400 hover:text-white">
              <ArrowLeft size={20} />
            </Link>
            <div className="min-w-0">
              <h1 className="font-semibold text-white truncate">{run.title}</h1>
              <p className="text-xs text-zinc-500">{run.club_name || 'Independent Run'}</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-bold uppercase ${getDifficultyColor(run.difficulty)}`}>
            {run.difficulty}
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex border-t border-zinc-800">
          <button
            onClick={() => setViewMode('details')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
              viewMode === 'details'
                ? 'bg-zinc-800 text-orange-500 border-b-2 border-orange-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Info size={16} />
            Details
          </button>
          <button
            onClick={() => setViewMode('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
              viewMode === 'chat'
                ? 'bg-zinc-800 text-orange-500 border-b-2 border-orange-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <MessageCircle size={16} />
            Chat ({messages.length})
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'details' ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-y-auto pb-safe-nav"
            >
              <div className="max-w-lg mx-auto p-4 space-y-4">
                {/* Run Info Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-4">
                  <h2 className="font-semibold text-white mb-4">Run Details</h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Calendar size={18} className="text-orange-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-zinc-400">Date & Time</p>
                        <p className="text-white">
                          {new Date(run.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })} at {run.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin size={18} className="text-orange-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-zinc-400">Meetup Location</p>
                        <p className="text-white">{run.meetup_location}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Users size={18} className="text-orange-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-zinc-400">Participants</p>
                        <p className="text-white">
                          {run.current_participants} / {run.max_participants} spots filled
                        </p>
                      </div>
                    </div>

                    {run.trail_name && (
                      <div className="flex items-start gap-3">
                        <Zap size={18} className="text-orange-500 mt-0.5" />
                        <div>
                          <p className="text-sm text-zinc-400">Trail</p>
                          <p className="text-white">{run.trail_name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-zinc-900 border border-zinc-800 p-4">
                  <h2 className="font-semibold text-white mb-2">Description</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">{run.description}</p>
                </div>

                {/* Vehicle Requirements */}
                {run.vehicle_requirements && (
                  <div className="bg-orange-500/10 border border-orange-500/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-orange-500" />
                      <h2 className="font-semibold text-orange-500">Vehicle Requirements</h2>
                    </div>
                    <p className="text-sm text-orange-300/80">{run.vehicle_requirements}</p>
                  </div>
                )}

                {/* Organizer */}
                {run.organizer_name && (
                  <div className="bg-zinc-900 border border-zinc-800 p-4">
                    <p className="text-sm text-zinc-500">
                      Organized by <span className="text-white">{run.organizer_name}</span>
                    </p>
                  </div>
                )}

                {/* Join Button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoinRun}
                  disabled={isJoining || hasJoined || run.current_participants >= run.max_participants}
                  className={`w-full py-4 font-semibold text-lg transition-colors ${
                    hasJoined
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : run.current_participants >= run.max_participants
                      ? 'bg-zinc-700 text-zinc-500'
                      : 'bg-orange-500 hover:bg-orange-600 text-zinc-950'
                  }`}
                >
                  {isJoining ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
                      />
                      Joining...
                    </span>
                  ) : hasJoined ? (
                    <span className="flex items-center justify-center gap-2">
                      <Check size={20} />
                      Joined - View Chat
                    </span>
                  ) : run.current_participants >= run.max_participants ? (
                    'Run is Full'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Zap size={20} />
                      Join This Run
                    </span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle size={48} className="text-zinc-700 mb-4" />
                    <p className="text-zinc-500">No messages yet</p>
                    <p className="text-sm text-zinc-600">Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => {
                      const isOwn = msg.user_id === user?.id || msg.user_id === 'current';
                      const showDate = index === 0 || 
                        formatDate(messages[index - 1].created_at) !== formatDate(msg.created_at);

                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="text-center my-4">
                              <span className="px-3 py-1 bg-zinc-800 text-xs text-zinc-500 rounded-full">
                                {formatDate(msg.created_at)}
                              </span>
                            </div>
                          )}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                          >
                            {!isOwn && (
                              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300 flex-shrink-0">
                                {msg.user_name?.[0] || '?'}
                              </div>
                            )}
                            <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                              {!isOwn && (
                                <p className="text-xs text-zinc-500 mb-1 ml-1">{msg.user_name}</p>
                              )}
                              <div
                                className={`px-3 py-2 rounded-2xl ${
                                  isOwn
                                    ? 'bg-orange-500 text-zinc-950 rounded-br-md'
                                    : 'bg-zinc-800 text-white rounded-bl-md'
                                }`}
                              >
                                <p className="text-sm">{msg.content}</p>
                              </div>
                              <p className={`text-[10px] text-zinc-600 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="border-t border-zinc-800 p-3 bg-zinc-900/50 safe-bottom">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="w-10 h-10 flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-950 rounded-full transition-colors"
                  >
                    <Send size={18} />
                  </motion.button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - only show on details view */}
      {viewMode === 'details' && <BottomNav />}
    </div>
  );
}
