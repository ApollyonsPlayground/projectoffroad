'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { normalizeUsername } from '@/lib/profileDisplay';

const storageKey = (userId: string) => `nickname_welcome_seen_${userId}`;

export function WelcomeNicknameToast() {
  const { user, profile, loading } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (loading || !user || !profile) return;
    const handle = normalizeUsername(String(profile.username ?? ''));
    if (!handle) return;
    if (typeof window === 'undefined') return;
    const key = storageKey(user.id);
    if (window.localStorage.getItem(key) === '1') return;
    window.localStorage.setItem(key, '1');
    showToast(
      `Your trail name is @${handle} — change it anytime under Edit profile.`,
      'success'
    );
  }, [loading, user, profile, showToast]);

  return null;
}
