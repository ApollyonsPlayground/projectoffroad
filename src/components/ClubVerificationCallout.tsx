'use client';

import { Mail, Copy } from 'lucide-react';
import { useToast } from '@/components/Toast';
import {
  buildClubVerificationMailto,
  getClubVerificationEmail,
} from '@/lib/clubVerificationContact';

type Props = {
  variant?: 'banner' | 'compact';
  clubName?: string;
  clubSlug?: string;
};

export function ClubVerificationCallout({ variant = 'banner', clubName, clubSlug }: Props) {
  const { showToast } = useToast();
  const email = getClubVerificationEmail();
  const mailto = buildClubVerificationMailto({
    clubName,
    clubSlug,
    note:
      'Please verify our club listing so we can host official runs and show the verified badge.',
  });

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      showToast('Email copied', 'success');
    } catch {
      showToast('Could not copy', 'error');
    }
  };

  if (variant === 'compact') {
    return (
      <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2.5 flex flex-col gap-2">
        <p className="text-[12px] text-zinc-300 leading-snug">
          Want the <strong className="text-orange-300">verified badge</strong>? Email{' '}
          <button
            type="button"
            onClick={copyEmail}
            className="font-semibold text-orange-400 underline underline-offset-2"
          >
            {email}
          </button>{' '}
          or tap below.
        </p>
        <a
          href={mailto}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg bg-orange-500 text-black text-[13px] font-bold"
        >
          <Mail size={16} />
          Request verification
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-700 bg-zinc-900/90 px-4 py-4 space-y-3">
      <p className="text-[13px] font-bold text-white">Get your club verified</p>
      <p className="text-[12px] text-zinc-400 leading-relaxed">
        New clubs start as <strong className="text-amber-400">unverified</strong>. Send a quick note so we can confirm
        you represent this group and flip on the verified badge (needed for official club runs).
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={mailto}
          className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-orange-500 hover:bg-orange-600 text-black text-[14px] font-black transition-colors"
        >
          <Mail size={18} />
          Email verification request
        </a>
        <button
          type="button"
          onClick={copyEmail}
          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl border border-zinc-600 text-zinc-300 text-[13px] font-semibold hover:bg-zinc-800"
        >
          <Copy size={16} />
          Copy email
        </button>
      </div>
      <p className="text-[11px] text-zinc-600 break-all">{email}</p>
    </div>
  );
}
