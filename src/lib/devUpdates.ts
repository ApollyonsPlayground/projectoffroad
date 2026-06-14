/** Bump when shipping a user-facing release — keep in sync with app-version.json / What's new modal. */
export const DEV_UPDATES_VERSION = '2026-06-14';

export type DevUpdateTag = 'new' | 'improved' | 'fix';

export type DevUpdateItem = {
  title: string;
  summary: string;
  tag: DevUpdateTag;
};

export type DevUpdateCallout = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type DevUpdateRelease = {
  version: string;
  date: string;
  title: string;
  items: DevUpdateItem[];
  /** Optional banner — e.g. ask for feedback before enabling a feature. */
  callout?: DevUpdateCallout;
};

export const DEV_UPDATES: DevUpdateRelease[] = [
  {
    version: DEV_UPDATES_VERSION,
    date: 'June 14, 2026',
    title: 'App 1.3 — push notifications & FCM',
    items: [
      {
        tag: 'new',
        title: 'Remote push notifications',
        summary:
          'Run reminders and alerts can reach your phone when notifications are enabled. Allow notifications when prompted after sign-in.',
      },
      {
        tag: 'improved',
        title: 'Android reliability',
        summary:
          'Updated native build for Google Play (version 1.3) with proper Firebase messaging support.',
      },
      {
        tag: 'fix',
        title: 'Native photo & video',
        summary:
          'Camera and gallery picking for posts, messages, and profile photos uses your phone’s built-in apps.',
      },
    ],
  },
  {
    version: '2026-06-13',
    date: 'June 13, 2026',
    title: 'App 1.0.9 — native camera, location & notifications',
    items: [
      {
        tag: 'fix',
        title: 'Native photo & video',
        summary:
          'Posts, messages, profile photos, and stories now use your phone’s built-in camera and photo library — required for a smooth App Store experience.',
      },
      {
        tag: 'improved',
        title: 'Live map GPS',
        summary:
          'Share my location on active runs uses native GPS permission prompts on iPhone and Android.',
      },
      {
        tag: 'improved',
        title: 'Push notification readiness',
        summary:
          'The app can register for push alerts when enabled. Run reminders still work as on-device notifications.',
      },
      {
        tag: 'improved',
        title: 'Post composer',
        summary:
          'Creating a post keeps the feed steady while you type — less disorienting on mobile.',
      },
    ],
  },
  {
    version: '2026-06-12',
    date: 'June 12, 2026',
    title: 'App 1.0.8 — themes, guest invites & native polish',
    items: [
      {
        tag: 'new',
        title: 'Themes & onboarding',
        summary:
          'Six distinct color presets, custom accent colors, and a short setup flow for new riders (trail name + theme). Existing members get a one-time theme picker.',
      },
      {
        tag: 'new',
        title: 'Guest run invites',
        summary:
          'Hosts can share a link so friends join a run with a temporary trail name — no full account required. Access is limited to that run until it ends.',
      },
      {
        tag: 'improved',
        title: 'Live map location',
        summary:
          'Tapping Share my location on an active run now prompts for GPS permission on the native app. SOS uses the same flow.',
      },
      {
        tag: 'improved',
        title: 'Status bar & shell',
        summary:
          'On iPhone and Android, the status bar matches your theme preset or custom colors.',
      },
      {
        tag: 'improved',
        title: 'Run publishing',
        summary:
          'Clearer errors when a run fails to publish, with hints on what to fix.',
      },
      {
        tag: 'fix',
        title: 'Official staff runs',
        summary:
          'Platform staff can publish official runs and guest invite links without permission errors.',
      },
    ],
  },
  {
    version: '2026-06-01',
    date: 'May 31, 2026',
    title: 'Still building — vote, clubs & push on the way',
    callout: {
      title: 'We’re still actively building',
      body:
        'SoCal Offroaders is under active development — new features land regularly. Push notifications are paused while we fix a stability issue (nothing is sent). Which alerts would feel helpful vs. annoying when we turn them back on? Run reminders (72h / 48h / 24h), new runs near you, club updates, DMs, community vote open / winner, or safety on active runs. Reply via support or club chat.',
      ctaLabel: 'Contact support',
      ctaHref: '/support/',
    },
    items: [
      {
        tag: 'new',
        title: 'Community trail vote — opens soon',
        summary:
          'A 14-day blind vote for our next big group run is coming to the top of the feed — Lytle Creek or Cleghorn, day or night. Vote opens soon; you’ll get one vote and the winner is revealed when the timer ends.',
      },
      {
        tag: 'new',
        title: 'Club cover photo',
        summary:
          'Club owners can set a full-width background on the club page and directory cards. Tap Add cover photo on your club page or upload from Edit club info.',
      },
      {
        tag: 'new',
        title: 'Club logo upload',
        summary:
          'Upload a club logo from your phone — camera button on the club page or file picker under Edit club info.',
      },
      {
        tag: 'new',
        title: 'Auto nicknames (@username)',
        summary:
          'Every rider gets a unique @handle on sign-in. The feed, runs, clubs, and messages show nicknames only — real names stay private on public surfaces.',
      },
      {
        tag: 'improved',
        title: 'Push setup (paused)',
        summary:
          'Remote push registration is turned off for now while we fix a crash when allowing notifications. Local run reminders on the native app still work if enabled in Settings.',
      },
      {
        tag: 'improved',
        title: 'Signed-in app entry',
        summary:
          'Returning users skip the marketing homepage and off-road advisory gate — you land in the feed automatically.',
      },
      {
        tag: 'new',
        title: 'Trail condition reports',
        summary:
          'Submit structured trail reports from trail pages or completed runs. Reports can include photos and post to the feed.',
      },
      {
        tag: 'fix',
        title: 'Repost visibility',
        summary:
          'Reposts now appear in your feed only when you follow the person who reposted (plus your own reposts).',
      },
    ],
  },
  {
    version: '2026-05-29',
    date: 'May 29, 2026',
    title: 'Club branding, trail names & smoother entry',
    items: [
      {
        tag: 'new',
        title: "What's new",
        summary:
          'Open Menu → What\'s new anytime for release notes. This popup highlights major changes after each update.',
      },
      {
        tag: 'new',
        title: 'Followers & following lists',
        summary: 'Tap follower/following counts on profiles to browse who you follow and who follows you.',
      },
      {
        tag: 'improved',
        title: 'Nickname welcome',
        summary:
          'After your @handle is assigned, a short toast explains your trail name and points you to Edit profile if you want to change it.',
      },
      {
        tag: 'improved',
        title: 'Run lifecycle',
        summary:
          'Runs auto-start at their scheduled time and auto-complete after 24 hours. Hosts can still start a run early.',
      },
    ],
  },
];

export function devUpdatesStorageKey(version = DEV_UPDATES_VERSION): string {
  return `dev_updates_seen_${version.replace(/-/g, '_')}`;
}

export function latestDevRelease(): DevUpdateRelease {
  return DEV_UPDATES[0];
}
