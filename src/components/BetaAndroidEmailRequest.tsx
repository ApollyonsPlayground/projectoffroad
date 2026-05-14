'use client';

import { useState } from 'react';
import { SITE_SUPPORT_EMAIL } from '@/lib/siteContact';

const MAIL_SUBJECT = 'Google Play internal test access';

export function BetaAndroidEmailRequest() {
  const [email, setEmail] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const value = email.trim();
    const body = `Please add this Google account email to Google Play internal testing:\n\n${value}\n\nThank you.`;
    const url = `mailto:${SITE_SUPPORT_EMAIL}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="beta-android-email" className="block text-sm font-semibold text-foreground/90 mb-1.5">
          Google Play account email
        </label>
        <input
          id="beta-android-email"
          name="playEmail"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
          placeholder="you@gmail.com"
        />
        <p className="text-[12px] text-muted-foreground mt-1.5">
          Use the same Google account you use on the Play Store — that is the email we add in Play Console.
        </p>
      </div>
      <button
        type="submit"
        className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/90 transition-colors"
      >
        Open email to send request
      </button>
    </form>
  );
}
