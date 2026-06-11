'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, Loader2, Plus, Trash2, Vote } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useToast } from '@/components/Toast';
import {
  fetchTrailOptions,
  type TrailOption,
  type VotingEvent,
  type VotingEventStatus,
} from '@/lib/voting/fetchVotingEvent';
import {
  addTrailOption,
  createVotingEvent,
  deleteTrailOption,
  fetchAllVotingEvents,
  updateVotingEventStatus,
} from '@/lib/voting/adminVoting';

type Props = {
  supabaseClient: SupabaseClient;
};

function fromDatetimeLocalValue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  return d.toISOString();
}

export function VotingAdminPanel({ supabaseClient }: Props) {
  const { showToast } = useToast();
  const [events, setEvents] = useState<VotingEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [options, setOptions] = useState<TrailOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStarts, setNewStarts] = useState('');
  const [newEnds, setNewEnds] = useState('');

  const [optTitle, setOptTitle] = useState('');
  const [optDescription, setOptDescription] = useState('');
  const [optDifficulty, setOptDifficulty] = useState('Moderate');
  const [optTrailId, setOptTrailId] = useState('');
  const [optNight, setOptNight] = useState(false);

  const selected = events.find((e) => e.id === selectedId) ?? null;

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchAllVotingEvents(supabaseClient);
      setEvents(rows);
      if (!selectedId && rows[0]) setSelectedId(rows[0].id);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not load votes', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabaseClient, selectedId, showToast]);

  const loadOptions = useCallback(async () => {
    if (!selectedId) {
      setOptions([]);
      return;
    }
    try {
      setOptions(await fetchTrailOptions(supabaseClient, selectedId));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not load options', 'error');
    }
  }, [supabaseClient, selectedId, showToast]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const handleCreateEvent = async () => {
    if (!newTitle.trim() || !newStarts || !newEnds) {
      showToast('Title, start, and end are required', 'error');
      return;
    }
    setBusy(true);
    try {
      const created = await createVotingEvent(supabaseClient, {
        title: newTitle.trim(),
        description: newDescription.trim() || '',
        starts_at: fromDatetimeLocalValue(newStarts),
        ends_at: fromDatetimeLocalValue(newEnds),
        status: 'draft',
      });
      setNewTitle('');
      setNewDescription('');
      setNewStarts('');
      setNewEnds('');
      await loadEvents();
      setSelectedId(created.id);
      showToast('Vote event created (draft)', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not create event', 'error');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: VotingEventStatus) => {
    if (!selected) return;
    setBusy(true);
    try {
      await updateVotingEventStatus(supabaseClient, selected.id, status);
      await loadEvents();
      showToast(`Event marked ${status}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not update status', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAddOption = async () => {
    if (!selected || !optTitle.trim() || !optDescription.trim()) {
      showToast('Option title and description required', 'error');
      return;
    }
    setBusy(true);
    try {
      await addTrailOption(supabaseClient, {
        voting_event_id: selected.id,
        title: optTitle.trim(),
        description: optDescription.trim(),
        difficulty: optDifficulty.trim() || 'Moderate',
        trail_id: optTrailId.trim() || null,
        image_url: null,
        is_night_run: optNight,
        sort_order: options.length + 1,
      });
      setOptTitle('');
      setOptDescription('');
      setOptTrailId('');
      setOptNight(false);
      await loadOptions();
      showToast('Trail option added', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not add option', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOption = async (id: string) => {
    setBusy(true);
    try {
      await deleteTrailOption(supabaseClient, id);
      await loadOptions();
      showToast('Option removed', 'info');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete option', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        Create community trail votes for the feed hero. Set <strong className="text-foreground/80">draft</strong> while
        building options, then <strong className="text-foreground/80">active</strong> when voting should open. Results
        appear after <code className="text-[12px]">ends_at</code> or when marked <strong className="text-foreground/80">closed</strong>.
      </p>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-[12px] font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
          <Plus size={14} /> New vote event
        </p>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Event title"
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm"
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Short description (shown on feed)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm resize-y"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-[11px] text-muted-foreground">
            Starts
            <input
              type="datetime-local"
              value={newStarts}
              onChange={(e) => setNewStarts(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm"
            />
          </label>
          <label className="text-[11px] text-muted-foreground">
            Ends
            <input
              type="datetime-local"
              value={newEnds}
              onChange={(e) => setNewEnds(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleCreateEvent()}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold disabled:opacity-50"
        >
          Create draft event
        </button>
      </div>

      {events.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-bold text-muted-foreground uppercase">Events</p>
          {events.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setSelectedId(ev.id)}
              className={`w-full text-left rounded-xl border p-3 transition-colors ${
                selectedId === ev.id ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <p className="font-bold text-foreground text-[14px]">{ev.title}</p>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Calendar size={12} />
                {new Date(ev.starts_at).toLocaleString()} → {new Date(ev.ends_at).toLocaleString()}
              </p>
              <span className="inline-block mt-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {ev.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-[13px] font-bold text-foreground flex items-center gap-2">
            <Vote size={16} className="text-primary" />
            {selected.title}
          </p>
          <div className="flex flex-wrap gap-2">
            {(['draft', 'active', 'closed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy || selected.status === s}
                onClick={() => void setStatus(s)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold border border-border disabled:opacity-40 capitalize"
              >
                {s === selected.status ? `✓ ${s}` : `Set ${s}`}
              </button>
            ))}
          </div>

          <div className="border-t border-border/80 pt-3 space-y-2">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Trail options ({options.length})</p>
            {options.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{o.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{o.description}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDeleteOption(o.id)}
                  className="text-red-400 p-1 disabled:opacity-40"
                  aria-label="Delete option"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            <div className="space-y-2 pt-2">
              <input
                value={optTitle}
                onChange={(e) => setOptTitle(e.target.value)}
                placeholder="Option title"
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              />
              <textarea
                value={optDescription}
                onChange={(e) => setOptDescription(e.target.value)}
                placeholder="Option description"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={optDifficulty}
                  onChange={(e) => setOptDifficulty(e.target.value)}
                  placeholder="Difficulty"
                  className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
                />
                <input
                  value={optTrailId}
                  onChange={(e) => setOptTrailId(e.target.value)}
                  placeholder="Trail ID (optional)"
                  className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <input type="checkbox" checked={optNight} onChange={(e) => setOptNight(e.target.checked)} />
                Night run option
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleAddOption()}
                className="w-full py-2 rounded-lg border border-primary/40 text-primary text-[12px] font-bold disabled:opacity-50"
              >
                Add trail option
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
