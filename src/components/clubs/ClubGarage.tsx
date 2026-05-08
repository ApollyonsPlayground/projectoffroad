'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/db/supabase';
import { useToast } from '@/components/Toast';

export interface GaragePhoto {
  id: string;
  club_id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

type Props = {
  clubId: string;
  currentUserId: string | null;
  canUpload: boolean;
  isClubOwner: boolean;
};

function publicGarageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
  return `${base}/storage/v1/object/public/club-garage/${encodeURI(path)}`;
}

export default function ClubGarage({ clubId, currentUserId, canUpload, isClubOwner }: Props) {
  const { showToast } = useToast();
  const [photos, setPhotos] = useState<GaragePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('club_garage_photos')
      .select('id, club_id, user_id, storage_path, caption, created_at')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ClubGarage]', error);
      setPhotos([]);
    } else {
      setPhotos((data ?? []) as GaragePhoto[]);
    }
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !supabase || !currentUserId || !canUpload) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const ok = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext ?? '');
    if (!ok) {
      showToast('Use JPG, PNG, WebP, or GIF', 'error');
      return;
    }

    const path = `${clubId}/${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    setUploading(true);
    try {
      const { error: upErr } = await supabase.storage.from('club-garage').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error: rowErr } = await supabase.from('club_garage_photos').insert({
        club_id: clubId,
        user_id: currentUserId,
        storage_path: path,
      });
      if (rowErr) throw rowErr;

      showToast('Photo added to club garage', 'success');
      await load();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(photo: GaragePhoto) {
    if (!supabase || !currentUserId) return;
    const allowed = photo.user_id === currentUserId || isClubOwner;
    if (!allowed) {
      showToast('Only the uploader or club owner can remove photos', 'error');
      return;
    }

    if (!window.confirm('Remove this photo from the club garage?')) return;

    try {
      const { error: stErr } = await supabase.storage.from('club-garage').remove([photo.storage_path]);
      if (stErr) console.warn('[ClubGarage] storage remove', stErr);

      const { error: delErr } = await supabase.from('club_garage_photos').delete().eq('id', photo.id);
      if (delErr) throw delErr;

      showToast('Photo removed', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete', 'error');
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
      <div className="p-4 border-b border-border flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Club garage</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rig shots from members — builds, trail rigs, meetups.
          </p>
        </div>
        {canUpload && currentUserId && (
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold cursor-pointer disabled:opacity-50">
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
            <span>{uploading ? 'Uploading…' : 'Add photo'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onPickFile} disabled={uploading} />
          </label>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-muted-foreground" size={28} />
          </div>
        ) : photos.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {canUpload ? 'No rig photos yet — be the first to add one.' : 'No photos in the garage yet.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border group">
                {/* eslint-disable-next-line @next/next/no-img-element -- Supabase project host varies per env */}
                <img src={publicGarageUrl(photo.storage_path)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                {currentUserId && (photo.user_id === currentUserId || isClubOwner) && (
                  <button
                    type="button"
                    onClick={() => void removePhoto(photo)}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
