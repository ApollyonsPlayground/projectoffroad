'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Ruler,
  AlertTriangle,
  Truck,
  Tag,
  ExternalLink,
  BookmarkPlus,
  BookmarkCheck,
  Share2,
  Users,
  ChevronRight,
  BadgeCheck,
  StickyNote,
} from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { TrailReportFormDrawer } from '@/components/trails/TrailReportFormDrawer';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { resolvePublicDisplayName } from '@/lib/profileDisplay';
import {
  mapDbTrailRow,
  trailVehicleScopeShortLabel,
  trailVehicleScopeBadgeClass,
  type ExplorerTrail,
  type DifficultyTier,
} from '@/lib/trails/mapDbTrail';
import { applyCatalogTrailLinks } from '@/lib/trails/staticTrailLinks';
import {
  normalizeTrailReportPhotoUrls,
  trailReportConditionLabel,
  trailReportDifficultyLabel,
  type TrailReportRow,
} from '@/lib/trails/trailReports';
import { useSavedTrailIds } from '@/lib/hooks/useSavedTrailIds';

type Trail = ExplorerTrail;

const PLAY_REVIEW_UI_ENABLED =
  typeof process.env.NEXT_PUBLIC_PLAY_REVIEW_GATEWAY === 'string' &&
  process.env.NEXT_PUBLIC_PLAY_REVIEW_GATEWAY.trim() === 'true';

function isGiantRockTrail(trail: Trail): boolean {
  const slug = trail.id?.toLowerCase?.() ?? '';
  const name = trail.name?.toLowerCase?.() ?? '';
  return slug === 'giant-rock' || name.includes('giant rock');
}

