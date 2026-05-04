'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/db/supabase';
import BottomNav from '@/components/BottomNav';
import ClubGarage from '@/components/clubs/ClubGarage';
import { useToast } from '@/components/Toast';

interface Club {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string;
  location: string;
  website: string | null;
  instagram: string | null;
  verified: boolean;
  premium: boolean;
  owner_id: string;
}

interface Run {
  id: string;
  title: string;
  date: string;
  difficulty: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  user?: { name: string; avatar_url: string };
}

function instagramHref(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.startsWith('http')) return t;
  return `https://instagram.com/${t.replace(/^@/, '')}`;
}

function websiteHref(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.startsWith('http')) return t;
  return `https://${t}`;
}

export default function ClubDetailPage() {
  const params = useParams();
  const clubId = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params?.id]);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [club, setClub] = useState<Club | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!clubId) return;
    fetchClub();
    fetchRuns();
    fetchMembers();
  }, [clubId]);

  useEffect(() => {
    if (user && members.length > 0) {
      setIsMember(members.some((m) => m.user_id === user.id));
    }
  }, [user, members]);

  async function fetchClub() {
    if (!supabase || !clubId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('clubs').select('*').eq('id', clubId).single();

    if (data) setClub(data as Club);
    setLoading(false);
  }

  async function fetchRuns() {
    if (!supabase || !clubId) return;
    const { data } = await supabase
      .from('runs')
      .select('id, title, date, difficulty')
      .eq('club_id', clubId)
      .eq('status', 'upcoming')
      .order('date', { ascending: true })
      .limit(5);

    if (data) setRuns(data as Run[]);
  }

  async function fetchMembers() {
    if (!supabase || !clubId) return;
    const { data } = await supabase
      .from('club_members')
      .select('*, user:users(id, name, avatar_url)')
      .eq('club_id', clubId)
      .order('role', { ascending: true });

    if (data) setMembers(data as Member[]);
  }

  async function joinClub() {
    if (!user) {
      router.push('/login');
      return;
    }

    setJoining(true);
    if (!supabase || !clubId) {
      setJoining(false);
      return;
    }
    const { error } = await supabase.from('club_members').insert({ club_id: clubId, user_id: user.id, role: 'member' });

    setJoining(false);
    if (!error) {
      setIsMember(true);
      fetchMembers();
    }
  }

  async function deleteClub() {
    if (!supabase || !club || !user || user.id !== club.owner_id) return;
    if (
      !window.confirm(
        'Delete this club permanently? Linked runs and garage photos will be removed or unlinked. This cannot be undone.'
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.from('clubs').delete().eq('id', club.id);
      if (error) throw error;
      showToast('Club deleted', 'success');
      router.push('/clubs/');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete club', 'error');
    } finally {
      setDeleting(false);
    }
  }

  function getDifficultyColor(difficulty: string) {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-500/20 text-green-600 dark:text-green-400';
      case 'Moderate':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'Challenging':
        return 'bg-orange-500/20 text-orange-600 dark:text-orange-400';
      case 'Extreme':
        return 'bg-red-500/20 text-red-600 dark:text-red-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary">Loading...</div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Club not found</div>
      </div>
    );
  }

  const isClubOwner = !!user && user.id === club.owner_id;
  const canGarageUpload = !!user && (isMember || isClubOwner);
  const ig = instagramHref(club.instagram);
  const web = websiteHref(club.website);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/clubs/" className="inline-block text-sm text-primary hover:underline mb-4">
          ← Back to clubs
        </Link>
        <p className="text-xs text-muted-foreground mb-4 max-w-2xl">
          This is the club&apos;s <span className="text-foreground font-medium">organizational</span> page — separate from any
          member&apos;s personal profile. Runs and the garage can reference this club without replacing your own account.
        </p>

        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center text-4xl border border-border">
              {club.logo ? (
                <img src={club.logo} alt={club.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                '🏢'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{club.name}</h1>
                {club.verified && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm rounded">
                    ✓ Verified
                  </span>
                )}
                {club.premium && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-sm rounded">
                    ⭐ Premium
                  </span>
                )}
              </div>
              <p className="text-muted-foreground mt-1">{club.location}</p>

              <div className="flex flex-wrap gap-4 mt-4">
                {web && (
                  <a href={web} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-semibold">
                    🌐 Website
                  </a>
                )}
                {ig && (
                  <a href={ig} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-semibold">
                    📸 Instagram
                  </a>
                )}
              </div>
            </div>
          </div>

          {club.description && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-foreground/90">{club.description}</p>
            </div>
          )}

          <button
            type="button"
            onClick={joinClub}
            disabled={joining || isMember}
            className="mt-6 w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition disabled:opacity-50 disabled:bg-muted"
          >
            {joining ? 'Joining...' : isMember ? '✓ Member' : 'Join Club'}
          </button>

          {isClubOwner && (
            <button
              type="button"
              onClick={() => void deleteClub()}
              disabled={deleting}
              className="mt-3 w-full py-3 flex items-center justify-center gap-2 rounded-lg border border-red-500/60 text-red-600 dark:text-red-400 hover:bg-red-500/10 font-semibold transition disabled:opacity-50"
            >
              <Trash2 size={18} />
              {deleting ? 'Deleting…' : 'Delete club'}
            </button>
          )}
        </div>

        {clubId && (
          <ClubGarage
            clubId={clubId}
            currentUserId={user?.id ?? null}
            canUpload={canGarageUpload}
            isClubOwner={isClubOwner}
          />
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Runs</h2>
          </div>

          <div className="p-4">
            {runs.length > 0 ? (
              <div className="space-y-3">
                {runs.map((run) => (
                  <a
                    key={run.id}
                    href={`/runs/${run.id}`}
                    className="block p-3 bg-muted rounded-lg hover:bg-muted/80 border border-border transition"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-foreground font-medium">{run.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${getDifficultyColor(run.difficulty)}`}>
                        {run.difficulty}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{new Date(run.date).toLocaleDateString()}</div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">No upcoming runs scheduled</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Members ({members.length})</h2>
          </div>

          <div className="p-4">
            {members.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2 p-2 bg-muted rounded-lg border border-border">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold shrink-0">
                      {member.user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground text-sm truncate">{member.user?.name || 'Unknown'}</div>
                      <div className="text-muted-foreground text-xs capitalize">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">No members yet</div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
