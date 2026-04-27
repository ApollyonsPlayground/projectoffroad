'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/db/supabase';
import BottomNav from '@/components/BottomNav';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId || !supabase) {
        setError('Invalid user ID');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: err } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (err) throw err;
        if (!data) {
          setError('User not found');
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch {
        setError('Failed to load user profile');
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500">Loading profile...</div>
        <BottomNav />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-[22px] font-black text-white mb-3">Profile Not Found</h2>
          <p className="text-zinc-500 mb-6">{error || 'This user does not exist.'}</p>
          <Link href="/" className="inline-block px-4 py-2 bg-orange-500 text-black font-bold rounded">
            Back to Feed
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black border-b border-zinc-900 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center justify-center w-10 h-10 hover:bg-zinc-900 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-white" />
        </Link>
        <h1 className="text-[18px] font-black text-white">Profile</h1>
      </div>

      {/* Profile card */}
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="text-center">
          {profile.avatar_url && (
            <img src={profile.avatar_url} alt={profile.name} className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-orange-500" />
          )}
          <h2 className="text-[20px] font-black text-white mb-1">{profile.name || 'Anonymous'}</h2>
          {profile.role === 'owner' && (
            <div className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full bg-[#FF8C00] mb-3">
              <span className="text-[9px] font-black text-black">PO</span>
            </div>
          )}
          {profile.bio && <p className="text-zinc-400 text-[14px] mb-4">{profile.bio}</p>}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