interface TrailTripNoteRow {
  id: string;
  body: string;
  created_at: string;
  run_id: string;
  runs?: { title: string; date: string } | null;
  users?: { name: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Matches DB values like "Open", "OPEN", " open ". */
function trailStatusIsOpen(status: string | undefined): boolean {
  return status?.trim().toLowerCase() === 'open';
}

function difficultyColorTier(tier: DifficultyTier) {
  if (tier === 'Easy') return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (tier === 'Moderate') return 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30';
  return 'bg-red-500/15 text-red-400 border-red-500/30';
}

function DifficultyDot({ tier }: { tier: DifficultyTier }) {
  const dots: DifficultyTier[] = ['Easy', 'Moderate', 'Hard'];
  const colors = ['bg-green-500', 'bg-yellow-500', 'bg-red-500'];
  const idx = dots.indexOf(tier);
  return (
    <div className="flex items-center gap-1" aria-label={`Difficulty: ${tier}`}>
      {dots.map((_, i) => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${i <= idx && idx >= 0 ? colors[idx] : 'bg-zinc-800'}`}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { supabaseClient, isConfigured, user } = useAuth();
  const { savedIds, toggleSave } = useSavedTrailIds(supabaseClient, user?.id);

  const [trail, setTrail] = useState<Trail | null>(null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tripNotes, setTripNotes] = useState<TrailTripNoteRow[]>([]);
  const [trailReports, setTrailReports] = useState<TrailReportRow[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const playReviewTapResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playReviewTapCountRef = useRef(0);
  const playReviewUnlockToastShownRef = useRef(false);
  const [playReviewUnlocked, setPlayReviewUnlocked] = useState(false);

  useEffect(() => {
    return () => {
      if (playReviewTapResetRef.current) clearTimeout(playReviewTapResetRef.current);
    };
  }, []);

  useEffect(() => {
    playReviewTapCountRef.current = 0;
    playReviewUnlockToastShownRef.current = false;
    setPlayReviewUnlocked(false);
    if (playReviewTapResetRef.current) {
      clearTimeout(playReviewTapResetRef.current);
      playReviewTapResetRef.current = null;
    }
  }, [trail?.id]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    let cancelled = false;

    async function loadTrail() {
      setLoading(true);
      setLoadError(null);

      if (!isConfigured || !supabaseClient) {
        setTrail(null);
        setLoadError(
          'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.'
        );
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseClient.from('trails').select('*').eq('id', id).maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('[trail detail]', error);
        setTrail(null);
        setLoadError(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setTrail(null);
        setLoadError(null);
        setLoading(false);
        return;
      }

      setTrail(applyCatalogTrailLinks(mapDbTrailRow(data as Record<string, unknown>)));
      setLoading(false);
    }

    void loadTrail();
    return () => {
      cancelled = true;
    };
  }, [id, supabaseClient, isConfigured]);

  const trailId = typeof id === 'string' ? id : '';

  const fetchTrailReports = useCallback(async () => {
    if (!trailId || !supabaseClient || !isConfigured) {
      setTrailReports([]);
      return;
    }
    const attempts = [
      'id, trail_id, run_id, user_id, condition_status, difficulty_today, surface_conditions, hazards, hazards_note, weather, body, photo_urls, feed_post_id, created_at, updated_at, users(name, username, hide_display_name, avatar_url, is_verified), runs(title, date)',
      'id, trail_id, run_id, user_id, condition_status, difficulty_today, surface_conditions, hazards, hazards_note, weather, body, photo_urls, feed_post_id, created_at, updated_at, users(name, username, hide_display_name, avatar_url, is_verified)',
      'id, trail_id, run_id, user_id, condition_status, difficulty_today, surface_conditions, hazards, hazards_note, weather, body, photo_urls, feed_post_id, created_at, updated_at',
    ];
    for (const sel of attempts) {
      const { data, error } = await supabaseClient
        .from('trail_reports')
        .select(sel)
        .eq('trail_id', trailId)
        .order('created_at', { ascending: false })
        .limit(40);
      if (!error && data != null) {
        setTrailReports(data as unknown as TrailReportRow[]);
        return;
      }
    }
    setTrailReports([]);
  }, [trailId, supabaseClient, isConfigured]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await fetchTrailReports();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchTrailReports]);

  useEffect(() => {
    if (!trailId || !supabaseClient || !isConfigured) {
      setTripNotes([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const attempts = [
        'id, body, created_at, run_id, runs(title, date), users(name)',
        'id, body, created_at, run_id, users(name)',
      ];
      for (const sel of attempts) {
        const { data, error } = await supabaseClient
          .from('run_reflections')
          .select(sel)
          .eq('trail_id', trailId)
          .order('created_at', { ascending: false })
          .limit(40);
        if (!error && data != null && !cancelled) {
          setTripNotes(data as unknown as TrailTripNoteRow[]);
          break;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trailId, supabaseClient, isConfigured]);
  const isSaved = trailId ? savedIds.has(trailId) : false;

  const handleSave = useCallback(async () => {
    if (!trailId) return;
    if (!user) {
      showToast('Sign in to save trails to your profile', 'info');
      return;
    }
    const { saved, error } = await toggleSave(trailId);
    if (error === 'not_authenticated') {
      showToast('Sign in to save trails', 'info');
      return;
    }
    if (error) {
      showToast(`Could not update: ${error}`, 'error');
      return;
    }
    showToast(
      saved ? 'Trail saved to your list' : 'Trail removed from saved',
      saved ? 'success' : 'info'
    );
  }, [trailId, user, toggleSave, showToast]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: trail?.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard', 'success');
      }
    } catch {
      showToast('Could not share trail', 'error');
    }
  }, [trail, showToast]);

  const handlePlayReviewOpenBadgeTap = useCallback(() => {
    const t = trail;
    if (
      !PLAY_REVIEW_UI_ENABLED ||
      !t ||
      !isGiantRockTrail(t) ||
      !trailStatusIsOpen(t.status)
    ) {
      return;
    }
    if (playReviewTapResetRef.current) clearTimeout(playReviewTapResetRef.current);
    playReviewTapResetRef.current = setTimeout(() => {
      playReviewTapCountRef.current = 0;
      playReviewTapResetRef.current = null;
    }, 4500);

    playReviewTapCountRef.current += 1;
    if (playReviewTapCountRef.current >= 7) {
      playReviewTapCountRef.current = 0;
      setPlayReviewUnlocked(true);
      if (!playReviewUnlockToastShownRef.current) {
        playReviewUnlockToastShownRef.current = true;
        showToast('Reviewer sign-in unlocked', 'success');
      }
    }
  }, [trail, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-9 h-9 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-muted-foreground text-[14px]">Loading trail…</p>
        <BottomNav />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle size={36} className="text-red-500/80" />
        <p className="text-muted-foreground text-[15px] text-center max-w-sm">{loadError}</p>
        <Link href="/trails" className="text-[14px] text-primary hover:text-primary/90">
          Back to trails
        </Link>
        <BottomNav />
      </div>
    );
  }

  if (!trail) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle size={36} className="text-muted-foreground" />
        <p className="text-muted-foreground text-[15px]">Trail not found</p>
        <Link href="/trails" className="text-[14px] text-primary hover:text-primary/90">
          Back to trails
        </Link>
        <BottomNav />
      </div>
    );
  }

  const diffClass = difficultyColorTier(trail.difficultyLabel);

  const renderVerifiedChip = () =>
    trail.isVerified ? (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
        <BadgeCheck size={12} />
        Verified
      </span>
    ) : null;

  const renderTrailStatusPill = () => {
    if (!trail.status) return null;
    const open = trailStatusIsOpen(trail.status);
    const tapTarget = PLAY_REVIEW_UI_ENABLED && isGiantRockTrail(trail) && open;
    const base = 'px-2.5 py-1 text-[11px] font-bold uppercase rounded-full border ';
    const cls = tapTarget
      ? `${base} bg-red-500/15 text-red-400 border-red-500/50 cursor-pointer select-none touch-manipulation active:opacity-80`
      : open
        ? `${base} bg-green-500/15 text-green-400 border-green-500/30`
        : `${base} bg-red-500/15 text-red-400 border-red-500/30`;
    return (
      <span
        className={cls}
        onClick={tapTarget ? handlePlayReviewOpenBadgeTap : undefined}
        role={tapTarget ? 'button' : undefined}
        tabIndex={tapTarget ? 0 : undefined}
        onKeyDown={
          tapTarget
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePlayReviewOpenBadgeTap();
                }
              }
            : undefined
        }
        aria-label={
          tapTarget ? 'Trail status Open — tap seven times for Play reviewer sign-in' : undefined
        }
      >
        {trail.status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="max-w-app-shell mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-[15px] font-bold text-foreground truncate mx-3 flex-1 text-center">{trail.name}</h1>
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleSave}
              className="p-2 text-muted-foreground hover:text-primary/90 transition-colors"
              aria-label={isSaved ? 'Remove from saved' : 'Save trail'}
            >
              {isSaved ? <BookmarkCheck size={20} className="text-primary" /> : <BookmarkPlus size={20} />}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleShare}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Share trail"
            >
              <Share2 size={18} />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-app-shell mx-auto pb-28">
        {/* Hero image */}
        {trail.image && !imageError ? (
          <div className="relative h-52 bg-card overflow-hidden">
            <img
              src={trail.image}
              alt={trail.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-end gap-2">
              {renderVerifiedChip()}
              {renderTrailStatusPill()}
            </div>
          </div>
        ) : (
          <div className="relative h-36 bg-muted border-b border-border flex items-center justify-center">
            <MapPin size={28} className="text-zinc-800" />
            <div className="absolute top-3 left-3 right-3 flex flex-wrap items-start justify-end gap-2">
              {renderVerifiedChip()}
              {renderTrailStatusPill()}
            </div>
          </div>
        )}

        {/* Title + difficulty */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-bold text-foreground leading-tight text-balance">{trail.name}</h2>
              <div className="flex items-center gap-1 mt-1 text-[13px] text-muted-foreground">
                <MapPin size={13} />
                <span>{trail.location}</span>
              </div>
            </div>
            <span className={`mt-1 px-2.5 py-1 text-[11px] font-bold uppercase border rounded-full flex-shrink-0 ${diffClass}`}>
              {trail.difficultyLabel}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DifficultyDot tier={trail.difficultyLabel} />
            <span
              className={`inline-flex px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${trailVehicleScopeBadgeClass(trail.vehicleScope)}`}
            >
              {trailVehicleScopeShortLabel(trail.vehicleScope)}
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 divide-x divide-zinc-900 border-b border-border">
          {[
            { icon: Ruler, label: 'Distance', value: trail.distance },
            { icon: Clock, label: 'Est. Time', value: trail.time },
            {
              icon: MapPin,
              label: 'Terrain',
              value: (() => {
                const t = trail.terrain || 'off-road';
                return t.charAt(0).toUpperCase() + t.slice(1);
              })(),
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1 py-3.5 px-2">
              <Icon size={17} className="text-primary" />
              <span className="text-[13px] font-semibold text-foreground">{value}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="px-4 py-4 border-b border-border">
          <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">About this Trail</h3>
          <p className="text-[14px] text-muted-foreground leading-relaxed">{trail.description}</p>
        </div>

        <div className="px-4 py-4 border-b border-border">
          <div className="rounded-2xl border border-primary/25 bg-primary/8 px-4 py-4">
            <h3 className="text-[15px] font-black text-foreground">Report trail conditions</h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed mt-1.5">
              Share status, hazards, surface conditions, weather, and photos for the next group.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  showToast('Sign in to report trail conditions', 'info');
                  return;
                }
                setReportOpen(true);
              }}
              className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-[14px] font-black text-primary-foreground hover:opacity-90 transition-colors"
            >
              {user ? 'Report trail conditions' : 'Sign in to report conditions'}
            </button>
          </div>
        </div>

        {playReviewUnlocked && PLAY_REVIEW_UI_ENABLED && isGiantRockTrail(trail) && (
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Google Play reviewer sign-in
            </h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
              Sign in with the <strong className="text-muted-foreground font-semibold">email and password</strong> supplied
              for Play Store review (check your credentials note).
            </p>
            <form action="/api/auth/play-review/" method="POST" className="space-y-3">
              <div>
                <label htmlFor="play-review-email" className="sr-only">
                  Email
                </label>
                <input
                  id="play-review-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  placeholder="Email"
                  className="w-full rounded-xl border border-border bg-muted px-3 py-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div>
                <label htmlFor="play-review-password" className="sr-only">
                  Password
                </label>
                <input
                  id="play-review-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Password"
                  className="w-full rounded-xl border border-border bg-muted px-3 py-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground text-[14px] font-bold transition-colors"
              >
                Sign in
              </button>
            </form>
          </div>
        )}

        {/* Structured trail reports */}
        {trailReports.length > 0 ? (
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <StickyNote size={14} className="text-primary" />
              Recent trail reports
            </h3>
            <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
              Fresh condition reports from the community and completed group runs.
            </p>
            <ul className="space-y-3">
              {trailReports.map((report) => {
                const photos = normalizeTrailReportPhotoUrls(report.photo_urls);
                const author = resolvePublicDisplayName({
                  id: report.user_id,
                  name: report.users?.name,
                  username: report.users?.username,
                  hide_display_name: report.users?.hide_display_name,
                });
                return (
                  <li
                    key={report.id}
                    className="rounded-2xl border border-border bg-muted/80 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-foreground truncate">
                          {author}
                          {report.users?.is_verified ? (
                            <BadgeCheck size={12} className="inline ml-1 text-primary" />
                          ) : null}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {report.run_id ? (
                            report.runs?.title ? (
                              <Link href={`/runs/${report.run_id}`} className="text-primary/90 hover:text-primary font-medium">
                                from {report.runs.title}
                              </Link>
                            ) : (
                              <Link href={`/runs/${report.run_id}`} className="text-primary/90 hover:text-primary font-medium">
                                from a group run
                              </Link>
                            )
                          ) : (
                            'community report'
                          )}
                          <span className="mx-1">·</span>
                          {new Date(report.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      {report.feed_post_id ? (
                        <Link
                          href={`/posts/${report.feed_post_id}`}
                          className="text-[11px] font-bold text-primary hover:text-primary/80 flex-shrink-0"
                        >
                          Feed post
                        </Link>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="px-2 py-1 rounded-full bg-card border border-border text-[11px] font-bold text-foreground">
                        {trailReportConditionLabel(report.condition_status)}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-card border border-border text-[11px] font-bold text-foreground">
                        {trailReportDifficultyLabel(report.difficulty_today)}
                      </span>
                      {report.weather ? (
                        <span className="px-2 py-1 rounded-full bg-card border border-border text-[11px] font-bold text-muted-foreground">
                          {report.weather}
                        </span>
                      ) : null}
                    </div>

                    {report.surface_conditions.length > 0 ? (
                      <p className="text-[12px] text-muted-foreground mb-1.5">
                        <span className="font-bold text-foreground/80">Conditions:</span> {report.surface_conditions.join(', ')}
                      </p>
                    ) : null}
                    {report.hazards.length > 0 || report.hazards_note ? (
                      <p className="text-[12px] text-muted-foreground mb-1.5">
                        <span className="font-bold text-foreground/80">Hazards:</span>{' '}
                        {[...report.hazards, report.hazards_note].filter(Boolean).join(', ')}
                      </p>
                    ) : null}
                    <p className="text-[14px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{report.body}</p>

                    {photos.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {photos.slice(0, 4).map((photo) => (
                          <img
                            key={photo}
                            src={photo}
                            alt=""
                            loading="lazy"
                            className="aspect-video w-full rounded-xl object-cover border border-border bg-card"
                          />
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : tripNotes.length > 0 ? (
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <StickyNote size={14} className="text-primary" />
              Recent trip notes
            </h3>
            <p className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
              Pulled from completed group runs on this trail while structured trail reports roll out.
            </p>
            <ul className="space-y-3">
              {tripNotes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl border border-border bg-muted/80 px-3 py-3"
                >
                  <p className="text-[11px] text-muted-foreground mb-1.5">
                    <span className="text-muted-foreground font-semibold">{n.users?.name ?? 'Rider'}</span>
                    <span className="text-muted-foreground mx-1">·</span>
                    {n.runs?.title ? (
                      <Link
                        href={`/runs/${n.run_id}`}
                        className="text-primary/90/95 hover:text-primary/80 font-medium"
                      >
                        {n.runs.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Past run</span>
                    )}
                    <span className="text-muted-foreground mx-1">·</span>
                    {new Date(n.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-[14px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Rig Requirements */}
        {trail.rigRequirements && (
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Truck size={14} className="text-primary" /> Rig Requirements
            </h3>
            <p className="text-[14px] text-muted-foreground leading-relaxed">{trail.rigRequirements}</p>
          </div>
        )}

        {/* Tags */}
        {trail.tags && trail.tags.length > 0 && (
          <div className="px-4 py-4 border-b border-border">
            <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Tag size={14} className="text-primary" /> Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {trail.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-card border border-border text-[12px] text-muted-foreground rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Coordinates */}
        {trail.coordinates && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Coordinates</p>
            <p className="text-[13px] text-muted-foreground font-mono mt-0.5">{trail.coordinates}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-4 pt-5 space-y-3">
          {trail.onxUrl && (
            <a
              href={trail.onxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary hover:opacity-90 text-primary-foreground font-bold text-[15px] rounded-xl transition-colors"
              onClick={() => showToast('Opening onX', 'info')}
            >
              <ExternalLink size={16} /> Open in onX
            </a>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-muted border border-border hover:border-primary/30 text-muted-foreground font-semibold text-[14px] rounded-xl transition-colors"
          >
            {isSaved
              ? <><BookmarkCheck size={16} className="text-primary" /> Saved to your list</>
              : <><BookmarkPlus size={16} /> Save this Trail</>
            }
          </motion.button>

          {/* Find a run on this trail */}
          <Link
            href={`/runs?trail=${encodeURIComponent(trail.name)}`}
            className="flex items-center justify-between w-full py-3.5 px-4 bg-card border border-border hover:border-border rounded-xl transition-colors"
            onClick={() => showToast('Finding runs on this trail', 'info')}
          >
            <div className="flex items-center gap-2 text-muted-foreground text-[14px] font-semibold">
              <Users size={16} className="text-primary" />
              Find a group run
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </Link>
        </div>
      </main>

      <TrailReportFormDrawer
        open={reportOpen}
        trailId={trail.id}
        trailName={trail.name}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => void fetchTrailReports()}
      />

      <BottomNav />
    </div>
  );
}
